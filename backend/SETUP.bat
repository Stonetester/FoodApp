@echo off
REM Cosy Cottage Food App - Windows Setup Script
REM Run this ONCE to set up the application

echo ============================================================
echo    Cosy Cottage Food App - Setup Wizard
echo ============================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH!
    echo.
    echo Please install Python first:
    echo   1. Go to https://www.python.org/downloads/
    echo   2. Download Python 3.11 or higher
    echo   3. Run installer
    echo   4. CHECK THE BOX: "Add Python to PATH"
    echo   5. Click "Install Now"
    echo.
    pause
    exit /b 1
)

echo [*] Python found: 
python --version
echo.

echo [1/5] Creating virtual environment...
if exist "venv\" (
    echo     Virtual environment already exists, skipping...
) else (
    python -m venv venv
    echo     Virtual environment created successfully!
)
echo.

echo [2/5] Activating virtual environment...
call venv\Scripts\activate.bat
echo.

echo [3/5] Upgrading pip...
python -m pip install --upgrade pip --quiet
echo     pip upgraded successfully!
echo.

echo [4/5] Installing Python packages...
echo     This may take 3-5 minutes, please wait...
echo.
pip install -r requirements.txt
echo.
echo     All packages installed successfully!
echo.

echo [5/5] Creating configuration file...
if exist ".env" (
    echo     .env file already exists, skipping...
) else (
    copy .env.example .env >nul
    echo     .env file created from template
    echo.
    echo     IMPORTANT: You need to edit .env file!
    echo     1. Open backend\.env in Notepad
    echo     2. Change the database password to match what you set in MySQL
    echo     3. Save the file
)
echo.

echo ============================================================
echo    Setup Complete!
echo ============================================================
echo.
echo Next steps:
echo.
echo 1. Make sure MySQL is running (XAMPP Control Panel)
echo.
echo 2. Edit the .env file:
echo    - Right-click backend\.env
echo    - Open with Notepad
echo    - Change the database password
echo    - Save and close
echo.
echo 3. Create the database in MySQL:
echo    - Open XAMPP Shell (or MySQL Command Line)
echo    - Run: mysql -u root -p
echo    - Enter password (or just press Enter for XAMPP)
echo    - Run these commands:
echo      CREATE DATABASE foodapp;
echo      CREATE USER 'foodapp_user'@'localhost' IDENTIFIED BY 'CosyCottage2026';
echo      GRANT ALL PRIVILEGES ON foodapp.* TO 'foodapp_user'@'localhost';
echo      FLUSH PRIVILEGES;
echo      EXIT;
echo.
echo 4. Start the app:
echo    - Double-click START_APP.bat
echo    - OR run: python run.py
echo.
echo 5. Open browser to: http://localhost:5000
echo.
echo For detailed instructions, see: WINDOWS_SETUP_GUIDE.md
echo.
pause
