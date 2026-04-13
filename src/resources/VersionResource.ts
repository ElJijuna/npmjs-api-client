import type { NpmPackageVersion } from '../domain/PackageVersion';

/** @internal */
export type RequestFn = <T>(
  path: string,
  params?: Record<string, string | number | boolean>,
  baseUrl?: string,
) => Promise<T>;

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
    return this.get().then(onfulfilled, onrejected);
  }

  /**
   * Fetches the version manifest for this specific version.
   *
   * `GET /{package}/{version}`
   *
   * @returns The version manifest object
   */
  async get(): Promise<NpmPackageVersion> {
    return this.request<NpmPackageVersion>(
      `/${encodeURIComponent(this.packageName)}/${encodeURIComponent(this.ver)}`,
    );
  }
}
