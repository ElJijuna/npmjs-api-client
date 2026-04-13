import { NpmClient } from '../src/index';
import { MaintainerResource } from '../src/resources/MaintainerResource';

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

const mockSearchResult = {
  objects: [
    {
      package: {
        name: 'my-pkg',
        scope: 'unscoped',
        version: '1.0.0',
        description: 'A package',
        date: '2024-01-01T00:00:00.000Z',
        links: { npm: 'https://www.npmjs.com/package/my-pkg' },
        author: { name: 'pilmee', email: 'pilmee@example.com' },
        publisher: { username: 'pilmee', email: 'pilmee@example.com' },
        maintainers: [{ username: 'pilmee', email: 'pilmee@example.com' }],
      },
      score: { final: 0.8, detail: { quality: 0.9, popularity: 0.7, maintenance: 0.8 } },
      searchScore: 1.5,
    },
  ],
  total: 1,
  time: '2024-01-01T00:00:00.000Z',
};

describe('MaintainerResource', () => {
  let npm: NpmClient;

  beforeEach(() => {
    mockFetch.mockClear();
    npm = new NpmClient();
  });

  describe('npm.maintainer()', () => {
    it('returns a MaintainerResource', () => {
      const resource = npm.maintainer('pilmee');
      expect(resource).toBeInstanceOf(MaintainerResource);
    });
  });

  describe('packages()', () => {
    it('calls the search endpoint with maintainer query', async () => {
      mockResponse(mockSearchResult);
      await npm.maintainer('pilmee').packages();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/-/v1/search?'),
        expect.any(Object),
      );
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('text=maintainer%3Apilmee');
    });

    it('returns search results', async () => {
      mockResponse(mockSearchResult);
      const result = await npm.maintainer('pilmee').packages();
      expect(result.total).toBe(1);
      expect(result.objects).toHaveLength(1);
      expect(result.objects[0].package.name).toBe('my-pkg');
    });

    it('forwards size and from params', async () => {
      mockResponse(mockSearchResult);
      await npm.maintainer('pilmee').packages({ size: 10, from: 20 });
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('size=10');
      expect(url).toContain('from=20');
    });

    it('forwards scoring weight params', async () => {
      mockResponse(mockSearchResult);
      await npm.maintainer('pilmee').packages({ quality: 0.5, popularity: 0.8, maintenance: 0.7 });
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('quality=0.5');
      expect(url).toContain('popularity=0.8');
      expect(url).toContain('maintenance=0.7');
    });

    it('does not append undefined params', async () => {
      mockResponse(mockSearchResult);
      await npm.maintainer('pilmee').packages();
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).not.toContain('size=');
      expect(url).not.toContain('from=');
    });

    it('works with default empty params', async () => {
      mockResponse({ objects: [], total: 0, time: '' });
      const result = await npm.maintainer('unknown-user-xyz').packages();
      expect(result.total).toBe(0);
      expect(result.objects).toHaveLength(0);
    });
  });
});
