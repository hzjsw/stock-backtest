/**
 * CSV 数据加载器
 */
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { Bar } from '../core/types';

export interface CsvLoadOptions {
  /** 日期列名 */
  dateColumn?: string;
  /** 开盘价列名 */
  openColumn?: string;
  /** 最高价列名 */
  highColumn?: string;
  /** 最低价列名 */
  lowColumn?: string;
  /** 收盘价列名 */
  closeColumn?: string;
  /** 成交量列名 */
  volumeColumn?: string;
  /** 日期格式 (默认 YYYY-MM-DD) */
  dateFormat?: string;
  /** 编码 */
  encoding?: BufferEncoding;
  /** 分隔符 */
  delimiter?: string;
}

const DEFAULT_OPTIONS: Required<CsvLoadOptions> = {
  dateColumn: 'date',
  openColumn: 'open',
  highColumn: 'high',
  lowColumn: 'low',
  closeColumn: 'close',
  volumeColumn: 'volume',
  dateFormat: 'YYYY-MM-DD',
  encoding: 'utf-8',
  delimiter: ',',
};

/**
 * 从 CSV 文件加载股票数据
 */
export function loadFromCsv(filePath: string, options?: CsvLoadOptions): Bar[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`文件不存在: ${absolutePath}`);
  }

  const content = fs.readFileSync(absolutePath, { encoding: opts.encoding });
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    delimiter: opts.delimiter,
    trim: true,
  }) as Record<string, string>[];

  const bars: Bar[] = records.map((record) => {
    const bar: Bar = {
      date: record[opts.dateColumn] || '',
      open: parseFloat(record[opts.openColumn]) || 0,
      high: parseFloat(record[opts.highColumn]) || 0,
      low: parseFloat(record[opts.lowColumn]) || 0,
      close: parseFloat(record[opts.closeColumn]) || 0,
      volume: parseFloat(record[opts.volumeColumn]) || 0,
    };

    // 保留额外字段
    for (const key of Object.keys(record)) {
      if (![opts.dateColumn, opts.openColumn, opts.highColumn,
            opts.lowColumn, opts.closeColumn, opts.volumeColumn].includes(key)) {
        const numVal = parseFloat(record[key]);
        bar[key] = isNaN(numVal) ? record[key] : numVal;
      }
    }

    return bar;
  });

  // 按日期排序
  bars.sort((a, b) => a.date.localeCompare(b.date));

  return bars;
}

/**
 * 从多个 CSV 文件加载多只股票数据
 */
export function loadMultipleFromCsv(
  fileMap: Record<string, string>,
  options?: CsvLoadOptions
): Map<string, Bar[]> {
  const result = new Map<string, Bar[]>();
  for (const [symbol, filePath] of Object.entries(fileMap)) {
    result.set(symbol, loadFromCsv(filePath, options));
  }
  return result;
}

/**
 * 从目录批量加载 CSV 文件
 * 文件名(去掉扩展名)作为股票代码
 */
export function loadFromDirectory(
  dirPath: string,
  options?: CsvLoadOptions
): Map<string, Bar[]> {
  const absolutePath = path.resolve(dirPath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`目录不存在: ${absolutePath}`);
  }

  const files = fs.readdirSync(absolutePath).filter(f => f.endsWith('.csv'));
  const result = new Map<string, Bar[]>();

  for (const file of files) {
    const symbol = path.basename(file, '.csv');
    const filePath = path.join(absolutePath, file);
    result.set(symbol, loadFromCsv(filePath, options));
  }

  return result;
}
