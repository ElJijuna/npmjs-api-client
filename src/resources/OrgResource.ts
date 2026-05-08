import type { NpmOrgMembers, NpmOrgPackages } from '../domain/Org';
import type { RequestFn } from './types';

/**
 * Represents an npm organization, providing access to authenticated org data
 * such as packages, teams, and members.
 *
 * These endpoints require a registry auth token with org access.
 *
 * @example
 * ```typescript
 * const npm = new NpmClient({ token: 'npm_...' });
 *
 * const packages = await npm.org('npmcli').packages();
 * const teams = await npm.org('npmcli').teams();
 * const members = await npm.org('npmcli').members();
 * const wombats = await npm.org('npmcli').teamMembers('wombats');
 * ```
 */
export class OrgResource {
  /** @internal */
  constructor(
    private readonly request: RequestFn,
    private readonly org: string,
  ) {}

  /**
   * Returns all packages an org has access to, keyed by package name.
   *
   * `GET /-/org/{org}/package`
   *
   * @param signal - Optional `AbortSignal` to cancel the request
   * @returns Package names mapped to `read-only` or `read-write`
   */
  async packages(signal?: AbortSignal): Promise<NpmOrgPackages> {
    return this.request<NpmOrgPackages>(
      `/-/org/${encodeURIComponent(normalizeOrg(this.org))}/package`,
      undefined,
      undefined,
      signal,
    );
  }

  /**
   * Returns all teams in an org.
   *
   * `GET /-/org/{org}/team`
   *
   * @param signal - Optional `AbortSignal` to cancel the request
   * @returns Team names, usually in `{org}:{team}` form
   */
  async teams(signal?: AbortSignal): Promise<string[]> {
    return this.request<string[]>(
      `/-/org/${encodeURIComponent(normalizeOrg(this.org))}/team`,
      undefined,
      undefined,
      signal,
    );
  }

  /**
   * Returns all members in an org, keyed by username.
   *
   * `GET /-/org/{org}/user`
   *
   * @param signal - Optional `AbortSignal` to cancel the request
   * @returns Usernames mapped to `developer`, `admin`, or `owner`
   */
  async members(signal?: AbortSignal): Promise<NpmOrgMembers> {
    return this.request<NpmOrgMembers>(
      `/-/org/${encodeURIComponent(normalizeOrg(this.org))}/user`,
      undefined,
      undefined,
      signal,
    );
  }

  /**
   * Returns all usernames in a team.
   *
   * `GET /-/org/{org}/{team}/user`
   *
   * @param team - Team name, with or without `{org}:` prefix
   * @param signal - Optional `AbortSignal` to cancel the request
   * @returns Usernames in the team
   */
  async teamMembers(team: string, signal?: AbortSignal): Promise<string[]> {
    return this.request<string[]>(
      `/-/org/${encodeURIComponent(normalizeOrg(this.org))}/${encodeURIComponent(normalizeTeam(team))}/user`,
      undefined,
      undefined,
      signal,
    );
  }
}

function normalizeOrg(org: string): string {
  return org.startsWith('@') ? org.slice(1) : org;
}

function normalizeTeam(team: string): string {
  const parts = team.split(':');
  const teamName = parts.length > 1 ? parts[parts.length - 1] : team;
  return teamName.startsWith('@') ? teamName.slice(1) : teamName;
}
