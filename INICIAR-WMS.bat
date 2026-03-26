@echo off
title RapidWMS Pro - Grupo Rapid
color 1F
echo.
echo  ============================================
echo   RapidWMS Pro - Grupo Rapid
echo   Iniciando plataforma...
echo  ============================================
echo.
cd /d "%~dp0"
node server.js
pause
