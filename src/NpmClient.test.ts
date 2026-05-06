import { NpmClient, NpmApiError } from './index';
import type { NpmPackument } from './index';

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
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404, statusText: 'Not Found', json: jest.fn() });
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
      await expect(npm.search({ text: 'react' }, controller.signal)).rejects.toThrow('The operation was aborted.');
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
          findings: [{ version: '4.17.11', paths: ['lodash'], dev: false, optional: false, bundled: false }],
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
      npm.on('request', e => events.push(e));
      await npm.audit(payload);
      const event = events[0] as { method: string; url: string };
      expect(event.method).toBe('POST');
      expect(event.url).toContain('/security/audits');
    });

    it('throws NpmApiError on non-2xx response', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 400, statusText: 'Bad Request', json: jest.fn() });
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
