import type {
  NpmVersionDownloadPeriod,
  NpmVersionDownloadPoint,
  NpmVersionDownloads,
} from '../domain/Downloads';
import type { NpmPackageVersion } from '../domain/PackageVersion';
import type { PackagephobiaSize } from '../domain/Packagephobia';
import type { JsdelivrStats, JsdelivrGroupBy, JsdelivrPeriod } from '../domain/Jsdelivr';
import type { UnpkgFile } from '../domain/Unpkg';
import type { DepsDevDependencies } from '../domain/DepsDev';
import type { NpmDistTags } from '../domain/DistTag';
import { NpmApiError } from '../errors/NpmApiError';
import type { RequestFn } from './types';

/** Exact semver version, e.g. `18.2.0` or `19.0.0-rc.1+build.5`. */
const EXACT_VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

export type { RequestFn };

/**
 * Represents a specific version of an npm package, providing access to its manifest.
 *
 * Implements `PromiseLike<NpmPackageVersion>` so it can be awaited directly.
 *
 * @example
 * ```typescript
 * // Await directly to get the version manifest
 * const manifest = await npm.package('react').version('18.2.0');
 *
 * // Or call .get() explicitly
 * const manifest = await npm.package('react').version('18.2.0').get();
 * ```
 */
export class VersionResource implements PromiseLike<NpmPackageVersion> {
  /** @internal */
  constructor(
    private readonly request: RequestFn,
    private readonly packageName: string,
    private readonly ver: string,
  ) {}

  /**
   * Allows the resource to be awaited directly, resolving with the version manifest.
   * Delegates to {@link VersionResource.get}.
   */
  then<TResult1 = NpmPackageVersion, TResult2 = never>(
    onfulfilled?: ((value: NpmPackageVersion) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    // PromiseLike requires this method to forward both callbacks.
    // eslint-disable-next-line no-restricted-syntax
    return this.get().then(onfulfilled, onrejected);
  }

  /**
   * Fetches the version manifest for this specific version.
   *
   * `GET /{package}/{version}`
   *
   * @param signal - Optional `AbortSignal` to cancel the request
   * @returns The version manifest object
   */
  async get(signal?: AbortSignal): Promise<NpmPackageVersion> {
    return this.request<NpmPackageVersion>(
      `/${encodeURIComponent(this.packageName)}/${encodeURIComponent(this.ver)}`,
      undefined,
      undefined,
      signal,
    );
  }

  /**
   * Fetches the download count for this specific version over the previous 7 days.
   *
   * npm exposes version-level download counts only for `last-week`.
   * A dist-tag (e.g. `'latest'`) is first resolved to the version it points to.
   *
   * `GET /versions/{package}/last-week` (via api.npmjs.org)
   *
   * @param period - Must be `'last-week'`
   * @param signal - Optional `AbortSignal` to cancel the request
   * @returns Download point data for this version
   *
   * @example
   * ```typescript
   * const stats = await npm.package('react').version('18.2.0').downloads('last-week');
   * console.log(stats.downloads);
   * ```
   */
  async downloads(
    period: NpmVersionDownloadPeriod = 'last-week',
    signal?: AbortSignal,
  ): Promise<NpmVersionDownloadPoint> {
    if (period !== 'last-week') {
      throw new RangeError("Version downloads are only available for 'last-week'.");
    }

    const [version, stats] = await Promise.all([
      this.resolveVersion(signal),
      this.request<NpmVersionDownloads>(
        `/versions/${encodeURIComponent(this.packageName)}/${period}`,
        undefined,
        'downloads',
        signal,
      ),
    ]);

    return {
      downloads: stats.downloads[version] ?? 0,
      package: stats.package,
      version,
      period,
    };
  }

  /**
   * Fetches the publish size and full install size (including all transitive dependencies)
   * for this specific version from Packagephobia.
   *
   * `GET /v2/api.json?p={name}@{version}` (via packagephobia.com)
   *
   * @param signal - Optional `AbortSignal` to cancel the request
   * @returns Publish and install size in bytes, file counts, and human-readable strings
   *
   * @example
   * ```typescript
   * const size = await npm.package('react').version('18.2.0').size();
   * console.log(size.install.pretty); // "300 kB"
   * ```
   */
  async size(signal?: AbortSignal): Promise<PackagephobiaSize> {
    return this.request<PackagephobiaSize>(
      '/v2/api.json',
      { p: `${this.packageName}@${this.ver}` },
      'packagephobia',
      signal,
    );
  }

  /**
   * Fetches the complete file tree of this package version from unpkg.
   *
   * Returns every file and directory included in the published tarball, with
   * individual file sizes, types, and paths — useful for auditing package contents.
   *
   * `GET /{name}@{version}/?meta` (via unpkg.com)
   *
   * @param signal - Optional `AbortSignal` to cancel the request
   * @returns Recursive file tree of the package
   *
   * @example
   * ```typescript
   * const tree = await npm.package('react').version('18.2.0').files();
   * tree.files?.forEach(f => console.log(f.path, f.size));
   * ```
   */
  async files(signal?: AbortSignal): Promise<UnpkgFile> {
    return this.request<UnpkgFile>(
      `/${encodeURIComponent(this.packageName)}@${encodeURIComponent(this.ver)}/`,
      { meta: '' },
      'unpkg',
      signal,
    );
  }

  /**
   * Fetches CDN usage statistics for this specific version from jsDelivr.
   *
   * At version level, results are grouped by file by default, showing which
   * individual files are most requested from browsers in production.
   * A dist-tag (e.g. `'latest'`) is first resolved to the version it points to.
   *
   * `GET /package/npm/{name}@{version}/stats/{groupBy}/{period}` (via data.jsdelivr.com/v1)
   *
   * @param groupBy - Group results by `'file'` (default) or `'date'`
   * @param period - Time period: `'day'`, `'week'`, `'month'` (default), or `'year'`
   * @param signal - Optional `AbortSignal` to cancel the request
   * @returns CDN hit counts and bandwidth breakdown by file or date
   *
   * @example
   * ```typescript
   * const stats = await npm.package('react').version('18.2.0').cdnStats();
   * console.log(stats.total);
   * ```
   */
  async cdnStats(
    groupBy: JsdelivrGroupBy = 'file',
    period: JsdelivrPeriod = 'month',
    signal?: AbortSignal,
  ): Promise<JsdelivrStats> {
    const version = await this.resolveVersion(signal);
    return this.request<JsdelivrStats>(
      `/package/npm/${encodeURIComponent(this.packageName)}@${encodeURIComponent(version)}/stats/${groupBy}/${period}`,
      undefined,
      'jsdelivr',
      signal,
    );
  }

  /**
   * Fetches the fully resolved dependency graph for this version from deps.dev.
   *
   * Unlike the semver ranges in `package.json`, this returns exact resolved versions
   * for every direct and transitive dependency, along with the dependency graph edges.
   * A dist-tag (e.g. `'latest'`) is first resolved to the version it points to.
   *
   * `GET /systems/npm/packages/{name}/versions/{version}:dependencies` (via api.deps.dev/v3)
   *
   * @param signal - Optional `AbortSignal` to cancel the request
   * @returns Dependency nodes (with resolved versions and relation type) and graph edges
   *
   * @example
   * ```typescript
   * const deps = await npm.package('react').version('18.2.0').dependencies();
   * const direct = deps.nodes.filter(n => n.relation === 'DIRECT');
   * console.log(direct.map(n => `${n.versionKey.name}@${n.versionKey.version}`));
   * ```
   */
  async dependencies(signal?: AbortSignal): Promise<DepsDevDependencies> {
    const version = await this.resolveVersion(signal);
    return this.request<DepsDevDependencies>(
      `/systems/npm/packages/${encodeURIComponent(this.packageName)}/versions/${encodeURIComponent(version)}:dependencies`,
      undefined,
      'depsdev',
      signal,
    );
  }

  /**
   * Resolves a dist-tag to the exact version it points to. jsDelivr stats,
   * deps.dev, and per-version downloads only understand exact versions, and
   * answer a tag with empty data or a 404 instead of an error.
   */
  private async resolveVersion(signal?: AbortSignal): Promise<string> {
    if (EXACT_VERSION.test(this.ver)) return this.ver;
    const tags = await this.request<NpmDistTags>(
      `/-/package/${encodeURIComponent(this.packageName)}/dist-tags`,
      undefined,
      undefined,
      signal,
    );
    const version = Object.hasOwn(tags, this.ver) ? tags[this.ver] : undefined;
    if (!version) {
      throw new NpmApiError(
        404,
        `Unknown dist-tag "${this.ver}" for package "${this.packageName}"`,
      );
    }
    return version;
  }
}
