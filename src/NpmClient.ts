import { NpmApiError } from './errors/NpmApiError';
import { PackageResource } from './resources/PackageResource';
import { MaintainerResource } from './resources/MaintainerResource';
import { OrgResource } from './resources/OrgResource';
import type { NpmSearchResult, NpmSearchParams } from './domain/Search';
import type { NpmDownloadPoint, NpmDownloadRange, NpmDownloadPeriod, NpmBulkDownloads } from './domain/Downloads';
import type { NpmAuditPayload, NpmAuditResult, NpmAuditQuickResult } from './domain/Audit';

const DEFAULT_REGISTRY_URL = 'https://registry.npmjs.org';
const DEFAULT_DOWNLOADS_URL = 'https://api.npmjs.org';
const DEFAULT_NPMS_URL = 'https://api.npms.io/v2';
const DEFAULT_PACKAGEPHOBIA_URL = 'https://packagephobia.com';
const DEFAULT_JSDELIVR_URL = 'https://data.jsdelivr.com/v1';
const DEFAULT_UNPKG_URL = 'https://unpkg.com';
const DEFAULT_DEPS_DEV_URL = 'https://api.deps.dev/v3';
const DEFAULT_TOP_PACKAGES_QUERY = 'keywords:javascript';

/**
 * Payload emitted on every HTTP request made by {@link NpmClient}.
 */
export interface RequestEvent {
  /** Full URL that was requested */
  url: string;
  /** HTTP method used */
  method: 'GET' | 'POST';
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
   * Base URL for the npms.io API (default: `'https://api.npms.io/v2'`).
   */
  npmsApiUrl?: string;
  /**
   * Base URL for the Packagephobia API (default: `'https://packagephobia.com'`).
   */
  packagephobiaUrl?: string;
  /**
   * Base URL for the jsDelivr data API (default: `'https://data.jsdelivr.com/v1'`).
   */
  jsdelivrUrl?: string;
  /**
   * Base URL for the unpkg CDN (default: `'https://unpkg.com'`).
   */
  unpkgUrl?: string;
  /**
   * Base URL for the deps.dev API (default: `'https://api.deps.dev/v3'`).
   */
  depsDevUrl?: string;
  /**
   * Bearer token for authenticated requests (e.g. private registry access).
   * Sent only to the registry and downloads API — never to third-party sources.
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
  private readonly npmsApiUrl: string;
  private readonly packagephobiaUrl: string;
  private readonly jsdelivrUrl: string;
  private readonly unpkgUrl: string;
  private readonly depsDevUrl: string;
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
    this.npmsApiUrl = (options.npmsApiUrl ?? DEFAULT_NPMS_URL).replace(/\/$/, '');
    this.packagephobiaUrl = (options.packagephobiaUrl ?? DEFAULT_PACKAGEPHOBIA_URL).replace(/\/$/, '');
    this.jsdelivrUrl = (options.jsdelivrUrl ?? DEFAULT_JSDELIVR_URL).replace(/\/$/, '');
    this.unpkgUrl = (options.unpkgUrl ?? DEFAULT_UNPKG_URL).replace(/\/$/, '');
    this.depsDevUrl = (options.depsDevUrl ?? DEFAULT_DEPS_DEV_URL).replace(/\/$/, '');
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

  private buildHeaders(baseUrl: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    if (this.token && (baseUrl === 'registry' || baseUrl === 'downloads')) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  private resolveBaseUrl(key: string): string {
    const map: Record<string, string> = {
      registry: this.registryUrl,
      downloads: this.downloadsApiUrl,
      npms: this.npmsApiUrl,
      packagephobia: this.packagephobiaUrl,
      jsdelivr: this.jsdelivrUrl,
      unpkg: this.unpkgUrl,
      depsdev: this.depsDevUrl,
    };
    return map[key] ?? this.registryUrl;
  }

  /**
   * Performs a GET request to the specified API.
   *
   * @param path - Path to append to the base URL
   * @param params - Optional query parameters
   * @param baseUrl - Which base URL to use: `'registry'` (default), `'downloads'`, `'npms'`, `'packagephobia'`, `'jsdelivr'`, `'unpkg'`, or `'depsdev'`
   * @param signal - Optional `AbortSignal` to cancel the request
   * @internal
   */
  private async request<T>(
    path: string,
    params?: Record<string, string | number | boolean>,
    baseUrl = 'registry',
    signal?: AbortSignal,
  ): Promise<T> {
    const base = this.resolveBaseUrl(baseUrl);
    const url = buildUrl(`${base}${path}`, params);
    const startedAt = new Date();
    let statusCode: number | undefined;
    try {
      const response = await fetch(url, { headers: this.buildHeaders(baseUrl), signal });
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

  /** @internal */
  private async post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
    const url = `${this.registryUrl}${path}`;
    const startedAt = new Date();
    let statusCode: number | undefined;
    const headers = { ...this.buildHeaders('registry'), 'Content-Type': 'application/json' };
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal,
      });
      statusCode = response.status;
      if (!response.ok) {
        throw new NpmApiError(response.status, response.statusText);
      }
      const data = await response.json() as T;
      this.emit('request', {
        url,
        method: 'POST',
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
        method: 'POST',
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
    if (params.text.trim() === '') {
      throw new TypeError('npm search requires a non-empty text query');
    }

    return this.request<NpmSearchResult>(
      '/-/v1/search',
      params as unknown as Record<string, string | number | boolean>,
      'registry',
      signal,
    );
  }

  /**
   * Returns the top packages according to npm search's default ranking.
   *
   * `GET /-/v1/search?text=keywords:javascript&size={n}`
   *
   * The default npm ranking combines quality, popularity, and maintenance.
   * npm requires a non-empty `text` query, so this helper uses a broad
   * JavaScript keyword search.
   *
   * @param n - Number of packages to return (default: 20, max: 250)
   * @param signal - Optional `AbortSignal` to cancel the request
   * @returns Search results including packages, scores, and total count
   *
   * @example
   * ```typescript
   * const top = await npm.topPackages(10);
   * top.objects.forEach(o => console.log(o.package.name, o.score.final));
   * ```
   */
  async topPackages(n = 20, signal?: AbortSignal): Promise<NpmSearchResult> {
    return this.search({ text: DEFAULT_TOP_PACKAGES_QUERY, size: n }, signal);
  }

  /**
   * Returns top packages ranked by popularity.
   *
   * `GET /-/v1/search?text=keywords:javascript&size={n}&popularity=1&quality=0&maintenance=0`
   *
   * @param n - Number of packages to return (default: 20, max: 250)
   * @param signal - Optional `AbortSignal` to cancel the request
   * @returns Search results including packages, scores, and total count
   */
  async topByPopularity(n = 20, signal?: AbortSignal): Promise<NpmSearchResult> {
    return this.search(
      { text: DEFAULT_TOP_PACKAGES_QUERY, size: n, popularity: 1, quality: 0, maintenance: 0 },
      signal,
    );
  }

  /**
   * Returns top packages ranked by quality.
   *
   * `GET /-/v1/search?text=keywords:javascript&size={n}&quality=1&popularity=0&maintenance=0`
   *
   * @param n - Number of packages to return (default: 20, max: 250)
   * @param signal - Optional `AbortSignal` to cancel the request
   * @returns Search results including packages, scores, and total count
   */
  async topByQuality(n = 20, signal?: AbortSignal): Promise<NpmSearchResult> {
    return this.search(
      { text: DEFAULT_TOP_PACKAGES_QUERY, size: n, quality: 1, popularity: 0, maintenance: 0 },
      signal,
    );
  }

  /**
   * Returns top packages ranked by maintenance.
   *
   * `GET /-/v1/search?text=keywords:javascript&size={n}&maintenance=1&quality=0&popularity=0`
   *
   * @param n - Number of packages to return (default: 20, max: 250)
   * @param signal - Optional `AbortSignal` to cancel the request
   * @returns Search results including packages, scores, and total count
   */
  async topByMaintenance(n = 20, signal?: AbortSignal): Promise<NpmSearchResult> {
    return this.search(
      { text: DEFAULT_TOP_PACKAGES_QUERY, size: n, maintenance: 1, quality: 0, popularity: 0 },
      signal,
    );
  }

  /**
   * Returns top packages for a keyword.
   *
   * `GET /-/v1/search?text=keywords:{keyword}&size={n}`
   *
   * @param keyword - Keyword to filter by
   * @param n - Number of packages to return (default: 20, max: 250)
   * @param signal - Optional `AbortSignal` to cancel the request
   * @returns Search results including packages, scores, and total count
   */
  async topByKeyword(keyword: string, n = 20, signal?: AbortSignal): Promise<NpmSearchResult> {
    return this.search({ text: `keywords:${keyword}`, size: n }, signal);
  }

  /**
   * Returns top packages for a scope.
   *
   * `GET /-/v1/search?text=scope:{scope}&size={n}`
   *
   * @param scope - Scope to filter by, with or without the leading `@`
   * @param n - Number of packages to return (default: 20, max: 250)
   * @param signal - Optional `AbortSignal` to cancel the request
   * @returns Search results including packages, scores, and total count
   */
  async topByScope(scope: string, n = 20, signal?: AbortSignal): Promise<NpmSearchResult> {
    const normalizedScope = scope.startsWith('@') ? scope.slice(1) : scope;
    return this.search({ text: `scope:${normalizedScope}`, size: n }, signal);
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
   * Returns an {@link OrgResource} for a given npm organization, providing
   * authenticated access to org packages, teams, and members.
   *
   * These endpoints require a registry auth token with org access.
   *
   * @param org - The npm org name, with or without the leading `@`
   * @returns An org resource with `packages()`, `teams()`, `members()`, and `teamMembers()` methods
   *
   * @example
   * ```typescript
   * const npm = new NpmClient({ token: 'npm_...' });
   * const packages = await npm.org('npmcli').packages();
   * const teams = await npm.org('npmcli').teams();
   * ```
   */
  org(org: string): OrgResource {
    return new OrgResource(
      <T>(path: string, params?: Record<string, string | number | boolean>, _baseUrl?: string, signal?: AbortSignal) =>
        this.request<T>(path, params, 'registry', signal),
      org,
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

  /**
   * Fetches the total download count for multiple packages in a single request.
   *
   * `GET /downloads/point/{period}/{name1},{name2},...` (via api.npmjs.org)
   *
   * @param packages - Array of package names to fetch downloads for (max 128)
   * @param period - Named period or date range (default: `'last-month'`)
   * @param signal - Optional `AbortSignal` to cancel the request
   * @returns A map of package name to download point data
   *
   * @example
   * ```typescript
   * const stats = await npm.bulkDownloads(['react', 'vue', 'angular']);
   * console.log(stats['react'].downloads); // 18591460
   * console.log(stats['vue'].downloads);   // 4200000
   * ```
   */
  async bulkDownloads(
    packages: string[],
    period: NpmDownloadPeriod = 'last-month',
    signal?: AbortSignal,
  ): Promise<NpmBulkDownloads> {
    const names = packages.map(encodeURIComponent).join(',');
    return this.request<NpmBulkDownloads>(
      `/downloads/point/${period}/${names}`,
      undefined,
      'downloads',
      signal,
    );
  }

  /**
   * Runs a full security audit against the npm registry.
   *
   * The payload mirrors the top-level structure of `package-lock.json`:
   * a `name`, `version`, and a `dependencies` map of resolved packages with their
   * versions, integrity hashes, and nested sub-dependencies.
   *
   * Returns detailed advisory objects for every vulnerability found, along with
   * recommended actions (update, install, or manual review).
   *
   * `POST /-/npm/v1/security/audits`
   *
   * @param payload - Lock-file-shaped dependency tree to audit
   * @param signal - Optional `AbortSignal` to cancel the request
   * @returns Full audit report with advisories, actions, and vulnerability counts
   *
   * @example
   * ```typescript
   * const result = await npm.audit({
   *   name: 'my-app',
   *   version: '1.0.0',
   *   requires: { lodash: '^4.17.11' },
   *   dependencies: {
   *     lodash: { version: '4.17.11', integrity: 'sha512-...' },
   *   },
   * });
   *
   * console.log(result.metadata.vulnerabilities);
   * // { info: 0, low: 0, moderate: 1, high: 0, critical: 0 }
   *
   * Object.values(result.advisories).forEach(a => {
   *   console.log(`[${a.severity}] ${a.title} — ${a.module_name}@${a.vulnerable_versions}`);
   *   console.log(`  Fix: upgrade to ${a.patched_versions}`);
   * });
   * ```
   */
  async audit(payload: NpmAuditPayload, signal?: AbortSignal): Promise<NpmAuditResult> {
    return this.post<NpmAuditResult>('/-/npm/v1/security/audits', payload, signal);
  }

  /**
   * Runs a quick security audit against the npm registry.
   *
   * Same payload as {@link audit} but returns only vulnerability counts by severity —
   * no advisory details or recommended actions. Faster and lighter than the full audit.
   *
   * `POST /-/npm/v1/security/audits/quick`
   *
   * @param payload - Lock-file-shaped dependency tree to audit
   * @param signal - Optional `AbortSignal` to cancel the request
   * @returns Vulnerability counts by severity and dependency totals
   *
   * @example
   * ```typescript
   * const result = await npm.auditQuick({
   *   name: 'my-app',
   *   version: '1.0.0',
   *   requires: { lodash: '^4.17.11' },
   *   dependencies: {
   *     lodash: { version: '4.17.11', integrity: 'sha512-...' },
   *   },
   * });
   *
   * const { high, critical } = result.metadata.vulnerabilities;
   * if (high + critical > 0) {
   *   console.error(`Found ${high} high and ${critical} critical vulnerabilities`);
   * }
   * ```
   */
  async auditQuick(payload: NpmAuditPayload, signal?: AbortSignal): Promise<NpmAuditQuickResult> {
    return this.post<NpmAuditQuickResult>('/-/npm/v1/security/audits/quick', payload, signal);
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
