import { NpmClient } from '../src/index';
import { UserResource } from '../src/resources/UserResource';

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

describe('UserResource', () => {
  let npm: NpmClient;

  beforeEach(() => {
    mockFetch.mockClear();
    npm = new NpmClient({ token: 'secret' });
  });

  describe('npm.user()', () => {
    it('returns a UserResource', () => {
      const resource = npm.user('pilmee');
      expect(resource).toBeInstanceOf(UserResource);
    });
  });

  describe('get()', () => {
    it('calls the authenticated user profile endpoint', async () => {
      mockResponse({
        _id: 'org.couchdb.user:pilmee',
        _rev: '1-abc',
        name: 'pilmee',
        email: 'pilmee@example.com',
        type: 'user',
      });

      const result = await npm.user('pilmee').get();

      expect(result.name).toBe('pilmee');
      expect(result.email).toBe('pilmee@example.com');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://registry.npmjs.org/-/user/org.couchdb.user:pilmee',
        expect.any(Object),
      );
    });

    it('encodes usernames in the profile path', async () => {
      mockResponse({ _id: 'org.couchdb.user:user/name', name: 'user/name' });

      await npm.user('user/name').get();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://registry.npmjs.org/-/user/org.couchdb.user:user%2Fname',
        expect.any(Object),
      );
    });
  });

  describe('packages()', () => {
    it('calls the user packages endpoint', async () => {
      mockResponse(['pkg-a', '@scope/pkg-b']);

      const result = await npm.user('pilmee').packages();

      expect(result).toEqual(['pkg-a', '@scope/pkg-b']);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://registry.npmjs.org/-/by-user/pilmee',
        expect.any(Object),
      );
    });

    it('forwards pagination params', async () => {
      mockResponse([]);

      await npm.user('pilmee').packages({ size: 10, from: 20 });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toBe('https://registry.npmjs.org/-/by-user/pilmee?size=10&from=20');
    });

    it('does not append undefined params', async () => {
      mockResponse([]);

      await npm.user('pilmee').packages();

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toBe('https://registry.npmjs.org/-/by-user/pilmee');
    });
  });

  describe('auth and AbortSignal', () => {
    it('sends Authorization header when token is provided', async () => {
      mockResponse({ _id: 'org.couchdb.user:pilmee', name: 'pilmee' });

      await npm.user('pilmee').get();

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer secret');
    });

    it('passes signal to fetch', async () => {
      mockResponse([]);
      const controller = new AbortController();

      await npm.user('pilmee').packages({}, controller.signal);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });
  });
});
