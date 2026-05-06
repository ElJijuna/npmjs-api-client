export type JsdelivrPeriod = 'day' | 'week' | 'month' | 'year';

export type JsdelivrGroupBy = 'version' | 'date' | 'file';

export interface JsdelivrVersionEntry {
  total: number;
  dates: Record<string, number>;
}

export interface JsdelivrStats {
  rank?: number;
  total: number;
  versions?: Record<string, JsdelivrVersionEntry>;
  files?: Record<string, JsdelivrVersionEntry>;
  dates?: Record<string, number>;
}
