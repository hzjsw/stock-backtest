import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import type { Trade } from '@/types/backtest'
import { getStockNameOrDefault } from '@stock-backtest/stock-names'

interface TradeTableProps {
  trades: Trade[]
}

export function TradeTable({ trades }: TradeTableProps) {
  const [page, setPage] = useState(0)
  const pageSize = 20
  const totalPages = Math.ceil(trades.length / pageSize)
  const displayed = trades.slice(page * pageSize, (page + 1) * pageSize)

  return (
    <Card className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle>交易记录</CardTitle>
        <span className="text-xs text-muted-foreground num">
          共 {trades.length} 笔交易
        </span>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="text-left py-2.5 px-3 font-medium">日期</th>
                <th className="text-left py-2.5 px-3 font-medium">股票</th>
                <th className="text-center py-2.5 px-3 font-medium">方向</th>
                <th className="text-right py-2.5 px-3 font-medium">数量</th>
                <th className="text-right py-2.5 px-3 font-medium">价格</th>
                <th className="text-right py-2.5 px-3 font-medium">手续费</th>
                <th className="text-right py-2.5 px-3 font-medium">盈亏</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((trade, i) => {
                const stockName = getStockNameOrDefault(trade.symbol);
                const hasName = stockName !== trade.symbol;
                return (
                <tr key={trade.id || i} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="py-2 px-3 num text-xs text-muted-foreground">{trade.date}</td>
                  <td className="py-2 px-3">
                    <div className="text-xs font-medium text-foreground num">{trade.symbol}</div>
                    <div className={`text-[10px] ${hasName ? 'text-muted-foreground' : 'text-orange-400/80'}`}>
                      {hasName ? stockName : '(未识别)'}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      trade.side === 'buy' ? 'text-profit bg-profit/10' : 'text-loss bg-loss/10'
                    }`}>
                      {trade.side === 'buy' ? '买入' : '卖出'}
                    </span>
                  </td>
                  <td className="py-2 px-3 num text-xs text-right text-foreground">{trade.quantity}</td>
                  <td className="py-2 px-3 num text-xs text-right text-foreground">{trade.price.toFixed(2)}</td>
                  <td className="py-2 px-3 num text-xs text-right text-muted-foreground">{trade.commission.toFixed(2)}</td>
                  <td className={`py-2 px-3 num text-xs text-right font-medium ${
                    trade.pnl === undefined ? 'text-muted-foreground' :
                    trade.pnl >= 0 ? 'text-profit' : 'text-loss'
                  }`}>
                    {trade.pnl !== undefined ? trade.pnl.toFixed(2) : '-'}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 text-xs rounded border border-border text-muted-foreground hover:bg-secondary disabled:opacity-30 transition-colors"
            >
              上一页
            </button>
            <span className="text-xs num text-muted-foreground">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1 text-xs rounded border border-border text-muted-foreground hover:bg-secondary disabled:opacity-30 transition-colors"
            >
              下一页
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
