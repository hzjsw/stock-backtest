import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// 读取版本信息
let versionInfo = { version: 'unknown', releaseDate: '', description: '' }
try {
  const versionPath = path.resolve(__dirname, '../VERSION.json')
  versionInfo = JSON.parse(fs.readFileSync(versionPath, 'utf-8'))
} catch (e) {
  console.warn('Could not load VERSION.json')
}

export default defineConfig({
  plugins: [react()],
  base: '/stock-backtest/',
  define: {
    __VERSION_INFO__: JSON.stringify(versionInfo),
  },
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
