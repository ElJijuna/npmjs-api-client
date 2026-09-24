/** Longest `detail` kept from a plain-text error body. */
const MAX_DETAIL_LENGTH = 300;

/**
 * Thrown when the npm Registry API returns a non-2xx response.
 *
 * @example
 * ```typescript
 * import { NpmApiError } from 'npmjs-api-client';
 *
 * try {
 *   await npm.search({ text: 'a' });
 * } catch (err) {
 *   if (err instanceof NpmApiError) {
 *     console.log(err.status);     // 400
 *     console.log(err.statusText); // often '' (not sent by the server)
 *     console.log(err.detail);     // "The 'text' parameter must be between 2 and 64 characters"
 *     console.log(err.body);       // { error: "The 'text' parameter ...", code: 'ERR_TEXT_LENGTH' }
 *   }
 * }
 * ```
 */
export class NpmApiError extends Error {
  /** HTTP status code (e.g. `404`, `401`, `403`) */
  readonly status: number;
  /**
   * HTTP status text (e.g. `'Not Found'`). Often empty: many servers, and
   * HTTP/2, do not send one — prefer {@link NpmApiError.status} and {@link NpmApiError.detail}.
   */
  readonly statusText: string;
  /**
   * Response body: parsed JSON when the body is JSON, otherwise the raw text.
   * `undefined` when the response had no body or it could not be read.
   */
  readonly body?: unknown;
  /**
   * Human-readable reason extracted from the response body, such as
   * `'scoped packages are not currently supported in bulk lookups'`.
   */
  readonly detail?: string;

  constructor(status: number, statusText: string, body?: unknown) {
    const detail = extractDetail(body);
    // Servers often send an empty status text (e.g. over HTTP/2).
    const summary = [status, statusText].filter(Boolean).join(' ');
    const reason = detail && detail !== statusText ? ` — ${detail}` : '';
    super(`npm API error: ${summary}${reason}`);
    this.name = 'NpmApiError';
    this.status = status;
    this.statusText = statusText;
    this.body = body;
    this.detail = detail;
  }
}

/**
 * Finds the error message in the body shapes returned by the supported APIs:
 * `{ error: '...' }`, `{ error: { message: '...' } }`, `{ message: '...' }`,
 * a JSON string, or plain text. HTML error pages are ignored.
 */
function extractDetail(body: unknown): string | undefined {
  if (typeof body === 'string') {
    const text = body.trim();
    if (!text || text.startsWith('<')) return undefined;
    return text.length > MAX_DETAIL_LENGTH ? `${text.slice(0, MAX_DETAIL_LENGTH)}…` : text;
  }
  if (typeof body !== 'object' || body === null) return undefined;
  const { error, message } = body as { error?: unknown; message?: unknown };
  if (typeof error === 'string') return extractDetail(error);
  if (typeof error === 'object' && error !== null) return extractDetail(error);
  if (typeof message === 'string') return extractDetail(message);
  return undefined;
}
