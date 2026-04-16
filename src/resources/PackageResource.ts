import type { NpmPackument, NpmPerson } from '../domain/Packument';
import type { NpmDistTags } from '../domain/DistTag';
import type { NpmDownloadPoint, NpmDownloadRange, NpmDownloadPeriod } from '../domain/Downloads';
import type { NpmPackageVersion } from '../domain/PackageVersion';
import { VersionResource, type RequestFn } from './VersionResource';

/**
 * Represents an npm package resource, providing access to package metadata,
 * versions, dist-tags, and download statistics.
 *
 * Implements `PromiseLike<NpmPackument>` so it can be awaited directly to
 * fetch the full packument, while also exposing sub-resource methods.
 *
 * @example
 * ```typescript
 * // Await directly to get full package metadata
 * const pkg = await npm.package('react');
 *
 * // Get a specific version
 * const v18 = await npm.package('react').version('18.2.0');
 *
 * // Get dist-tags
 * const tags = await npm.package('react').distTags();
 *
 * // Get download stats for last month
 * const stats = await npm.package('react').downloads();
 *
 * // Get daily download breakdown for a custom date range
 * const range = await npm.package('react').downloadRange('2024-01-01:2024-01-31');
 * ```
 */
export class PackageResource implements PromiseLike<NpmPackument> {
  /** @internal */
  constructor(
    private readonly request: RequestFn,
    private readonly name: string,
  ) {}

  /**
   * Allows the resource to be awaited directly, resolving with the full packument.
   * Delegates to {@link PackageResource.get}.
   */
  then<TResult1 = NpmPackument, TResult2 = never>(
    onfulfilled?: ((value: NpmPackument) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.get().then(onfulfilled, onrejected);
  }

  /**
   * Fetches the full packument (all versions metadata) for this package.
   *
   * `GET /{name}`
   *
   * @param signal - Optional `AbortSignal` to cancel the request
   * @returns The full packument object
   */
  async get(signal?: AbortSignal): Promise<NpmPackument> {
    return this.request<NpmPackument>(`/${encodeURIComponent(this.name)}`, undefined, undefined, signal);
  }

  /**
   * Returns a {@link VersionResource} for a specific version, which can be
   * awaited directly or chained.
   *
   * @param ver - Version string (e.g. `'18.2.0'`) or dist-tag (e.g. `'latest'`)
   * @returns A chainable version resource
   *
   * @example
   * ```typescript
   * const manifest = await npm.package('react').version('18.2.0');
   * ```
   */
  version(ver: string): VersionResource {
    return new VersionResource(this.request, this.name, ver);
  }

  /**
   * Returns a {@link VersionResource} for the `latest` dist-tag.
   *
   * Shorthand for `.version('latest')`.
   *
   * @returns A chainable version resource pointing to `latest`
   *
   * @example
   * ```typescript
   * const manifest = await npm.package('react').latest();
   * ```
   */
  latest(): VersionResource {
    return this.version('latest');
  }

  /**
   * Fetches all published versions of this package as an ordered array.
   *
   * Internally fetches the packument and converts the `versions` map to an array
   * sorted from oldest to newest.
   *
   * `GET /{name}`
   *
   * @param signal - Optional `AbortSignal` to cancel the request
   * @returns Array of version manifests sorted by publication order
   *
   * @example
   * ```typescript
   * const versions = await npm.package('typescript').versions();
   * console.log(versions.map(v => v.version).join(', '));
   * ```
   */
  async versions(signal?: AbortSignal): Promise<NpmPackageVersion[]> {
    const packument = await this.get(signal);
    return Object.values(packument.versions);
  }

  /**
   * Fetches the current maintainers of this package.
   *
   * Internally fetches the packument and returns the `maintainers` array.
   *
   * `GET /{name}`
   *
   * @param signal - Optional `AbortSignal` to cancel the request
   * @returns Array of maintainer entries (name, email, url)
   *
   * @example
   * ```typescript
   * const maintainers = await npm.package('typescript').maintainers();
   * maintainers.forEach(m => console.log(m.name, m.email));
   * ```
   */
  async maintainers(signal?: AbortSignal): Promise<NpmPerson[]> {
    const packument = await this.get(signal);
    return packument.maintainers ?? [];
  }

  /**
   * Fetches all dist-tags for this package.
   *
   * `GET /-/package/{name}/dist-tags`
   *
   * @param signal - Optional `AbortSignal` to cancel the request
   * @returns A map of tag names to version strings
   *
   * @example
   * ```typescript
   * const tags = await npm.package('react').distTags();
   * // { latest: '18.2.0', next: '19.0.0-beta.1' }
   * ```
   */
  async distTags(signal?: AbortSignal): Promise<NpmDistTags> {
    return this.request<NpmDistTags>(`/-/package/${encodeURIComponent(this.name)}/dist-tags`, undefined, undefined, signal);
  }

  /**
   * Fetches the total download count for this package over a given period.
   *
   * `GET /downloads/point/{period}/{name}` (via api.npmjs.org)
   *
   * @param period - Named period or date range (default: `'last-month'`)
   * @param signal - Optional `AbortSignal` to cancel the request
   * @returns Download point data including total count and date range
   *
   * @example
   * ```typescript
   * const stats = await npm.package('react').downloads('last-week');
   * console.log(stats.downloads); // 12345678
   * ```
   */
  async downloads(period: NpmDownloadPeriod = 'last-month', signal?: AbortSignal): Promise<NpmDownloadPoint> {
    return this.request<NpmDownloadPoint>(
      `/downloads/point/${period}/${encodeURIComponent(this.name)}`,
      undefined,
      'downloads',
      signal,
    );
  }

  /**
   * Fetches the per-day download breakdown for this package over a given period.
   *
   * `GET /downloads/range/{period}/{name}` (via api.npmjs.org)
   *
   * @param period - Named period or date range (default: `'last-month'`)
   * @param signal - Optional `AbortSignal` to cancel the request
   * @returns Download range data with a per-day array
   *
   * @example
   * ```typescript
   * const range = await npm.package('react').downloadRange('2024-01-01:2024-01-31');
   * range.downloads.forEach(d => console.log(d.day, d.downloads));
   * ```
   */
  async downloadRange(period: NpmDownloadPeriod = 'last-month', signal?: AbortSignal): Promise<NpmDownloadRange> {
    return this.request<NpmDownloadRange>(
      `/downloads/range/${period}/${encodeURIComponent(this.name)}`,
      undefined,
      'downloads',
      signal,
    );
  }
}
