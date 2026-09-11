import { NpmClient, NpmApiError } from './index';
import type { RequestEvent } from './index';

const mockFetch = jest.fn();
const originalFetch = global.fetch;
beforeEach(() => {
  mockFetch.mockReset();
  global.fetch = mockFetch;
});
afterAll(() => {
  global.fetch = originalFetch;
});

const invoke = (client: NpmClient, method: string, signal?: AbortSignal) =>
  method === 'GET'
    ? client.package('react').get(signal)
    : client.audit({ name: 'test', version: '1.0.0', requires: {}, dependencies: {} }, signal);

describe.each(['GET', 'POST'])('%s transport', (method) => {
  it.each([
    'success',
    'http',
    'network',
    'json',
    'abort',
  ])('emits once for %s with failing observers', async (outcome) => {
    const client = new NpmClient();
    const events: RequestEvent[] = [];
    const failure =
      outcome === 'abort' ? new DOMException('Cancelled', 'AbortError') : new Error(outcome);
    const data = { name: 'react' };
    if (outcome === 'network' || outcome === 'abort') mockFetch.mockRejectedValueOnce(failure);
    else
      mockFetch.mockResolvedValueOnce({
        ok: outcome !== 'http',
        status: outcome === 'http' ? 503 : 200,
        statusText: 'Unavailable',
        json: () => (outcome === 'json' ? Promise.reject(failure) : Promise.resolve(data)),
      });
    client.on('request', () => {
      throw new Error('sync observer');
    });
    client.on('request', async () => {
      throw new Error('async observer');
    });
    client.on('request', (event) => {
      events.push(event);
    });
    const { signal } = new AbortController();
    const operation = invoke(client, method, signal);
    if (outcome === 'success') await expect(operation).resolves.toEqual(data);
    else if (outcome === 'http') await expect(operation).rejects.toBeInstanceOf(NpmApiError);
    else await expect(operation).rejects.toBe(failure);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(events).toHaveLength(1);
    const [event] = events;
    expect(event.method).toBe(method);
    expect(mockFetch.mock.calls[0][1].signal).toBe(signal);
    if (outcome === 'success') expect(event.error).toBeUndefined();
    else if (outcome === 'http') expect(event.error).toMatchObject({ status: 503 });
    else if (outcome === 'abort') expect(event.error?.message).toContain('Cancelled');
    else expect(event.error).toBe(failure);
  });

  it('does not wait for asynchronous observers', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) });
    const client = new NpmClient();
    client.on('request', () => new Promise<void>(() => undefined));
    await expect(invoke(client, method)).resolves.toEqual({});
  });
});

it.each([
  true,
  false,
])('routes providers and headers correctly with token=%s', async (authenticated) => {
  mockFetch.mockImplementation(async () => ({ ok: true, status: 200, json: async () => ({}) }));
  const client = new NpmClient({
    token: authenticated ? 'secret' : undefined,
    registryUrl: 'https://registry.example/base/',
    downloadsApiUrl: 'https://downloads.example/base/',
    packagephobiaUrl: 'https://size.example/base/',
    jsdelivrUrl: 'https://cdn.example/base/',
    unpkgUrl: 'https://files.example/base/',
    depsDevUrl: 'https://deps.example/base/',
  });
  await client.package('react').get();
  await client.downloads('last-week', 'react');
  await client.package('react').size();
  await client.package('react').cdnStats();
  await client.package('react').version('1.0.0').files();
  await client.package('react').version('1.0.0').dependencies();
  await invoke(client, 'POST');
  const hosts = ['registry', 'downloads', 'size', 'cdn', 'files', 'deps', 'registry'];
  mockFetch.mock.calls.forEach(([url, init], index) => {
    expect(url).toMatch(new RegExp(`^https://${hosts[index]}\\.example/base/`));
    expect(init.headers.Accept).toBe('application/json');
    expect(init.headers.Authorization).toBe(
      authenticated && [0, 1, 6].includes(index) ? 'Bearer secret' : undefined,
    );
    expect(init.headers['Content-Type']).toBe(index === 6 ? 'application/json' : undefined);
  });
  expect(JSON.parse(mockFetch.mock.calls[6][1].body)).toEqual({
    name: 'test',
    version: '1.0.0',
    requires: {},
    dependencies: {},
  });
});
