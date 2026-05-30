import { monitorEventLoopDelay } from 'perf_hooks';
import { NpmClient, buildUrl } from '../src/NpmClient';
import { largePackument, smallPackument, makeMockResponse } from './fixtures';

const ns = (n: number) => (n / 1e6).toFixed(3);

function printHistogram(label: string, h: ReturnType<typeof monitorEventLoopDelay>): void {
  if (h.count === 0) {
    // No samples collected: all operations finished within the 1ms resolution window.
    // This means event loop delay is below measurement threshold — effectively zero.
    console.log(`  ${label}\n    < 1ms (below 1ms resolution — no event loop lag detected)`);
    return;
  }
  console.log(
    `  ${label}\n` +
    `    mean ${ns(h.mean)}ms  |  p50 ${ns(h.percentile(50))}ms  p75 ${ns(h.percentile(75))}ms  p99 ${ns(h.percentile(99))}ms  max ${ns(h.max)}ms`,
  );
}

async function measureSync(
  label: string,
  fn: () => void,
  iterations: number,
): Promise<void> {
  const h = monitorEventLoopDelay({ resolution: 1 });
  h.enable();
  for (let i = 0; i < iterations; i++) fn();
  // yield to let the delay monitor tick before reading
  await new Promise(resolve => setImmediate(resolve));
  h.disable();
  printHistogram(label, h);
}

async function measureAsync(
  label: string,
  fn: () => Promise<unknown>,
  iterations: number,
): Promise<void> {
  const h = monitorEventLoopDelay({ resolution: 1 });
  h.enable();
  for (let i = 0; i < iterations; i++) await fn();
  await new Promise(resolve => setImmediate(resolve));
  h.disable();
  printHistogram(label, h);
}

describe('06 — Event Loop Lag', () => {
  beforeAll(() => {
    jest.setTimeout(120_000);
    console.log('\n06 — Event Loop Lag (lower is better — all times in ms)');
    console.log('  Format: mean | p50  p75  p99  max\n');
  });

  // --- Sync operations that run in a tight loop ---

  it('buildUrl() no params — tight loop 100k', async () => {
    await measureSync(
      'buildUrl(base, undefined)  ×100k',
      () => { buildUrl('https://registry.npmjs.org/react'); },
      100_000,
    );
  });

  it('buildUrl() 1 param — tight loop 100k', async () => {
    await measureSync(
      'buildUrl(base, { p })  ×100k',
      () => { buildUrl('https://packagephobia.com/v2/api.json', { p: 'react' }); },
      100_000,
    );
  });

  it('buildUrl() 4 params — tight loop 100k', async () => {
    await measureSync(
      'buildUrl(base, { text, size, quality, popularity })  ×100k',
      () => {
        buildUrl('https://registry.npmjs.org/-/v1/search', {
          text: 'react state management',
          size: 20,
          quality: 0.5,
          popularity: 1,
        });
      },
      100_000,
    );
  });

  it('Object.values(largePackument.versions) — tight loop 10k', async () => {
    await measureSync(
      'Object.values(largePackument.versions)  ×10k  (100 versions each)',
      () => { Object.values(largePackument.versions); },
      10_000,
    );
  });

  it('new NpmClient() — tight loop 10k', async () => {
    await measureSync(
      'new NpmClient()  ×10k',
      () => { new NpmClient(); },
      10_000,
    );
  });

  it('encodeURIComponent scoped — tight loop 100k', async () => {
    await measureSync(
      'encodeURIComponent("@babel/core")  ×100k',
      () => { encodeURIComponent('@babel/core'); },
      100_000,
    );
  });

  // --- Async operations — each yields between iterations ---

  it('package.get() sequential 500 calls', async () => {
    jest.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(makeMockResponse(smallPackument)),
    );
    const client = new NpmClient();
    const pkg = client.package('react');
    await measureAsync(
      'package.get() sequential  ×500',
      () => pkg.get(),
      500,
    );
    jest.restoreAllMocks();
  });

  it('package.get() batched Promise.all(50) × 10 rounds', async () => {
    jest.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(makeMockResponse(smallPackument)),
    );
    const client = new NpmClient();
    const pkg = client.package('react');
    const h = monitorEventLoopDelay({ resolution: 1 });
    h.enable();
    for (let round = 0; round < 10; round++) {
      await Promise.all(Array.from({ length: 50 }, () => pkg.get()));
    }
    await new Promise(resolve => setImmediate(resolve));
    h.disable();
    printHistogram('package.get() Promise.all(50) × 10 rounds  (500 total)', h);
    jest.restoreAllMocks();
  });
});
