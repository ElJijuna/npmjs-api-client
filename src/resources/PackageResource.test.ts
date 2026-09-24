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
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: jest.fn(),
      });
      await expect(npm.package('nonexistent-xyz-pkg').get()).rejects.toThrow(NpmApiError);
    });

    it('throws NpmApiError with correct status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: jest.fn(),
      });
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

    it('fetches downloads for a specific version', async () => {
      mockResponse({
        package: 'react',
        downloads: {
          '18.2.0': 12345,
          '19.0.0': 67890,
        },
      });
      const result = await npm.package('react').version('18.2.0').downloads('last-week');
      expect(result).toEqual({
        downloads: 12345,
        package: 'react',
        version: '18.2.0',
        period: 'last-week',
      });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.npmjs.org/versions/react/last-week',
        expect.any(Object),
      );
    });

    it('defaults version downloads to last-week', async () => {
      mockResponse({ package: 'react', downloads: { '18.2.0': 12345 } });
      const result = await npm.package('react').version('18.2.0').downloads();
      expect(result.downloads).toBe(12345);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.npmjs.org/versions/react/last-week',
        expect.any(Object),
      );
    });

    it('returns zero when the version has no download entry', async () => {
      mockResponse({ package: 'react', downloads: { '19.0.0': 67890 } });
      const result = await npm.package('react').version('18.2.0').downloads();
      expect(result.downloads).toBe(0);
    });

    it('throws when version downloads use a period other than last-week', async () => {
      await expect(
        npm
          .package('react')
          .version('18.2.0')
          .downloads('last-month' as 'last-week'),
      ).rejects.toThrow(RangeError);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('encodes scoped package name in version downloads URL', async () => {
      mockResponse({ package: '@types/node', downloads: { '20.0.0': 100 } });
      await npm.package('@types/node').version('20.0.0').downloads();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.npmjs.org/versions/%40types%2Fnode/last-week',
        expect.any(Object),
      );
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
      mockResponse({
        downloads: 5000000,
        start: '2024-03-14',
        end: '2024-04-13',
        package: 'react',
      });
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
      mockResponse({
        downloads: 100,
        start: '2024-01-01',
        end: '2024-01-31',
        package: '@types/node',
      });
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
      expect(result.map((v) => v.version)).toEqual(['4.17.20', '4.17.21']);
    });

    it('sorts versions by publication time, not by registry key order', async () => {
      const manifest = (version: string) => ({
        name: 'express',
        version,
        dist: { tarball: '', shasum: '' },
      });
      mockResponse({
        name: 'express',
        'dist-tags': { latest: '5.0.0' },
        // A 4.x backport published after 5.0.0, listed out of order.
        versions: {
          '4.21.1': manifest('4.21.1'),
          '5.0.0': manifest('5.0.0'),
          '4.21.0': manifest('4.21.0'),
        },
        time: {
          created: '2010-01-01T00:00:00.000Z',
          '4.21.0': '2024-09-11T00:00:00.000Z',
          '5.0.0': '2024-09-10T00:00:00.000Z',
          '4.21.1': '2024-10-08T00:00:00.000Z',
        },
      });
      const result = await npm.package('express').versions();
      expect(result.map((v) => v.version)).toEqual(['5.0.0', '4.21.0', '4.21.1']);
    });

    it('places versions without a publication time last, in registry order', async () => {
      const manifest = (version: string) => ({
        name: 'pkg',
        version,
        dist: { tarball: '', shasum: '' },
      });
      mockResponse({
        name: 'pkg',
        'dist-tags': {},
        versions: {
          '3.0.0': manifest('3.0.0'),
          '1.0.0': manifest('1.0.0'),
          '2.0.0': manifest('2.0.0'),
          '0.1.0': manifest('0.1.0'),
        },
        time: { '2.0.0': '2024-02-01T00:00:00.000Z', '1.0.0': '2024-01-01T00:00:00.000Z' },
      });
      const result = await npm.package('pkg').versions();
      expect(result.map((v) => v.version)).toEqual(['1.0.0', '2.0.0', '3.0.0', '0.1.0']);
    });

    it('keeps registry order when the packument has no time map', async () => {
      mockResponse({
        name: 'pkg',
        'dist-tags': {},
        versions: {
          '2.0.0': { name: 'pkg', version: '2.0.0', dist: { tarball: '', shasum: '' } },
          '1.0.0': { name: 'pkg', version: '1.0.0', dist: { tarball: '', shasum: '' } },
        },
      });
      const result = await npm.package('pkg').versions();
      expect(result.map((v) => v.version)).toEqual(['2.0.0', '1.0.0']);
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

    it('passes signal to fetch on version().downloads()', async () => {
      mockResponse({ package: 'react', downloads: { '18.2.0': 1000 } });
      const controller = new AbortController();
      await npm.package('react').version('18.2.0').downloads('last-week', controller.signal);
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

  describe('score()', () => {
    function searchFixture(name: string) {
      return {
        objects: [
          {
            package: {
              name,
              scope: 'unscoped',
              version: '1.0.0',
              date: '2024-01-01T00:00:00.000Z',
            },
            // npm now returns search relevance as `final` and 1 for every detail metric.
            score: { final: 2467.3, detail: { quality: 1, popularity: 1, maintenance: 1 } },
            searchScore: 100000,
          },
        ],
        total: 1,
        time: '2024-01-01T00:00:00.000Z',
      };
    }

    it('fetches the aggregate score from registry search', async () => {
      mockResponse(searchFixture('react'));
      const result = await npm.package('react').score();
      expect(result.score.final).toBe(2467.3);
      expect(result.score.detail).toEqual({ quality: 1, popularity: 1, maintenance: 1 });
      expect(result.analyzedAt).toBe('2024-01-01T00:00:00.000Z');
    });

    it('calls the registry search endpoint with the package name and size=1', async () => {
      mockResponse(searchFixture('react'));
      await npm.package('react').score();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://registry.npmjs.org/-/v1/search?text=react&size=1',
        expect.any(Object),
      );
    });

    it('encodes scoped package name in the search query', async () => {
      mockResponse(searchFixture('@types/node'));
      await npm.package('@types/node').score();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://registry.npmjs.org/-/v1/search?text=%40types%2Fnode&size=1',
        expect.any(Object),
      );
    });

    it('throws NpmApiError when the package has no search results', async () => {
      mockResponse({ objects: [], total: 0, time: '2024-01-01T00:00:00.000Z' });
      await expect(npm.package('nonexistent-pkg-xyz').score()).rejects.toThrow(NpmApiError);
    });

    it('throws a 404 instead of returning a different package when there is no exact match', async () => {
      // Deprecated packages such as `lodash.get` are excluded from search,
      // which then returns a fuzzy match like `@types/lodash.get`.
      mockResponse(searchFixture('@types/lodash.get'));
      await expect(npm.package('lodash.get').score()).rejects.toMatchObject({
        name: 'NpmApiError',
        status: 404,
      });
    });

    it('sends the Authorization header when a token is configured', async () => {
      const authedNpm = new NpmClient({ token: 'secret' });
      mockResponse(searchFixture('react'));
      await authedNpm.package('react').score();
      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer secret');
    });

    it('passes signal to fetch', async () => {
      mockResponse(searchFixture('react'));
      const controller = new AbortController();
      await npm.package('react').score(controller.signal);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });
  });

  describe('size()', () => {
    const sizeFixture = {
      publish: { bytes: 12400, files: 10, pretty: '12.4 kB', color: 'green' },
      install: { bytes: 307200, files: 35, pretty: '307 kB', color: 'green' },
    };

    it('fetches the packagephobia size for the latest version', async () => {
      mockResponse(sizeFixture);
      const result = await npm.package('react').size();
      expect(result.install.bytes).toBe(307200);
      expect(result.publish.pretty).toBe('12.4 kB');
    });

    it('calls packagephobia with the package name as query param', async () => {
      mockResponse(sizeFixture);
      await npm.package('react').size();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://packagephobia.com/v2/api.json?p=react',
        expect.any(Object),
      );
    });

    it('does not send Authorization header to packagephobia', async () => {
      const authedNpm = new NpmClient({ token: 'secret' });
      mockResponse(sizeFixture);
      await authedNpm.package('react').size();
      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect((init.headers as Record<string, string>)['Authorization']).toBeUndefined();
    });

    it('passes signal to fetch', async () => {
      mockResponse(sizeFixture);
      const controller = new AbortController();
      await npm.package('react').size(controller.signal);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });
  });

  describe('cdnStats()', () => {
    const statsFixture = {
      rank: 1,
      total: 1234567890,
      versions: {
        '18.2.0': { total: 900000000, dates: { '2024-01-01': 30000000 } },
      },
    };

    it('fetches CDN stats with defaults (version groupBy, month period)', async () => {
      mockResponse(statsFixture);
      const result = await npm.package('react').cdnStats();
      expect(result.rank).toBe(1);
      expect(result.total).toBe(1234567890);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://data.jsdelivr.com/v1/package/npm/react/stats/version/month',
        expect.any(Object),
      );
    });

    it('respects custom groupBy and period', async () => {
      mockResponse(statsFixture);
      await npm.package('react').cdnStats('date', 'week');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://data.jsdelivr.com/v1/package/npm/react/stats/date/week',
        expect.any(Object),
      );
    });

    it('encodes scoped package name in CDN stats URL', async () => {
      mockResponse(statsFixture);
      await npm.package('@types/node').cdnStats();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://data.jsdelivr.com/v1/package/npm/%40types%2Fnode/stats/version/month',
        expect.any(Object),
      );
    });

    it('passes signal to fetch', async () => {
      mockResponse(statsFixture);
      const controller = new AbortController();
      await npm.package('react').cdnStats('version', 'month', controller.signal);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });
  });
});
