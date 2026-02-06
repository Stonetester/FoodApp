@echo off
REM Cosy Cottage Food App - Windows Startup Script
REM Double-click this file to start the app!

echo ============================================================
echo    Cosy Cottage Food App - Starting...
echo ============================================================
echo.

REM Check if we're in the right directory
if not exist "venv\" (
    echo ERROR: Virtual environment not found!
    echo.
    echo Please run this script from the backend folder.
    echo OR run the setup first:
    echo   1. Open Command Prompt in backend folder
    echo   2. Run: python -m venv venv
    echo   3. Run: venv\Scripts\activate
    echo   4. Run: pip install -r requirements.txt
    echo.
    pause
    exit /b 1
)

echo [1/3] Activating virtual environment...
call venv\Scripts\activate.bat

echo [2/3] Checking if MySQL is running...
echo       (Make sure XAMPP Control Panel shows MySQL as started)
echo.

echo [3/3] Starting the Food App...
echo.
echo ============================================================
echo    App is starting - please wait...
echo ============================================================
echo.
echo Once you see "Running on http://127.0.0.1:5000"
echo Open your browser to: http://localhost:5000
echo.
echo To STOP the app: Press Ctrl+C in this window
echo.
echo ============================================================
echo.

python run.py

echo.
echo ============================================================
echo    App has stopped
echo ============================================================
echo.
pause
