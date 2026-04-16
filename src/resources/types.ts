/** @internal */
export type RequestFn = <T>(
  path: string,
  params?: Record<string, string | number | boolean>,
  baseUrl?: string,
  signal?: AbortSignal,
) => Promise<T>;
