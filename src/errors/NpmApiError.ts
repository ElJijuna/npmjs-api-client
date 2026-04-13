/**
 * Thrown when the npm Registry API returns a non-2xx response.
 *
 * @example
 * ```typescript
 * import { NpmApiError } from 'npmjs-api-client';
 *
 * try {
 *   await npm.package('nonexistent-pkg-xyz').get();
 * } catch (err) {
 *   if (err instanceof NpmApiError) {
 *     console.log(err.status);     // 404
 *     console.log(err.statusText); // 'Not Found'
 *     console.log(err.message);    // 'npm API error: 404 Not Found'
 *   }
 * }
 * ```
 */
export class NpmApiError extends Error {
  /** HTTP status code (e.g. `404`, `401`, `403`) */
  readonly status: number;
  /** HTTP status text (e.g. `'Not Found'`, `'Unauthorized'`) */
  readonly statusText: string;

  constructor(status: number, statusText: string) {
    super(`npm API error: ${status} ${statusText}`);
    this.name = 'NpmApiError';
    this.status = status;
    this.statusText = statusText;
  }
}
