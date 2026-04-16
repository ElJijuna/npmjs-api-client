import { NpmApiError } from './errors/NpmApiError';
import { PackageResource } from './resources/PackageResource';
import { MaintainerResource } from './resources/MaintainerResource';
import type { NpmSearchResult, NpmSearchParams } from './domain/Search';
import type { NpmDownloadPoint, NpmDownloadRange, NpmDownloadPeriod } from './domain/Downloads';

const DEFAULT_REGISTRY_URL = 'https://registry.npmjs.org';
const DEFAULT_DOWNLOADS_URL = 'https://api.npmjs.org';

/**
 * Payload emitted on every HTTP request made by {@link NpmClient}.
 */
export interface RequestEvent {
  /** Full URL that was requested */
  url: string;
  /** HTTP method used */
  method: 'GET';
  /** Timestamp when the request started */
  startedAt: Date;
  /** Timestamp when the request finished (success or error) */
  finishedAt: Date;
  /** Total duration in milliseconds */
  durationMs: number;
  /** HTTP status code returned by the server, if a response was received */
  statusCode?: number;
  /** Error thrown, if the request failed */
  error?: Error;
}

/** Map of supported client events to their callback signatures */
export interface NpmClientEvents {
  request: (event: RequestEvent) => void;
}

/**
 * Constructor options for {@link NpmClient}.
 */
export interface NpmClientOptions {
  /**
   * Base URL for the npm registry (default: `'https://registry.npmjs.org'`).
   * Override for private registries or mirrors.
   */
  registryUrl?: string;
  /**
   * Base URL for the npm Downloads API (default: `'https://api.npmjs.org'`).
   */
  downloadsApiUrl?: string;
  /**
   * Bearer token for authenticated requests (e.g. private registry access).
   * Not required for public registry read operations.
   */
  token?: string;
}

/**
 * Main entry point for the npm Registry API client.
 *
 * @example
 * ```typescript
 * import { NpmClient } from 'npmjs-api-client';
 *
 * const npm = new NpmClient();
 *
 * // Get full package metadata
 * const pkg = await npm.package('react');
 *
 * // Get a specific version
 * const v18 = await npm.package('react').version('18.2.0');
 *
 * // Get the latest version
 * const latest = await npm.package('react').latest();
 *
 * // Get dist-tags
 * const tags = await npm.package('react').distTags();
 *
 * // Search packages
 * const results = await npm.search({ text: 'react hooks', size: 10 });
 *
 * // Get download stats
 * const stats = await npm.package('react').downloads('last-week');
 *
 * // Get all packages by a maintainer
 * const result = await npm.maintainer('sindresorhus').packages();
 * ```
 */
export class NpmClient {
  private readonly registryUrl: string;
  private readonly downloadsApiUrl: string;
  private readonly token?: string;
  private readonly listeners: Map<
    keyof NpmClientEvents,
    NpmClientEvents[keyof NpmClientEvents][]
  > = new Map();

  /**
   * @param options - Optional configuration for registry URL, downloads API URL, and auth token
   */
  constructor(options: NpmClientOptions = {}) {
    this.registryUrl = (options.registryUrl ?? DEFAULT_REGISTRY_URL).replace(/\/$/, '');
    this.downloadsApiUrl = (options.downloadsApiUrl ?? DEFAULT_DOWNLOADS_URL).replace(/\/$/, '');
    this.token = options.token;
  }

  /**
   * Subscribes to a client event.
   *
   * @example
   * ```typescript
   * npm.on('request', (event) => {
   *   console.log(`${event.method} ${event.url} — ${event.durationMs}ms`);
   *   if (event.error) console.error('Request failed:', event.error);
   * });
   * ```
   */
  on<K extends keyof NpmClientEvents>(event: K, callback: NpmClientEvents[K]): this {
    const callbacks = this.listeners.get(event) ?? [];
    callbacks.push(callback);
    this.listeners.set(event, callbacks);
    return this;
  }

  private emit<K extends keyof NpmClientEvents>(
    event: K,
    payload: Parameters<NpmClientEvents[K]>[0],
  ): void {
    const callbacks = this.listeners.get(event) ?? [];
    for (const cb of callbacks) {
      (cb as (p: typeof payload) => void)(payload);
    }
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  /**
   * Performs a GET request to either the registry or downloads API.
   *
   * @param path - Path to append to the base URL
   * @param params - Optional query parameters
   * @param baseUrl - Which base URL to use: `'registry'` (default) or `'downloads'`
   * @param signal - Optional `AbortSignal` to cancel the request
   * @internal
   */
  private async request<T>(
    path: string,
    params?: Record<string, string | number | boolean>,
    baseUrl: 'registry' | 'downloads' = 'registry',
    signal?: AbortSignal,
  ): Promise<T> {
    const base = baseUrl === 'downloads' ? this.downloadsApiUrl : this.registryUrl;
    const url = buildUrl(`${base}${path}`, params);
    const startedAt = new Date();
    let statusCode: number | undefined;
    try {
      const response = await fetch(url, { headers: this.buildHeaders(), signal });
      statusCode = response.status;
      if (!response.ok) {
        throw new NpmApiError(response.status, response.statusText);
      }
      const data = await response.json() as T;
      this.emit('request', {
        url,
        method: 'GET',
        startedAt,
        finishedAt: new Date(),
        durationMs: Date.now() - startedAt.getTime(),
        statusCode,
      });
      return data;
    } catch (err) {
      const finishedAt = new Date();
      this.emit('request', {
        url,
        method: 'GET',
        startedAt,
        finishedAt,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        statusCode,
        error: err instanceof Error ? err : new Error(String(err)),
      });
      throw err;
    }
  }

  /**
   * Returns a {@link PackageResource} for a given package name, providing access
   * to package metadata, versions, dist-tags, and download statistics.
   *
   * The returned resource can be awaited directly to fetch the full packument,
   * or chained to access nested resources.
   *
   * @param name - The package name (e.g. `'react'`, `'@types/node'`)
   * @returns A chainable package resource
   *
   * @example
   * ```typescript
   * const pkg  = await npm.package('react');
   * const v18  = await npm.package('react').version('18.2.0');
   * const tags = await npm.package('react').distTags();
   * ```
   */
  package(name: string): PackageResource {
    return new PackageResource(
      <T>(path: string, params?: Record<string, string | number | boolean>, baseUrl?: string, signal?: AbortSignal) =>
        this.request<T>(path, params, (baseUrl as 'registry' | 'downloads') ?? 'registry', signal),
      name,
    );
  }

  /**
   * Searches for packages on the npm registry.
   *
   * `GET /-/v1/search`
   *
   * @param params - Search parameters (required: `text`)
   * @param signal - Optional `AbortSignal` to cancel the request
   * @returns Search results including packages, scores, and total count
   *
   * @example
   * ```typescript
   * const results = await npm.search({ text: 'react state management', size: 5 });
   * results.objects.forEach(o => console.log(o.package.name, o.package.version));
   * ```
   */
  async search(params: NpmSearchParams, signal?: AbortSignal): Promise<NpmSearchResult> {
    return this.request<NpmSearchResult>(
      '/-/v1/search',
      params as unknown as Record<string, string | number | boolean>,
      'registry',
      signal,
    );
  }

  /**
   * Returns a {@link MaintainerResource} for a given npm username, providing
   * access to all packages they maintain.
   *
   * `GET /-/v1/search?text=maintainer:{username}`
   *
   * @param username - The npm username (e.g. `'sindresorhus'`, `'pilmee'`)
   * @returns A maintainer resource with a `packages()` method
   *
   * @example
   * ```typescript
   * const result = await npm.maintainer('sindresorhus').packages();
   * console.log(`${result.total} packages`);
   * result.objects.forEach(o => console.log(o.package.name, o.package.version));
   *
   * // Paginate
   * const page2 = await npm.maintainer('sindresorhus').packages({ size: 25, from: 25 });
   * ```
   */
  maintainer(username: string): MaintainerResource {
    return new MaintainerResource(
      <T>(path: string, params?: Record<string, string | number | boolean>, _baseUrl?: string, signal?: AbortSignal) =>
        this.request<T>(path, params, 'registry', signal),
      username,
    );
  }

  /**
   * Fetches the total download count for a package over a given period.
   *
   * `GET /downloads/point/{period}/{package}` (via api.npmjs.org)
   *
   * Convenience method — equivalent to `npm.package(name).downloads(period)`.
   *
   * @param period - Named period or date range
   * @param packageName - The package name
   * @param signal - Optional `AbortSignal` to cancel the request
   * @returns Download point data including total count and date range
   *
   * @example
   * ```typescript
   * const stats = await npm.downloads('last-week', 'react');
   * console.log(stats.downloads);
   * ```
   */
  async downloads(
    period: NpmDownloadPeriod,
    packageName: string,
    signal?: AbortSignal,
  ): Promise<NpmDownloadPoint> {
    return this.request<NpmDownloadPoint>(
      `/downloads/point/${period}/${encodeURIComponent(packageName)}`,
      undefined,
      'downloads',
      signal,
    );
  }

  /**
   * Fetches the per-day download breakdown for a package over a given period.
   *
   * `GET /downloads/range/{period}/{package}` (via api.npmjs.org)
   *
   * Convenience method — equivalent to `npm.package(name).downloadRange(period)`.
   *
   * @param period - Named period or date range
   * @param packageName - The package name
   * @param signal - Optional `AbortSignal` to cancel the request
   * @returns Download range data with a per-day array
   *
   * @example
   * ```typescript
   * const range = await npm.downloadRange('last-month', 'react');
   * range.downloads.forEach(d => console.log(d.day, d.downloads));
   * ```
   */
  async downloadRange(
    period: NpmDownloadPeriod,
    packageName: string,
    signal?: AbortSignal,
  ): Promise<NpmDownloadRange> {
    return this.request<NpmDownloadRange>(
      `/downloads/range/${period}/${encodeURIComponent(packageName)}`,
      undefined,
      'downloads',
      signal,
    );
  }
}

/**
 * Appends query parameters to a URL string, skipping `undefined` values.
 * @internal
 */
function buildUrl(base: string, params?: Record<string, string | number | boolean>): string {
  if (!params) return base;
  const entries = Object.entries(params).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return base;
  const search = new URLSearchParams(entries.map(([k, v]) => [k, String(v)]));
  return `${base}?${search.toString()}`;
}
