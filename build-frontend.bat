@echo off
cd /d "%~dp0frontend"

call npm install
if %errorlevel% equ 0 (
    call npm run build
)

pause