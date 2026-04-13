/**
 * Map of dist-tags to version strings for a package.
 *
 * Returned by `GET /-/package/:name/dist-tags`.
 *
 * @example
 * ```json
 * { "latest": "1.2.3", "next": "2.0.0-beta.1", "canary": "2.0.0-alpha.5" }
 * ```
 */
export type NpmDistTags = Record<string, string>;
