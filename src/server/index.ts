/**
 * Express API Server - Backtest Engine Connection
 */
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { BacktestEngine } from '../core/engine';
import {
  Strategy,
  StrategyContext,
  Bar,
  BacktestConfig,
  BacktestRequest,
  DataSourceConfig,
} from '../core/types';
import {
  SMA,
  EMA,
  MACD,
  RSI,
  BollingerBands,
  ParabolicSAR,
  DualThrustRange,
  getIndicatorValue,
} from '../index';
import { fetchStockData, fetchMultipleStocks } from '../data/web-loader';
import { logger, ValidationError, DataError } from '../lib/logger';

const PORT = 3001;

// 创建服务器专用日志器
const serverLogger = logger.child('server');

// CSV Helper Functions
function saveToCsv(filePath: string, bars: any[]): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const records = bars.map(bar => ({
    date: bar.date,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
    volume: bar.volume,
  }));
  
  const output = stringify(records, {
    header: true,
    columns: ['date', 'open', 'high', 'low', 'close', 'volume'],
  });
  
  fs.writeFileSync(filePath, output);
}

function loadCsvFile(filePath: string): Bar[] {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }
  const content = fs.readFileSync(absolutePath, 'utf-8');
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  const bars: Bar[] = records.map(record => ({
    date: record['date'] || '',
    open: parseFloat(record['open']) || 0,
    high: parseFloat(record['high']) || 0,
    low: parseFloat(record['low']) || 0,
    close: parseFloat(record['close']) || 0,
    volume: parseFloat(record['volume']) || 0,
  })).sort((a, b) => a.date.localeCompare(b.date));

  return bars;
}

function loadCsvDirectory(dirPath: string): Map<string, Bar[]> {
  const absolutePath = path.resolve(dirPath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Directory not found: ${absolutePath}`);
  }
  const files = fs.readdirSync(absolutePath).filter(f => f.endsWith('.csv'));
  const result = new Map<string, Bar[]>();
  for (const file of files) {
    const symbol = path.basename(file, '.csv');
    const filePath = path.join(absolutePath, file);
    result.set(symbol, loadCsvFile(filePath));
  }
  return result;
}

// Mock Data Generator
function generateStockData(symbol: string, days: number = 500): Bar[] {
  const bars: Bar[] = [];
  let price = 5 + Math.random() * 45;
  const volatility = 0.015 + Math.random() * 0.025;
  const drift = (Math.random() - 0.4) * 0.0008;
  const startDate = new Date('2022-01-04');

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    const change = price * (drift + volatility * (Math.random() - 0.5));
    const open = price + change;
    const close = open + price * (Math.random() - 0.5) * volatility;
    const high = Math.max(open, close) + Math.random() * price * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * price * volatility * 0.5;
    const volume = Math.floor(1000000 + Math.random() * 9000000);

    bars.push({
      date: date.toISOString().split('T')[0],
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume,
    });

    price = close;
  }

  return bars;
}

// Strategy Factory Functions

function createMACrossover(shortPeriod: number, longPeriod: number, symbol: string = '000001'): Strategy {
  return {
    name: `MA Crossover (MA${shortPeriod}/MA${longPeriod})`,
    onBar(ctx: StrategyContext) {
      const bars = ctx.getBars(symbol);
      if (bars.length < longPeriod + 5) return;

      const smaShort = SMA(bars, shortPeriod);
      const smaLong = SMA(bars, longPeriod);
      const idx = bars.length - 1;
      const prev = idx - 1;

      const cs = getIndicatorValue(smaShort, idx);
      const cl = getIndicatorValue(smaLong, idx);
      const ps = getIndicatorValue(smaShort, prev);
      const pl = getIndicatorValue(smaLong, prev);
      if (!cs || !cl || !ps || !pl) return;

      const bar = ctx.getCurrentBar(symbol);
      if (!bar) return;
      const pos = ctx.positions.get(symbol);

      if (ps <= pl && cs > cl && !pos) {
        const qty = Math.floor((ctx.cash * 0.8) / bar.close);
        if (qty > 0) ctx.buy(symbol, qty);
      }
      if (ps >= pl && cs < cl && pos && pos.quantity > 0) {
        ctx.sell(symbol, pos.quantity);
      }
    },
  };
}

function createMACDStrategy(fastPeriod: number, slowPeriod: number, signalPeriod: number, symbol: string = '000001'): Strategy {
  return {
    name: `MACD Strategy (${fastPeriod}/${slowPeriod}/${signalPeriod})`,
    onBar(ctx: StrategyContext) {
      const bars = ctx.getBars(symbol);
      if (bars.length < slowPeriod + signalPeriod + 5) return;

      const { histogram } = MACD(bars, fastPeriod, slowPeriod, signalPeriod);
      const idx = bars.length - 1;
      const prev = idx - 1;

      const ch = getIndicatorValue(histogram, idx);
      const ph = getIndicatorValue(histogram, prev);
      if (ch === undefined || ph === undefined) return;

      const bar = ctx.getCurrentBar(symbol);
      if (!bar) return;
      const pos = ctx.positions.get(symbol);

      if (ph <= 0 && ch > 0 && !pos) {
        const qty = Math.floor((ctx.cash * 0.8) / bar.close);
        if (qty > 0) ctx.buy(symbol, qty);
      }
      if (ph >= 0 && ch < 0 && pos && pos.quantity > 0) {
        ctx.sell(symbol, pos.quantity);
      }
    },
  };
}

function createRSIStrategy(period: number, overbought: number, oversold: number, symbol: string = '000001'): Strategy {
  return {
    name: `RSI Strategy (${period})`,
    onBar(ctx: StrategyContext) {
      const bars = ctx.getBars(symbol);
      if (bars.length < period + 5) return;

      const rsi = RSI(bars, period);
      const idx = bars.length - 1;
      const rsiVal = getIndicatorValue(rsi, idx);
      if (rsiVal === undefined) return;

      const bar = ctx.getCurrentBar(symbol);
      if (!bar) return;
      const pos = ctx.positions.get(symbol);

      if (rsiVal < oversold && !pos) {
        const qty = Math.floor((ctx.cash * 0.8) / bar.close);
        if (qty > 0) ctx.buy(symbol, qty);
      }
      if (rsiVal > overbought && pos && pos.quantity > 0) {
        ctx.sell(symbol, pos.quantity);
      }
    },
  };
}

function createBollingerStrategy(period: number, stdDev: number, symbol: string = '000001'): Strategy {
  return {
    name: `Bollinger Bands Strategy (${period}, ${stdDev}σ)`,
    onBar(ctx: StrategyContext) {
      const bars = ctx.getBars(symbol);
      if (bars.length < period + 5) return;

      const { upper, lower } = BollingerBands(bars, period, stdDev);
      const idx = bars.length - 1;
      const u = getIndicatorValue(upper, idx);
      const l = getIndicatorValue(lower, idx);
      if (u === undefined || l === undefined) return;

      const bar = ctx.getCurrentBar(symbol);
      if (!bar) return;
      const pos = ctx.positions.get(symbol);

      if (bar.close <= l && !pos) {
        const qty = Math.floor((ctx.cash * 0.8) / bar.close);
        if (qty > 0) ctx.buy(symbol, qty);
      }
      if (bar.close >= u && pos && pos.quantity > 0) {
        ctx.sell(symbol, pos.quantity);
      }
    },
  };
}

function createMultiFactorStrategy(params: Record<string, number>): Strategy {
  const topN = params.topN ?? 3;
  let lastRebalanceMonth = '';

  return {
    name: `Multi-Factor Strategy (Top${topN})`,
    onBar(ctx: StrategyContext) {
      const date = ctx.getCurrentBar('000001')?.date || '';
      const month = date.slice(0, 7);
      if (month === lastRebalanceMonth) return;
      lastRebalanceMonth = month;

      const symbol = '000001';
      const bar = ctx.getCurrentBar(symbol);
      if (!bar) return;
      const pos = ctx.positions.get(symbol);

      if (!pos && ctx.cash > 0) {
        const qty = Math.floor((ctx.cash * 0.8) / bar.close);
        if (qty > 0) ctx.buy(symbol, qty);
      }
    },
  };
}

function createDualThrustStrategy(k1: number, k2: number, lookback: number, symbol: string = '000001'): Strategy {
  return {
    name: `Dual Thrust Strategy (K1=${k1}, K2=${k2})`,
    onBar(ctx: StrategyContext) {
      const bars = ctx.getBars(symbol);
      if (bars.length < lookback + 1) return;

      const { upper, lower } = DualThrustRange(bars, k1, k2, lookback);
      const idx = bars.length - 1;

      const upperBand = upper[idx];
      const lowerBand = lower[idx];
      if (isNaN(upperBand) || isNaN(lowerBand)) return;

      const bar = ctx.getCurrentBar(symbol);
      if (!bar) return;
      const pos = ctx.positions.get(symbol);

      // Price breaks above upper band - buy signal
      if (bar.close > upperBand && !pos) {
        const qty = Math.floor((ctx.cash * 0.8) / bar.close);
        if (qty > 0) ctx.buy(symbol, qty);
      }
      // Price breaks below lower band - sell signal
      else if (bar.close < lowerBand && pos && pos.quantity > 0) {
        ctx.sell(symbol, pos.quantity);
      }
    },
  };
}

function createParabolicSARStrategy(afStart: number, afIncrement: number, afMax: number, symbol: string = '000001'): Strategy {
  return {
    name: `Parabolic SAR Strategy (AF=${afStart}-${afMax})`,
    onBar(ctx: StrategyContext) {
      const bars = ctx.getBars(symbol);
      if (bars.length < 3) return;

      const { sar, trend } = ParabolicSAR(bars, afStart, afIncrement, afMax);
      const idx = bars.length - 1;
      const prev = idx - 1;

      const currentSAR = sar[idx];
      const currentTrend = trend[idx];
      const prevTrend = trend[prev];
      if (isNaN(currentSAR) || isNaN(currentTrend)) return;

      const bar = ctx.getCurrentBar(symbol);
      if (!bar) return;
      const pos = ctx.positions.get(symbol);

      // Trend reversal detection
      if (prevTrend !== currentTrend) {
        // Trend changed from down to up - buy signal
        if (currentTrend === 1 && !pos) {
          const qty = Math.floor((ctx.cash * 0.8) / bar.close);
          if (qty > 0) ctx.buy(symbol, qty);
        }
        // Trend changed from up to down - sell signal
        else if (currentTrend === -1 && pos && pos.quantity > 0) {
          ctx.sell(symbol, pos.quantity);
        }
      }
      // Stop loss: price breaks SAR in uptrend
      else if (currentTrend === 1 && pos && pos.quantity > 0) {
        if (bar.close < currentSAR) {
          ctx.sell(symbol, pos.quantity);
        }
      }
    },
  };
}

// Backtest Request Handler
function handleBacktest(body: BacktestRequest) {
  const engineConfig: Partial<BacktestConfig> = {
    initialCapital: body.config.initialCapital || 1000000,
    commissionRate: body.config.commissionRate ?? 0.0003,
    stampDutyRate: body.config.stampDutyRate ?? 0.001,
    slippage: body.config.slippage ?? 0.001,
  };

  let strategy: Strategy;
  let data: Map<string, Bar[]>;
  const p = body.strategyParams || {};
  const dataSource = body.dataSource || { type: 'mock' };

  // Load data based on source type
  if (dataSource.type === 'csv-file' && dataSource.filePath) {
    const bars = loadCsvFile(dataSource.filePath);
    const symbol = path.basename(dataSource.filePath, '.csv');
    data = new Map([[symbol, bars]]);
  } else if (dataSource.type === 'csv-directory' && dataSource.filePath) {
    // Check if specific symbols are selected
    if (dataSource.symbols && dataSource.symbols.length > 0) {
      // Load only selected symbols
      const dataDir = dataSource.filePath || path.join(process.cwd(), 'data');
      data = new Map<string, Bar[]>();
      
      for (const symbol of dataSource.symbols) {
        const csvPath = path.join(dataDir, `${symbol}.csv`);
        if (fs.existsSync(csvPath)) {
          const bars = loadCsvFile(csvPath);
          data.set(symbol, bars);
          console.log(`  Loaded ${symbol} (${bars.length} bars)`);
        } else {
          console.warn(`  File not found: ${csvPath}`);
        }
      }
    } else {
      // Load all files in directory
      data = loadCsvDirectory(dataSource.filePath);
    }
  } else if (dataSource.type === 'online' && dataSource.symbols && dataSource.onlineConfig) {
    const dataDir = path.join(process.cwd(), 'data');
    data = new Map<string, Bar[]>();

    for (const symbol of dataSource.symbols) {
      const csvPath = path.join(dataDir, `${symbol}.csv`);
      if (fs.existsSync(csvPath)) {
        const bars = loadCsvFile(csvPath);
        data.set(symbol, bars);
        serverLogger.debug(`Loaded ${symbol} (${bars.length} bars)`);
      } else {
        serverLogger.warn(`File not found: ${csvPath}`);
      }
    }

    if (data.size === 0) {
      serverLogger.warn('No data found, using mock data');
      data = new Map();
    }
  } else {
    data = new Map();
  }

  // Apply date range filter if specified
  if (body.dateRange && (body.dateRange.startDate || body.dateRange.endDate)) {
    const startDate = body.dateRange.startDate || '0000-00-00';
    const endDate = body.dateRange.endDate || '9999-99-99';

    serverLogger.info(`Filtering data by date range: ${startDate} to ${endDate}`);

    const filteredData = new Map<string, Bar[]>();
    for (const [symbol, bars] of data) {
      const filteredBars = bars.filter(bar => {
        return bar.date >= startDate && bar.date <= endDate;
      });
      if (filteredBars.length > 0) {
        filteredData.set(symbol, filteredBars);
        serverLogger.debug(`${symbol}: ${bars.length} -> ${filteredBars.length} bars`);
      }
    }
    data = filteredData;
  }

  // Get first symbol for strategy
  const firstSymbol = data.size > 0 ? Array.from(data.keys())[0] : '000001';

  // Create strategy with correct symbol
  switch (body.strategy) {
    case 'ma-crossover':
      strategy = createMACrossover(p.shortPeriod || 5, p.longPeriod || 20, firstSymbol);
      if (data.size === 0) {
        serverLogger.info('No data loaded, using mock 000001');
        data.set('000001', generateStockData('000001'));
      }
      break;
    case 'macd':
      strategy = createMACDStrategy(p.fastPeriod || 12, p.slowPeriod || 26, p.signalPeriod || 9, firstSymbol);
      if (data.size === 0) {
        serverLogger.info('No data loaded, using mock 000001');
        data.set('000001', generateStockData('000001'));
      }
      break;
    case 'rsi':
      strategy = createRSIStrategy(p.period || 14, p.overbought || 70, p.oversold || 30, firstSymbol);
      if (data.size === 0) {
        serverLogger.info('No data loaded, using mock 000001');
        data.set('000001', generateStockData('000001'));
      }
      break;
    case 'bollinger':
      strategy = createBollingerStrategy(p.period || 20, p.stdDev || 2, firstSymbol);
      if (data.size === 0) {
        serverLogger.info('No data loaded, using mock 000001');
        data.set('000001', generateStockData('000001'));
      }
      break;
    case 'multi-factor': {
      strategy = createMultiFactorStrategy(p);
      if (data.size === 0) {
        serverLogger.info('No data loaded, using multi-factor mock data');
        const symbols = ['600000', '600036', '601318', '000001', '000002',
                         '000858', '002415', '300059', '600519', '601166'];
        for (const sym of symbols) data.set(sym, generateStockData(sym));
      }
      break;
    }
    case 'dual-thrust':
      strategy = createDualThrustStrategy(p.k1 || 0.5, p.k2 || 0.5, p.lookback || 1, firstSymbol);
      if (data.size === 0) {
        serverLogger.info('No data loaded, using mock 000001');
        data.set('000001', generateStockData('000001'));
      }
      break;
    case 'parabolic-sar':
      strategy = createParabolicSARStrategy(p.afStart || 0.02, p.afIncrement || 0.02, p.afMax || 0.2, firstSymbol);
      if (data.size === 0) {
        serverLogger.info('No data loaded, using mock 000001');
        data.set('000001', generateStockData('000001'));
      }
      break;
    default:
      throw new Error(`Unknown strategy: ${body.strategy}`);
  }

  const engine = new BacktestEngine(engineConfig);
  return engine.run(strategy, data);
}

// HTTP Server
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/api/backtest') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const parsed: BacktestRequest = JSON.parse(body);

        // 验证请求参数
        if (!parsed.strategy) {
          throw new ValidationError('Missing strategy type');
        }
        if (!parsed.config) {
          throw new ValidationError('Missing backtest config');
        }

        serverLogger.info(`Running backtest: ${parsed.strategy}`, {
          strategy: parsed.strategy,
          dataSource: parsed.dataSource?.type,
          initialCapital: parsed.config?.initialCapital,
        });

        const result = handleBacktest(parsed);

        serverLogger.info('Backtest completed', {
          totalReturn: result.metrics.totalReturn,
          trades: result.trades.length,
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        const isAppError = err instanceof ValidationError || err instanceof DataError;
        const statusCode = isAppError ? (err as any).statusCode : 500;

        serverLogger.error('Backtest failed', error);

        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: {
            code: isAppError ? (err as any).code : 'INTERNAL_ERROR',
            message: error.message,
          },
        }));
      }
    });
    return;
  }

  if (req.method === 'GET' && req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  // List data files endpoint
  if (req.method === 'GET' && req.url === '/api/list-data-files') {
    try {
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      const files = fs.readdirSync(dataDir)
        .filter(f => f.endsWith('.csv'))
        .map(f => {
          const filePath = path.join(dataDir, f);
          const stats = fs.statSync(filePath);
          const symbol = path.basename(f, '.csv');
          
          // Read first and last date from CSV
          let startDate = '';
          let endDate = '';
          let bars = 0;
          try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.trim().split('\n');
            bars = lines.length - 1; // Exclude header
            if (lines.length > 1) {
              const firstLine = lines[1].split(',');
              const lastLine = lines[lines.length - 1].split(',');
              startDate = firstLine[0] || '';
              endDate = lastLine[0] || '';
            }
          } catch (e) {
            // Ignore parse errors
          }
          
          return {
            filename: f,
            symbol,
            size: stats.size,
            bars,
            startDate,
            endDate,
            modified: stats.mtime.toISOString(),
          };
        })
        .sort((a, b) => a.symbol.localeCompare(b.symbol));
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, files }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: err instanceof Error ? err.message : 'Failed to list files' }));
    }
    return;
  }

  // Fetch stock data endpoint with auto-save
  if (req.method === 'POST' && req.url === '/api/fetch-data') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body);
        const { symbols, source = 'netease', startDate, endDate, token, autoSave = true } = parsed;

        if (!symbols || !Array.isArray(symbols)) {
          throw new ValidationError('Missing stock symbols');
        }

        serverLogger.info(`Fetching data for ${symbols.length} stocks from ${source}`);

        const data = await fetchMultipleStocks(symbols, source, { startDate, endDate, token });

        let savedCount = 0;
        if (autoSave) {
          const dataDir = path.join(process.cwd(), 'data');
          for (const [symbol, bars] of data) {
            const filePath = path.join(dataDir, `${symbol}.csv`);
            saveToCsv(filePath, bars as any);
            serverLogger.debug(`Saved ${symbol} to ${filePath} (${bars.length} bars)`);
            savedCount++;
          }
          serverLogger.info(`Total saved: ${savedCount} stocks`);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          data: Array.from(data.entries()).map(([symbol, bars]) => ({ symbol, count: bars.length })),
          savedCount,
        }));
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        serverLogger.error('Failed to fetch data', error);

        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: {
            code: 'DATA_FETCH_ERROR',
            message: error.message,
          },
        }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => {
  serverLogger.info(`Server started on port ${PORT}`);
  serverLogger.info('Endpoints:');
  serverLogger.info('  GET  /api/health - Health check');
  serverLogger.info('  POST /api/backtest - Run backtest');
  serverLogger.info('  GET  /api/list-data-files - List data files');
  serverLogger.info('  POST /api/fetch-data - Fetch online data');
});
