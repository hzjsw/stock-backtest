import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/stock-backtest/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@stock-backtest/types': path.resolve(__dirname, '../packages/types'),
      '@stock-backtest/stock-names': path.resolve(__dirname, '../packages/stock-names'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
