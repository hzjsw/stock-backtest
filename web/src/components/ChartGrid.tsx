import { useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { EChart } from '@/components/EChart'
import type { BacktestResult } from '@/types/backtest'

interface ChartGridProps {
  result: BacktestResult
}

const GOLD = '#d4a843'
const PROFIT_RED = '#ef4444'
const LOSS_GREEN = '#22c55e'
const BLUE = '#3b82f6'

export function ChartGrid({ result }: ChartGridProps) {
  const { portfolioHistory: history, config } = result
  const dates = history.map(h => h.date)

  const equityOption = useMemo<EChartsOption>(() => ({
    tooltip: {
      trigger: 'axis',
      formatter: (p: unknown) => {
        const params = p as Array<{ axisValue: string; value: number }>
        return `${params[0].axisValue}<br/>净值: <b style="color:${GOLD}">${params[0].value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</b>`
      },
    },
    xAxis: { type: 'category', data: dates, axisLabel: { rotate: 0, interval: Math.floor(dates.length / 6) } },
    yAxis: { type: 'value', scale: true, axisLabel: { formatter: (v: number) => (v / 10000).toFixed(0) + '万' } },
    series: [{
      type: 'line', data: history.map(h => +h.totalValue.toFixed(2)), smooth: true, symbol: 'none',
      lineStyle: { width: 2, color: GOLD },
      areaStyle: {
        color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: GOLD + '30' }, { offset: 1, color: GOLD + '02' }] },
      },
    }],
    grid: { left: 70, right: 20, top: 15, bottom: 50 },
    dataZoom: [{ type: 'inside' }, { type: 'slider', height: 20, bottom: 5, borderColor: 'transparent', backgroundColor: '#1e2d4030', fillerColor: GOLD + '20', handleStyle: { color: GOLD } }],
  }), [history, dates])

  const returnDrawdownOption = useMemo<EChartsOption>(() => {
    const cumReturns = history.map(h => +((h.totalValue - config.initialCapital) / config.initialCapital * 100).toFixed(2))
    const drawdowns: number[] = []
    let peak = history[0].totalValue
    for (const h of history) {
      if (h.totalValue > peak) peak = h.totalValue
      drawdowns.push(+(-((peak - h.totalValue) / peak) * 100).toFixed(2))
    }
    return {
      tooltip: { trigger: 'axis' },
      legend: { data: ['累计收益率', '回撤'], right: 10, top: 0 },
      xAxis: { type: 'category', data: dates, axisLabel: { interval: Math.floor(dates.length / 6) } },
      yAxis: [
        { type: 'value', axisLabel: { formatter: '{value}%' }, position: 'left' },
        { type: 'value', axisLabel: { formatter: '{value}%' }, position: 'right' },
      ],
      series: [
        { name: '累计收益率', type: 'line', data: cumReturns, smooth: true, symbol: 'none', lineStyle: { color: PROFIT_RED, width: 2 } },
        { name: '回撤', type: 'line', yAxisIndex: 1, data: drawdowns, smooth: true, symbol: 'none', lineStyle: { color: LOSS_GREEN, width: 1.5 }, areaStyle: { color: LOSS_GREEN + '15' } },
      ],
      grid: { left: 55, right: 55, top: 30, bottom: 50 },
      dataZoom: [{ type: 'inside' }, { type: 'slider', height: 20, bottom: 5, borderColor: 'transparent', backgroundColor: '#1e2d4030', fillerColor: BLUE + '20' }],
    }
  }, [history, dates, config])

  const allocationOption = useMemo<EChartsOption>(() => ({
    tooltip: { trigger: 'axis' },
    legend: { data: ['现金', '持仓市值'], right: 10, top: 0 },
    xAxis: { type: 'category', data: dates, axisLabel: { interval: Math.floor(dates.length / 6) } },
    yAxis: { type: 'value', axisLabel: { formatter: (v: number) => (v / 10000).toFixed(0) + '万' } },
    series: [
      { name: '现金', type: 'line', stack: 'total', symbol: 'none', lineStyle: { width: 0 }, areaStyle: { color: BLUE + '40' }, data: history.map(h => +h.cash.toFixed(2)) },
      { name: '持仓市值', type: 'line', stack: 'total', symbol: 'none', lineStyle: { width: 0 }, areaStyle: { color: PROFIT_RED + '40' }, data: history.map(h => +h.positionsValue.toFixed(2)) },
    ],
    grid: { left: 70, right: 20, top: 30, bottom: 50 },
    dataZoom: [{ type: 'inside' }, { type: 'slider', height: 20, bottom: 5, borderColor: 'transparent', backgroundColor: '#1e2d4030' }],
  }), [history, dates])

  const distOption = useMemo<EChartsOption>(() => {
    const returns = history.map(h => h.dailyReturn)
    const bins: Record<string, number> = {}
    const step = 0.005
    returns.forEach(r => {
      const key = (Math.round(r / step) * step).toFixed(3)
      bins[key] = (bins[key] || 0) + 1
    })
    const sortedKeys = Object.keys(bins).sort((a, b) => parseFloat(a) - parseFloat(b))
    return {
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: sortedKeys.map(k => (parseFloat(k) * 100).toFixed(1) + '%'), axisLabel: { rotate: 45, fontSize: 10 } },
      yAxis: { type: 'value', name: '天数' },
      series: [{
        type: 'bar', data: sortedKeys.map(k => ({
          value: bins[k],
          itemStyle: { color: parseFloat(k) >= 0 ? PROFIT_RED + 'cc' : LOSS_GREEN + 'cc', borderRadius: [2, 2, 0, 0] },
        })),
      }],
      grid: { left: 45, right: 15, top: 30, bottom: 55 },
    }
  }, [history])

  const heatmapOption = useMemo<EChartsOption>(() => {
    const monthly: Record<string, { start: number; end: number }> = {}
    for (let i = 0; i < dates.length; i++) {
      const ym = dates[i].substring(0, 7)
      if (!monthly[ym]) monthly[ym] = { start: history[i].totalValue, end: history[i].totalValue }
      monthly[ym].end = history[i].totalValue
    }
    const years = [...new Set(Object.keys(monthly).map(k => k.substring(0, 4)))].sort()
    const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']
    const data: [number, number, number][] = []
    for (const ym of Object.keys(monthly)) {
      const y = years.indexOf(ym.substring(0, 4))
      const m = months.indexOf(ym.substring(5, 7))
      data.push([m, y, +((monthly[ym].end - monthly[ym].start) / monthly[ym].start * 100).toFixed(2)])
    }
    return {
      tooltip: { formatter: (p: unknown) => { const v = (p as { value: number[] }).value; return `${years[v[1]]}-${months[v[0]]}: <b>${v[2]}%</b>` } },
      xAxis: { type: 'category', data: months.map(m => m + '月'), splitArea: { show: true, areaStyle: { color: ['transparent', '#ffffff05'] } } },
      yAxis: { type: 'category', data: years, splitArea: { show: true, areaStyle: { color: ['transparent', '#ffffff05'] } } },
      visualMap: { min: -10, max: 10, calculable: true, orient: 'horizontal', left: 'center', bottom: 0, inRange: { color: [LOSS_GREEN, '#1a1a2e', PROFIT_RED] }, textStyle: { color: '#64748b' } },
      series: [{ type: 'heatmap', data, label: { show: true, formatter: (p: unknown) => (p as { value: number[] }).value[2] + '%', fontSize: 10, color: '#e2e8f0' } }],
      grid: { left: 45, right: 15, top: 10, bottom: 55 },
    }
  }, [history, dates])

  return (
    <div className="space-y-3 animate-slide-up" style={{ animationDelay: '0.1s' }}>
      {/* Equity Curve - full width */}
      <Card>
        <CardHeader className="pb-2"><CardTitle>资产净值曲线</CardTitle></CardHeader>
        <CardContent><EChart option={equityOption} height={320} /></CardContent>
      </Card>

      {/* 2-column charts */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle>累计收益率 & 回撤</CardTitle></CardHeader>
          <CardContent><EChart option={returnDrawdownOption} height={280} /></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle>资产配置</CardTitle></CardHeader>
          <CardContent><EChart option={allocationOption} height={280} /></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle>日收益率分布</CardTitle></CardHeader>
          <CardContent><EChart option={distOption} height={250} /></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle>月度收益热力图</CardTitle></CardHeader>
          <CardContent><EChart option={heatmapOption} height={250} /></CardContent>
        </Card>
      </div>
    </div>
  )
}
