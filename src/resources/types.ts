/** @internal */
export type ApiProvider = 'registry' | 'downloads' | 'packagephobia' | 'jsdelivr' | 'unpkg' | 'depsdev';

/** @internal */
export type RequestFn = <T>(
  path: string,
  params?: Record<string, string | number | boolean>,
  baseUrl?: ApiProvider,
  signal?: AbortSignal,
) => Promise<T>;
