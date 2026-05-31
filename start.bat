@echo off
chcp 65001 > nul
title 邕江治理与演变展示系统 启动器

echo --------------------------------------------------
echo      邕江治理与演变展示系统 启动器
echo --------------------------------------------------
echo 正在检测运行环境并启动本地静态服务器...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1"

if %errorlevel% neq 0 (
    echo.
    echo [错误] 启动脚本执行失败，请检查 PowerShell 版本或系统权限。
    pause
)
