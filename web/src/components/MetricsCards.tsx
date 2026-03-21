import type { PerformanceMetrics, BacktestConfig } from '@/types/backtest'
import { TrendingUp, TrendingDown, BarChart3, Target, Activity, Percent } from 'lucide-react'

interface MetricsCardsProps {
  metrics: PerformanceMetrics
  config: BacktestConfig
}

function fmt(value: number, type: 'percent' | 'number' | 'money' = 'number'): string {
  if (type === 'percent') return (value * 100).toFixed(2) + '%'
  if (type === 'money') return value.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  return value.toFixed(2)
}

interface MetricItem {
  label: string
  value: string
  type: 'positive' | 'negative' | 'neutral'
  icon: React.ReactNode
}

export function MetricsCards({ metrics, config }: MetricsCardsProps) {
  const finalValue = config.initialCapital * (1 + metrics.totalReturn)

  const primaryMetrics: MetricItem[] = [
    {
      label: '总收益率',
      value: fmt(metrics.totalReturn, 'percent'),
      type: metrics.totalReturn >= 0 ? 'positive' : 'negative',
      icon: metrics.totalReturn >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />,
    },
    {
      label: '年化收益率',
      value: fmt(metrics.annualizedReturn, 'percent'),
      type: metrics.annualizedReturn >= 0 ? 'positive' : 'negative',
      icon: <Percent className="w-4 h-4" />,
    },
    {
      label: '夏普比率',
      value: fmt(metrics.sharpeRatio),
      type: metrics.sharpeRatio >= 1 ? 'positive' : metrics.sharpeRatio >= 0 ? 'neutral' : 'negative',
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      label: '最大回撤',
      value: fmt(metrics.maxDrawdown, 'percent'),
      type: 'negative',
      icon: <Activity className="w-4 h-4" />,
    },
  ]

  const secondaryMetrics = [
    { label: '最终资产', value: fmt(finalValue, 'money') },
    { label: '年化波动率', value: fmt(metrics.annualizedVolatility, 'percent') },
    { label: 'Calmar', value: fmt(metrics.calmarRatio) },
    { label: 'Sortino', value: fmt(metrics.sortinoRatio) },
    { label: '胜率', value: fmt(metrics.winRate, 'percent') },
    { label: '盈亏比', value: fmt(metrics.profitLossRatio) },
    { label: '交易次数', value: String(metrics.totalTrades) },
    { label: '回撤天数', value: String(metrics.maxDrawdownDays) },
  ]

  return (
    <div className="space-y-3 animate-slide-up">
      {/* Primary metrics - large cards */}
      <div className="grid grid-cols-4 gap-3">
        {primaryMetrics.map(m => (
          <div key={m.label} className="metric-card rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={m.type === 'positive' ? 'text-profit' : m.type === 'negative' ? 'text-loss' : 'text-gold'}>
                {m.icon}
              </span>
              <span className="text-xs text-muted-foreground">{m.label}</span>
            </div>
            <div className={`text-2xl font-bold num ${
              m.type === 'positive' ? 'text-profit' : m.type === 'negative' ? 'text-loss' : 'text-foreground'
            }`}>
              {m.value}
            </div>
          </div>
        ))}
      </div>

      {/* Secondary metrics - compact row */}
      <div className="grid grid-cols-8 gap-2">
        {secondaryMetrics.map(m => (
          <div key={m.label} className="metric-card rounded-md px-3 py-2.5 text-center">
            <div className="text-[10px] text-muted-foreground mb-0.5">{m.label}</div>
            <div className="text-sm font-semibold num text-foreground">{m.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
