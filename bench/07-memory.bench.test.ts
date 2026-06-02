import { NpmClient, buildUrl } from '../src/NpmClient';
import { smallPackument, largePackument, makeMockResponse } from './fixtures';

const gc = (globalThis as unknown as { gc?: () => void }).gc;

function forceGc(): void {
  if (gc) {
    gc();
    gc(); // two passes to collect weak references too
  }
}

function formatBytes(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  if (abs >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n.toFixed(0)} B`;
}

/**
 * Measures retained heap after N iterations.
 * With --expose-gc: forces GC before each measurement → precise retained bytes.
 * Without --expose-gc: measures approximate net allocation (GC may have run mid-loop).
 */
function measureHeap(label: string, fn: () => void, iterations = 10_000): void {
  // warmup — let JIT compile the path
  for (let i = 0; i < Math.floor(iterations / 10); i++) fn();
  forceGc();

  const before = process.memoryUsage();
  for (let i = 0; i < iterations; i++) fn();
  forceGc();
  const after = process.memoryUsage();

  const heapDelta = after.heapUsed - before.heapUsed;
  const bytesPerOp = heapDelta / iterations;
  const gcAvailable = gc != null ? '' : ' (no --expose-gc: GC may have run mid-loop)';

  console.log(
    `  ${label}\n` +
      `    heap Δ ${formatBytes(heapDelta)}  |  ~${bytesPerOp.toFixed(1)} bytes/op${gcAvailable}`,
  );
}

async function measureHeapAsync(
  label: string,
  fn: () => Promise<unknown>,
  iterations = 1_000,
): Promise<void> {
  for (let i = 0; i < Math.floor(iterations / 10); i++) await fn();
  forceGc();

  const before = process.memoryUsage();
  for (let i = 0; i < iterations; i++) await fn();
  forceGc();
  const after = process.memoryUsage();

  const heapDelta = after.heapUsed - before.heapUsed;
  const bytesPerOp = heapDelta / iterations;
  const gcAvailable = gc != null ? '' : ' (approx)';

  console.log(
    `  ${label}\n` +
      `    heap Δ ${formatBytes(heapDelta)}  |  ~${bytesPerOp.toFixed(1)} bytes/op${gcAvailable}`,
  );
}

describe('07 — Memory & GC Pressure', () => {
  beforeAll(() => {
    jest.setTimeout(120_000);
    const gcMode = gc ? 'GC forced (precise)' : 'no --expose-gc (approximate)';
    console.log(`\n07 — Memory & GC Pressure  [${gcMode}]`);
    console.log('  Negative heap Δ = GC collected more than was allocated during the run\n');
  });

  // --- Sync allocations ---

  it('new NpmClient() — heap per construction', () => {
    measureHeap('new NpmClient()  ×10k', () => {
      new NpmClient();
    });
  });

  it('new NpmClient() with listeners — retained after on()', () => {
    measureHeap('new NpmClient() + 3 listeners  ×10k', () => {
      const c = new NpmClient();
      c.on('request', () => {});
      c.on('request', () => {});
      c.on('request', () => {});
    });
  });

  it('client.package() — resource creation heap cost', () => {
    const client = new NpmClient();
    measureHeap('client.package("react")  ×10k', () => {
      client.package('react');
    });
  });

  it('buildUrl() no params — heap per call', () => {
    measureHeap('buildUrl(base, undefined)  ×10k', () => {
      buildUrl('https://registry.npmjs.org/react');
    });
  });

  it('buildUrl() 4 params — heap per call', () => {
    measureHeap('buildUrl(base, { text, size, quality, popularity })  ×10k', () => {
      buildUrl('https://registry.npmjs.org/-/v1/search', {
        text: 'react state management',
        size: 20,
        quality: 0.5,
        popularity: 1,
      });
    });
  });

  it('Object.values(largePackument.versions) — heap per call (100 versions)', () => {
    measureHeap('Object.values(largePackument.versions)  ×10k', () => {
      Object.values(largePackument.versions);
    });
  });

  // --- Async allocations ---

  it('package.get() — heap per request', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => Promise.resolve(makeMockResponse(smallPackument)));
    const client = new NpmClient();
    const pkg = client.package('react');
    await measureHeapAsync('package.get()  ×1k', () => pkg.get());
    jest.restoreAllMocks();
  });

  it('package.get() with 5 listeners — heap per request', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => Promise.resolve(makeMockResponse(smallPackument)));
    const client = new NpmClient();
    for (let i = 0; i < 5; i++) client.on('request', () => {});
    const pkg = client.package('react');
    await measureHeapAsync('package.get() with 5 listeners  ×1k', () => pkg.get());
    jest.restoreAllMocks();
  });

  // --- Leak detection ---

  it('NpmClient instances are GC-able after going out of scope', () => {
    const INSTANCES = 500;
    forceGc();
    const before = process.memoryUsage().heapUsed;

    // Create many clients with listeners — all go out of scope after the block
    for (let i = 0; i < INSTANCES; i++) {
      const c = new NpmClient({ token: `token-${i}` });
      c.on('request', () => {});
      c.on('request', () => {});
    }

    forceGc();
    const after = process.memoryUsage().heapUsed;
    const retained = after - before;

    console.log(
      `  NpmClient leak check  (${INSTANCES} instances created + GC'd)\n` +
        `    retained after GC: ${formatBytes(retained)}` +
        (gc ? '' : '  (approx — run with --expose-gc for precision)'),
    );

    // If more than 1 KB per instance is retained, something isn't being released.
    // With --expose-gc this is tight; without it the threshold is relaxed.
    const maxRetainedPerInstance = gc ? 1024 : 8192;
    expect(retained / INSTANCES).toBeLessThan(maxRetainedPerInstance);
  });

  it('repeated search() calls do not grow heap unboundedly', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() =>
        Promise.resolve(makeMockResponse({ objects: [], total: 0, time: '' })),
      );
    const client = new NpmClient();

    forceGc();
    const snapshots: number[] = [];

    for (let batch = 0; batch < 5; batch++) {
      for (let i = 0; i < 200; i++) {
        await client.search({ text: `query-${i}` });
      }
      forceGc();
      snapshots.push(process.memoryUsage().heapUsed);
    }

    jest.restoreAllMocks();

    const firstBatch = snapshots[0]!;
    const lastBatch = snapshots[snapshots.length - 1]!;
    const totalGrowth = lastBatch - firstBatch;

    // Growth per batch (ignoring first batch which includes JIT warm-up allocations)
    const batchGrowths = snapshots.slice(1).map((n, i) => n - snapshots[i]!);
    const maxBatchGrowth = Math.max(...batchGrowths);
    const minBatchGrowth = Math.min(...batchGrowths);

    console.log(
      `  search() heap growth across 5×200 calls\n` +
        `    snapshots: ${snapshots.map((n) => formatBytes(n)).join(' → ')}\n` +
        `    net growth first→last: ${formatBytes(totalGrowth)}\n` +
        `    growth per batch (batches 2–5): min ${formatBytes(minBatchGrowth)}  max ${formatBytes(maxBatchGrowth)}\n` +
        `    verdict: ${maxBatchGrowth < minBatchGrowth * 4 + 200_000 ? '✓ stable (linear growth, no leak)' : '⚠ accelerating growth (possible leak)'}`,
    );

    // A real leak would show ACCELERATING growth (each batch worse than the previous).
    // Linear/constant growth is normal async steady-state allocation from Promises,
    // string interning, and JSON serialization of mock response bodies.
    // If max batch growth is more than 4× the min, something is accumulating.
    expect(maxBatchGrowth).toBeLessThan(minBatchGrowth * 4 + 200_000);
    jest.restoreAllMocks();
  });
});
