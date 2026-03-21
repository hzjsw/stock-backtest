/**
 * API 数据加载器
 * 支持通用 HTTP API 获取股票数据
 */
import { Bar } from '../core/types';

export interface ApiConfig {
  /** API 基础地址 */
  baseUrl: string;
  /** 请求头 */
  headers?: Record<string, string>;
  /** API Token */
  token?: string;
}

export interface ApiLoadOptions {
  /** 股票代码 */
  symbol: string;
  /** 起始日期 */
  startDate?: string;
  /** 结束日期 */
  endDate?: string;
  /** 数据频率: daily, weekly, monthly */
  frequency?: 'daily' | 'weekly' | 'monthly';
}

/** API 响应数据的字段映射 */
export interface ApiFieldMapping {
  date: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  /** 额外字段映射 */
  extra?: Record<string, string>;
}

/**
 * 通用 API 数据加载器
 */
export class ApiLoader {
  private config: ApiConfig;
  private fieldMapping: ApiFieldMapping;

  constructor(config: ApiConfig, fieldMapping?: ApiFieldMapping) {
    this.config = config;
    this.fieldMapping = fieldMapping || {
      date: 'date',
      open: 'open',
      high: 'high',
      low: 'low',
      close: 'close',
      volume: 'volume',
    };
  }

  /**
   * 从 API 加载单只股票数据
   */
  async load(options: ApiLoadOptions): Promise<Bar[]> {
    const url = this.buildUrl(options);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config.headers,
    };
    if (this.config.token) {
      headers['Authorization'] = `Bearer ${this.config.token}`;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return this.parseResponse(data);
  }

  /**
   * 从 API 加载多只股票数据
   */
  async loadMultiple(
    symbols: string[],
    options?: Omit<ApiLoadOptions, 'symbol'>
  ): Promise<Map<string, Bar[]>> {
    const result = new Map<string, Bar[]>();
    const promises = symbols.map(async (symbol) => {
      const bars = await this.load({ ...options, symbol });
      result.set(symbol, bars);
    });
    await Promise.all(promises);
    return result;
  }

  private buildUrl(options: ApiLoadOptions): string {
    const params = new URLSearchParams();
    params.set('symbol', options.symbol);
    if (options.startDate) params.set('start_date', options.startDate);
    if (options.endDate) params.set('end_date', options.endDate);
    if (options.frequency) params.set('frequency', options.frequency);
    return `${this.config.baseUrl}?${params.toString()}`;
  }

  private parseResponse(data: unknown): Bar[] {
    const records = Array.isArray(data) ? data : (data as Record<string, unknown>)['data'];
    if (!Array.isArray(records)) {
      throw new Error('API 返回的数据格式不正确，期望数组');
    }

    const mapping = this.fieldMapping;
    const bars: Bar[] = records.map((record: Record<string, unknown>) => {
      const bar: Bar = {
        date: String(record[mapping.date] || ''),
        open: Number(record[mapping.open]) || 0,
        high: Number(record[mapping.high]) || 0,
        low: Number(record[mapping.low]) || 0,
        close: Number(record[mapping.close]) || 0,
        volume: Number(record[mapping.volume]) || 0,
      };

      if (mapping.extra) {
        for (const [key, field] of Object.entries(mapping.extra)) {
          const val = record[field];
          bar[key] = typeof val === 'number' ? val : String(val ?? '');
        }
      }

      return bar;
    });

    bars.sort((a, b) => a.date.localeCompare(b.date));
    return bars;
  }
}

/**
 * 从内存数组创建 Bar 数据 (便于测试和自定义数据源)
 */
export function createBarsFromArray(
  data: Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    [key: string]: string | number | undefined;
  }>
): Bar[] {
  return data
    .map((d) => ({ ...d } as Bar))
    .sort((a, b) => a.date.localeCompare(b.date));
}
