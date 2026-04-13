/**
 * Public user profile derived from the npm registry search API.
 */
export interface NpmUser {
  /** npm username */
  name: string;
  /** Public email address (when available) */
  email?: string;
}
