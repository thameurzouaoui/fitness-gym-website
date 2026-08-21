@echo off
title ACTIV FITNESS - Arret du serveur
echo Arret du serveur ACTIV FITNESS (port 3000)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
  taskkill /f /pid %%a >nul 2>&1
)
echo Termine. Vous pouvez relancer le site avec start.bat
ping -n 3 127.0.0.1 >nul
exit