import { MetricsCards } from '@/components/MetricsCards'
import { ChartGrid } from '@/components/ChartGrid'
import { TradeTable } from '@/components/TradeTable'
import type { BacktestResult } from '@/types/backtest'
import { BarChart3, Zap } from 'lucide-react'

interface DashboardProps {
  result: BacktestResult | null
  isLoading: boolean
}

export function Dashboard({ result, isLoading }: DashboardProps) {
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center animate-pulse-gold"
            style={{ background: 'var(--gradient-gold)' }}>
            <Zap className="w-6 h-6 text-primary-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">正在运行回测策略...</p>
          <div className="mt-4 w-48 h-1.5 mx-auto rounded-full overflow-hidden" style={{ background: 'hsl(var(--secondary))' }}>
            <div className="h-full rounded-full shimmer" style={{ background: 'var(--gradient-gold)', width: '60%' }} />
          </div>
        </div>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--gradient-surface)', border: '1px solid hsl(var(--border))' }}>
            <BarChart3 className="w-8 h-8" style={{ color: 'hsl(var(--gold-dim))' }} />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">选择策略并运行回测</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            在左侧面板中选择交易策略、调整参数和回测配置，然后点击"运行回测"按钮查看详细的绩效分析报告。
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4">
            {[
              { label: '技术指标', desc: 'MA / MACD / RSI / 布林带' },
              { label: '因子选股', desc: '动量 / 波动率 / 均线偏离' },
              { label: '可视化分析', desc: '净值 / 回撤 / 热力图' },
            ].map(item => (
              <div key={item.label} className="metric-card rounded-lg p-4 text-center">
                <div className="text-xs font-semibold text-gold mb-1">{item.label}</div>
                <div className="text-[11px] text-muted-foreground">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{result.strategyName}</h2>
          <p className="text-xs text-muted-foreground num">
            {result.portfolioHistory[0]?.date} ~ {result.portfolioHistory[result.portfolioHistory.length - 1]?.date}
            &nbsp;&middot;&nbsp;初始资金 {result.config.initialCapital.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Metrics */}
      <MetricsCards metrics={result.metrics} config={result.config} />

      {/* Charts */}
      <ChartGrid result={result} />

      {/* Trades */}
      <TradeTable trades={result.trades} />
    </div>
  )
}
