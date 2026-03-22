/** Shared types mirroring the backend BacktestResult */

export interface PortfolioSnapshot {
  date: string
  totalValue: number
  cash: number
  positionsValue: number
  dailyReturn: number
}

export interface Trade {
  id: string
  symbol: string
  side: 'buy' | 'sell'
  quantity: number
  price: number
  commission: number
  date: string
  pnl?: number
}

export interface PerformanceMetrics {
  totalReturn: number
  annualizedReturn: number
  sharpeRatio: number
  maxDrawdown: number
  maxDrawdownDays: number
  winRate: number
  profitLossRatio: number
  totalTrades: number
  winningTrades: number
  losingTrades: number
  avgDailyReturn: number
  dailyReturnStd: number
  annualizedVolatility: number
  calmarRatio: number
  sortinoRatio: number
}

export interface BacktestConfig {
  initialCapital: number
  commissionRate: number
  stampDutyRate: number
  slippage: number
  startDate: string
  endDate: string
}

export interface BacktestResult {
  strategyName: string
  config: BacktestConfig
  metrics: PerformanceMetrics
  portfolioHistory: PortfolioSnapshot[]
  trades: Trade[]
}

export type StrategyType = 'ma-crossover' | 'macd' | 'rsi' | 'bollinger' | 'multi-factor' | 'dual-thrust' | 'parabolic-sar'

export interface StrategyParam {
  key: string
  label: string
  value: number
  min: number
  max: number
  step: number
}

export interface StrategyOption {
  type: StrategyType
  name: string
  description: string
  params: StrategyParam[]
}

export const STRATEGY_OPTIONS: StrategyOption[] = [
  {
    type: 'ma-crossover',
    name: '双均线交叉',
    description: '短期均线上穿长期均线买入，下穿卖出',
    params: [
      { key: 'shortPeriod', label: '短期均线', value: 5, min: 2, max: 60, step: 1 },
      { key: 'longPeriod', label: '长期均线', value: 20, min: 5, max: 250, step: 1 },
    ],
  },
  {
    type: 'macd',
    name: 'MACD策略',
    description: 'MACD金叉买入，死叉卖出',
    params: [
      { key: 'fastPeriod', label: '快线周期', value: 12, min: 2, max: 50, step: 1 },
      { key: 'slowPeriod', label: '慢线周期', value: 26, min: 10, max: 100, step: 1 },
      { key: 'signalPeriod', label: '信号线周期', value: 9, min: 2, max: 30, step: 1 },
    ],
  },
  {
    type: 'rsi',
    name: 'RSI策略',
    description: 'RSI超卖买入，超买卖出',
    params: [
      { key: 'period', label: 'RSI周期', value: 14, min: 2, max: 50, step: 1 },
      { key: 'overbought', label: '超买阈值', value: 70, min: 50, max: 95, step: 1 },
      { key: 'oversold', label: '超卖阈值', value: 30, min: 5, max: 50, step: 1 },
    ],
  },
  {
    type: 'bollinger',
    name: '布林带策略',
    description: '价格触及下轨买入，触及上轨卖出',
    params: [
      { key: 'period', label: '均线周期', value: 20, min: 5, max: 100, step: 1 },
      { key: 'stdDev', label: '标准差倍数', value: 2, min: 0.5, max: 4, step: 0.1 },
    ],
  },
  {
    type: 'multi-factor',
    name: '多因子选股',
    description: '多因子打分排名，定期调仓',
    params: [
      { key: 'momentumWeight', label: '动量权重', value: 0.3, min: 0, max: 1, step: 0.05 },
      { key: 'volatilityWeight', label: '波动率权重', value: 0.2, min: 0, max: 1, step: 0.05 },
      { key: 'maDeviationWeight', label: '均线偏离权重', value: 0.25, min: 0, max: 1, step: 0.05 },
      { key: 'volumeRatioWeight', label: '量比权重', value: 0.25, min: 0, max: 1, step: 0.05 },
      { key: 'topN', label: '持仓数量', value: 3, min: 1, max: 10, step: 1 },
    ],
  },
  {
    type: 'dual-thrust',
    name: 'Dual Thrust',
    description: '开盘区间突破策略，价格突破上轨买入，跌破下轨卖出',
    params: [
      { key: 'k1', label: '上轨系数 K1', value: 0.5, min: 0.1, max: 2, step: 0.1 },
      { key: 'k2', label: '下轨系数 K2', value: 0.5, min: 0.1, max: 2, step: 0.1 },
      { key: 'lookback', label: '回看天数', value: 1, min: 1, max: 10, step: 1 },
    ],
  },
  {
    type: 'parabolic-sar',
    name: 'Parabolic SAR',
    description: '抛物线转向策略，趋势反转时交易',
    params: [
      { key: 'afStart', label: '初始加速因子', value: 0.02, min: 0.01, max: 0.1, step: 0.01 },
      { key: 'afIncrement', label: '加速增量', value: 0.02, min: 0.01, max: 0.1, step: 0.01 },
      { key: 'afMax', label: '最大加速因子', value: 0.2, min: 0.1, max: 0.5, step: 0.05 },
    ],
  },
]
