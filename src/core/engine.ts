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
  RiskOrder,
  OrderStatus,
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
  private riskOrders: RiskOrder[] = []; // 止损止盈订单
  private trades: Trade[] = [];
  private portfolioHistory: PortfolioSnapshot[] = [];
  private allBars: Map<string, Bar[]> = new Map();
  private currentBarIndex: Map<string, number> = new Map();
  private currentDate: string = '';
  private prevDate: string = '';
  private orderIdCounter: number = 0;
  private benchmarkHistory: Array<{ date: string; value: number }> = [];
  // 记录每笔买入的成本价，用于全局止损止盈计算
  private buyCostMap: Map<string, number> = new Map();
  // 记录持仓开仓日期，用于跳过当天止损止盈检查
  private positionOpenDateMap: Map<string, string> = new Map();
  // 记录持仓期间的最高价，用于追踪止损
  private positionHighMap: Map<string, number> = new Map();

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

      // 1. 执行挂单（限价单）
      this.processPendingOrders();

      // 2. 调用策略（让策略决定买卖）
      strategy.onBar(ctx);

      // 3. 检查全局止损止盈（在策略执行后，下一个交易日再触发）
      // 注意：不在开仓当天检查，所以需要等到下一个交易日
      if (this.prevDate) {
        this.checkGlobalRiskControlForDate(this.prevDate);
      }
      this.prevDate = date;

      // 4. 检查止损止盈订单（策略设置的）
      this.processRiskOrders();

      // 记录投资组合快照
      this.takeSnapshot(date);
    }

    // 策略结束回调
    if (strategy.onFinish) {
      strategy.onFinish(ctx);
    }

    // 计算基准对比 (如果有基准配置)
    if (this.config.benchmark && this.allBars.has(this.config.benchmark)) {
      this.calculateBenchmarkHistory();
    }

    return {
      strategyName: strategy.name,
      config: this.config,
      metrics: this.calculateMetrics(),
      portfolioHistory: this.portfolioHistory,
      trades: this.trades,
      benchmarkHistory: this.benchmarkHistory.length > 0 ? this.benchmarkHistory : undefined,
    };
  }

  private reset(): void {
    this.cash = this.config.initialCapital;
    this.positions.clear();
    this.orders = [];
    this.riskOrders = [];
    this.trades = [];
    this.portfolioHistory = [];
    this.currentBarIndex.clear();
    this.orderIdCounter = 0;
    this.benchmarkHistory = [];
    this.buyCostMap.clear();
    this.positionOpenDateMap.clear();
    this.positionHighMap.clear();
    this.prevDate = '';
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
        // 更新持仓期间的最高价（用于追踪止损）
        const highestPrice = this.positionHighMap.get(symbol) || position.avgCost;
        if (bar.high > highestPrice) {
          this.positionHighMap.set(symbol, bar.high);
        }
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

  private getPositionOpenDate(symbol: string): string | undefined {
    return this.positionOpenDateMap.get(symbol);
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
      setStopLoss(symbol: string, triggerPrice: number, quantity?: number) {
        engine.setStopLoss(symbol, triggerPrice, quantity);
      },
      setTakeProfit(symbol: string, triggerPrice: number, quantity?: number) {
        engine.setTakeProfit(symbol, triggerPrice, quantity);
      },
      setTrailingStop(symbol: string, deltaPercent: number, quantity?: number) {
        engine.setTrailingStop(symbol, deltaPercent, quantity);
      },
      cancelRiskOrders(symbol: string) {
        engine.cancelRiskOrders(symbol);
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
      // 更新买入成本价（用于止损止盈计算）
      this.buyCostMap.set(symbol, existing.avgCost);
    } else {
      this.positions.set(symbol, {
        symbol,
        quantity,
        avgCost: price,
        currentPrice: price,
        unrealizedPnl: 0,
        realizedPnl: 0,
      });
      // 记录买入成本价
      this.buyCostMap.set(symbol, price);
      // 记录开仓日期
      this.positionOpenDateMap.set(symbol, this.currentDate);
      // 初始化最高价
      this.positionHighMap.set(symbol, price);
    }
  }

  private reducePosition(symbol: string, quantity: number, pnl: number): void {
    const position = this.positions.get(symbol);
    if (!position) return;

    position.quantity -= quantity;
    position.realizedPnl += pnl;

    if (position.quantity <= 0) {
      this.positions.delete(symbol);
      // 清仓时删除成本记录和止损止盈订单
      this.buyCostMap.delete(symbol);
      this.positionOpenDateMap.delete(symbol);
      this.positionHighMap.delete(symbol);
      this.cancelRiskOrders(symbol);
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

  /**
   * 处理止损止盈订单
   */
  private processRiskOrders(): void {
    for (const riskOrder of this.riskOrders) {
      if (riskOrder.status !== 'pending') continue;

      const bar = this.getCurrentBar(riskOrder.symbol);
      if (!bar) continue;

      const position = this.positions.get(riskOrder.symbol);
      if (!position || position.quantity <= 0) {
        // 没有持仓，取消订单
        riskOrder.status = 'cancelled';
        continue;
      }

      // 跳过开仓当天的止损止盈检查（当天买入的持仓，当天不触发止损止盈）
      const positionOpenDate = this.getPositionOpenDate(riskOrder.symbol);
      if (positionOpenDate === this.currentDate) {
        continue;
      }

      let triggered = false;

      switch (riskOrder.type) {
        case 'stop-loss':
          // 止损：价格跌破触发价
          if (riskOrder.triggerPrice && bar.low <= riskOrder.triggerPrice) {
            triggered = true;
          }
          break;

        case 'take-profit':
          // 止盈：价格涨突破发价
          if (riskOrder.triggerPrice && bar.high >= riskOrder.triggerPrice) {
            triggered = true;
          }
          break;

        case 'trailing-stop':
          // 更新最高价
          if (!riskOrder.highestPrice || bar.high > riskOrder.highestPrice) {
            riskOrder.highestPrice = bar.high;
          }
          // 追踪止损：从最高点下跌触发差价
          if (riskOrder.highestPrice && riskOrder.triggerPrice) {
            const threshold = riskOrder.highestPrice * (1 - riskOrder.triggerPrice);
            if (bar.low <= threshold) {
              triggered = true;
            }
          }
          break;
      }

      if (triggered) {
        riskOrder.status = 'filled';
        riskOrder.triggeredAt = this.currentDate;
        // 执行卖出
        const qty = riskOrder.quantity || position.quantity;
        this.placeOrder(riskOrder.symbol, 'sell', qty);
      }
    }

    // 清理已完成的订单
    this.riskOrders = this.riskOrders.filter(o => o.status === 'pending');
  }

  /**
   * 检查指定日期的全局止损止盈配置
   */
  private checkGlobalRiskControlForDate(checkDate: string): void {
    const riskControl = this.config.riskControl;
    if (!riskControl) {
      return;
    }

    // 临时设置 currentDate 和 currentBarIndex 为检查日期
    const originalDate = this.currentDate;
    const originalBarIndex = new Map(this.currentBarIndex);

    // 更新 currentBarIndex 到检查日期
    for (const [symbol, bars] of this.allBars) {
      let idx = 0;
      while (idx < bars.length && bars[idx].date <= checkDate) {
        idx++;
      }
      idx--;
      if (idx >= 0 && bars[idx].date === checkDate) {
        this.currentBarIndex.set(symbol, idx);
      }
    }

    // 设置 currentDate 为检查日期，确保 placeOrder 使用正确的日期
    this.currentDate = checkDate;

    for (const [symbol, position] of this.positions) {
      const costPrice = this.buyCostMap.get(symbol);

      if (!costPrice) continue;

      // 跳过买入当天开仓的持仓（当天不会触发止损止盈）
      const positionOpenDate = this.getPositionOpenDate(symbol);
      if (positionOpenDate === checkDate) {
        continue;
      }

      // 获取检查日期的 bar
      const bar = this.getCurrentBar(symbol);
      if (!bar) continue;

      let triggered = false;

      // 全局止损：检查当日最低价是否跌破止损价
      if (riskControl.stopLossPercent && !triggered) {
        const stopLossPrice = costPrice * (1 - riskControl.stopLossPercent);
        if (bar.low <= stopLossPrice) {
          this.placeOrder(symbol, 'sell', position.quantity);
          triggered = true;
        }
      }

      // 全局止盈：检查当日最高价是否突破止盈价
      if (riskControl.takeProfitPercent && !triggered) {
        const takeProfitPrice = costPrice * (1 + riskControl.takeProfitPercent);
        if (bar.high >= takeProfitPrice) {
          this.placeOrder(symbol, 'sell', position.quantity);
          triggered = true;
        }
      }

      // 追踪止损：检查当日最低价是否跌破追踪止损价
      if (riskControl.trailingStopPercent && !triggered) {
        const highestPrice = this.positionHighMap.get(symbol) || costPrice;
        const threshold = highestPrice * (1 - riskControl.trailingStopPercent);
        if (bar.low <= threshold) {
          this.placeOrder(symbol, 'sell', position.quantity);
          triggered = true;
        }
      }
    }

    // 恢复原始状态
    this.currentDate = originalDate;
    this.currentBarIndex.clear();
    for (const [k, v] of originalBarIndex) {
      this.currentBarIndex.set(k, v);
    }
  }

  /**
   * 检查全局止损止盈配置（已废弃，使用 checkGlobalRiskControlForDate）
   */
  private checkGlobalRiskControl(): void {
    this.checkGlobalRiskControlForDate(this.currentDate);
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

  /**
   * 设置止损订单
   */
  private setStopLoss(symbol: string, triggerPrice: number, quantity?: number): void {
    const position = this.positions.get(symbol);
    if (!position || position.quantity <= 0) return;

    const riskOrder: RiskOrder = {
      id: `risk_${++this.orderIdCounter}`,
      symbol,
      type: 'stop-loss',
      triggerPrice,
      quantity: quantity || position.quantity,
      referencePrice: position.avgCost,
      status: 'pending',
    };
    this.riskOrders.push(riskOrder);
  }

  /**
   * 设置止盈订单
   */
  private setTakeProfit(symbol: string, triggerPrice: number, quantity?: number): void {
    const position = this.positions.get(symbol);
    if (!position || position.quantity <= 0) return;

    const riskOrder: RiskOrder = {
      id: `risk_${++this.orderIdCounter}`,
      symbol,
      type: 'take-profit',
      triggerPrice,
      quantity: quantity || position.quantity,
      referencePrice: position.avgCost,
      status: 'pending',
    };
    this.riskOrders.push(riskOrder);
  }

  /**
   * 设置追踪止损订单
   */
  private setTrailingStop(symbol: string, deltaPercent: number, quantity?: number): void {
    const position = this.positions.get(symbol);
    if (!position || position.quantity <= 0) return;

    const bar = this.getCurrentBar(symbol);
    const currentPrice = bar?.close || position.currentPrice;

    const riskOrder: RiskOrder = {
      id: `risk_${++this.orderIdCounter}`,
      symbol,
      type: 'trailing-stop',
      triggerPrice: deltaPercent, // 用 triggerPrice 存储百分比
      quantity: quantity || position.quantity,
      referencePrice: currentPrice,
      highestPrice: currentPrice,
      status: 'pending',
    };
    this.riskOrders.push(riskOrder);
  }

  /**
   * 取消指定股票的所有止损止盈订单
   */
  private cancelRiskOrders(symbol: string): void {
    this.riskOrders = this.riskOrders.filter(o => o.symbol !== symbol);
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
      // 基准对比指标
      benchmarkReturn: this.calculateBenchmarkReturn(),
      excessReturn: this.calculateExcessReturn(),
      informationRatio: this.calculateInformationRatio(),
      trackingError: this.calculateTrackingError(),
      benchmarkWinRate: this.calculateBenchmarkWinRate(),
    };
  }

  /**
   * 计算基准历史净值 (假设基准为等权重买入并持有)
   */
  private calculateBenchmarkHistory(): void {
    if (!this.config.benchmark) return;

    const benchmarkBars = this.allBars.get(this.config.benchmark);
    if (!benchmarkBars || benchmarkBars.length === 0) return;

    // 创建日期到 bar 的映射
    const barMap = new Map<string, Bar>();
    for (const bar of benchmarkBars) {
      barMap.set(bar.date, bar);
    }

    // 计算基准每日净值
    let benchmarkValue = this.config.initialCapital;
    let prevClose = benchmarkBars[0]?.close || 1;

    for (const snapshot of this.portfolioHistory) {
      const bar = barMap.get(snapshot.date);
      if (bar) {
        // 假设基准收益率为当日涨跌幅
        const dailyReturn = (bar.close - prevClose) / prevClose;
        benchmarkValue *= (1 + dailyReturn);
        prevClose = bar.close;

        this.benchmarkHistory.push({
          date: snapshot.date,
          value: benchmarkValue,
        });
      }
    }
  }

  /**
   * 计算基准收益率
   */
  private calculateBenchmarkReturn(): number | undefined {
    if (this.benchmarkHistory.length === 0) return undefined;
    const startValue = this.benchmarkHistory[0].value;
    const endValue = this.benchmarkHistory[this.benchmarkHistory.length - 1].value;
    return (endValue - startValue) / startValue;
  }

  /**
   * 计算超额收益
   */
  private calculateExcessReturn(): number | undefined {
    const benchmarkReturn = this.calculateBenchmarkReturn();
    if (benchmarkReturn === undefined) return undefined;
    return (this.portfolioHistory[this.portfolioHistory.length - 1]?.totalValue || 0) / this.config.initialCapital - 1 - benchmarkReturn;
  }

  /**
   * 计算信息比率 (超额收益/跟踪误差)
   */
  private calculateInformationRatio(): number | undefined {
    if (this.benchmarkHistory.length === 0) return undefined;

    // 计算每日超额收益
    const portfolioMap = new Map(this.portfolioHistory.map(h => [h.date, h.dailyReturn]));
    const benchmarkDailyReturns: number[] = [];
    const excessReturns: number[] = [];

    for (let i = 1; i < this.benchmarkHistory.length; i++) {
      const benchReturn = (this.benchmarkHistory[i].value - this.benchmarkHistory[i - 1].value) / this.benchmarkHistory[i - 1].value;
      benchmarkDailyReturns.push(benchReturn);

      const portReturn = portfolioMap.get(this.benchmarkHistory[i].date) || 0;
      excessReturns.push(portReturn - benchReturn);
    }

    if (excessReturns.length === 0) return undefined;

    // 计算平均超额收益和标准差
    const avgExcess = excessReturns.reduce((s, r) => s + r, 0) / excessReturns.length;
    const std = Math.sqrt(excessReturns.reduce((s, r) => s + Math.pow(r - avgExcess, 2), 0) / excessReturns.length);

    if (std === 0) return undefined;

    // 年化
    return (avgExcess * 252) / (std * Math.sqrt(252));
  }

  /**
   * 计算跟踪误差 (年化)
   */
  private calculateTrackingError(): number | undefined {
    if (this.benchmarkHistory.length === 0) return undefined;

    const portfolioMap = new Map(this.portfolioHistory.map(h => [h.date, h.dailyReturn]));
    const excessReturns: number[] = [];

    for (let i = 1; i < this.benchmarkHistory.length; i++) {
      const benchReturn = (this.benchmarkHistory[i].value - this.benchmarkHistory[i - 1].value) / this.benchmarkHistory[i - 1].value;
      const portReturn = portfolioMap.get(this.benchmarkHistory[i].date) || 0;
      excessReturns.push(portReturn - benchReturn);
    }

    if (excessReturns.length === 0) return undefined;

    const avgExcess = excessReturns.reduce((s, r) => s + r, 0) / excessReturns.length;
    const variance = excessReturns.reduce((s, r) => s + Math.pow(r - avgExcess, 2), 0) / excessReturns.length;

    return Math.sqrt(variance) * Math.sqrt(252);
  }

  /**
   * 计算基准胜率 (组合收益跑赢基准的天数比例)
   */
  private calculateBenchmarkWinRate(): number | undefined {
    if (this.benchmarkHistory.length === 0) return undefined;

    const portfolioMap = new Map(this.portfolioHistory.map(h => [h.date, h.dailyReturn]));
    let winDays = 0;
    let totalDays = 0;

    for (let i = 1; i < this.benchmarkHistory.length; i++) {
      const benchReturn = (this.benchmarkHistory[i].value - this.benchmarkHistory[i - 1].value) / this.benchmarkHistory[i - 1].value;
      const portReturn = portfolioMap.get(this.benchmarkHistory[i].date) || 0;

      if (portReturn > benchReturn) winDays++;
      totalDays++;
    }

    return totalDays > 0 ? winDays / totalDays : 0;
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
      benchmarkReturn: undefined,
      excessReturn: undefined,
      informationRatio: undefined,
      trackingError: undefined,
      benchmarkWinRate: undefined,
    };
  }
}
