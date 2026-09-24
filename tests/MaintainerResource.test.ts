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

function withPackage(overrides: Record<string, unknown>) {
  return {
    ...mockSearchResult,
    objects: [
      {
        ...mockSearchResult.objects[0],
        package: { ...mockSearchResult.objects[0].package, ...overrides },
      },
    ],
  };
}

// Mirrors `maintainer:isaacs`, whose top result was published by a co-maintainer.
const publishedByCoMaintainer = withPackage({
  publisher: { username: 'juliangruber', email: 'julian@juliangruber.com' },
  maintainers: [
    { username: 'juliangruber', email: 'julian@juliangruber.com' },
    { username: 'isaacs', email: 'i@izs.me' },
  ],
});

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

  describe('info()', () => {
    it('extracts the maintainer profile from search result', async () => {
      mockResponse(
        withPackage({ maintainers: [{ username: 'pilmee', email: 'pilmee@gmail.com' }] }),
      );
      const profile = await npm.maintainer('pilmee').info();
      expect(profile.name).toBe('pilmee');
      expect(profile.email).toBe('pilmee@gmail.com');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/-/v1/search?'),
        expect.any(Object),
      );
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('text=maintainer%3Apilmee');
      expect(url).toContain('size=1');
    });

    it('falls back to username when no results', async () => {
      mockResponse({ objects: [], total: 0, time: '' });
      const profile = await npm.maintainer('ghost').info();
      expect(profile.name).toBe('ghost');
      expect(profile.email).toBeUndefined();
    });

    it('returns email as undefined when the maintainer has none', async () => {
      mockResponse(withPackage({ maintainers: [{ username: 'pilmee' }] }));
      const profile = await npm.maintainer('pilmee').info();
      expect(profile.email).toBeUndefined();
    });

    it('ignores the publisher when it is a different user', async () => {
      mockResponse(publishedByCoMaintainer);
      const profile = await npm.maintainer('isaacs').info();
      expect(profile).toEqual({ name: 'isaacs', email: 'i@izs.me' });
    });

    it('matches the username case-insensitively', async () => {
      mockResponse(publishedByCoMaintainer);
      const profile = await npm.maintainer('IsaacS').info();
      expect(profile).toEqual({ name: 'isaacs', email: 'i@izs.me' });
    });

    it('falls back to the publisher when it is this user and maintainers are missing', async () => {
      mockResponse(
        withPackage({
          publisher: { username: 'pilmee', email: 'pilmee@gmail.com' },
          maintainers: undefined,
        }),
      );
      const profile = await npm.maintainer('pilmee').info();
      expect(profile).toEqual({ name: 'pilmee', email: 'pilmee@gmail.com' });
    });

    it("never returns another user's email when this user is not listed", async () => {
      mockResponse(
        withPackage({
          publisher: { username: 'someone-else', email: 'else@example.com' },
          maintainers: [{ username: 'someone-else', email: 'else@example.com' }],
        }),
      );
      const profile = await npm.maintainer('pilmee').info();
      expect(profile).toEqual({ name: 'pilmee', email: undefined });
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

  describe('avatar()', () => {
    it('returns a Gravatar URL derived from the public maintainer email', async () => {
      mockResponse(
        withPackage({ maintainers: [{ username: 'pilmee', email: 'pilmee@gmail.com' }] }),
      );
      const url = await npm.maintainer('pilmee').avatar();
      expect(url).toBe(
        'https://www.gravatar.com/avatar/062d380b834f09366e280dce73f4a553cb56cc7e5714634ffda175c292436895?d=identicon&s=128',
      );
    });

    it('returns undefined when no public email is available', async () => {
      mockResponse(withPackage({ maintainers: [{ username: 'pilmee' }] }));
      const url = await npm.maintainer('pilmee').avatar();
      expect(url).toBeUndefined();
    });

    it("uses this maintainer's email, not the publisher's", async () => {
      mockResponse(publishedByCoMaintainer);
      const url = await npm.maintainer('isaacs').avatar();
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('i@izs.me'));
      const hash = Buffer.from(digest).toString('hex');
      expect(url).toBe(`https://www.gravatar.com/avatar/${hash}?d=identicon&s=128`);
    });

    it('returns undefined when there are no results', async () => {
      mockResponse({ objects: [], total: 0, time: '' });
      const url = await npm.maintainer('ghost').avatar();
      expect(url).toBeUndefined();
    });

    it('passes signal to fetch on avatar()', async () => {
      mockResponse(mockSearchResult);
      const controller = new AbortController();
      await npm.maintainer('pilmee').avatar(controller.signal);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });
  });

  describe('AbortSignal', () => {
    it('passes signal to fetch on info()', async () => {
      mockResponse({ objects: [], total: 0, time: '' });
      const controller = new AbortController();
      await npm.maintainer('pilmee').info(controller.signal);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });

    it('passes signal to fetch on packages()', async () => {
      mockResponse(mockSearchResult);
      const controller = new AbortController();
      await npm.maintainer('pilmee').packages({}, controller.signal);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });
  });
});
