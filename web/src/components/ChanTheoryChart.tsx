/**
 * 缠论可视化图表组件
 *
 * 显示：
 * 1. K 线图
 * 2. 分型标记（顶/底）
 * 3. 笔连线
 * 4. 中枢区域
 * 5. 买卖点标记
 */

import { useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { EChart } from '@/components/EChart'
import type { Bar, ChanTheoryResult, Trade } from '@stock-backtest/types'

interface ChanTheoryChartProps {
  bars: Bar[]
  chanResult: ChanTheoryResult
  trades?: Trade[]
  height?: number
}

const COLORS = {
  candleUp: '#ef4444',      // 红色 - 上涨
  candleDown: '#22c55e',    // 绿色 - 下跌
  fractalTop: '#f59e0b',    // 橙色 - 顶分型
  fractalBottom: '#3b82f6', // 蓝色 - 底分型
  strokeUp: '#ef4444',      // 红色 - 向上笔
  strokeDown: '#22c55e',    // 绿色 - 向下笔
  pivot: 'rgba(212, 168, 67, 0.15)',  // 金色半透明 - 中枢
  pivotBorder: 'rgba(212, 168, 67, 0.8)',  // 金色边框
  buy1: '#f59e0b',          // 橙色 - 一类买点
  buy2: '#10b981',          // 绿色 - 二类买点
  buy3: '#3b82f6',          // 蓝色 - 三类买点
  sell1: '#ef4444',         // 红色 - 一类卖点
  sell2: '#f97316',         // 橙红 - 二类卖点
  sell3: '#8b5cf6',         // 紫色 - 三类卖点
}

export function ChanTheoryChart({ bars, chanResult, trades = [], height = 600 }: ChanTheoryChartProps) {
  const option = useMemo<EChartsOption>(() => {
    if (!bars.length || !chanResult) {
      return {}
    }

    // 1. K 线数据
    const candlestickData = bars.map((bar, i) => [
      bar.open,
      bar.close,
      bar.low,
      bar.high,
    ])

    // 2. 分型标记数据
    const topFractals = chanResult.fractals
      .filter(f => f.type === 'top')
      .map(f => {
        const barIndex = bars.findIndex(b => b.date === f.date)
        return [barIndex, f.price, f.date]
      })
      .filter(p => p[0] >= 0)

    const bottomFractals = chanResult.fractals
      .filter(f => f.type === 'bottom')
      .map(f => {
        const barIndex = bars.findIndex(b => b.date === f.date)
        return [barIndex, f.price, f.date]
      })
      .filter(p => p[0] >= 0)

    // 3. 笔连线数据
    const strokeLines = chanResult.strokes.map(stroke => {
      const startIndex = bars.findIndex(b => b.date === stroke.startDate)
      const endIndex = bars.findIndex(b => b.date === stroke.endDate)
      return {
        coords: [[startIndex, stroke.startPoint], [endIndex, stroke.endPoint]],
        style: {
          stroke: stroke.direction === 1 ? COLORS.strokeUp : COLORS.strokeDown,
          lineWidth: 2,
        },
      }
    })

    // 4. 中枢区域数据
    const pivotAreas = chanResult.pivots.map(pivot => {
      const startIndex = bars.findIndex(b => b.date === pivot.startDate)
      const endIndex = bars.findIndex(b => b.date === pivot.endDate)
      return {
        coord: [startIndex, pivot.low],
        width: endIndex - startIndex,
        height: pivot.high - pivot.low,
        style: {
          fill: COLORS.pivot,
          stroke: COLORS.pivotBorder,
          lineWidth: 1,
        },
      }
    })

    // 5. 买卖点标记
    const buySellMarks = chanResult.buySellPoints.map(bp => {
      const barIndex = bars.findIndex(b => b.date === bp.date)
      let color = COLORS.buy1
      let symbol = 'triangle'
      let offset = 10

      switch (bp.type) {
        case 'buy1': color = COLORS.buy1; symbol = 'triangle'; offset = 15; break
        case 'buy2': color = COLORS.buy2; symbol = 'triangle'; offset = 15; break
        case 'buy3': color = COLORS.buy3; symbol = 'triangle'; offset = 15; break
        case 'sell1': color = COLORS.sell1; symbol = 'triangle'; offset = -15; break
        case 'sell2': color = COLORS.sell2; symbol = 'triangle'; offset = -15; break
        case 'sell3': color = COLORS.sell3; symbol = 'triangle'; offset = -15; break
      }

      return {
        coord: [barIndex, bp.price],
        symbol,
        symbolSize: 12,
        itemStyle: { color },
        value: bp.type.toUpperCase(),
      }
    })

    // 构建标记配置
    const markPoint = {
      data: buySellMarks,
      symbol: 'triangle',
      symbolSize: 12,
      label: {
        show: true,
        fontSize: 9,
        color: '#fff',
        offset: [0, -15],
      },
    }

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        formatter: (params: any) => {
          const bar = bars[params[0]?.dataIndex]
          if (!bar) return ''
          return `
            <div style="font-weight:bold">${bar.date}</div>
            <div>开：${bar.open.toFixed(2)}</div>
            <div>高：${bar.high.toFixed(2)}</div>
            <div>低：${bar.low.toFixed(2)}</div>
            <div>收：${bar.close.toFixed(2)}</div>
            <div>量：${bar.volume.toLocaleString()}</div>
          `
        },
      },
      legend: {
        data: ['K 线', '顶分型', '底分型', '买卖点'],
        right: 10,
        top: 10,
        textStyle: { color: '#94a3b8' },
      },
      xAxis: {
        type: 'category',
        data: bars.map(b => b.date),
        axisLabel: {
          color: '#64748b',
          rotate: bars.length > 100 ? 45 : 0,
          interval: bars.length > 100 ? Math.floor(bars.length / 50) : Math.floor(bars.length / 10),
        },
        axisLine: { lineStyle: { color: '#1e2d40' } },
      },
      yAxis: {
        type: 'value',
        scale: true,
        axisLabel: { color: '#64748b' },
        splitLine: { lineStyle: { color: '#1e2d4060' } },
        axisLine: { lineStyle: { color: '#1e2d40' } },
      },
      dataZoom: [
        { type: 'inside', start: 50, end: 100 },
        {
          type: 'slider',
          height: 20,
          bottom: 5,
          borderColor: 'transparent',
          backgroundColor: '#1e2d4030',
          fillerColor: '#d4a84320',
          handleStyle: { color: '#d4a843' },
        },
      ],
      series: [
        // K 线图
        {
          name: 'K 线',
          type: 'candlestick',
          data: candlestickData,
          itemStyle: {
            color: COLORS.candleUp,
            color0: COLORS.candleDown,
            borderColor: COLORS.candleUp,
            borderColor0: COLORS.candleDown,
          },
          markPoint: {
            ...markPoint,
            animation: true,
          },
          z: 10,
        },
        // 顶分型标记
        {
          name: '顶分型',
          type: 'scatter',
          data: topFractals,
          symbol: 'triangle',
          symbolSize: 10,
          itemStyle: { color: COLORS.fractalTop },
          label: { show: false },
          z: 20,
        },
        // 底分型标记
        {
          name: '底分型',
          type: 'scatter',
          data: bottomFractals,
          symbol: 'triangle',
          symbolSize: 10,
          itemStyle: { color: COLORS.fractalBottom },
          label: { show: false },
          z: 20,
        },
        // 中枢区域 (使用 custom series)
        {
          name: '中枢',
          type: 'custom',
          renderItem: (params: any, api: any) => {
            const points: number[][] = []
            pivotAreas.forEach((area: any) => {
              const x = api.coord([area.coord[0], area.coord[1]])[0]
              const y = api.coord([area.coord[0], area.coord[1] + area.height])[1]
              const width = api.size([area.width, 0])[0]
              const height = api.size([0, area.height])[1]
              points.push([x, y, width, height])
            })
            return {
              type: 'group',
              children: points.map((p: any, i: number) => ({
                type: 'rect',
                shape: { x: p[0], y: p[1], width: p[2], height: p[3] },
                style: pivotAreas[i].style,
              })),
            }
          },
          z: 5,
        },
      ],
      grid: {
        left: 60,
        right: 20,
        top: 50,
        bottom: 60,
      },
    }
  }, [bars, chanResult])

  return (
    <Card className="animate-slide-up">
      <CardHeader className="pb-2">
        <CardTitle>缠论分析</CardTitle>
      </CardHeader>
      <CardContent>
        <EChart option={option} height={height} />
      </CardContent>
    </Card>
  )
}
