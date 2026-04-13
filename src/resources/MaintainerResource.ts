import type { NpmSearchResult } from '../domain/Search';

/** @internal */
export type RequestFn = <T>(
  path: string,
  params?: Record<string, string | number | boolean>,
  baseUrl?: string,
) => Promise<T>;

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
 * Represents an npm maintainer, providing access to their published packages
 * via the npm registry search API.
 *
 * @example
 * ```typescript
 * // Get packages by a maintainer
 * const result = await npm.maintainer('sindresorhus').packages();
 *
 * // Paginate
 * const page2 = await npm.maintainer('sindresorhus').packages({ size: 25, from: 25 });
 *
 * result.objects.forEach(o => console.log(o.package.name, o.package.version));
 * console.log(result.total);
 * ```
 */
export class MaintainerResource {
  /** @internal */
  constructor(
    private readonly request: RequestFn,
    private readonly username: string,
  ) {}

  /**
   * Searches for all packages maintained by this user.
   *
   * `GET /-/v1/search?text=maintainer:{username}`
   *
   * @param params - Optional pagination and scoring weights
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
  async packages(params: MaintainerPackagesParams = {}): Promise<NpmSearchResult> {
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
    );
  }
}
