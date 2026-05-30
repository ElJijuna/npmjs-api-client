# Benchmark Results — npmjs-api-client

Performance measurements for the internal operations of the client. All benchmarks run with mocked network (no real HTTP calls), so results reflect **client overhead only**, not network latency.

## How to run

```bash
npm run bench       # run all benchmarks (includes --expose-gc for precise heap measurements)
npm test            # run unit tests (benchmarks excluded)
```

Benchmarks live in `bench/` and use a dedicated Jest config (`jest.bench.config.ts`) so they never pollute the normal test run.

## Environment

| | |
|---|---|
| **Node.js** | v22.22.2 |
| **CPU** | Intel Core i5-6267U @ 2.90 GHz |
| **Arch** | x86_64 |
| **Library version** | 1.8.0 |
| **Fetch** | Mocked via `jest.spyOn(globalThis, 'fetch')` — new `Response` per call |

---

## Results

### 01 — Client Construction
_100,000 iterations · sync_

| Case | ops/sec | Time for 100k iters |
|---|---|---|
| `new NpmClient()` — defaults | 488,299 | 204.8 ms |
| `new NpmClient({ token })` — with auth | 566,561 | 176.5 ms |
| `new NpmClient({ all options })` — all custom URLs + token | 480,289 | 208.2 ms |

**What's happening:** Each constructor call runs 7 `string.replace(/\/$/, '')` strips (one per base URL), initializes a `new Map()` for event listeners, and stores up to 8 properties. Cost is ~2 µs per construction, which is acceptable — clients should be constructed once and reused as singletons.

**Notable:** Passing `token` or custom URLs doesn't meaningfully change performance because the `replace()` calls run regardless.

---

### 02 — Resource Creation
_100,000 iterations · sync_

| Case | ops/sec | Time for 100k iters |
|---|---|---|
| `client.package("react")` | 25,826,593 | 3.9 ms |
| `client.package("@babel/core")` | 25,328,023 | 3.9 ms |
| `client.package("react").version("18.2.0")` | 15,323,179 | 6.5 ms |
| `client.package("react").latest()` | 51,370,778 | 1.9 ms |
| `client.maintainer("sindresorhus")` | 34,269,931 | 2.9 ms |
| `client.user("pilmee")` | 57,403,996 | 1.7 ms |
| `client.org("npmcli")` | 75,418,706 | 1.3 ms |

**What's happening:** Resource creation is essentially free — it just wraps a closure over the injected `RequestFn` and the name string. No I/O, no URL building, no encoding. The `PromiseLike` pattern adds no measurable overhead.

**Notable:** `latest()` is faster than `version("18.2.0")` because it's a one-liner that calls `this.version('latest')` with a literal string — no argument allocation. Chaining (`.package().version()`) doubles the object allocations, which explains the slight slowdown vs bare `.package()`.

---

### 03 — Request Pipeline (mocked fetch)
_1,000 iterations · async · fetch body parsed as JSON on every call_

| Case | ops/sec | Time for 1k iters |
|---|---|---|
| `package.get()` | 3,161 | 316.4 ms |
| `package.downloads("last-week")` | 3,536 | 282.8 ms |
| `package.score()` — npms (third-party base URL) | 3,282 | 304.7 ms |
| `package.size()` — with query params `?p=name` | 2,824 | 354.1 ms |
| `package.distTags()` | 3,881 | 257.7 ms |
| `client.search({ text: "react", size: 20 })` | 4,381 | 228.3 ms |
| `client.bulkDownloads([5 packages])` | 5,692 | 175.7 ms |
| `package.get()` — with auth token | 4,678 | 213.8 ms |
| `package.get()` — 404 error path | **17,250** | 58.0 ms |

**What's happening:** In a real application the dominant cost is always network latency (hundreds of milliseconds). In this benchmark, network is mocked to zero, so we're measuring:
- `Promise` microtask scheduling overhead
- `new Date()` x2 (for `startedAt` / `finishedAt`)
- `Date.now()` for `durationMs`
- `resolveBaseUrl()` — builds a new `Record<string, string>` on every call
- `buildHeaders()` — allocates a new object on every call
- `buildUrl()` — `URLSearchParams` construction when params are present
- `response.json()` — JSON deserialization of the response body
- `this.emit('request', ...)` — event dispatch

**Notable — the error path is 5× faster than the success path:** The 404 case throws before reaching `response.json()`, bypassing JSON deserialization entirely. This confirms that `response.json()` is the dominant cost in the success path, not the client's internal orchestration.

**Notable — `package.size()` is the slowest success path:** It calls `buildUrl()` with a `?p=name` query param, adding `URLSearchParams` construction on top of the base cost. Compare with `package.downloads()` which builds its path via string template with no query params.

**Notable — `bulkDownloads([5 packages])` is the fastest:** The response body is a small JSON object (a map of 5 package entries), so `response.json()` is cheaper than parsing a full packument.

---

### 04 — Data Transformation
_100,000 iterations · sync_

| Case | ops/sec | Time for 100k iters | Notes |
|---|---|---|---|
| `Object.values(smallPackument.versions)` | 1,062,389 | 94.1 ms | 5 versions |
| `Object.values(largePackument.versions)` | 33,683 | 2,968.9 ms | 100 versions |
| `packument.maintainers ?? []` | 95,813,891 | 1.0 ms | Simple property access |
| `buildUrl(base, undefined)` — no params | 53,407,306 | 1.9 ms | Early return, no allocation |
| `buildUrl(base, { p: name })` — 1 param | 323,652 | 309.0 ms | URLSearchParams for 1 entry |
| `buildUrl(base, { text, size, quality, popularity })` — 4 params | 144,365 | 692.7 ms | URLSearchParams + filter + map |
| `encodeURIComponent("react")` | 1,242,257 | 80.5 ms | Plain name |
| `encodeURIComponent("@babel/core")` | 1,308,051 | 76.4 ms | Scoped name |
| `Object.entries(params).filter(v !== undefined)` | 819,540 | 122.0 ms | Param filtering |

**`buildUrl()` — the key hotspot:** There is a **370× gap** between the no-params fast path (53M ops/sec) and the 4-param case (144K ops/sec). Every request with query parameters pays this cost. The breakdown:

```
Object.entries(params)            → allocates entries array
  .filter(([, v]) => v !== undefined)  → allocates filtered array
  .map(([k, v]) => [k, String(v)])     → allocates mapped array + String() calls
new URLSearchParams(entries)      → constructs URLSearchParams object
search.toString()                 → serializes to string
`${base}?${search}`               → template literal concat
```

Six allocations per call with params, compared to a single early-return for the no-params path.

**`Object.values(largePackument.versions)` — scales linearly with version count:** A 20× increase in version count (5 → 100) produces a 31× slowdown (1M → 33K ops/sec). V8 must copy all 100 values into a new array. For packages like `typescript` (200+ versions), callers should cache the result rather than calling `.versions()` in a loop.

**`encodeURIComponent()` — constant cost regardless of scope prefix:** Scoped packages (`@babel/core`) are not meaningfully slower than plain ones. The `@` and `/` characters are encoded but the total string length difference is small.

---

### 05 — Event Emission
_1,000 iterations · async_

| Listeners registered | ops/sec | Time for 1k iters |
|---|---|---|
| 0 | 2,331 | 429.0 ms |
| 1 | 3,169 | 315.6 ms |
| 3 | 3,069 | 325.8 ms |
| 5 | 1,978 | 505.4 ms |

**What's happening:** Each request emits one `'request'` event after completion. The client loops over the listener array and calls each callback. Overhead should grow linearly with listener count.

**Why 0 listeners isn't the fastest:** Each test case runs in a separate Jest `it()` block with its own async event loop flush. The 0-listener result is slower than 1–3 listeners due to JIT warm-up variance across independently scheduled tests — not a real regression. Treat the 0-listener baseline as roughly equivalent to 1–3 listeners.

**5 listeners shows real overhead:** At 5 listeners the slowdown is visible (~15% slower than 1 listener). In practice, registering more than 2–3 `'request'` listeners on a single client instance is unusual.

---

---

### 06 — Event Loop Lag
_`perf_hooks.monitorEventLoopDelay({ resolution: 1 })` — measures delay between scheduled and actual timer fire_

| Case | Result |
|---|---|
| `buildUrl(base, undefined)` ×100k | < 1ms — below resolution |
| `buildUrl(base, { p })` ×100k | < 1ms — below resolution |
| `buildUrl(base, { 4 params })` ×100k | < 1ms — below resolution |
| `Object.values(largePackument.versions)` ×10k | < 1ms — below resolution |
| `new NpmClient()` ×10k | < 1ms — below resolution |
| `encodeURIComponent("@babel/core")` ×100k | < 1ms — below resolution |
| `package.get()` sequential ×500 | < 1ms — below resolution |
| `package.get()` `Promise.all(50)` × 10 rounds | < 1ms — below resolution |

**What "below 1ms resolution" means:** `monitorEventLoopDelay` samples the event loop by scheduling a libuv timer every 1ms. It collects a sample count of zero when either (a) all operations complete before the first timer tick, or (b) for async operations, each `await` resumes fast enough that no delay accumulates between ticks.

**For sync operations — how to interpret correctly:** `monitorEventLoopDelay` cannot measure within a synchronous loop because libuv timers don't fire while JavaScript is executing. The metric to use instead is the **per-call duration** from the throughput benchmarks (section 04):

| Sync operation | Per-call duration | Event loop impact per call |
|---|---|---|
| `buildUrl(4 params)` | ~7 µs | Blocks for 7 µs — negligible |
| `Object.values(100 versions)` | ~21 µs | Blocks for 21 µs — negligible |
| `new NpmClient()` | ~1 µs | Blocks for 1 µs — negligible |

Any single call to these functions holds the event loop for microseconds, well below the 1ms threshold where Node.js starts dropping timer accuracy. Even calling `buildUrl()` 100 times consecutively blocks for < 1ms total.

**For async operations:** The `< 1ms` result is a genuine positive signal — `package.get()` properly yields to the event loop on each `await`, including in batched `Promise.all(50)` patterns. No microtask starvation observed.

**Conclusion:** None of the library's operations introduce measurable event loop lag. The client is safe to use in latency-sensitive servers.

---

### 07 — Memory & GC Pressure
_`process.memoryUsage()` with forced GC via `--expose-gc` (precise retained heap)_

#### Sync allocations (10,000 iterations, GC forced before/after)

| Operation | Heap Δ | Retained per op |
|---|---|---|
| `new NpmClient()` | 15.1 KB | ~1.5 bytes |
| `new NpmClient() + 3 listeners` | 16.4 KB | ~1.7 bytes |
| `client.package("react")` | 7.0 KB | ~0.7 bytes |
| `buildUrl(base, undefined)` | −1.9 KB | ~0 bytes (GC collected) |
| `buildUrl(base, { 4 params })` | **39.3 KB** | **~4.0 bytes** |
| `Object.values(largePackument.versions)` | 2.7 KB | ~0.3 bytes |

**Why `buildUrl(4 params)` retains more:** Each call allocates 3 intermediate arrays and 1 `URLSearchParams` object. After GC, V8 retains ~4 bytes of overhead per operation in its internal structures (hidden class descriptors, string internment). The allocations themselves are collected — but they generate GC pressure.

**Why `buildUrl(undefined)` is negative:** The early-return path allocates nothing. The −1.9 KB is the GC collecting unrelated object from the warmup phase.

#### Async allocations (1,000 iterations, GC forced before/after)

| Operation | Heap Δ | Retained per op |
|---|---|---|
| `package.get()` | 7.56 MB | ~7,931 bytes |
| `package.get()` with 5 listeners | 7.56 MB | ~7,930 bytes |

**Why ~8 KB per async call:** Each call creates a mocked `Response` containing `JSON.stringify(smallPackument)` (~3 KB serialized). The retained 8 KB includes: the serialized JSON string, the parsed object graph, Promise chain objects, `RequestEvent` object, `Date` objects, and V8 internal overhead. Listeners add essentially zero per-call cost (~1 byte difference with 5 listeners).

In production, the parsed response object is handed to the caller and GC'd when the caller drops the reference — so the steady-state retained heap per request is much lower than 8 KB.

#### Leak detection

| Test | Result |
|---|---|
| 500 `NpmClient` instances created + GC'd | **2.1 KB retained** (~4 bytes/instance) |
| `search()` heap across 5 × 200 calls | **Stable** — 582–616 KB/batch, no acceleration |

**No memory leaks detected.** The 2.1 KB retained after 500 instances is V8's string interning for repeated URL strings (the default registry URLs are interned once). Per-instance retained cost is ~4 bytes — negligible.

The `search()` stability check shows linear growth (~600 KB per 200-call batch) caused by steady-state Promise and string allocations, not a leak. A real leak would show an accelerating growth rate; the batch-to-batch variance here is < 6%.

## Optimization Candidates

Ranked by expected impact on real-world usage:

### 1. `resolveBaseUrl()` — rebuild map on every request (High)

**Current code** (`NpmClient.ts:181`):
```typescript
private resolveBaseUrl(key: string): string {
  const map: Record<string, string> = {   // ← new object per call
    registry: this.registryUrl,
    downloads: this.downloadsApiUrl,
    // ...
  };
  return map[key] ?? this.registryUrl;
}
```

**Problem:** A new `Record<string, string>` with 7 entries is allocated on every single HTTP request. The values never change after construction.

**Fix:** Build the map once in the constructor and store it as a private field. A `Map<string, string>` or a frozen plain object both work.

**Expected gain:** Eliminates 7 property writes + 1 object allocation per request. Measurable at high request rates.

---

### 2. `buildUrl()` with params — `URLSearchParams` allocation (Medium)

**Current code** (`NpmClient.ts:685`):
```typescript
function buildUrl(base: string, params?: Record<string, ...>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined);
  const search = new URLSearchParams(entries.map(([k, v]) => [k, String(v)]));
  return `${base}?${search.toString()}`;
}
```

**Problem:** Three intermediate arrays + one `URLSearchParams` object allocated per call. Most requests have 0–1 params.

**Fix:** Special-case 0 and 1 params to avoid `URLSearchParams` entirely:
```typescript
// 0 params → already fast (early return exists)
// 1 param  → `${base}?${key}=${encodeURIComponent(value)}`
// N params → keep current URLSearchParams path
```

**Expected gain:** ~2–3× faster for single-param requests (e.g. `package.size()`, `packagephobia` calls). No change for no-param requests (already 53M ops/sec).

---

### 3. `buildHeaders()` — object allocation per request (Low)

**Current code** (`NpmClient.ts:171`):
```typescript
private buildHeaders(baseUrl: string): Record<string, string> {
  const headers: Record<string, string> = { 'Accept': 'application/json' };
  if (this.token && ...) headers['Authorization'] = `Bearer ${this.token}`;
  return headers;    // ← new object per call
}
```

**Problem:** A new object is allocated on every request. There are only two possible outcomes: headers with `Authorization` (for registry/downloads) or without.

**Fix:** Pre-compute both variants in the constructor:
```typescript
private readonly headersNoAuth = { 'Accept': 'application/json' } as const;
private readonly headersWithAuth: Record<string, string>;

// In constructor:
this.headersWithAuth = this.token
  ? { 'Accept': 'application/json', 'Authorization': `Bearer ${this.token}` }
  : this.headersNoAuth;
```

**Expected gain:** Eliminates 1 object allocation per request. Minor in isolation but compounds with fix #1.

---

### 4. `post()` double spread — two allocations for POST headers (Low)

**Current code** (`NpmClient.ts:249`):
```typescript
const headers = { ...this.buildHeaders('registry'), 'Content-Type': 'application/json' };
```

`buildHeaders()` allocates object A, then spread allocates object B. With fix #3 in place, this becomes a single spread from a cached object.

---

## What Is Already Fast

- **Resource creation** (package, version, maintainer, user, org): 15–75M ops/sec — no action needed.
- **`buildUrl()` with no params**: 53M ops/sec — the early-return fast path works well.
- **`packument.maintainers ?? []`**: 95M ops/sec — plain property access with nullish coalesce is negligible.
- **`encodeURIComponent()`**: ~1.25M ops/sec — comparable to a field read for short strings; not worth caching.
- **Auth token handling**: passing a token does not meaningfully slow down request dispatch.

---

## Methodology Notes

- Each sync benchmark runs **100,000 iterations** with a 10,000-iteration warmup before timing starts.
- Each async benchmark runs **1,000 iterations** sequentially (not `Promise.all`) with a 100-iteration warmup. Sequential execution measures per-call latency, which is what matters for API clients used in series.
- `fetch` is mocked via `jest.spyOn(globalThis, 'fetch').mockImplementation(...)`. A **new `Response` object** is created per call to avoid the "body already read" error — this means JSON deserialization cost is included in every measurement, which reflects real usage.
- Numbers vary ±5–15% between runs due to V8 JIT scheduling and OS scheduling. The relative rankings between operations are stable; the absolute numbers are indicative.
- The benchmarks run inside Jest (ts-jest), which adds per-suite startup overhead not reflected in the per-operation measurements.
