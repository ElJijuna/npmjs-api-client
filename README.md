# npmjs-api-client

[![CI](https://github.com/ElJijuna/npmjs-api-client/actions/workflows/ci.yml/badge.svg)](https://github.com/ElJijuna/npmjs-api-client/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/npmjs-api-client)](https://www.npmjs.com/package/npmjs-api-client)
[![npm downloads/week](https://img.shields.io/npm/dw/npmjs-api-client)](https://www.npmjs.com/package/npmjs-api-client)
[![npm downloads/month](https://img.shields.io/npm/dm/npmjs-api-client)](https://www.npmjs.com/package/npmjs-api-client)
[![Bundle size](https://img.shields.io/bundlephobia/minzip/npmjs-api-client)](https://bundlephobia.com/package/npmjs-api-client)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/node/v/npmjs-api-client)](https://nodejs.org/)

TypeScript client for the [npm Registry REST API](https://github.com/npm/registry/blob/main/docs/REGISTRY-API.md).
Works in **Node.js** and the **browser** (isomorphic). Fully typed, zero runtime dependencies.

---

## Installation

```bash
npm install npmjs-api-client
```

---

## Quick start

```typescript
import { NpmClient } from 'npmjs-api-client';

// Public registry — no auth required for read operations
const npm = new NpmClient();

// Private registry or authenticated requests
const npm = new NpmClient({
  registryUrl: 'https://my-registry.example.com',
  token:       'my-auth-token',
});
```

---

## API reference

### Package metadata

```typescript
// Full packument — all versions, dist-tags, maintainers, etc.
const pkg = await npm.package('typescript');

// Can also be awaited directly (same as .get())
const pkg = await npm.package('typescript').get();

// All published versions as an ordered array
const versions = await npm.package('typescript').versions();
console.log(versions.map(v => v.version).join(', '));

// Current maintainers
const maintainers = await npm.package('typescript').maintainers();
maintainers.forEach(m => console.log(m.name, m.email));
```

### Version manifest

```typescript
// Specific version
const manifest = await npm.package('typescript').version('5.4.5');

// Latest version (shorthand)
const latest = await npm.package('typescript').latest();

// Can be awaited directly or chained
const manifest = await npm.package('typescript').version('5.4.5').get();

console.log(manifest.version);      // '5.4.5'
console.log(manifest.license);      // 'Apache-2.0'
console.log(manifest.dist.tarball); // tarball URL
```

### Dist-tags

```typescript
const tags = await npm.package('typescript').distTags();
// { latest: '6.0.2', beta: '6.0.0-beta', rc: '6.0.1-rc', next: '...' }
```

### Cancelling requests

Pass an `AbortSignal` to any method to cancel the in-flight request:

```typescript
const controller = new AbortController();

// Cancel after 3 seconds
setTimeout(() => controller.abort(), 3000);

const pkg    = await npm.package('react').get(controller.signal);
const latest = await npm.package('react').latest().get(controller.signal);
const tags   = await npm.package('react').distTags(controller.signal);
const stats  = await npm.package('react').downloads('last-week', controller.signal);
const range  = await npm.package('react').downloadRange('last-month', controller.signal);

const results = await npm.search({ text: 'react' }, controller.signal);

const info  = await npm.maintainer('sindresorhus').info(controller.signal);
const pkgs  = await npm.maintainer('sindresorhus').packages({}, controller.signal);
```

When a request is aborted, `fetch` throws a `DOMException` with `name === 'AbortError'`.
The `request` event is still emitted with the error attached.

---

### Search

```typescript
const results = await npm.search({ text: 'typescript client' });
const results = await npm.search({ text: 'react hooks', size: 10, from: 0 });

// With quality/popularity/maintenance weights (0–1)
const results = await npm.search({
  text:        'logger',
  size:        5,
  quality:     0.5,
  popularity:  0.8,
  maintenance: 0.7,
});

results.objects.forEach(o => {
  console.log(o.package.name, o.package.version, o.score.final);
});
console.log(results.total); // total matches
```

### Download stats

```typescript
// Total downloads for a period
const stats = await npm.package('typescript').downloads();             // last-month (default)
const stats = await npm.package('typescript').downloads('last-day');
const stats = await npm.package('typescript').downloads('last-week');
const stats = await npm.package('typescript').downloads('last-year');
const stats = await npm.package('typescript').downloads('2024-01-01:2024-03-31');

console.log(stats.downloads); // 163781296
console.log(stats.start);     // '2024-01-01'
console.log(stats.end);       // '2024-01-31'

// Per-day breakdown
const range = await npm.package('typescript').downloadRange('last-month');
const range = await npm.package('typescript').downloadRange('2024-01-01:2024-01-31');

range.downloads.forEach(d => console.log(d.day, d.downloads));

// Version downloads (npm only supports last-week for this endpoint)
const versionStats = await npm.package('typescript').version('5.4.5').downloads('last-week');
console.log(versionStats.downloads);

// Convenience methods on the client directly
const stats = await npm.downloads('last-week', 'typescript');
const range = await npm.downloadRange('last-month', 'typescript');
```

---

## Chainable resource pattern

Every resource that maps to a single entity implements `PromiseLike`, so you can **await it directly** or **chain methods**:

```typescript
// Await directly → fetches the packument
const pkg = await npm.package('typescript');

// Chain → fetches the version manifest
const manifest = await npm.package('typescript').version('5.4.5');

// Chain → fetches the latest version
const latest = await npm.package('typescript').latest();
```

---

## Request events

Subscribe to every HTTP request for logging, monitoring, or debugging:

```typescript
npm.on('request', (event) => {
  console.log(`[${event.method}] ${event.url} → ${event.statusCode} (${event.durationMs}ms)`);
  if (event.error) {
    console.error('Request failed:', event.error.message);
  }
});
```

The `event` object contains:

| Field | Type | Description |
|---|---|---|
| `url` | `string` | Full URL that was requested |
| `method` | `'GET'` | HTTP method used |
| `startedAt` | `Date` | When the request started |
| `finishedAt` | `Date` | When the request finished |
| `durationMs` | `number` | Duration in milliseconds |
| `statusCode` | `number \| undefined` | HTTP status code, if a response was received |
| `error` | `Error \| undefined` | Present only if the request failed |

Multiple listeners can be registered. The event is always emitted after the request completes, whether it succeeded or failed.

---

## Error handling

Non-2xx responses throw an `NpmApiError` with the HTTP status code and status text:

```typescript
import { NpmApiError } from 'npmjs-api-client';

try {
  await npm.package('nonexistent-xyz').get();
} catch (err) {
  if (err instanceof NpmApiError) {
    console.log(err.status);     // 404
    console.log(err.statusText); // 'Not Found'
    console.log(err.message);    // 'npm API error: 404 Not Found'
    console.log(err.stack);      // full stack trace
  }
}
```

---

## TypeScript types

All domain types are exported:

```typescript
import type {
  // Client
  NpmClientOptions, RequestEvent, NpmClientEvents,
  // Package
  NpmPackument, NpmPerson, NpmRepository,
  NpmPackageVersion, NpmDist,
  NpmDistTags,
  // Search
  NpmSearchResult, NpmSearchObject, NpmSearchPackage,
  NpmSearchParams, NpmScore, NpmScoreDetail, NpmPackageLinks,
  // Downloads
  NpmDownloadPoint, NpmDownloadRange, NpmDownloadDay, NpmDownloadPeriod,
} from 'npmjs-api-client';
```

---

## Documentation

Full API documentation is published at:
**[https://eljijuna.github.io/npmjs-api-client](https://eljijuna.github.io/npmjs-api-client)**

---

## Contributing

See [CONTRIBUTING.md](.github/CONTRIBUTING.md).

---

## License

[MIT](LICENSE)
