@echo off
chcp 65001 >nul
echo ============================================================
echo 开始打包 Flask 应用...
echo ============================================================
echo.

REM 检查 Python 是否安装
python --version >nul 2>&1
if errorlevel 1 (
    echo 错误: 未找到 Python，请先安装 Python
    pause
    exit /b 1
)

REM 检查并安装 PyInstaller
echo 检查 PyInstaller...
python -c "import PyInstaller" >nul 2>&1
if errorlevel 1 (
    echo PyInstaller 未安装，正在安装...
    python -m pip install pyinstaller
    if errorlevel 1 (
        echo 错误: PyInstaller 安装失败
        pause
        exit /b 1
    )
)

REM 清理之前的构建文件
echo.
echo 清理之前的构建文件...
if exist build rmdir /s /q build
if exist dist rmdir /s /q dist
if exist __pycache__ rmdir /s /q __pycache__
if exist app.spec del /q app.spec

REM 执行打包
echo.
echo 开始执行 PyInstaller...
echo ============================================================
python build.py

echo.
pause

