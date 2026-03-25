@echo off
:: Change directory to the script's location, then into 'frontend'
cd /d "%~dp0frontend"

echo Installing dependencies...
call npm install
if %errorlevel% neq 0 exit /b %errorlevel%

echo Building frontend...
call npm run build
if %errorlevel% neq 0 exit /b %errorlevel%

echo Frontend built successfully to static/

pause