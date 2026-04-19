import { useState, useEffect } from 'react'
import { Play, Settings, TrendingUp, Loader2, Calendar, Shield, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { STRATEGY_OPTIONS, type StrategyType, type BacktestRequest, type BacktestResult, type DataSourceConfig, type StrategyParam } from '@/types/backtest'
import { DataSourcePanel } from '@/components/DataSourcePanel'
import { getVersionInfo, type VersionInfo } from '@/lib/api'

interface SidebarProps {
  onRunBacktest: (config: BacktestRequest) => void
  isLoading: boolean
  result: BacktestResult | null
}

export function Sidebar({ onRunBacktest, isLoading, result }: SidebarProps) {
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyType>('ma-crossover')
  const [strategyParams, setStrategyParams] = useState<Record<string, number>>({})
  const [initialCapital, setInitialCapital] = useState(1000000)
  const [commissionRate, setCommissionRate] = useState(0.0003)
  const [stampDutyRate, setStampDutyRate] = useState(0.001)
  const [slippage, setSlippage] = useState(0.001)
  const [dataSource, setDataSource] = useState<DataSourceConfig>({ type: 'mock' })
  // Date range state
  const [backtestStartDate, setBacktestStartDate] = useState('')
  const [backtestEndDate, setBacktestEndDate] = useState('')
  // Risk control state
  const [useRiskControl, setUseRiskControl] = useState(false)
  const [stopLossPercent, setStopLossPercent] = useState(0.05)
  const [takeProfitPercent, setTakeProfitPercent] = useState(0.15)
  const [trailingStopPercent, setTrailingStopPercent] = useState(0.08)
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null)

  useEffect(() => {
    getVersionInfo().then(setVersionInfo).catch(console.error)
  }, [])

  const currentStrategy = STRATEGY_OPTIONS.find(s => s.type === selectedStrategy)!

  const handleStrategyChange = (type: StrategyType) => {
    setSelectedStrategy(type)
    const option = STRATEGY_OPTIONS.find(s => s.type === type)!
    const defaults: Record<string, number> = {}
    option.params.forEach((p: StrategyParam) => { defaults[p.key] = p.value })
    setStrategyParams(defaults)
  }

  const handleParamChange = (key: string, value: number) => {
    setStrategyParams(prev => ({ ...prev, [key]: value }))
  }

  const getParamValue = (key: string, defaultValue: number) => {
    return strategyParams[key] ?? defaultValue
  }

  const handleRun = () => {
    onRunBacktest({
      strategy: selectedStrategy,
      strategyParams: currentStrategy.params.reduce((acc: Record<string, number>, p: StrategyParam) => {
        acc[p.key] = getParamValue(p.key, p.value)
        return acc
      }, {} as Record<string, number>),
      dataSource,
      config: {
        initialCapital,
        commissionRate,
        stampDutyRate,
        slippage,
        // Risk control config
        ...(useRiskControl ? {
          riskControl: {
            stopLossPercent,
            takeProfitPercent,
            trailingStopPercent,
          }
        } : {}),
      },
      // Include date range if specified
      ...(backtestStartDate || backtestEndDate ? {
        dateRange: {
          startDate: backtestStartDate || undefined,
          endDate: backtestEndDate || undefined,
        }
      } : {}),
    })
  }

  return (
    <aside className="w-80 min-w-[320px] h-screen overflow-y-auto flex flex-col border-r border-border"
      style={{ background: 'hsl(224 50% 5.5%)' }}>
      {/* Header */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--gradient-gold)' }}>
            <TrendingUp className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-base font-bold text-gold-gradient">QuantX</h1>
            <p className="text-[11px] text-muted-foreground">量化策略回测系统</p>
          </div>
        </div>
      </div>

      {/* Strategy Selection */}
      <div className="sidebar-section px-5">
        <label className="sidebar-label flex items-center gap-1.5">
          <TrendingUp className="w-3 h-3" /> 策略选择
        </label>
        <select
          className="select-field"
          value={selectedStrategy}
          onChange={e => handleStrategyChange(e.target.value as StrategyType)}
        >
          {STRATEGY_OPTIONS.map(s => (
            <option key={s.type} value={s.type}>{s.name}</option>
          ))}
        </select>
        <p className="text-xs mt-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
          {currentStrategy.description}
        </p>
      </div>

      {/* Data Source */}
      <div className="sidebar-section px-5">
        <DataSourcePanel config={dataSource} onChange={setDataSource} />
      </div>

      {/* Strategy Parameters */}
      <div className="sidebar-section px-5">
        <label className="sidebar-label flex items-center gap-1.5">
          <Settings className="w-3 h-3" /> 策略参数
        </label>
        <div className="space-y-3">
          {currentStrategy.params.map((param: StrategyParam) => (
            <div key={param.key}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-muted-foreground">{param.label}</span>
                <span className="text-xs num text-foreground font-medium">
                  {getParamValue(param.key, param.value)}
                </span>
              </div>
              <input
                type="range"
                min={param.min}
                max={param.max}
                step={param.step}
                value={getParamValue(param.key, param.value)}
                onChange={e => handleParamChange(param.key, parseFloat(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, hsl(var(--gold)) 0%, hsl(var(--gold)) ${
                    ((getParamValue(param.key, param.value) - param.min) / (param.max - param.min)) * 100
                  }%, hsl(var(--secondary)) ${
                    ((getParamValue(param.key, param.value) - param.min) / (param.max - param.min)) * 100
                  }%, hsl(var(--secondary)) 100%)`,
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Backtest Config */}
      <div className="sidebar-section px-5">
        <label className="sidebar-label">回测参数</label>
        <div className="space-y-3">
          <div>
            <span className="text-xs text-muted-foreground block mb-1">初始资金</span>
            <input type="number" className="input-field num" value={initialCapital}
              onChange={e => setInitialCapital(Number(e.target.value))} step={100000} min={10000} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-xs text-muted-foreground block mb-1">手续费率</span>
              <input type="number" className="input-field num text-xs" value={commissionRate}
                onChange={e => setCommissionRate(Number(e.target.value))} step={0.0001} min={0} />
            </div>
            <div>
              <span className="text-xs text-muted-foreground block mb-1">印花税率</span>
              <input type="number" className="input-field num text-xs" value={stampDutyRate}
                onChange={e => setStampDutyRate(Number(e.target.value))} step={0.0001} min={0} />
            </div>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block mb-1">滑点</span>
            <input type="number" className="input-field num" value={slippage}
              onChange={e => setSlippage(Number(e.target.value))} step={0.0001} min={0} />
          </div>
        </div>
      </div>

      {/* Risk Control */}
      <div className="sidebar-section px-5">
        <div className="flex items-center gap-1.5 mb-3">
          <Shield className="w-3 h-3" style={{ color: 'hsl(var(--gold))' }} />
          <label className="sidebar-label flex-1">风险控制</label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={useRiskControl}
              onChange={e => setUseRiskControl(e.target.checked)}
              className="w-3 h-3 rounded"
            />
            <span className="text-xs text-muted-foreground">启用</span>
          </label>
        </div>
        {useRiskControl && (
          <div className="space-y-3">
            <div>
              <span className="text-xs text-muted-foreground block mb-1">止损比例 (%)</span>
              <input type="number" className="input-field num text-xs" value={stopLossPercent * 100}
                onChange={e => setStopLossPercent(Number(e.target.value) / 100)} step={1} min={1} max={50} />
              <p className="text-[10px] text-muted-foreground mt-1">买入价下跌超过此比例自动止损</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block mb-1">止盈比例 (%)</span>
              <input type="number" className="input-field num text-xs" value={takeProfitPercent * 100}
                onChange={e => setTakeProfitPercent(Number(e.target.value) / 100)} step={1} min={1} max={200} />
              <p className="text-[10px] text-muted-foreground mt-1">买入价上涨超过此比例自动止盈</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block mb-1">追踪止损 (%)</span>
              <input type="number" className="input-field num text-xs" value={trailingStopPercent * 100}
                onChange={e => setTrailingStopPercent(Number(e.target.value) / 100)} step={1} min={1} max={50} />
              <p className="text-[10px] text-muted-foreground mt-1">从最高点下跌超过此比例自动卖出</p>
            </div>
          </div>
        )}
      </div>

      {/* Date Range Selection */}
      <div className="sidebar-section px-5">
        <label className="sidebar-label flex items-center gap-1.5">
          <Calendar className="w-3 h-3" /> 回测时间范围
        </label>
        <p className="text-[11px] text-muted-foreground mb-2">可选，留空则使用全部数据</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-xs text-muted-foreground block mb-1">开始日期</span>
            <input
              type="date"
              className="input-field text-xs"
              value={backtestStartDate}
              onChange={e => setBacktestStartDate(e.target.value)}
            />
          </div>
          <div>
            <span className="text-xs text-muted-foreground block mb-1">结束日期</span>
            <input
              type="date"
              className="input-field text-xs"
              value={backtestEndDate}
              onChange={e => setBacktestEndDate(e.target.value)}
            />
          </div>
        </div>
        {(backtestStartDate || backtestEndDate) && (
          <button
            className="text-xs text-muted-foreground hover:text-foreground mt-2"
            onClick={() => { setBacktestStartDate(''); setBacktestEndDate('') }}
          >
            清除时间范围
          </button>
        )}
      </div>

      {/* Run Button */}
      <div className="px-5 py-4 border-t border-border">
        <Button variant="gold" size="lg" className="w-full gap-2" onClick={handleRun} disabled={isLoading}>
          {isLoading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> 回测运行中...</>
          ) : (
            <><Play className="w-4 h-4" /> 运行回测</>
          )}
        </Button>
        {result && (
          <p className="text-[11px] text-center mt-2 text-muted-foreground">
            共 {result.trades.length} 笔交易 / {result.portfolioHistory.length} 个交易日
          </p>
        )}
      </div>

      {/* Version Info */}
      {versionInfo && (
        <div className="px-5 py-3 border-t border-border" style={{ background: 'hsl(224 50% 4%)' }}>
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] text-muted-foreground">版本</p>
              <p className="text-xs font-semibold" style={{ color: 'hsl(var(--gold))' }}>
                v{versionInfo.version}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">{versionInfo.releaseDate}</p>
              <p className="text-[10px] text-muted-foreground line-clamp-1">
                {versionInfo.description}
              </p>
            </div>
          </div>
          <a
            href="https://github.com/hzjsw/stock-backtest/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground mt-2"
          >
            <ExternalLink className="w-2.5 h-2.5" />
            查看 Release 说明
          </a>
        </div>
      )}
    </aside>
  )
}
