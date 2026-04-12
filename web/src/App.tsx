import { useState, useCallback } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { Dashboard } from '@/components/Dashboard'
import type { BacktestResult, BacktestRequest } from '@/types/backtest'

function App() {
  const [result, setResult] = useState<BacktestResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRunBacktest = useCallback(async (request: BacktestRequest) => {
    setIsLoading(true)
    setError(null)
    try {
      console.log('发送回测请求:', request)
      
      const response = await fetch('http://localhost:3001/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ message: '回测请求失败' }))
        throw new Error(errData.message || `服务器错误 ${response.status}`)
      }
      
      const data: BacktestResult = await response.json()
      console.log('回测结果:', data)
      setResult(data)
    } catch (err) {
      console.error('回测失败:', err)
      setError(err instanceof Error ? err.message : '未知错误')
    } finally {
      setIsLoading(false)
    }
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar onRunBacktest={handleRunBacktest} isLoading={isLoading} result={result} />
      <main className="flex-1 flex flex-col overflow-hidden">
        {error && (
          <div className="mx-5 mt-4 px-4 py-3 rounded-lg text-sm border" style={{
            background: 'hsl(0 84% 60% / 0.08)',
            borderColor: 'hsl(0 84% 60% / 0.2)',
            color: 'hsl(0 84% 70%)',
          }}>
            {error}
          </div>
        )}
        <Dashboard result={result} isLoading={isLoading} />
      </main>
    </div>
  )
}

export default App
