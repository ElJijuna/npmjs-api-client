import { NpmClient, NpmApiError } from '../index';
import { VersionResource } from './VersionResource';

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

describe('PackageResource', () => {
  let npm: NpmClient;

  beforeEach(() => {
    mockFetch.mockClear();
    npm = new NpmClient();
  });

  describe('get()', () => {
    it('fetches the full packument', async () => {
      const packument = {
        name: 'lodash',
        description: 'Lodash modular utilities.',
        'dist-tags': { latest: '4.17.21' },
        versions: {},
        time: { created: '2012-04-07T00:00:00.000Z' },
      };
      mockResponse(packument);
      const result = await npm.package('lodash').get();
      expect(result.name).toBe('lodash');
      expect(result['dist-tags'].latest).toBe('4.17.21');
    });

    it('throws NpmApiError on 404', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404, statusText: 'Not Found', json: jest.fn() });
      await expect(npm.package('nonexistent-xyz-pkg').get()).rejects.toThrow(NpmApiError);
    });

    it('throws NpmApiError with correct status', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404, statusText: 'Not Found', json: jest.fn() });
      try {
        await npm.package('nonexistent-xyz-pkg').get();
      } catch (err) {
        expect(err).toBeInstanceOf(NpmApiError);
        expect((err as NpmApiError).status).toBe(404);
        expect((err as NpmApiError).statusText).toBe('Not Found');
      }
    });
  });

  describe('version()', () => {
    it('returns a VersionResource', () => {
      const vr = npm.package('react').version('18.2.0');
      expect(vr).toBeInstanceOf(VersionResource);
    });

    it('fetches the version manifest', async () => {
      const manifest = {
        name: 'react',
        version: '18.2.0',
        dist: { tarball: 'https://registry.npmjs.org/react/-/react-18.2.0.tgz', shasum: 'abc123' },
      };
      mockResponse(manifest);
      const result = await npm.package('react').version('18.2.0').get();
      expect(result.version).toBe('18.2.0');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://registry.npmjs.org/react/18.2.0',
        expect.any(Object),
      );
    });

    it('can be awaited directly', async () => {
      const manifest = {
        name: 'react',
        version: '18.2.0',
        dist: { tarball: '', shasum: '' },
      };
      mockResponse(manifest);
      const result = await npm.package('react').version('18.2.0');
      expect(result.name).toBe('react');
    });
  });

  describe('latest()', () => {
    it('returns a VersionResource for the latest dist-tag', async () => {
      const manifest = {
        name: 'react',
        version: '18.2.0',
        dist: { tarball: '', shasum: '' },
      };
      mockResponse(manifest);
      await npm.package('react').latest().get();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://registry.npmjs.org/react/latest',
        expect.any(Object),
      );
    });
  });

  describe('distTags()', () => {
    it('fetches dist-tags', async () => {
      mockResponse({ latest: '18.2.0', next: '19.0.0-beta.1' });
      const tags = await npm.package('react').distTags();
      expect(tags.latest).toBe('18.2.0');
      expect(tags.next).toBe('19.0.0-beta.1');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://registry.npmjs.org/-/package/react/dist-tags',
        expect.any(Object),
      );
    });
  });

  describe('downloads()', () => {
    it('fetches download point with default period', async () => {
      mockResponse({ downloads: 5000000, start: '2024-03-14', end: '2024-04-13', package: 'react' });
      const result = await npm.package('react').downloads();
      expect(result.downloads).toBe(5000000);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.npmjs.org/downloads/point/last-month/react',
        expect.any(Object),
      );
    });

    it('fetches download point with custom period', async () => {
      mockResponse({ downloads: 1000, start: '2024-01-01', end: '2024-01-07', package: 'react' });
      await npm.package('react').downloads('last-week');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.npmjs.org/downloads/point/last-week/react',
        expect.any(Object),
      );
    });

    it('encodes scoped package name in download URL', async () => {
      mockResponse({ downloads: 100, start: '2024-01-01', end: '2024-01-31', package: '@types/node' });
      await npm.package('@types/node').downloads();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.npmjs.org/downloads/point/last-month/%40types%2Fnode',
        expect.any(Object),
      );
    });
  });

  describe('downloadRange()', () => {
    it('fetches per-day download breakdown', async () => {
      mockResponse({
        downloads: [
          { downloads: 100, day: '2024-01-01' },
          { downloads: 120, day: '2024-01-02' },
        ],
        start: '2024-01-01',
        end: '2024-01-02',
        package: 'react',
      });
      const result = await npm.package('react').downloadRange('2024-01-01:2024-01-02');
      expect(result.downloads).toHaveLength(2);
      expect(result.downloads[0].day).toBe('2024-01-01');
    });
  });

  describe('versions()', () => {
    it('returns all versions as an array', async () => {
      const packument = {
        name: 'lodash',
        'dist-tags': { latest: '4.17.21' },
        versions: {
          '4.17.20': { name: 'lodash', version: '4.17.20', dist: { tarball: '', shasum: '' } },
          '4.17.21': { name: 'lodash', version: '4.17.21', dist: { tarball: '', shasum: '' } },
        },
        time: {},
      };
      mockResponse(packument);
      const result = await npm.package('lodash').versions();
      expect(result).toHaveLength(2);
      expect(result.map(v => v.version)).toEqual(['4.17.20', '4.17.21']);
    });

    it('returns empty array when no versions', async () => {
      mockResponse({ name: 'empty-pkg', 'dist-tags': {}, versions: {}, time: {} });
      const result = await npm.package('empty-pkg').versions();
      expect(result).toEqual([]);
    });
  });

  describe('maintainers()', () => {
    it('returns the maintainers array', async () => {
      const packument = {
        name: 'lodash',
        'dist-tags': {},
        versions: {},
        time: {},
        maintainers: [
          { name: 'jdalton', email: 'john@example.com' },
          { name: 'mathias', email: 'mathias@example.com' },
        ],
      };
      mockResponse(packument);
      const result = await npm.package('lodash').maintainers();
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('jdalton');
      expect(result[1].email).toBe('mathias@example.com');
    });

    it('returns empty array when maintainers field is absent', async () => {
      mockResponse({ name: 'no-maintainers', 'dist-tags': {}, versions: {}, time: {} });
      const result = await npm.package('no-maintainers').maintainers();
      expect(result).toEqual([]);
    });
  });

  describe('AbortSignal', () => {
    it('passes signal to fetch on get()', async () => {
      mockResponse({ name: 'react', 'dist-tags': {}, versions: {}, time: {} });
      const controller = new AbortController();
      await npm.package('react').get(controller.signal);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });

    it('passes signal to fetch on distTags()', async () => {
      mockResponse({ latest: '18.2.0' });
      const controller = new AbortController();
      await npm.package('react').distTags(controller.signal);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });

    it('passes signal to fetch on downloads()', async () => {
      mockResponse({ downloads: 1000, start: '2024-01-01', end: '2024-01-31', package: 'react' });
      const controller = new AbortController();
      await npm.package('react').downloads('last-week', controller.signal);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });

    it('passes signal to fetch on downloadRange()', async () => {
      mockResponse({ downloads: [], start: '2024-01-01', end: '2024-01-31', package: 'react' });
      const controller = new AbortController();
      await npm.package('react').downloadRange('last-month', controller.signal);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });

    it('passes signal to fetch on version().get()', async () => {
      mockResponse({ name: 'react', version: '18.2.0', dist: { tarball: '', shasum: '' } });
      const controller = new AbortController();
      await npm.package('react').version('18.2.0').get(controller.signal);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });
  });

  describe('PromiseLike behaviour', () => {
    it('PackageResource is a thenable', () => {
      const pkg = npm.package('react');
      expect(typeof pkg.then).toBe('function');
    });

    it('PackageResource.then delegates to get()', async () => {
      const packument = { name: 'react', 'dist-tags': {}, versions: {}, time: {} };
      mockResponse(packument);
      const result = await npm.package('react');
      expect(result.name).toBe('react');
    });
  });
});
