import { NpmClient } from '../index';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockResponse<T>(data: T, status = 200): void {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : status === 404 ? 'Not Found' : 'Error',
    json: () => Promise.resolve(data),
  });
}

describe('VersionResource — new methods', () => {
  let npm: NpmClient;

  beforeEach(() => {
    mockFetch.mockClear();
    npm = new NpmClient();
  });

  describe('size()', () => {
    const sizeFixture = {
      publish: { bytes: 12400, files: 10, pretty: '12.4 kB', color: 'green' },
      install: { bytes: 307200, files: 35, pretty: '307 kB', color: 'green' },
    };

    it('fetches the packagephobia size for a specific version', async () => {
      mockResponse(sizeFixture);
      const result = await npm.package('react').version('18.2.0').size();
      expect(result.install.bytes).toBe(307200);
      expect(result.publish.pretty).toBe('12.4 kB');
    });

    it('calls packagephobia with name@version as query param', async () => {
      mockResponse(sizeFixture);
      await npm.package('react').version('18.2.0').size();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://packagephobia.com/v2/api.json?p=react%4018.2.0',
        expect.any(Object),
      );
    });

    it('does not send Authorization header to packagephobia', async () => {
      const authedNpm = new NpmClient({ token: 'secret' });
      mockResponse(sizeFixture);
      await authedNpm.package('react').version('18.2.0').size();
      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect((init.headers as Record<string, string>)['Authorization']).toBeUndefined();
    });

    it('passes signal to fetch', async () => {
      mockResponse(sizeFixture);
      const controller = new AbortController();
      await npm.package('react').version('18.2.0').size(controller.signal);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });
  });

  describe('files()', () => {
    const filesFixture = {
      path: '/',
      type: 'directory',
      files: [
        { path: '/index.js', type: 'file', size: 1234, mode: 33188 },
        { path: '/package.json', type: 'file', size: 890, mode: 33188 },
      ],
    };

    it('fetches the unpkg file tree for a specific version', async () => {
      mockResponse(filesFixture);
      const result = await npm.package('react').version('18.2.0').files();
      expect(result.type).toBe('directory');
      expect(result.files).toHaveLength(2);
      expect(result.files?.[0].path).toBe('/index.js');
    });

    it('calls unpkg with ?meta flag', async () => {
      mockResponse(filesFixture);
      await npm.package('react').version('18.2.0').files();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://unpkg.com/react@18.2.0/?meta=',
        expect.any(Object),
      );
    });

    it('encodes scoped package name in unpkg URL', async () => {
      mockResponse(filesFixture);
      await npm.package('@types/node').version('20.0.0').files();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://unpkg.com/%40types%2Fnode@20.0.0/?meta=',
        expect.any(Object),
      );
    });

    it('does not send Authorization header to unpkg', async () => {
      const authedNpm = new NpmClient({ token: 'secret' });
      mockResponse(filesFixture);
      await authedNpm.package('react').version('18.2.0').files();
      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect((init.headers as Record<string, string>)['Authorization']).toBeUndefined();
    });

    it('passes signal to fetch', async () => {
      mockResponse(filesFixture);
      const controller = new AbortController();
      await npm.package('react').version('18.2.0').files(controller.signal);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });
  });

  describe('cdnStats()', () => {
    const statsFixture = {
      total: 900000000,
      files: {
        'index.js': { total: 800000000, dates: { '2024-01-01': 26000000 } },
        'cjs/react.production.min.js': { total: 100000000, dates: { '2024-01-01': 3000000 } },
      },
    };

    it('fetches CDN stats with defaults (file groupBy, month period)', async () => {
      mockResponse(statsFixture);
      const result = await npm.package('react').version('18.2.0').cdnStats();
      expect(result.total).toBe(900000000);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://data.jsdelivr.com/v1/package/npm/react@18.2.0/stats/file/month',
        expect.any(Object),
      );
    });

    it('respects custom groupBy and period', async () => {
      mockResponse(statsFixture);
      await npm.package('react').version('18.2.0').cdnStats('date', 'week');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://data.jsdelivr.com/v1/package/npm/react@18.2.0/stats/date/week',
        expect.any(Object),
      );
    });

    it('encodes scoped package name in CDN stats URL', async () => {
      mockResponse(statsFixture);
      await npm.package('@types/node').version('20.0.0').cdnStats();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://data.jsdelivr.com/v1/package/npm/%40types%2Fnode@20.0.0/stats/file/month',
        expect.any(Object),
      );
    });

    it('passes signal to fetch', async () => {
      mockResponse(statsFixture);
      const controller = new AbortController();
      await npm.package('react').version('18.2.0').cdnStats('file', 'month', controller.signal);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });
  });

  describe('dependencies()', () => {
    const depsFixture = {
      nodes: [
        { versionKey: { system: 'NPM', name: 'react', version: '18.2.0' }, bundled: false, relation: 'SELF', errors: [] },
        { versionKey: { system: 'NPM', name: 'loose-envify', version: '1.4.0' }, bundled: false, relation: 'DIRECT', errors: [] },
        { versionKey: { system: 'NPM', name: 'js-tokens', version: '4.0.0' }, bundled: false, relation: 'INDIRECT', errors: [] },
      ],
      edges: [
        { fromNode: 0, toNode: 1, requirement: '^1.1.0' },
        { fromNode: 1, toNode: 2, requirement: '^3.0.0 || ^4.0.0' },
      ],
    };

    it('fetches the resolved dependency graph', async () => {
      mockResponse(depsFixture);
      const result = await npm.package('react').version('18.2.0').dependencies();
      expect(result.nodes).toHaveLength(3);
      expect(result.edges).toHaveLength(2);
      const direct = result.nodes.filter(n => n.relation === 'DIRECT');
      expect(direct[0].versionKey.name).toBe('loose-envify');
      expect(direct[0].versionKey.version).toBe('1.4.0');
    });

    it('calls the deps.dev API endpoint', async () => {
      mockResponse(depsFixture);
      await npm.package('react').version('18.2.0').dependencies();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.deps.dev/v3/systems/npm/packages/react/versions/18.2.0:dependencies',
        expect.any(Object),
      );
    });

    it('encodes scoped package name in deps.dev URL', async () => {
      mockResponse(depsFixture);
      await npm.package('@types/node').version('20.0.0').dependencies();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.deps.dev/v3/systems/npm/packages/%40types%2Fnode/versions/20.0.0:dependencies',
        expect.any(Object),
      );
    });

    it('does not send Authorization header to deps.dev', async () => {
      const authedNpm = new NpmClient({ token: 'secret' });
      mockResponse(depsFixture);
      await authedNpm.package('react').version('18.2.0').dependencies();
      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect((init.headers as Record<string, string>)['Authorization']).toBeUndefined();
    });

    it('passes signal to fetch', async () => {
      mockResponse(depsFixture);
      const controller = new AbortController();
      await npm.package('react').version('18.2.0').dependencies(controller.signal);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });
  });
});
