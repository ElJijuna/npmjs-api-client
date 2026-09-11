import { NpmClient } from '../src/NpmClient';
import { runBenchAsync } from './helpers';
import { smallPackument, makeMockResponse } from './fixtures';

const ITERATIONS = 1_000;

describe('03 — Request Pipeline (mocked fetch)', () => {
  beforeAll(() => {
    jest.setTimeout(60_000);
    console.log('\n03 — Request Pipeline (mocked fetch)');
  });

  beforeEach(() => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => Promise.resolve(makeMockResponse(smallPackument)));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('package.get() — GET to registry', async () => {
    const client = new NpmClient();
    const pkg = client.package('react');
    await runBenchAsync('package.get()', () => pkg.get(), ITERATIONS);
  });

  it('package.downloads() — GET to downloads API (different base URL)', async () => {
    const client = new NpmClient();
    const pkg = client.package('react');
    await runBenchAsync(
      'package.downloads("last-week")',
      () => pkg.downloads('last-week'),
      ITERATIONS,
    );
  });

  it('package.score() — GET to registry search, aggregate score lookup', async () => {
    jest.restoreAllMocks();
    jest.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        makeMockResponse({
          objects: [
            {
              package: { name: 'react', scope: 'unscoped', version: '18.2.0' },
              score: {
                final: 0.97,
                detail: { quality: 0.95, popularity: 0.99, maintenance: 0.98 },
              },
              searchScore: 100000,
            },
          ],
          total: 1,
          time: '2024-01-01T00:00:00.000Z',
        }),
      ),
    );
    const client = new NpmClient();
    const pkg = client.package('react');
    await runBenchAsync('package.score()', () => pkg.score(), ITERATIONS);
  });

  it('package.size() — GET with query params (?p=name)', async () => {
    const client = new NpmClient();
    const pkg = client.package('react');
    await runBenchAsync('package.size()', () => pkg.size(), ITERATIONS);
  });

  it('package.distTags() — GET dist-tags endpoint', async () => {
    const client = new NpmClient();
    const pkg = client.package('react');
    await runBenchAsync('package.distTags()', () => pkg.distTags(), ITERATIONS);
  });

  it('search() — GET with search params + input validation', async () => {
    const client = new NpmClient();
    await runBenchAsync(
      'client.search({ text: "react" })',
      // Benchmark promise chaining overhead explicitly.
      // eslint-disable-next-line no-restricted-syntax
      () => client.search({ text: 'react', size: 20 }).then(() => {}),
      ITERATIONS,
    );
  });

  it('bulkDownloads() — encode + join of package names', async () => {
    const client = new NpmClient();
    const pkgs = ['react', 'vue', 'angular', '@angular/core', 'svelte'];
    await runBenchAsync(
      'client.bulkDownloads([5 packages])',
      // Benchmark promise chaining overhead explicitly.
      // eslint-disable-next-line no-restricted-syntax
      () => client.bulkDownloads(pkgs).then(() => {}),
      ITERATIONS,
    );
  });

  it('package.get() — with auth token (header includes Authorization)', async () => {
    const client = new NpmClient({ token: 'npm_test_token_abcdef1234567890' });
    const pkg = client.package('react');
    await runBenchAsync('package.get() with token', () => pkg.get(), ITERATIONS);
  });

  it('package.get() — error path (non-2xx response)', async () => {
    jest.restoreAllMocks();
    jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() =>
        Promise.resolve(new Response('Not Found', { status: 404, statusText: 'Not Found' })),
      );
    const client = new NpmClient();
    const pkg = client.package('nonexistent-pkg-xyz');
    await runBenchAsync(
      'package.get() — 404 error path',
      async () => {
        try {
          await pkg.get();
        } catch {
          /* expected */
        }
      },
      ITERATIONS,
    );
  });
});
