import { useState } from 'react'
import { Play, Settings, TrendingUp, Loader2, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { STRATEGY_OPTIONS, type StrategyType, type BacktestResult } from '@/types/backtest'
import { DataSourcePanel } from '@/components/DataSourcePanel'

interface SidebarProps {
  onRunBacktest: (config: BacktestRequest) => void
  isLoading: boolean
  result: BacktestResult | null
}

export interface BacktestRequest {
  strategy: StrategyType
  strategyParams: Record<string, number>
  dataSource: {
    type: 'csv-file' | 'csv-directory' | 'mock' | 'online'
    filePath?: string
    symbols?: string[]
    onlineConfig?: {
      source: string
      symbolsStr: string
      startDate: string
      endDate: string
    }
  }
  config: {
    initialCapital: number
    commissionRate: number
    stampDutyRate: number
    slippage: number
  }
  dateRange?: {
    startDate?: string
    endDate?: string
  }
}

export function Sidebar({ onRunBacktest, isLoading, result }: SidebarProps) {
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyType>('ma-crossover')
  const [strategyParams, setStrategyParams] = useState<Record<string, number>>({})
  const [initialCapital, setInitialCapital] = useState(1000000)
  const [commissionRate, setCommissionRate] = useState(0.0003)
  const [stampDutyRate, setStampDutyRate] = useState(0.001)
  const [slippage, setSlippage] = useState(0.001)
  const [dataSource, setDataSource] = useState<{ type: 'csv-file' | 'csv-directory' | 'mock' | 'online'; filePath?: string; symbols?: string[]; onlineConfig?: { source: 'netease' | 'eastmoney' | 'sina' | 'tushare'; symbolsStr: string; startDate: string; endDate: string } }>({ type: 'mock' })
  // Date range state
  const [backtestStartDate, setBacktestStartDate] = useState('')
  const [backtestEndDate, setBacktestEndDate] = useState('')

  const currentStrategy = STRATEGY_OPTIONS.find(s => s.type === selectedStrategy)!

  const handleStrategyChange = (type: StrategyType) => {
    setSelectedStrategy(type)
    const option = STRATEGY_OPTIONS.find(s => s.type === type)!
    const defaults: Record<string, number> = {}
    option.params.forEach(p => { defaults[p.key] = p.value })
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
      strategyParams: currentStrategy.params.reduce((acc, p) => {
        acc[p.key] = getParamValue(p.key, p.value)
        return acc
      }, {} as Record<string, number>),
      dataSource,
      config: { initialCapital, commissionRate, stampDutyRate, slippage },
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
          {currentStrategy.params.map(param => (
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
      <div className="px-5 py-4 mt-auto border-t border-border">
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
    </aside>
  )
}
