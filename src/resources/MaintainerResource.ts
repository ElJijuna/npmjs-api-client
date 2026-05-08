import type { NpmSearchResult, NpmSearchObject } from '../domain/Search';
import type { NpmUser } from '../domain/NpmUser';
import type { RequestFn } from './types';

/**
 * Pagination and scoring options for {@link MaintainerResource.packages}.
 * Same as {@link NpmSearchParams} but without `text` (auto-filled as `maintainer:{username}`).
 */
export interface MaintainerPackagesParams {
  /** How many results to return (default: 20, max: 250) */
  size?: number;
  /** Offset for pagination */
  from?: number;
  /** Weight for quality in final score (0–1) */
  quality?: number;
  /** Weight for popularity in final score (0–1) */
  popularity?: number;
  /** Weight for maintenance in final score (0–1) */
  maintenance?: number;
}

/**
 * Represents an npm maintainer, providing access to their public profile
 * and published packages via the npm registry API.
 *
 * @example
 * ```typescript
 * // Get public profile
 * const profile = await npm.maintainer('pilmee').info();
 * console.log(profile.name, profile.email);
 *
 * // Get packages maintained by this user
 * const result = await npm.maintainer('pilmee').packages();
 * result.objects.forEach(o => console.log(o.package.name, o.package.version));
 *
 * // Paginate
 * const page2 = await npm.maintainer('pilmee').packages({ size: 25, from: 25 });
 * ```
 */
export class MaintainerResource {
  /** @internal */
  constructor(
    private readonly request: RequestFn,
    private readonly username: string,
  ) {}

  /**
   * Fetches the public profile of this npm user.
   *
   * Internally searches for packages by the maintainer and extracts the
   * publisher profile from the first result — no authentication required.
   *
   * `GET /-/v1/search?text=maintainer:{username}&size=1`
   *
   * @param signal - Optional `AbortSignal` to cancel the request
   * @returns The user profile with `name` and optional `email`
   * @throws {NpmApiError} If the user has no published packages (404-equivalent: no results)
   *
   * @example
   * ```typescript
   * const profile = await npm.maintainer('pilmee').info();
   * console.log(profile.name);  // 'pilmee'
   * console.log(profile.email); // 'pilmee@gmail.com'
   * ```
   */
  async info(signal?: AbortSignal): Promise<NpmUser> {
    const publisher = await this.publisher(signal);
    const email = publisher?.email;

    return {
      name: publisher?.username ?? this.username,
      email,
    };
  }

  /**
   * Searches for all packages maintained by this user.
   *
   * `GET /-/v1/search?text=maintainer:{username}`
   *
   * @param params - Optional pagination and scoring weights
   * @param signal - Optional `AbortSignal` to cancel the request
   * @returns Search results with packages, scores, and total count
   *
   * @example
   * ```typescript
   * const result = await npm.maintainer('pilmee').packages();
   * console.log(`${result.total} packages`);
   * result.objects.forEach(o => {
   *   console.log(o.package.name, o.package.version);
   * });
   * ```
   */
  async packages(params: MaintainerPackagesParams = {}, signal?: AbortSignal): Promise<NpmSearchResult> {
    return this.request<NpmSearchResult>(
      '/-/v1/search',
      {
        text: `maintainer:${this.username}`,
        ...(params.size !== undefined && { size: params.size }),
        ...(params.from !== undefined && { from: params.from }),
        ...(params.quality !== undefined && { quality: params.quality }),
        ...(params.popularity !== undefined && { popularity: params.popularity }),
        ...(params.maintenance !== undefined && { maintenance: params.maintenance }),
      },
      undefined,
      signal,
    );
  }

  /**
   * Returns the public avatar URL for this npm user when a public email is available.
   *
   * Internally searches for packages by the maintainer, extracts the public
   * publisher email from the first result, and derives a Gravatar URL.
   *
   * `GET /-/v1/search?text=maintainer:{username}&size=1`
   *
   * @param signal - Optional `AbortSignal` to cancel the request
   * @returns Gravatar image URL, or `undefined` when no public email is available
   *
   * @example
   * ```typescript
   * const url = await npm.maintainer('pilmee').avatar();
   * // 'https://www.gravatar.com/avatar/...'
   * ```
   */
  async avatar(signal?: AbortSignal): Promise<string | undefined> {
    const publisher = await this.publisher(signal);
    return publisher?.email ? gravatarUrl(publisher.email) : undefined;
  }

  private async publisher(signal?: AbortSignal): Promise<NpmSearchObject['package']['publisher']> {
    const result = await this.request<NpmSearchResult>(
      '/-/v1/search',
      { text: `maintainer:${this.username}`, size: 1 },
      undefined,
      signal,
    );
    const first: NpmSearchObject | undefined = result.objects[0];
    return first?.package.publisher;
  }
}

async function gravatarUrl(email: string): Promise<string> {
  const normalizedEmail = email.trim().toLowerCase();
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalizedEmail));
  const hash = Array.from(new Uint8Array(hashBuffer), byte => byte.toString(16).padStart(2, '0')).join('');
  return `https://www.gravatar.com/avatar/${hash}?d=identicon&s=128`;
}
