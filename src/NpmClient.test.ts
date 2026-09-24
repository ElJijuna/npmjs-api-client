import { NpmClient, NpmApiError } from './index';
import type { NpmClientOptions, NpmPackument } from './index';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockResponse<T>(data: T, status = 200): void {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Not Found',
    json: () => Promise.resolve(data),
  });
}

describe('NpmClient', () => {
  let npm: NpmClient;

  beforeEach(() => {
    mockFetch.mockClear();
    npm = new NpmClient();
  });

  describe('constructor', () => {
    it('uses default registry and downloads URLs', () => {
      const client = new NpmClient();
      expect(client).toBeInstanceOf(NpmClient);
    });

    it('accepts custom registry URL', () => {
      const client = new NpmClient({ registryUrl: 'https://my-registry.example.com' });
      expect(client).toBeInstanceOf(NpmClient);
    });

    it('strips trailing slash from registryUrl', async () => {
      const client = new NpmClient({ registryUrl: 'https://registry.npmjs.org/' });
      mockResponse({ name: 'react', 'dist-tags': {}, versions: {}, time: {} });
      await client.package('react').get();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://registry.npmjs.org/react',
        expect.any(Object),
      );
    });
  });

  describe('package()', () => {
    it('returns a PackageResource', () => {
      const pkg = npm.package('react');
      expect(pkg).toBeDefined();
      expect(typeof pkg.get).toBe('function');
      expect(typeof pkg.version).toBe('function');
      expect(typeof pkg.distTags).toBe('function');
      expect(typeof pkg.downloads).toBe('function');
    });

    it('can be awaited directly (packument)', async () => {
      const packument: Partial<NpmPackument> = {
        name: 'react',
        'dist-tags': { latest: '18.2.0' },
        versions: {},
        time: {},
      };
      mockResponse(packument);
      const result = await npm.package('react');
      expect(result.name).toBe('react');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://registry.npmjs.org/react',
        expect.any(Object),
      );
    });

    it('encodes scoped package names', async () => {
      mockResponse({ name: '@types/node', 'dist-tags': {}, versions: {}, time: {} });
      await npm.package('@types/node').get();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://registry.npmjs.org/%40types%2Fnode',
        expect.any(Object),
      );
    });
  });

  describe('search()', () => {
    it('calls the search endpoint with query params', async () => {
      mockResponse({ objects: [], total: 0, time: '' });
      const result = await npm.search({ text: 'react', size: 5 });
      expect(result.total).toBe(0);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/-/v1/search?'),
        expect.any(Object),
      );
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('text=react');
      expect(url).toContain('size=5');
    });

    it('rejects empty search text before calling the registry', async () => {
      await expect(npm.search({ text: '', size: 5 })).rejects.toThrow(
        'npm search requires a non-empty text query',
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('top package helpers', () => {
    function expectSearchParams(expected: Record<string, string>): void {
      const url = new URL(mockFetch.mock.calls[0][0] as string);
      expect(`${url.origin}${url.pathname}`).toBe('https://registry.npmjs.org/-/v1/search');
      for (const [key, value] of Object.entries(expected)) {
        expect(url.searchParams.get(key)).toBe(value);
      }
    }

    it('topPackages() uses npm search default ranking', async () => {
      mockResponse({ objects: [], total: 0, time: '' });
      await npm.topPackages(10);
      expectSearchParams({ text: 'keywords:javascript', size: '10' });
    });

    it('topPackages() defaults to 20 results', async () => {
      mockResponse({ objects: [], total: 0, time: '' });
      await npm.topPackages();
      expectSearchParams({ text: 'keywords:javascript', size: '20' });
    });

    it('topPackages() passes signal to fetch', async () => {
      mockResponse({ objects: [], total: 0, time: '' });
      const controller = new AbortController();
      await npm.topPackages(10, controller.signal);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });

    it('topByPopularity() ranks by popularity only', async () => {
      mockResponse({ objects: [], total: 0, time: '' });
      await npm.topByPopularity(5);
      expectSearchParams({
        text: 'keywords:javascript',
        size: '5',
        popularity: '1',
        quality: '0',
        maintenance: '0',
      });
    });

    it('topByQuality() ranks by quality only', async () => {
      mockResponse({ objects: [], total: 0, time: '' });
      await npm.topByQuality(5);
      expectSearchParams({
        text: 'keywords:javascript',
        size: '5',
        quality: '1',
        popularity: '0',
        maintenance: '0',
      });
    });

    it('topByMaintenance() ranks by maintenance only', async () => {
      mockResponse({ objects: [], total: 0, time: '' });
      await npm.topByMaintenance(5);
      expectSearchParams({
        text: 'keywords:javascript',
        size: '5',
        maintenance: '1',
        quality: '0',
        popularity: '0',
      });
    });

    it('topByKeyword() filters by keyword', async () => {
      mockResponse({ objects: [], total: 0, time: '' });
      await npm.topByKeyword('typescript', 7);
      expectSearchParams({ text: 'keywords:typescript', size: '7' });
    });

    it('topByScope() filters by scope and accepts a leading @', async () => {
      mockResponse({ objects: [], total: 0, time: '' });
      await npm.topByScope('@types', 7);
      expectSearchParams({ text: 'scope:types', size: '7' });
    });
  });

  describe('downloads()', () => {
    it('calls the downloads API', async () => {
      mockResponse({ downloads: 1000, start: '2024-01-01', end: '2024-01-31', package: 'react' });
      const result = await npm.downloads('last-month', 'react');
      expect(result.downloads).toBe(1000);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.npmjs.org/downloads/point/last-month/react',
        expect.any(Object),
      );
    });
  });

  describe('downloadRange()', () => {
    it('calls the downloads range API', async () => {
      mockResponse({
        downloads: [{ downloads: 100, day: '2024-01-01' }],
        start: '2024-01-01',
        end: '2024-01-31',
        package: 'react',
      });
      const result = await npm.downloadRange('last-month', 'react');
      expect(result.downloads).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.npmjs.org/downloads/range/last-month/react',
        expect.any(Object),
      );
    });
  });

  describe('on() event emitter', () => {
    it('emits request events on successful requests', async () => {
      mockResponse({ name: 'react', 'dist-tags': {}, versions: {}, time: {} });
      const events: unknown[] = [];
      npm.on('request', (e) => events.push(e));
      await npm.package('react').get();
      expect(events).toHaveLength(1);
      const event = events[0] as { url: string; method: string; statusCode: number };
      expect(event.url).toBe('https://registry.npmjs.org/react');
      expect(event.method).toBe('GET');
      expect(event.statusCode).toBe(200);
    });

    it('emits request events with error on failed requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: jest.fn(),
      });
      const events: unknown[] = [];
      npm.on('request', (e) => events.push(e));
      await expect(npm.package('nonexistent-xyz').get()).rejects.toThrow(NpmApiError);
      expect(events).toHaveLength(1);
      const event = events[0] as { error: Error };
      expect(event.error).toBeInstanceOf(NpmApiError);
    });

    it('supports method chaining', () => {
      const result = npm.on('request', () => undefined);
      expect(result).toBe(npm);
    });
  });

  describe('off()', () => {
    const packument = { name: 'react', 'dist-tags': {}, versions: {}, time: {} };

    it('stops calling a removed listener', async () => {
      const listener = jest.fn();
      npm.on('request', listener);
      mockResponse(packument);
      await npm.package('react').get();
      npm.off('request', listener);
      mockResponse(packument);
      await npm.package('react').get();
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('keeps other listeners registered', async () => {
      const removed = jest.fn();
      const kept = jest.fn();
      npm.on('request', removed).on('request', kept).off('request', removed);
      mockResponse(packument);
      await npm.package('react').get();
      expect(removed).not.toHaveBeenCalled();
      expect(kept).toHaveBeenCalledTimes(1);
    });

    it('removes only one registration of a listener added twice', async () => {
      const listener = jest.fn();
      npm.on('request', listener).on('request', listener).off('request', listener);
      mockResponse(packument);
      await npm.package('react').get();
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('ignores listeners that were never registered', async () => {
      const listener = jest.fn();
      npm.on('request', listener);
      expect(npm.off('request', jest.fn())).toBe(npm);
      expect(new NpmClient().off('request', listener)).toBeInstanceOf(NpmClient);
      mockResponse(packument);
      await npm.package('react').get();
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('does not affect an emission in progress', async () => {
      const second = jest.fn();
      const first = jest.fn(() => {
        npm.off('request', first).off('request', second);
      });
      npm.on('request', first).on('request', second);
      mockResponse(packument);
      await npm.package('react').get();
      mockResponse(packument);
      await npm.package('react').get();
      expect(first).toHaveBeenCalledTimes(1);
      expect(second).toHaveBeenCalledTimes(1);
    });

    it('lets a listener added during an emission run from the next request', async () => {
      const late = jest.fn();
      const once = jest.fn(() => {
        npm.off('request', once).on('request', late);
      });
      npm.on('request', once);
      mockResponse(packument);
      await npm.package('react').get();
      expect(late).not.toHaveBeenCalled();
      mockResponse(packument);
      await npm.package('react').get();
      expect(late).toHaveBeenCalledTimes(1);
    });
  });

  describe('AbortSignal', () => {
    it('passes signal to fetch on search()', async () => {
      mockResponse({ objects: [], total: 0, time: '' });
      const controller = new AbortController();
      await npm.search({ text: 'react' }, controller.signal);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });

    it('passes signal to fetch on downloads()', async () => {
      mockResponse({ downloads: 1000, start: '2024-01-01', end: '2024-01-31', package: 'react' });
      const controller = new AbortController();
      await npm.downloads('last-week', 'react', controller.signal);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });

    it('passes signal to fetch on downloadRange()', async () => {
      mockResponse({ downloads: [], start: '2024-01-01', end: '2024-01-31', package: 'react' });
      const controller = new AbortController();
      await npm.downloadRange('last-month', 'react', controller.signal);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });

    it('propagates AbortError and still emits request event', async () => {
      const abortError = new DOMException('The operation was aborted.', 'AbortError');
      mockFetch.mockRejectedValueOnce(abortError);
      const controller = new AbortController();
      const events: unknown[] = [];
      npm.on('request', (e) => events.push(e));
      await expect(npm.search({ text: 'react' }, controller.signal)).rejects.toThrow(
        'The operation was aborted.',
      );
      expect(events).toHaveLength(1);
      const event = events[0] as { error: Error };
      expect(event.error).toBeInstanceOf(Error);
      expect(event.error.message).toContain('The operation was aborted.');
    });
  });

  describe('authorization header', () => {
    it('does not send Authorization header when no token', async () => {
      mockResponse({ name: 'react', 'dist-tags': {}, versions: {}, time: {} });
      await npm.package('react').get();
      const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>;
      expect(headers['Authorization']).toBeUndefined();
    });

    it('sends Bearer token when provided', async () => {
      const client = new NpmClient({ token: 'my-secret-token' });
      mockResponse({ name: 'react', 'dist-tags': {}, versions: {}, time: {} });
      await client.package('react').get();
      const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>;
      expect(headers['Authorization']).toBe('Bearer my-secret-token');
    });

    async function downloadsAuthorization(options: NpmClientOptions) {
      const client = new NpmClient({ token: 'secret', ...options });
      mockResponse({ downloads: 1, start: '', end: '', package: 'react' });
      await client.downloads('last-week', 'react');
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      const { Authorization: authorization } = init.headers as Record<string, string>;
      return { url, authorization };
    }

    it('does not leak a private registry token to the default downloads API', async () => {
      const { url, authorization } = await downloadsAuthorization({
        registryUrl: 'https://my-registry.example.com',
      });
      expect(url).toMatch(/^https:\/\/api\.npmjs\.org\//);
      expect(authorization).toBeUndefined();
    });

    it('does not send the token to a downloads API on a different origin', async () => {
      const { authorization } = await downloadsAuthorization({
        downloadsApiUrl: 'https://downloads.example.com',
      });
      expect(authorization).toBeUndefined();
    });

    it('sends the token to a downloads API on the same origin as the registry', async () => {
      const { authorization } = await downloadsAuthorization({
        registryUrl: 'https://my-registry.example.com/npm/',
        downloadsApiUrl: 'https://my-registry.example.com/downloads',
      });
      expect(authorization).toBe('Bearer secret');
    });

    it('sends the token when both URLs are npm defaults, even if set explicitly', async () => {
      const { authorization } = await downloadsAuthorization({
        registryUrl: 'https://registry.npmjs.org/',
        downloadsApiUrl: 'https://api.npmjs.org',
      });
      expect(authorization).toBe('Bearer secret');
    });

    it('still sends the token to a private registry', async () => {
      const client = new NpmClient({
        token: 'secret',
        registryUrl: 'https://my-registry.example.com',
      });
      mockResponse({ name: 'react', 'dist-tags': {}, versions: {}, time: {} });
      await client.package('react').get();
      const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>;
      expect(headers['Authorization']).toBe('Bearer secret');
    });

    it('does not send the token to the downloads API when a URL is not parseable', async () => {
      const { authorization } = await downloadsAuthorization({
        registryUrl: 'not a url',
        downloadsApiUrl: 'not a url',
      });
      expect(authorization).toBeUndefined();
    });
  });

  describe('audit()', () => {
    const payload = {
      name: 'my-app',
      version: '1.0.0',
      requires: { lodash: '^4.17.11' },
      dependencies: {
        lodash: { version: '4.17.11', integrity: 'sha512-abc' },
      },
    };

    const auditResultFixture = {
      actions: [
        {
          action: 'update',
          module: 'lodash',
          target: '4.17.21',
          isMajor: false,
          resolves: [{ id: 1067418, path: 'lodash', dev: false, optional: false, bundled: false }],
        },
      ],
      advisories: {
        '1067418': {
          id: 1067418,
          module_name: 'lodash',
          vulnerable_versions: '<4.17.21',
          patched_versions: '>=4.17.21',
          severity: 'high',
          title: 'Prototype Pollution',
          url: 'https://npmjs.com/advisories/1067418',
          recommendation: 'Upgrade to version 4.17.21 or later',
          overview: 'Lodash versions prior to 4.17.21 are vulnerable to prototype pollution.',
          cves: ['CVE-2021-23337'],
          cwe: 'CWE-78',
          findings: [
            { version: '4.17.11', paths: ['lodash'], dev: false, optional: false, bundled: false },
          ],
          created: '2021-01-01T00:00:00.000Z',
          updated: '2021-06-01T00:00:00.000Z',
        },
      },
      muted: [],
      metadata: {
        vulnerabilities: { info: 0, low: 0, moderate: 0, high: 1, critical: 0 },
        dependencies: 1,
        devDependencies: 0,
        optionalDependencies: 0,
        totalDependencies: 1,
      },
    };

    it('POSTs to the full audit endpoint', async () => {
      mockResponse(auditResultFixture);
      await npm.audit(payload);
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://registry.npmjs.org/-/npm/v1/security/audits');
      expect(init.method).toBe('POST');
    });

    it('sends the payload as JSON', async () => {
      mockResponse(auditResultFixture);
      await npm.audit(payload);
      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(init.body).toBe(JSON.stringify(payload));
      expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    });

    it('returns advisories and actions', async () => {
      mockResponse(auditResultFixture);
      const result = await npm.audit(payload);
      expect(result.metadata.vulnerabilities.high).toBe(1);
      expect(result.advisories['1067418'].module_name).toBe('lodash');
      expect(result.actions[0].target).toBe('4.17.21');
    });

    it('sends Authorization header when token provided', async () => {
      const client = new NpmClient({ token: 'secret' });
      mockResponse(auditResultFixture);
      await client.audit(payload);
      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer secret');
    });

    it('emits a request event with method POST', async () => {
      mockResponse(auditResultFixture);
      const events: unknown[] = [];
      npm.on('request', (e) => events.push(e));
      await npm.audit(payload);
      const event = events[0] as { method: string; url: string };
      expect(event.method).toBe('POST');
      expect(event.url).toContain('/security/audits');
    });

    it('throws NpmApiError on non-2xx response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: jest.fn(),
      });
      await expect(npm.audit(payload)).rejects.toThrow(NpmApiError);
    });

    it('passes signal to fetch', async () => {
      mockResponse(auditResultFixture);
      const controller = new AbortController();
      await npm.audit(payload, controller.signal);
      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(init.signal).toBe(controller.signal);
    });
  });

  describe('bulkDownloads()', () => {
    const bulkFixture = {
      react: { downloads: 18591460, start: '2024-03-14', end: '2024-04-13', package: 'react' },
      lodash: { downloads: 3001256, start: '2024-03-14', end: '2024-04-13', package: 'lodash' },
      vue: { downloads: 4200000, start: '2024-03-14', end: '2024-04-13', package: 'vue' },
    };

    it('fetches download counts for multiple packages', async () => {
      mockResponse(bulkFixture);
      const result = await npm.bulkDownloads(['react', 'lodash', 'vue']);
      expect(result['react']?.downloads).toBe(18591460);
      expect(result['lodash']?.downloads).toBe(3001256);
      expect(result['vue']?.downloads).toBe(4200000);
    });

    it('calls the downloads API with comma-separated package names', async () => {
      mockResponse(bulkFixture);
      await npm.bulkDownloads(['react', 'lodash', 'vue']);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.npmjs.org/downloads/point/last-month/react,lodash,vue',
        expect.any(Object),
      );
    });

    it('uses last-month as default period', async () => {
      mockResponse(bulkFixture);
      await npm.bulkDownloads(['react', 'lodash']);
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('/last-month/');
    });

    it('respects a custom period', async () => {
      mockResponse(bulkFixture);
      await npm.bulkDownloads(['react', 'lodash'], 'last-week');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.npmjs.org/downloads/point/last-week/react,lodash',
        expect.any(Object),
      );
    });

    const point = (name: string, downloads = 100) => ({
      downloads,
      start: '2024-03-14',
      end: '2024-04-13',
      package: name,
    });

    function mockDownloadsByUrl(): void {
      mockFetch.mockImplementation(async (url: string) => {
        const names = decodeURIComponent(url.split('/').pop()!).split(',');
        if (names.length === 1) {
          const [name] = names as [string];
          if (name.includes('missing')) {
            return { ok: false, status: 404, statusText: 'Not Found', json: async () => ({}) };
          }
          return { ok: true, status: 200, json: async () => point(name) };
        }
        const map = Object.fromEntries(
          names.map((name) => [name, name.includes('missing') ? null : point(name)]),
        );
        return { ok: true, status: 200, json: async () => map };
      });
    }

    afterEach(() => mockFetch.mockReset());

    it('fetches scoped packages individually, since npm rejects them in bulk', async () => {
      mockDownloadsByUrl();
      const result = await npm.bulkDownloads(['react', '@types/node', 'vue', '@babel/core']);
      const urls = mockFetch.mock.calls.map(([url]) => url as string);
      expect(urls).toEqual([
        'https://api.npmjs.org/downloads/point/last-month/react,vue',
        'https://api.npmjs.org/downloads/point/last-month/%40types%2Fnode',
        'https://api.npmjs.org/downloads/point/last-month/%40babel%2Fcore',
      ]);
      expect(Object.keys(result).sort()).toEqual(['@babel/core', '@types/node', 'react', 'vue']);
      expect(result['@types/node']).toEqual(point('@types/node'));
    });

    it('wraps a single-package response, which npm returns as a plain point', async () => {
      mockDownloadsByUrl();
      const result = await npm.bulkDownloads(['react']);
      expect(result).toEqual({ react: point('react') });
    });

    it('maps missing packages to null, in bulk and individually', async () => {
      mockDownloadsByUrl();
      const result = await npm.bulkDownloads(['react', 'missing-a', '@scope/missing-b']);
      expect(result['missing-a']).toBeNull();
      expect(result['@scope/missing-b']).toBeNull();
      expect(result['react']).toEqual(point('react'));
    });

    it('splits more than 128 unscoped packages into batches of 128', async () => {
      mockDownloadsByUrl();
      const names = Array.from({ length: 300 }, (_, i) => `pkg-${i}`);
      const result = await npm.bulkDownloads(names);
      const sizes = mockFetch.mock.calls.map(
        ([url]) => (url as string).split('/').pop()!.split(',').length,
      );
      expect(sizes).toEqual([128, 128, 44]);
      expect(Object.keys(result)).toHaveLength(300);
    });

    it('ignores duplicate package names', async () => {
      mockDownloadsByUrl();
      await npm.bulkDownloads(['react', 'vue', 'react']);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][0]).toBe(
        'https://api.npmjs.org/downloads/point/last-month/react,vue',
      );
    });

    it('returns an empty map without requests for an empty list', async () => {
      await expect(npm.bulkDownloads([])).resolves.toEqual({});
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('propagates non-404 errors from individual lookups', async () => {
      mockResponse({}, 503);
      await expect(npm.bulkDownloads(['@types/node'])).rejects.toMatchObject({ status: 503 });
    });

    it('sends Authorization header to downloads API when token is provided', async () => {
      const authedNpm = new NpmClient({ token: 'secret' });
      mockResponse(bulkFixture);
      await authedNpm.bulkDownloads(['react', 'lodash']);
      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer secret');
    });

    it('passes signal to fetch', async () => {
      mockResponse(bulkFixture);
      const controller = new AbortController();
      await npm.bulkDownloads(['react', 'lodash'], 'last-month', controller.signal);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });

    it('throws NpmApiError on non-2xx bulk response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: jest.fn(),
      });
      await expect(npm.bulkDownloads(['react', 'vue'])).rejects.toThrow(NpmApiError);
    });
  });

  describe('whoami()', () => {
    it('calls GET /-/whoami on the registry', async () => {
      const client = new NpmClient({ token: 'npm_secret' });
      mockResponse({ username: 'pilmee' });
      const result = await client.whoami();
      expect(result.username).toBe('pilmee');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://registry.npmjs.org/-/whoami',
        expect.any(Object),
      );
    });

    it('sends Authorization header with token', async () => {
      const client = new NpmClient({ token: 'npm_secret' });
      mockResponse({ username: 'pilmee' });
      await client.whoami();
      const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>;
      expect(headers['Authorization']).toBe('Bearer npm_secret');
    });

    it('throws NpmApiError on 401', async () => {
      const client = new NpmClient({ token: 'npm_invalid' });
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: jest.fn(),
      });
      await expect(client.whoami()).rejects.toThrow(NpmApiError);
    });

    it('passes signal to fetch', async () => {
      const client = new NpmClient({ token: 'npm_secret' });
      mockResponse({ username: 'pilmee' });
      const controller = new AbortController();
      await client.whoami(controller.signal);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });
  });

  describe('auditQuick()', () => {
    const payload = {
      name: 'my-app',
      version: '1.0.0',
      requires: { lodash: '^4.17.11' },
      dependencies: {
        lodash: { version: '4.17.11', integrity: 'sha512-abc' },
      },
    };

    const quickResultFixture = {
      wheres: {},
      metadata: {
        vulnerabilities: { info: 0, low: 0, moderate: 0, high: 1, critical: 0 },
        dependencies: 1,
        devDependencies: 0,
        optionalDependencies: 0,
        totalDependencies: 1,
      },
    };

    it('POSTs to the quick audit endpoint', async () => {
      mockResponse(quickResultFixture);
      await npm.auditQuick(payload);
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://registry.npmjs.org/-/npm/v1/security/audits/quick');
      expect(init.method).toBe('POST');
    });

    it('returns vulnerability counts', async () => {
      mockResponse(quickResultFixture);
      const result = await npm.auditQuick(payload);
      expect(result.metadata.vulnerabilities.high).toBe(1);
      expect(result.metadata.totalDependencies).toBe(1);
    });

    it('passes signal to fetch', async () => {
      mockResponse(quickResultFixture);
      const controller = new AbortController();
      await npm.auditQuick(payload, controller.signal);
      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(init.signal).toBe(controller.signal);
    });
  });
});
