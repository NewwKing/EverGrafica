@echo off
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
    py -3 run.py
) else (
    python run.py
)
if errorlevel 1 (
    echo.
    echo Hace falta Python 3. Tambien puedes usar Live Server en esta carpeta.
)
pause
