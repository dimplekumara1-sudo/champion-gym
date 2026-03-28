@echo off
title eSSL X990 Bridge Agent
color 0A

REM ════════════════════════════════════════════════════════════
REM Configuration
REM ════════════════════════════════════════════════════════════
set DEVICE_IP=192.168.0.215
set DEVICE_PORT=4370
set PORT=5000
set POLL_INTERVAL=60
set BRIDGE_SECRET=your_strong_secret_here_change_me
set SUPABASE_URL=https://your-project.supabase.co
set SUPABASE_KEY=your_service_role_key_here

REM ════════════════════════════════════════════════════════════
REM Start Bridge
REM ════════════════════════════════════════════════════════════
cd /d "C:\Users\dimpl\Downloads\powerflex---elite-fitness-coach (1)"
echo.
echo ════════════════════════════════════════════════════════════
echo       eSSL X990 Bridge Agent
echo ════════════════════════════════════════════════════════════
echo Device IP       : %DEVICE_IP%:%DEVICE_PORT%
echo Flask Port      : %PORT%
echo Sweep Interval  : %POLL_INTERVAL% seconds
echo.
echo Starting Python bridge agent...
echo.
echo Once running, the API is available at:
echo   http://localhost:%PORT%
echo.
echo ════════════════════════════════════════════════════════════
echo.

C:\Users\dimpl\AppData\Local\Programs\Python\Python311\python.exe bridge_agent.py
pause
