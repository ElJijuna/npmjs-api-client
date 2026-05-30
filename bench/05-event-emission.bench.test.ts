import { NpmClient } from '../src/NpmClient';
import { runBenchAsync } from './helpers';
import { smallPackument, makeMockResponse } from './fixtures';

const ITERATIONS = 1_000;

describe('05 — Event Emission', () => {
  beforeAll(() => {
    jest.setTimeout(60_000);
    console.log('\n05 — Event Emission');
  });

  beforeEach(() => {
    jest.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(makeMockResponse(smallPackument)),
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('0 listeners — baseline request overhead', async () => {
    const client = new NpmClient();
    const pkg = client.package('react');
    await runBenchAsync('package.get() — 0 listeners', () => pkg.get(), ITERATIONS);
  });

  it('1 listener — typical logging use case', async () => {
    const client = new NpmClient();
    client.on('request', () => {});
    const pkg = client.package('react');
    await runBenchAsync('package.get() — 1 listener', () => pkg.get(), ITERATIONS);
  });

  it('3 listeners — multiple subscribers', async () => {
    const client = new NpmClient();
    client.on('request', () => {});
    client.on('request', () => {});
    client.on('request', () => {});
    const pkg = client.package('react');
    await runBenchAsync('package.get() — 3 listeners', () => pkg.get(), ITERATIONS);
  });

  it('5 listeners — heavy subscriber load', async () => {
    const client = new NpmClient();
    for (let i = 0; i < 5; i++) client.on('request', () => {});
    const pkg = client.package('react');
    await runBenchAsync('package.get() — 5 listeners', () => pkg.get(), ITERATIONS);
  });
});
