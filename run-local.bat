@echo off
rem Connection: run-local.bat is part of the local runtime documented in CODEBASE_GUIDE.md.
rem Function: Provides a Windows shortcut for launching the local development services.
title EduNerd - Local Hosting Server
cd /d "%~dp0"
echo ========================================================
echo    Starting EduNerd Local Hosting (Ports 3000 & 3001)   
echo ========================================================
echo.
echo Main App:        http://localhost:3000
echo Chat Sidecar:    http://localhost:3001
echo Chat Preview:    http://localhost:3000/chat-preview.html
echo.
node start-all.js
pause
