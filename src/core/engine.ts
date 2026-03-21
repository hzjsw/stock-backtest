/**
 * 回测引擎 - 核心模块
 */
import {
  Bar,
  BacktestConfig,
  BacktestResult,
  Order,
  OrderSide,
  Position,
  PortfolioSnapshot,
  Strategy,
  StrategyContext,
  Trade,
} from './types';

/** 默认回测配置 */
const DEFAULT_CONFIG: BacktestConfig = {
  initialCapital: 1000000,
  commissionRate: 0.0003,
  stampDutyRate: 0.001,
  slippage: 0.001,
  startDate: '',
  endDate: '',
};

/**
 * 回测引擎
 */
export class BacktestEngine {
  private config: BacktestConfig;
  private cash: number;
  private positions: Map<string, Position> = new Map();
  private orders: Order[] = [];
  private trades: Trade[] = [];
  private portfolioHistory: PortfolioSnapshot[] = [];
  private allBars: Map<string, Bar[]> = new Map();
  private currentBarIndex: Map<string, number> = new Map();
  private currentDate: string = '';
  private orderIdCounter: number = 0;

  constructor(config?: Partial<BacktestConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cash = this.config.initialCapital;
  }

  /**
   * 运行回测
   */
  run(strategy: Strategy, data: Map<string, Bar[]>): BacktestResult {
    this.reset();
    this.allBars = data;

    // 获取所有交易日期并排序
    const allDates = this.getAllTradingDates(data);

    // 过滤日期范围
    const tradingDates = allDates.filter(date => {
      if (this.config.startDate && date < this.config.startDate) return false;
      if (this.config.endDate && date > this.config.endDate) return false;
      return true;
    });

    if (tradingDates.length === 0) {
      throw new Error('指定日期范围内没有交易数据');
    }

    // 构建策略上下文
    const ctx = this.createContext();

    // 策略初始化
    if (strategy.init) {
      strategy.init(ctx);
    }

    // 遍历每个交易日
    for (const date of tradingDates) {
      this.currentDate = date;
      this.updateCurrentBarIndices(date);
      this.updatePositionPrices();

      // 执行挂单
      this.processPendingOrders();

      // 调用策略
      strategy.onBar(ctx);

      // 记录投资组合快照
      this.takeSnapshot(date);
    }

    // 策略结束回调
    if (strategy.onFinish) {
      strategy.onFinish(ctx);
    }

    return {
      strategyName: strategy.name,
      config: this.config,
      metrics: this.calculateMetrics(),
      portfolioHistory: this.portfolioHistory,
      trades: this.trades,
    };
  }

  private reset(): void {
    this.cash = this.config.initialCapital;
    this.positions.clear();
    this.orders = [];
    this.trades = [];
    this.portfolioHistory = [];
    this.currentBarIndex.clear();
    this.orderIdCounter = 0;
  }

  private getAllTradingDates(data: Map<string, Bar[]>): string[] {
    const dateSet = new Set<string>();
    for (const bars of data.values()) {
      for (const bar of bars) {
        dateSet.add(bar.date);
      }
    }
    return Array.from(dateSet).sort();
  }

  private updateCurrentBarIndices(date: string): void {
    for (const [symbol, bars] of this.allBars) {
      const currentIdx = this.currentBarIndex.get(symbol) ?? 0;
      let idx = currentIdx;
      while (idx < bars.length && bars[idx].date < date) {
        idx++;
      }
      if (idx < bars.length && bars[idx].date === date) {
        this.currentBarIndex.set(symbol, idx);
      }
    }
  }

  private updatePositionPrices(): void {
    for (const [symbol, position] of this.positions) {
      const bar = this.getCurrentBar(symbol);
      if (bar) {
        position.currentPrice = bar.close;
        position.unrealizedPnl = (bar.close - position.avgCost) * position.quantity;
      }
    }
  }

  private getCurrentBar(symbol: string): Bar | undefined {
    const bars = this.allBars.get(symbol);
    const idx = this.currentBarIndex.get(symbol);
    if (!bars || idx === undefined || idx >= bars.length) return undefined;
    if (bars[idx].date !== this.currentDate) return undefined;
    return bars[idx];
  }

  private getBars(symbol: string): Bar[] {
    const bars = this.allBars.get(symbol);
    const idx = this.currentBarIndex.get(symbol);
    if (!bars || idx === undefined) return [];
    // 返回到当前bar为止的所有历史数据 (防止未来数据泄漏)
    return bars.slice(0, idx + 1);
  }

  private createContext(): StrategyContext {
    const engine = this;
    return {
      get currentDate() {
        return engine.currentDate;
      },
      get positions() {
        return engine.positions;
      },
      get cash() {
        return engine.cash;
      },
      get totalValue() {
        return engine.getTotalValue();
      },
      getBars(symbol: string) {
        return engine.getBars(symbol);
      },
      getCurrentBar(symbol: string) {
        return engine.getCurrentBar(symbol);
      },
      buy(symbol: string, quantity: number, price?: number) {
        engine.placeOrder(symbol, 'buy', quantity, price);
      },
      sell(symbol: string, quantity: number, price?: number) {
        engine.placeOrder(symbol, 'sell', quantity, price);
      },
      targetPercent(symbol: string, percent: number) {
        engine.targetPercent(symbol, percent);
      },
      liquidate(symbol: string) {
        engine.liquidate(symbol);
      },
    };
  }

  private placeOrder(symbol: string, side: OrderSide, quantity: number, price?: number): void {
    if (quantity <= 0) return;

    const bar = this.getCurrentBar(symbol);
    if (!bar) return;

    const order: Order = {
      id: `order_${++this.orderIdCounter}`,
      symbol,
      side,
      type: price ? 'limit' : 'market',
      quantity: Math.floor(quantity), // 整数手
      price,
      status: 'pending',
      createdAt: this.currentDate,
      commission: 0,
    };

    // 市价单立即执行
    if (order.type === 'market') {
      this.executeOrder(order, bar);
    } else {
      this.orders.push(order);
    }
  }

  private executeOrder(order: Order, bar: Bar): void {
    let fillPrice: number;

    if (order.type === 'limit' && order.price !== undefined) {
      fillPrice = order.price;
    } else {
      // 市价单使用收盘价 + 滑点
      fillPrice = order.side === 'buy'
        ? bar.close * (1 + this.config.slippage)
        : bar.close * (1 - this.config.slippage);
    }

    const totalCost = fillPrice * order.quantity;

    // 计算手续费
    let commission = totalCost * this.config.commissionRate;
    // 卖出时加收印花税
    if (order.side === 'sell') {
      commission += totalCost * this.config.stampDutyRate;
    }

    // 买入检查资金
    let tradePnl: number | undefined;

    if (order.side === 'buy') {
      if (this.cash < totalCost + commission) {
        order.status = 'cancelled';
        return;
      }
      this.cash -= totalCost + commission;
      this.updatePosition(order.symbol, order.quantity, fillPrice);
    } else {
      // 卖出检查持仓
      const position = this.positions.get(order.symbol);
      if (!position || position.quantity < order.quantity) {
        order.status = 'cancelled';
        return;
      }
      this.cash += totalCost - commission;
      tradePnl = (fillPrice - position.avgCost) * order.quantity;
      this.reducePosition(order.symbol, order.quantity, tradePnl);
    }

    order.status = 'filled';
    order.filledPrice = fillPrice;
    order.filledQuantity = order.quantity;
    order.filledAt = this.currentDate;
    order.commission = commission;

    // 记录交易
    this.trades.push({
      id: order.id,
      symbol: order.symbol,
      side: order.side,
      quantity: order.quantity,
      price: fillPrice,
      commission,
      date: this.currentDate,
      pnl: tradePnl,
    });
  }

  private updatePosition(symbol: string, quantity: number, price: number): void {
    const existing = this.positions.get(symbol);
    if (existing) {
      const totalCost = existing.avgCost * existing.quantity + price * quantity;
      const totalQty = existing.quantity + quantity;
      existing.avgCost = totalCost / totalQty;
      existing.quantity = totalQty;
      existing.currentPrice = price;
      existing.unrealizedPnl = (price - existing.avgCost) * totalQty;
    } else {
      this.positions.set(symbol, {
        symbol,
        quantity,
        avgCost: price,
        currentPrice: price,
        unrealizedPnl: 0,
        realizedPnl: 0,
      });
    }
  }

  private reducePosition(symbol: string, quantity: number, pnl: number): void {
    const position = this.positions.get(symbol);
    if (!position) return;

    position.quantity -= quantity;
    position.realizedPnl += pnl;

    if (position.quantity <= 0) {
      this.positions.delete(symbol);
    }
  }

  private processPendingOrders(): void {
    const pendingOrders = this.orders.filter(o => o.status === 'pending');
    for (const order of pendingOrders) {
      const bar = this.getCurrentBar(order.symbol);
      if (!bar) continue;

      if (order.type === 'limit' && order.price !== undefined) {
        if (order.side === 'buy' && bar.low <= order.price) {
          this.executeOrder(order, bar);
        } else if (order.side === 'sell' && bar.high >= order.price) {
          this.executeOrder(order, bar);
        }
      }
    }
  }

  private targetPercent(symbol: string, percent: number): void {
    const totalValue = this.getTotalValue();
    const targetValue = totalValue * percent;
    const bar = this.getCurrentBar(symbol);
    if (!bar) return;

    const position = this.positions.get(symbol);
    const currentValue = position ? position.quantity * bar.close : 0;
    const diff = targetValue - currentValue;

    if (Math.abs(diff) < bar.close) return; // 差异太小，不操作

    if (diff > 0) {
      const quantity = Math.floor(diff / bar.close);
      if (quantity > 0) this.placeOrder(symbol, 'buy', quantity);
    } else {
      const quantity = Math.floor(Math.abs(diff) / bar.close);
      if (quantity > 0) this.placeOrder(symbol, 'sell', quantity);
    }
  }

  private liquidate(symbol: string): void {
    const position = this.positions.get(symbol);
    if (position && position.quantity > 0) {
      this.placeOrder(symbol, 'sell', position.quantity);
    }
  }

  private getTotalValue(): number {
    let positionsValue = 0;
    for (const position of this.positions.values()) {
      positionsValue += position.quantity * position.currentPrice;
    }
    return this.cash + positionsValue;
  }

  private takeSnapshot(date: string): void {
    let positionsValue = 0;
    const positionsList: Position[] = [];

    for (const position of this.positions.values()) {
      positionsValue += position.quantity * position.currentPrice;
      positionsList.push({ ...position });
    }

    const totalValue = this.cash + positionsValue;
    const prevSnapshot = this.portfolioHistory[this.portfolioHistory.length - 1];
    const prevTotalValue = prevSnapshot ? prevSnapshot.totalValue : this.config.initialCapital;
    const dailyReturn = (totalValue - prevTotalValue) / prevTotalValue;

    this.portfolioHistory.push({
      date,
      totalValue,
      cash: this.cash,
      positionsValue,
      positions: positionsList,
      dailyReturn,
    });
  }

  private calculateMetrics(): import('./types').PerformanceMetrics {
    const history = this.portfolioHistory;
    if (history.length === 0) {
      return this.emptyMetrics();
    }

    const dailyReturns = history.map(h => h.dailyReturn);
    const totalReturn = (history[history.length - 1].totalValue - this.config.initialCapital) / this.config.initialCapital;

    // 年化收益率
    const tradingDays = history.length;
    const years = tradingDays / 252;
    const annualizedReturn = Math.pow(1 + totalReturn, 1 / years) - 1;

    // 日均收益率和标准差
    const avgDailyReturn = dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length;
    const dailyReturnStd = Math.sqrt(
      dailyReturns.reduce((s, r) => s + Math.pow(r - avgDailyReturn, 2), 0) / dailyReturns.length
    );

    // 年化波动率
    const annualizedVolatility = dailyReturnStd * Math.sqrt(252);

    // 夏普比率 (无风险利率 3%)
    const riskFreeRate = 0.03;
    const sharpeRatio = annualizedVolatility === 0
      ? 0
      : (annualizedReturn - riskFreeRate) / annualizedVolatility;

    // 最大回撤
    let maxDrawdown = 0;
    let maxDrawdownDays = 0;
    let peak = history[0].totalValue;
    let peakIndex = 0;
    let currentDDDays = 0;

    for (let i = 1; i < history.length; i++) {
      if (history[i].totalValue > peak) {
        peak = history[i].totalValue;
        peakIndex = i;
        currentDDDays = 0;
      } else {
        const dd = (peak - history[i].totalValue) / peak;
        currentDDDays = i - peakIndex;
        if (dd > maxDrawdown) {
          maxDrawdown = dd;
          maxDrawdownDays = currentDDDays;
        }
      }
    }

    // Calmar 比率
    const calmarRatio = maxDrawdown === 0 ? 0 : annualizedReturn / maxDrawdown;

    // Sortino 比率
    const downsideReturns = dailyReturns.filter(r => r < 0);
    const downsideDeviation = downsideReturns.length > 0
      ? Math.sqrt(downsideReturns.reduce((s, r) => s + r * r, 0) / downsideReturns.length) * Math.sqrt(252)
      : 0;
    const sortinoRatio = downsideDeviation === 0
      ? 0
      : (annualizedReturn - riskFreeRate) / downsideDeviation;

    // 交易统计
    const closedTrades = this.trades.filter(t => t.side === 'sell' && t.pnl !== undefined);
    const winningTrades = closedTrades.filter(t => (t.pnl || 0) > 0);
    const losingTrades = closedTrades.filter(t => (t.pnl || 0) <= 0);
    const winRate = closedTrades.length > 0 ? winningTrades.length / closedTrades.length : 0;

    const avgWin = winningTrades.length > 0
      ? winningTrades.reduce((s, t) => s + (t.pnl || 0), 0) / winningTrades.length
      : 0;
    const avgLoss = losingTrades.length > 0
      ? Math.abs(losingTrades.reduce((s, t) => s + (t.pnl || 0), 0) / losingTrades.length)
      : 0;
    const profitLossRatio = avgLoss === 0 ? 0 : avgWin / avgLoss;

    return {
      totalReturn,
      annualizedReturn,
      sharpeRatio,
      maxDrawdown,
      maxDrawdownDays,
      winRate,
      profitLossRatio,
      totalTrades: this.trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      avgDailyReturn,
      dailyReturnStd,
      annualizedVolatility,
      calmarRatio,
      sortinoRatio,
    };
  }

  private emptyMetrics(): import('./types').PerformanceMetrics {
    return {
      totalReturn: 0,
      annualizedReturn: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      maxDrawdownDays: 0,
      winRate: 0,
      profitLossRatio: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      avgDailyReturn: 0,
      dailyReturnStd: 0,
      annualizedVolatility: 0,
      calmarRatio: 0,
      sortinoRatio: 0,
    };
  }
}
