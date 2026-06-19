@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

set "BACKUP_DIR=%~dp0.revert"

:: Files to backup (relative to project root)
set "FILES[0]=src\pages\ChatPage.jsx"
set "FILES[1]=src\App.jsx"
set "FILES[2]=vite.config.js"
set "FILES[3]=src\components\Sidebar.jsx"
set "FILES[4]=node_modules\app-builder-lib\out\util\electronGet.js"

if /I "%1"=="--restore" goto :restore
if /I "%1"=="-r" goto :restore

:backup
echo Backing up current files to %BACKUP_DIR%...
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"
for /L %%i in (0,1,4) do (
  if exist "%~dp0!FILES[%%i]!" (
    set "SRC=%~dp0!FILES[%%i]!"
    set "REL=!FILES[%%i]!"
    set "REL_DIR=!REL!\.."
    md "%BACKUP_DIR%\!REL_DIR!" 2>nul
    copy /Y "!SRC!" "%BACKUP_DIR%\!REL!" >nul
    echo   backed up !FILES[%%i]!
  ) else (
    echo   WARNING: !FILES[%%i]! not found, skipping
  )
)
echo Done. Use "revert --restore" to restore.
exit /b 0

:restore
echo Restoring files from %BACKUP_DIR%...
if not exist "%BACKUP_DIR%" (
  echo ERROR: No backup directory found at %BACKUP_DIR%
  echo Run "revert" (without --restore) first to create a backup.
  exit /b 1
)
for /L %%i in (0,1,4) do (
  if exist "%BACKUP_DIR%\!FILES[%%i]!" (
    copy /Y "%BACKUP_DIR%\!FILES[%%i]!" "%~dp0!FILES[%%i]!" >nul
    echo   restored !FILES[%%i]!
  ) else (
    echo   WARNING: backup for !FILES[%%i]! not found, skipping
  )
)
echo Done. Files restored from backup.
exit /b 0
