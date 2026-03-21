@echo off
chcp 65001 >nul
echo.
echo ========================================
echo   QuantX - 量化策略回测系统
echo ========================================
echo.
echo 正在启动服务...
echo.

REM 启动后端
start cmd /k "title QuantX API Server && cd /d %~dp0 && npm run server"
echo [√] 后端 API 服务器启动中...
timeout /t 2 /nobreak >nul

REM 启动前端
start cmd /k "title QuantX Web UI && cd /d %~dp0web && npm run dev"
echo [√] 前端 Web 界面启动中...
echo.
echo ========================================
echo   启动完成！
echo.
echo   前端地址：http://localhost:5173
echo   后端地址：http://localhost:3001
echo ========================================
echo.
echo 按任意键退出此窗口...
pause >nul
