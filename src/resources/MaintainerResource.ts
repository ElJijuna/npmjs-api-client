import type { NpmSearchResult, NpmSearchObject } from '../domain/Search';
import type { NpmUser } from '../domain/NpmUser';
import type { NpmPerson } from '../domain/Packument';
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
   * Internally searches for packages by the maintainer and extracts this
   * user's entry from the first result's maintainers — no authentication required.
   *
   * `GET /-/v1/search?text=maintainer:{username}&size=1`
   *
   * @param signal - Optional `AbortSignal` to cancel the request
   * @returns The user profile with `name` and optional `email`. When the user has
   * no published packages, `name` is the requested username and `email` is `undefined`.
   *
   * @example
   * ```typescript
   * const profile = await npm.maintainer('pilmee').info();
   * console.log(profile.name);  // 'pilmee'
   * console.log(profile.email); // 'pilmee@gmail.com'
   * ```
   */
  async info(signal?: AbortSignal): Promise<NpmUser> {
    const profile = await this.profile(signal);

    return {
      name: profile?.username ?? this.username,
      email: profile?.email,
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
  async packages(
    params: MaintainerPackagesParams = {},
    signal?: AbortSignal,
  ): Promise<NpmSearchResult> {
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
   * Internally searches for packages by the maintainer, extracts this user's
   * public email from the first result's maintainers, and derives a Gravatar URL.
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
    const profile = await this.profile(signal);
    return profile?.email ? gravatarUrl(profile.email) : undefined;
  }

  /**
   * Finds this user's entry in the first search result. The package publisher
   * is only used when it is this user: a maintainer's packages are often
   * published by someone else.
   */
  private async profile(signal?: AbortSignal): Promise<NpmPerson | undefined> {
    const result = await this.request<NpmSearchResult>(
      '/-/v1/search',
      { text: `maintainer:${this.username}`, size: 1 },
      undefined,
      signal,
    );
    const [first]: NpmSearchObject[] = result.objects;
    if (!first) return undefined;
    const username = this.username.toLowerCase();
    const isUser = (person?: NpmPerson): person is NpmPerson =>
      person?.username?.toLowerCase() === username;
    const { maintainers, publisher } = first.package;
    return maintainers?.find(isUser) ?? (isUser(publisher) ? publisher : undefined);
  }
}

async function gravatarUrl(email: string): Promise<string> {
  const normalizedEmail = email.trim().toLowerCase();
  const hashBuffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(normalizedEmail),
  );
  const hash = Array.from(new Uint8Array(hashBuffer), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  return `https://www.gravatar.com/avatar/${hash}?d=identicon&s=128`;
}
