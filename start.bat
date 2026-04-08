@echo off
title MediaSave Launcher
color 0A
echo.
echo  Starting MediaSave...
echo.
python "%~dp0start.py" %*
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  [ERROR] Something went wrong. Make sure Python 3.10+ is installed.
    pause
)
