/**
 * 网络股票数据获取模块
 * 支持多种数据源：AKShare, Tushare, 新浪财经等
 */

import * as http from 'http';
import * as https from 'https';

export interface StockBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface DataSourceConfig {
  source: 'akshare' | 'tushare' | 'sina' | 'eastmoney' | 'netease';
  token?: string;
  proxy?: string;
}

/**
 * 推荐使用的数据源列表（按优先级排序）
 * 1. netease - 免费、历史数据完整、稳定、无需 token
 * 2. sina - 免费、简单，但只有当天数据
 * 3. akshare - 需要本地安装 Python
 * 4. eastmoney - 可能被防火墙阻止
 * 5. tushare - 需要 token
 */
export const RECOMMENDED_SOURCES: DataSourceConfig['source'][] = ['netease', 'sina', 'akshare', 'eastmoney'];

/**
 * HTTP 请求封装（带请求头）
 */
function httpGet(url: string, timeout: number = 10000, headers: Record<string, string> = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    // 默认请求头 - 模拟浏览器
    const defaultHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Connection': 'keep-alive',
      ...headers
    };
    
    const options: any = {
      timeout,
      headers: defaultHeaders,
      rejectUnauthorized: false  // 忽略 SSL 证书验证问题
    };
    
    const req = client.get(url, options, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`请求失败：${res.statusCode}`));
        return;
      }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', (err) => {
      console.error(`HTTP 请求错误 [${url}]:`, err.message);
      reject(err);
    });
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('请求超时'));
    });
  });
}

/**
 * 解析 CSV 文本
 */
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim());
  const records: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const record: Record<string, string> = {};
    headers.forEach((h, idx) => {
      record[h] = values[idx] || '';
    });
    records.push(record);
  }
  
  return records;
}

/**
 * 新浪财经数据源 - A 股日线数据
 * 优点：免费、无需 token、数据质量较好
 */
export async function fetchFromSina(symbol: string, startDate?: string, endDate?: string): Promise<StockBar[]> {
  // 转换股票代码格式
  let sinaSymbol = symbol;
  if (symbol.startsWith('60') || symbol.startsWith('68')) {
    sinaSymbol = `sh${symbol}`;
  } else if (symbol.startsWith('00') || symbol.startsWith('30')) {
    sinaSymbol = `sz${symbol}`;
  }

  const url = `https://hq.sinajs.cn/list=${sinaSymbol}`;
  
  try {
    // 添加 Referer 避免 403 错误
    const response = await httpGet(url, 10000, {
      'Referer': 'https://finance.sina.com.cn/'
    });
    const match = response.match(/="([^"]+)"/);
    if (!match) {
      throw new Error('数据格式异常');
    }
    
    const parts = match[1].split(',');
    if (parts.length < 32) {
      throw new Error('数据字段不完整');
    }
    
    // 解析当前日 K 线
    // 新浪数据格式：当天开盘价，昨天收盘价，当前价，最高价，最低价，
    // 买一价，买二价，买三价，买四价，买五价，
    // 卖一价，卖二价，卖三价，卖四价，卖五价，
    // 成交量（股），成交额（元），...
    // 日期，时间
    const bar: StockBar = {
      date: parts[30] || parts[31] || new Date().toISOString().split('T')[0],
      open: parseFloat(parts[1]) || 0,
      high: parseFloat(parts[3]) || 0,
      low: parseFloat(parts[4]) || 0,
      close: parseFloat(parts[6]) || 0,  // 当前价作为收盘价
      volume: parseFloat(parts[8]) || 0,
    };
    
    return [bar];
  } catch (err) {
    throw new Error(`新浪财经数据获取失败：${err instanceof Error ? err.message : '未知错误'}`);
  }
}

/**
 * 东方财富数据源 - 历史 K 线
 * 优点：免费、历史数据完整、支持多周期
 */
export async function fetchFromEastMoney(
  symbol: string,
  startDate: string = '19700101',
  endDate: string = '20991231'
): Promise<StockBar[]> {
  // 转换股票代码格式
  let market = symbol.startsWith('60') || symbol.startsWith('68') ? '1' : '0';
  let emSymbol = symbol.padStart(6, '0');
  
  const url = `https://push2his.eastmoney.com/api/qt/stock/kline/get?` +
    `secid=${market}.${emSymbol}&` +
    `klt=101&fqt=1&` +
    `beg=${startDate}&end=${endDate}&` +
    `fields1=f1,f2,f3,f4,f5,f6&` +
    `fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61`;

  try {
    const response = await httpGet(url);
    const data = JSON.parse(response);
    
    if (!data.data || !data.data.klines) {
      throw new Error('数据为空');
    }
    
    const bars: StockBar[] = data.data.klines.map((line: string) => {
      const parts = line.split(',');
      return {
        date: parts[0].split(' ')[0],
        open: parseFloat(parts[1]) || 0,
        high: parseFloat(parts[2]) || 0,
        low: parseFloat(parts[3]) || 0,
        close: parseFloat(parts[4]) || 0,
        volume: parseFloat(parts[5]) || 0,
      };
    });
    
    return bars;
  } catch (err) {
    throw new Error(`东方财富数据获取失败：${err instanceof Error ? err.message : '未知错误'}`);
  }
}

/**
 * AKShare 数据源（需要本地运行 AKShare 服务）
 * 优点：数据最全、支持广
 * 缺点：需要本地安装 AKShare 并运行服务
 */
export async function fetchFromAKShare(
  symbol: string,
  startDate: string = '20200101',
  endDate: string = '20991231',
  baseUrl: string = 'http://127.0.0.1:8080'
): Promise<StockBar[]> {
  const url = `${baseUrl}/api/stock_zh_a_hist?` +
    `symbol=${symbol}&` +
    `period=daily&` +
    `start_date=${startDate}&` +
    `end_date=${endDate}`;

  try {
    const response = await httpGet(url, 15000);
    const data = JSON.parse(response);
    
    const bars: StockBar[] = data.map((item: any) => ({
      date: item['日期'] ? item['日期'].split(' ')[0] : item['date'],
      open: parseFloat(item['开盘'] || item['open'] || 0),
      high: parseFloat(item['最高'] || item['high'] || 0),
      low: parseFloat(item['最低'] || item['low'] || 0),
      close: parseFloat(item['收盘'] || item['close'] || 0),
      volume: parseFloat(item['成交量'] || item['volume'] || 0),
    }));
    
    return bars;
  } catch (err) {
    throw new Error(`AKShare 数据获取失败：${err instanceof Error ? err.message : '未知错误'}`);
  }
}

/**
 * 腾讯财经数据源 - A 股历史 K 线
 * 优点：免费、无需 token、历史数据完整、稳定
 * 缺点：数据格式需要解析
 */
export async function fetchFromNetease(
  symbol: string,
  startDate: string = '20200101',
  endDate: string = '20991231'
): Promise<StockBar[]> {
  // 转换股票代码格式
  let ntSymbol = symbol;
  if (symbol.startsWith('60') || symbol.startsWith('68')) {
    ntSymbol = `sh${symbol}`;
  } else if (symbol.startsWith('00') || symbol.startsWith('30')) {
    ntSymbol = `sz${symbol}`;
  }

  // 网易财经 API - 日线数据
  // scale: 240=日线，datalen: 数据条数（最多 10000 条）
  const url = `http://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData?symbol=${ntSymbol}&scale=240&datalen=10000`;
  
  try {
    const response = await httpGet(url, 15000, {
      'Referer': 'https://finance.sina.com.cn/'
    });
    const data = JSON.parse(response);
    
    if (!Array.isArray(data)) {
      throw new Error('数据格式异常');
    }
    
    const bars: StockBar[] = data.map((item: any) => ({
      date: item.day || '',
      open: parseFloat(item.open) || 0,
      high: parseFloat(item.high) || 0,
      low: parseFloat(item.low) || 0,
      close: parseFloat(item.close) || 0,
      volume: parseFloat(item.volume) || 0,
    }));
    
    // 按日期排序并过滤日期范围
    bars.sort((a, b) => a.date.localeCompare(b.date));
    const filtered = bars.filter(bar => bar.date >= startDate && bar.date <= endDate);
    
    return filtered.length > 0 ? filtered : bars;
  } catch (err) {
    throw new Error(`网易财经数据获取失败：${err instanceof Error ? err.message : '未知错误'}`);
  }
}

/**
 * Tushare 数据源（需要 Token）
 * 优点：数据质量高、稳定
 * 缺点：需要注册获取 token
 */
export async function fetchFromTushare(
  symbol: string,
  startDate: string,
  endDate: string,
  token: string
): Promise<StockBar[]> {
  const url = 'http://api.tushare.pro';
  
  const requestBody = {
    api_name: 'daily',
    token: token,
    params: {
      ts_code: formatTsCode(symbol),
      start_date: startDate.replace(/-/g, ''),
      end_date: endDate.replace(/-/g, '')
    },
    fields: 'ts_code,trade_date,open,high,low,close,vol'
  };

  try {
    const response = await httpPost(url, requestBody);
    const data = JSON.parse(response);
    
    if (data.code !== 0) {
      throw new Error(data.msg || 'Tushare API 错误');
    }
    
    const bars: StockBar[] = data.data.items.map((item: any[]) => ({
      date: item[1] || '',
      open: parseFloat(item[2]) || 0,
      high: parseFloat(item[3]) || 0,
      low: parseFloat(item[4]) || 0,
      close: parseFloat(item[5]) || 0,
      volume: parseFloat(item[6]) || 0,
    }));
    
    return bars;
  } catch (err) {
    throw new Error(`Tushare 数据获取失败：${err instanceof Error ? err.message : '未知错误'}`);
  }
}

/**
 * 转换股票代码为 Tushare 格式
 */
function formatTsCode(symbol: string): string {
  const code = symbol.padStart(6, '0');
  if (code.startsWith('60') || code.startsWith('68')) {
    return `${code}.SH`;
  } else {
    return `${code}.SZ`;
  }
}

/**
 * HTTP POST 请求
 */
function httpPost(url: string, data: any, timeout: number = 10000): Promise<string> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const client = url.startsWith('https') ? https : http;
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': body.length
      },
      timeout
    };
    
    const req = client.request(url, options, (res) => {
      let responseData = '';
      res.setEncoding('utf8');
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => resolve(responseData));
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('请求超时'));
    });
    
    req.write(body);
    req.end();
  });
}

/**
 * 统一数据获取接口
 */
export async function fetchStockData(
  symbol: string,
  source: DataSourceConfig['source'] = 'netease',
  options?: {
    startDate?: string;
    endDate?: string;
    token?: string;
    baseUrl?: string;
  }
): Promise<StockBar[]> {
  const startDate = options?.startDate || '20200101';
  const endDate = options?.endDate || '20991231';
  
  switch (source) {
    case 'netease':
      return fetchFromNetease(symbol, startDate, endDate);
    case 'eastmoney':
      return fetchFromEastMoney(symbol, startDate, endDate);
    case 'sina':
      return fetchFromSina(symbol, startDate, endDate);
    case 'akshare':
      return fetchFromAKShare(symbol, startDate, endDate, options?.baseUrl);
    case 'tushare':
      if (!options?.token) {
        throw new Error('Tushare 需要配置 token');
      }
      return fetchFromTushare(symbol, startDate, endDate, options.token);
    default:
      throw new Error(`不支持的数据源：${source}`);
  }
}

/**
 * 批量获取多只股票数据
 */
export async function fetchMultipleStocks(
  symbols: string[],
  source?: DataSourceConfig['source'],
  options?: {
    startDate?: string;
    endDate?: string;
    token?: string;
    concurrency?: number;
  }
): Promise<Map<string, StockBar[]>> {
  const concurrency = options?.concurrency || 3;
  const result = new Map<string, StockBar[]>();
  
  // 分批请求，避免频率限制
  for (let i = 0; i < symbols.length; i += concurrency) {
    const batch = symbols.slice(i, i + concurrency);
    const promises = batch.map(async (symbol) => {
      try {
        const bars = await fetchStockData(symbol, source, options);
        if (bars.length > 0) {
          result.set(symbol, bars);
        }
      } catch (err) {
        console.error(`获取 ${symbol} 数据失败：`, err);
      }
    });
    
    await Promise.all(promises);
    
    // 请求间隔，避免过快
    if (i + concurrency < symbols.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return result;
}
