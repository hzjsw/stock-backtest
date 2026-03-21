import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'

interface EChartProps {
  option: echarts.EChartsOption
  height?: number
  className?: string
}

const DARK_THEME = {
  backgroundColor: 'transparent',
  textStyle: { color: '#94a3b8', fontFamily: "'Inter', sans-serif" },
  title: { textStyle: { color: '#e2e8f0' } },
  legend: { textStyle: { color: '#94a3b8' } },
  tooltip: {
    backgroundColor: 'hsl(224, 50%, 8%)',
    borderColor: 'hsl(222, 38%, 18%)',
    textStyle: { color: '#e2e8f0', fontSize: 12 },
  },
  categoryAxis: {
    axisLine: { lineStyle: { color: '#1e2d40' } },
    axisTick: { lineStyle: { color: '#1e2d40' } },
    axisLabel: { color: '#64748b' },
    splitLine: { lineStyle: { color: '#1e2d4020' } },
  },
  valueAxis: {
    axisLine: { lineStyle: { color: '#1e2d40' } },
    axisTick: { lineStyle: { color: '#1e2d40' } },
    axisLabel: { color: '#64748b' },
    splitLine: { lineStyle: { color: '#1e2d4060' } },
  },
}

export function EChart({ option, height = 350, className = '' }: EChartProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const instanceRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!chartRef.current) return

    if (!instanceRef.current) {
      echarts.registerTheme('finance-dark', DARK_THEME)
      instanceRef.current = echarts.init(chartRef.current, 'finance-dark')
    }

    instanceRef.current.setOption(option, true)

    const handleResize = () => instanceRef.current?.resize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [option])

  useEffect(() => {
    return () => {
      instanceRef.current?.dispose()
      instanceRef.current = null
    }
  }, [])

  return <div ref={chartRef} className={className} style={{ width: '100%', height }} />
}
