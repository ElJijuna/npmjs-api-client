import type { NpmAuthenticatedUser, NpmUserPackages, NpmUserPackagesParams } from '../domain/User';
import type { RequestFn } from './types';

/**
 * Represents an npm user, providing authenticated access to user profile
 * information and package names associated with the account.
 *
 * These endpoints require a registry auth token.
 *
 * @example
 * ```typescript
 * const npm = new NpmClient({ token: 'npm_...' });
 *
 * const user = await npm.user('pilmee').get();
 * const packages = await npm.user('pilmee').packages();
 * ```
 */
export class UserResource {
  /** @internal */
  constructor(
    private readonly request: RequestFn,
    private readonly username: string,
  ) {}

  /**
   * Returns the authenticated registry profile document for this user.
   *
   * `GET /-/user/org.couchdb.user:{username}`
   *
   * @param signal - Optional `AbortSignal` to cancel the request
   * @returns npm user profile document
   */
  async get(signal?: AbortSignal): Promise<NpmAuthenticatedUser> {
    return this.request<NpmAuthenticatedUser>(
      `/-/user/org.couchdb.user:${encodeURIComponent(this.username)}`,
      undefined,
      undefined,
      signal,
    );
  }

  /**
   * Returns package names associated with this user.
   *
   * `GET /-/by-user/{username}`
   *
   * @param params - Optional pagination parameters
   * @param signal - Optional `AbortSignal` to cancel the request
   * @returns Package names associated with the user
   */
  async packages(params: NpmUserPackagesParams = {}, signal?: AbortSignal): Promise<NpmUserPackages> {
    return this.request<NpmUserPackages>(
      `/-/by-user/${encodeURIComponent(this.username)}`,
      {
        ...(params.size !== undefined && { size: params.size }),
        ...(params.from !== undefined && { from: params.from }),
      },
      undefined,
      signal,
    );
  }
}
