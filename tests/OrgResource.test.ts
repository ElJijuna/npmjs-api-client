import { NpmClient } from '../src/index';
import { OrgResource } from '../src/resources/OrgResource';

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

describe('OrgResource', () => {
  let npm: NpmClient;

  beforeEach(() => {
    mockFetch.mockClear();
    npm = new NpmClient({ token: 'secret' });
  });

  describe('npm.org()', () => {
    it('returns an OrgResource', () => {
      const resource = npm.org('npmcli');
      expect(resource).toBeInstanceOf(OrgResource);
    });
  });

  describe('packages()', () => {
    it('calls the org packages endpoint', async () => {
      mockResponse({ '@npmcli/arborist': 'read-write', '@npmcli/config': 'read-only' });
      const result = await npm.org('npmcli').packages();
      expect(result['@npmcli/arborist']).toBe('read-write');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://registry.npmjs.org/-/org/npmcli/package',
        expect.any(Object),
      );
    });

    it('accepts org names with a leading @', async () => {
      mockResponse({});
      await npm.org('@npmcli').packages();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://registry.npmjs.org/-/org/npmcli/package',
        expect.any(Object),
      );
    });
  });

  describe('teams()', () => {
    it('calls the org teams endpoint', async () => {
      mockResponse(['npmcli:developers', 'npmcli:wombats']);
      const result = await npm.org('npmcli').teams();
      expect(result).toEqual(['npmcli:developers', 'npmcli:wombats']);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://registry.npmjs.org/-/org/npmcli/team',
        expect.any(Object),
      );
    });
  });

  describe('members()', () => {
    it('calls the org members endpoint', async () => {
      mockResponse({ isaacs: 'owner', npmcli: 'developer' });
      const result = await npm.org('npmcli').members();
      expect(result.isaacs).toBe('owner');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://registry.npmjs.org/-/org/npmcli/user',
        expect.any(Object),
      );
    });
  });

  describe('teamMembers()', () => {
    it('calls the team members endpoint', async () => {
      mockResponse(['isaacs', 'npmcli']);
      const result = await npm.org('npmcli').teamMembers('wombats');
      expect(result).toEqual(['isaacs', 'npmcli']);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://registry.npmjs.org/-/org/npmcli/wombats/user',
        expect.any(Object),
      );
    });

    it('accepts team names with org prefixes', async () => {
      mockResponse([]);
      await npm.org('npmcli').teamMembers('npmcli:wombats');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://registry.npmjs.org/-/org/npmcli/wombats/user',
        expect.any(Object),
      );
    });
  });

  describe('auth and AbortSignal', () => {
    it('sends Authorization header when token is provided', async () => {
      mockResponse({});
      await npm.org('npmcli').packages();
      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer secret');
    });

    it('passes signal to fetch', async () => {
      mockResponse({});
      const controller = new AbortController();
      await npm.org('npmcli').packages(controller.signal);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });
  });
});
