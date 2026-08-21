@echo off
title ACTIV FITNESS - Lancement
cd /d "%~dp0..\backend"

echo ==========================================
echo  ACTIV FITNESS - demarrage du serveur...
echo ==========================================
echo.

REM ---- Arret d'un serveur encore actif sur le port 3000 ----
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
  taskkill /f /pid %%a >nul 2>&1
)
timeout /t 2 /nobreak >nul

if not exist node_modules call npm install --no-fund --no-audit

REM ---- Demarrage du serveur en arriere-plan (sans fenetre) ----
powershell -NoProfile -WindowStyle Hidden -Command "Start-Process -FilePath 'node.exe' -ArgumentList 'server.js' -WorkingDirectory '%CD%' -WindowStyle Hidden -RedirectStandardOutput 'server.log' -RedirectStandardError 'server-err.log'"

echo.
echo  Demarrage du serveur...
timeout /t 4 /nobreak >nul

netstat -ano | findstr ":3000" | findstr "LISTENING" >nul
if errorlevel 1 (
  echo  ECHEC : le serveur ne repond pas. Veuillez voir server-err.log
  echo.
  type server-err.log 2>nul
) else (
  echo  Serveur demarre avec succes !
  echo.
  echo  Site  : http://localhost:3000/
  echo  Admin : http://localhost:3000/admin
  echo  Login : admin / admin123
  echo.
  echo  Le serveur tourne en arriere-plan (aucune fenetre).
  echo  Pour ARRETER le site : double-cliquez sur stop.bat
  echo.
  start "" "http://localhost:3000/"
)
timeout /t 6 /nobreak >nul
exit