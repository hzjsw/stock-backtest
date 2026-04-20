@echo off
taskkill /F /IM node.exe
timeout /t 2 /nobreak
cd /d "D:\Claude pro\stock-backtest"
npm run server
