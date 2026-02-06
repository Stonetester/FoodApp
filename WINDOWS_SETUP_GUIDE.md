# 🪟 COMPLETE Windows Setup Guide - Cosy Cottage Food App
## Every Single Step Explained - Nothing Assumed

This guide assumes you've NEVER done anything like this before. Every click, every button is explained.

---

## 📋 What You're Going to Install

1. **Python** - The programming language the app runs on
2. **MySQL** - The database that stores your recipes
3. **Tesseract OCR** - Reads text from images (for recipe import)
4. **The Food App** - Your actual application

**Time needed:** 30-45 minutes  
**Difficulty:** Beginner-friendly

---

# PART 1: INSTALL PYTHON

## Step 1.1: Download Python

1. **Open your web browser** (Chrome, Edge, Firefox - doesn't matter)

2. **Type this in the address bar and press Enter:**
   ```
   https://www.python.org/downloads/
   ```

3. **You'll see a yellow button that says "Download Python 3.12.x"** (the number might be different)
   - Click that big yellow button
   - A file will start downloading (it's about 25-30 MB)
   - **File name will look like:** `python-3.12.1-amd64.exe` or similar

4. **Wait for the download to finish**
   - Look at the bottom of your browser
   - When it's done, you'll see the file name

## Step 1.2: Install Python

1. **Find the downloaded file:**
   - Click the downloaded file name at the bottom of your browser
   - OR go to your Downloads folder (usually `C:\Users\YourName\Downloads`)
   - Double-click the file that starts with `python-3.`

2. **A blue window will appear** with "Install Python" at the top

3. **⚠️ VERY IMPORTANT - DO NOT SKIP THIS:**
   - At the BOTTOM of the window, you'll see a checkbox that says:
     ```
     ☐ Add python.exe to PATH
     ```
   - **CLICK THAT CHECKBOX** - it must have a checkmark: ☑
   - This is CRITICAL - if you forget this, nothing will work

4. **Click the big button that says "Install Now"**
   - Windows might ask "Do you want to allow this app to make changes?"
   - Click "Yes"

5. **Wait for installation** (takes 1-2 minutes)
   - You'll see a progress bar
   - When it says "Setup was successful" - you're done!

6. **Click "Close"**

## Step 1.3: Verify Python is Installed

1. **Open Command Prompt:**
   - Press the `Windows key` (⊞ on your keyboard, between Ctrl and Alt)
   - Type: `cmd`
   - You'll see "Command Prompt" appear
   - Press `Enter` OR click on it

2. **A black window will appear** - this is the Command Prompt

3. **Type this EXACTLY and press Enter:**
   ```
   python --version
   ```

4. **You should see something like:**
   ```
   Python 3.12.1
   ```
   
   ✅ **If you see this - Python is installed correctly!**
   
   ❌ **If you see "python is not recognized":**
   - You forgot to check "Add to PATH" during installation
   - Uninstall Python (Settings → Apps → Python → Uninstall)
   - Start over at Step 1.1 and CHECK THE BOX this time

5. **Close the Command Prompt** (type `exit` and press Enter, or click the X)

---

# PART 2: INSTALL MYSQL DATABASE

You have TWO options. XAMPP is easier for beginners.

## OPTION A: XAMPP (RECOMMENDED FOR BEGINNERS)

### Step 2A.1: Download XAMPP

1. **Open your browser**

2. **Type this in the address bar:**
   ```
   https://www.apachefriends.org/download.html
   ```

3. **You'll see download buttons for different versions**
   - Find the one that says "XAMPP for Windows"
   - Under it, click the version number (e.g., "8.2.12" or whatever is newest)
   - A file will start downloading (it's BIG - about 150 MB)
   - **File name:** `xampp-windows-x64-8.2.12-0-VS16-installer.exe` (or similar)

4. **Wait for download** (might take a few minutes depending on your internet)

### Step 2A.2: Install XAMPP

1. **Find the downloaded file in your Downloads folder**
   - Double-click it

2. **Windows might warn you:**
   - "An antivirus program may block installation"
   - Click "OK" (it's safe, don't worry)

3. **XAMPP Setup Wizard appears:**
   - Click "Next"

4. **Select Components:**
   - You'll see checkboxes for different programs
   - Make sure these are CHECKED: ☑
     - MySQL
     - phpMyAdmin
   - You can uncheck others if you want
   - Click "Next"

5. **Installation folder:**
   - Leave it as `C:\xampp`
   - Click "Next"

6. **Language:**
   - Choose "English"
   - Click "Next"

7. **Ready to Install:**
   - Click "Next"

8. **Installation starts** (takes 3-5 minutes)
   - You'll see files being copied
   - Wait patiently

9. **When it finishes:**
   - ☑ Check "Do you want to start the Control Panel now?"
   - Click "Finish"

### Step 2A.3: Start MySQL in XAMPP

1. **XAMPP Control Panel appears** (orange and white window)
   - If it doesn't appear, press Windows key, type "XAMPP", click "XAMPP Control Panel"

2. **You'll see a list of modules:**
   ```
   Apache     [Start] [Stop] ...
   MySQL      [Start] [Stop] ...
   FileZilla  ...
   Mercury    ...
   Tomcat     ...
   ```

3. **Find the line that says "MySQL"**
   - Click the "Start" button on that line
   - The MySQL line will turn GREEN
   - You'll see "MySQL started" in the logs at the bottom

4. **Keep XAMPP Control Panel running** (minimize it, don't close it)

### Step 2A.4: Create Database in XAMPP

1. **In XAMPP Control Panel:**
   - On the MySQL line, click the "Shell" button (on the right side)
   - A black window appears

2. **Type this EXACTLY and press Enter:**
   ```
   mysql -u root -p
   ```

3. **It will ask for a password:**
   - Just press Enter (XAMPP has no default password)

4. **You should see:**
   ```
   mysql>
   ```

5. **Now type these commands ONE AT A TIME:**
   
   **First command - Create the database:**
   ```sql
   CREATE DATABASE foodapp;
   ```
   Press Enter. You should see: `Query OK, 1 row affected`
   
   **Second command - Create a user:**
   ```sql
   CREATE USER 'foodapp_user'@'localhost' IDENTIFIED BY 'CosyCottage2026';
   ```
   Press Enter. You should see: `Query OK, 0 rows affected`
   
   **Note:** You can change `CosyCottage2026` to any password you want. REMEMBER THIS PASSWORD!
   
   **Third command - Give permissions:**
   ```sql
   GRANT ALL PRIVILEGES ON foodapp.* TO 'foodapp_user'@'localhost';
   ```
   Press Enter.
   
   **Fourth command - Apply changes:**
   ```sql
   FLUSH PRIVILEGES;
   ```
   Press Enter.
   
   **Fifth command - Exit:**
   ```sql
   EXIT;
   ```
   Press Enter.

6. **Close the shell window**

✅ **Database is ready!**

---

## OPTION B: MySQL Community Server (More Advanced)

### Step 2B.1: Download MySQL

1. **Open browser and go to:**
   ```
   https://dev.mysql.com/downloads/installer/
   ```

2. **You'll see two download buttons:**
   - One says "smaller, web installer" (about 2 MB)
   - One says "larger, includes all" (about 300+ MB)
   - **Click the SMALLER one** (web installer)

3. **You'll see "Login" or "Sign Up" prompts:**
   - **IGNORE THESE**
   - Scroll down
   - Click the link that says "No thanks, just start my download"

4. **File downloads:** `mysql-installer-web-community-8.0.35.0.msi` (or similar)

### Step 2B.2: Install MySQL

1. **Run the downloaded file**

2. **Choosing Setup Type:**
   - Select "Developer Default"
   - Click "Next"

3. **Check Requirements:**
   - You might see warnings about missing software
   - Click "Execute" to install them
   - OR click "Next" to skip (usually fine)

4. **Installation:**
   - Click "Execute"
   - Wait 5-10 minutes while everything downloads and installs
   - You'll see green checkmarks as each item completes

5. **Product Configuration:**
   - Click "Next"

6. **Type and Networking:**
   - Leave everything as default
   - Click "Next"

7. **Authentication Method:**
   - Choose "Use Strong Password Encryption"
   - Click "Next"

8. **Accounts and Roles:**
   - You need to set a ROOT password
   - Type a password (example: `MyRootPass2026`)
   - Type it again to confirm
   - **WRITE THIS DOWN** - you'll need it!
   - Click "Next"

9. **Windows Service:**
   - Leave everything as default
   - Click "Next"

10. **Apply Configuration:**
    - Click "Execute"
    - Wait for checkmarks
    - Click "Finish"

11. **Product Configuration (MySQL Router):**
    - Click "Next" then "Finish"

12. **Connect To Server:**
    - Enter the root password you created
    - Click "Check" - should say "Connection succeeded"
    - Click "Next" then "Finish"

13. **Installation Complete:**
    - Click "Finish"

### Step 2B.3: Create Database in MySQL Community

1. **Open Command Prompt:**
   - Press Windows key + R
   - Type: `cmd`
   - Press Enter

2. **Navigate to MySQL:**
   ```cmd
   cd "C:\Program Files\MySQL\MySQL Server 8.0\bin"
   ```
   Press Enter

3. **Login to MySQL:**
   ```cmd
   mysql -u root -p
   ```
   Press Enter
   
4. **Enter your root password** (the one you set during installation)

5. **You should see:** `mysql>`

6. **Create database - type these ONE AT A TIME:**
   
   ```sql
   CREATE DATABASE foodapp;
   ```
   
   ```sql
   CREATE USER 'foodapp_user'@'localhost' IDENTIFIED BY 'CosyCottage2026';
   ```
   
   ```sql
   GRANT ALL PRIVILEGES ON foodapp.* TO 'foodapp_user'@'localhost';
   ```
   
   ```sql
   FLUSH PRIVILEGES;
   ```
   
   ```sql
   EXIT;
   ```

✅ **Database is ready!**

---

# PART 3: INSTALL TESSERACT OCR

This lets the app read recipes from images.

## Step 3.1: Download Tesseract

1. **Open browser and go to:**
   ```
   https://github.com/UB-Mannheim/tesseract/wiki
   ```

2. **Scroll down** until you see "Tesseract at UB Mannheim"

3. **You'll see links like:**
   - `tesseract-ocr-w64-setup-5.3.3.20231005.exe` (64-bit)
   - `tesseract-ocr-w32-setup-...` (32-bit)

4. **Click the 64-bit version** (unless you have a very old computer)
   - File downloads (about 50 MB)

## Step 3.2: Install Tesseract

1. **Run the downloaded file**

2. **Setup wizard appears:**
   - Click "Next"

3. **License Agreement:**
   - Click "I Agree"

4. **Choose Components:**
   - Leave everything checked
   - Click "Next"

5. **Choose Install Location:**
   - **IMPORTANT:** Note this path!
   - Default is: `C:\Program Files\Tesseract-OCR`
   - **Write this down or remember it**
   - Click "Install"

6. **Wait for installation** (1-2 minutes)

7. **Click "Finish"**

## Step 3.3: Add Tesseract to PATH

This step is CRITICAL - don't skip!

1. **Right-click on "This PC" or "My Computer"** (on desktop or in File Explorer)
   - If you don't see it, press Windows key, type "This PC", right-click the result

2. **Click "Properties"**

3. **Click "Advanced system settings"** (on the left side)

4. **A window appears called "System Properties"**
   - Click the button at the bottom that says "Environment Variables..."

5. **Environment Variables window appears**
   - In the BOTTOM section called "System variables"
   - Scroll down and find a variable called "Path"
   - Click on it so it's highlighted
   - Click the "Edit..." button

6. **Edit environment variable window appears**
   - Click the "New" button on the right
   - A new line appears with a cursor
   - Type EXACTLY: `C:\Program Files\Tesseract-OCR`
   - If you installed Tesseract somewhere else, use that path instead

7. **Click "OK" on all the windows** (there are 3 windows to close)

8. **Restart any open Command Prompts** for this to take effect

---

# PART 4: EXTRACT AND SET UP THE FOOD APP

## Step 4.1: Extract the Application Files

1. **Find where you downloaded `FoodApp_Windows.zip`**
   - Usually in: `C:\Users\YourName\Downloads`
   - You'll see a file with a zipper icon

2. **Right-click on `FoodApp_Windows.zip`**

3. **Choose "Extract All..."**
   - A window appears asking where to extract

4. **Choose a location:**
   - I recommend: `C:\Users\YourName\` (your user folder)
   - OR anywhere you can easily find it
   - **Remember where you put it!**
   - Click "Extract"

5. **A folder named `FoodApp_Windows` is created**
   - Open it
   - You should see folders: `backend`, `frontend`, and some files

## Step 4.2: Open Command Prompt in the Backend Folder

**METHOD 1 - Using File Explorer (Easier):**

1. **Open the folder you just extracted**
   - Navigate to: `C:\Users\YourName\FoodApp_Windows`

2. **Double-click the `backend` folder** to open it

3. **Click in the address bar** at the top of File Explorer
   - The address bar shows the path (like `C:\Users\YourName\FoodApp_Windows\backend`)
   - Click directly on it - the text should become highlighted

4. **Type: `cmd`** (this replaces the path)

5. **Press Enter**
   - A Command Prompt window opens
   - It's already in the right folder!

**METHOD 2 - Manual Navigation:**

1. **Press Windows key + R**

2. **Type: `cmd`** and press Enter

3. **Type these commands** (replace `YourName` with your actual Windows username):
   ```cmd
   cd C:\Users\YourName\FoodApp_Windows\backend
   ```
   Press Enter

## Step 4.3: Create Virtual Environment

Still in Command Prompt in the `backend` folder:

1. **Type this command and press Enter:**
   ```cmd
   python -m venv venv
   ```

2. **Wait 10-20 seconds**
   - Python is creating a "virtual environment"
   - This is like a sandbox for the app
   - You'll see some text, then the prompt returns

3. **A new folder called `venv` is created** in the backend directory

## Step 4.4: Activate Virtual Environment

1. **Type this command and press Enter:**
   ```cmd
   venv\Scripts\activate
   ```

2. **Your prompt changes!**
   - Before it looked like: `C:\Users\YourName\FoodApp_Windows\backend>`
   - Now it looks like: `(venv) C:\Users\YourName\FoodApp_Windows\backend>`
   - See the `(venv)` at the front? That means it's activated!

## Step 4.5: Upgrade pip

1. **Type this and press Enter:**
   ```cmd
   python -m pip install --upgrade pip
   ```

2. **Wait 5-10 seconds**
   - You'll see text scrolling
   - Should say "Successfully installed pip-XX.X.X"

## Step 4.6: Install All Python Packages

This installs all the libraries the app needs.

1. **Type this and press Enter:**
   ```cmd
   pip install -r requirements.txt
   ```

2. **WAIT 3-5 MINUTES**
   - You'll see LOTS of text scrolling
   - Packages being downloaded and installed
   - Lines like "Installing collected packages: ..."
   - **DO NOT CLOSE THE WINDOW**
   - This is normal - just wait

3. **When it's done, you'll see:**
   ```
   Successfully installed Flask-3.0.0 SQLAlchemy-2.0.23 ... (and many more)
   ```

4. **Your prompt returns:** `(venv) C:\Users\YourName\FoodApp_Windows\backend>`

✅ **All Python packages installed!**

---

# PART 5: CONFIGURE THE APPLICATION

## Step 5.1: Create .env File

The app needs a configuration file.

1. **In File Explorer, open the `backend` folder**
   - `C:\Users\YourName\FoodApp_Windows\backend`

2. **You should see a file called `.env.example`**
   - If you don't see file extensions:
     - Click "View" at the top
     - Check the box "File name extensions"

3. **Right-click on `.env.example`**

4. **Choose "Copy"**

5. **Right-click in empty space in the folder**

6. **Choose "Paste"**
   - A file appears: `.env.example - Copy`

7. **Right-click the copied file**

8. **Choose "Rename"**

9. **Delete everything and type just:**
   ```
   .env
   ```
   Press Enter

10. **Windows might warn you:**
    - "If you change a file name extension, the file might become unusable. Are you sure?"
    - Click "Yes"

11. **You now have a file called `.env`** (no .txt, no .example, just .env)

## Step 5.2: Edit .env File

1. **Right-click on the `.env` file**

2. **Choose "Open with"**

3. **Choose "Notepad"** (or "Choose another app" → "Notepad")

4. **The file opens** - you'll see several lines

5. **Find this line:**
   ```
   SECRET_KEY=your-secret-key-here-change-this-in-production
   ```

6. **Change it to a random string** (at least 24 characters):
   ```
   SECRET_KEY=my-cosy-cottage-super-secret-key-2026-delicious
   ```
   (You can type anything random here - it just needs to be secret and long)

7. **Find this line:**
   ```
   DATABASE_URL=mysql+pymysql://foodapp_user:YourPasswordHere@localhost/foodapp
   ```

8. **Change `YourPasswordHere` to the password you set earlier**
   
   If you used XAMPP and followed my instructions:
   ```
   DATABASE_URL=mysql+pymysql://foodapp_user:CosyCottage2026@localhost/foodapp
   ```
   
   If you used MySQL Community and set a different password:
   ```
   DATABASE_URL=mysql+pymysql://foodapp_user:YOUR_PASSWORD@localhost/foodapp
   ```

9. **Save the file:**
   - Click File → Save
   - OR press Ctrl + S

10. **Close Notepad**

✅ **Configuration complete!**

---

# PART 6: START THE APPLICATION

## Step 6.1: Make Sure Everything is Ready

**Check that:**
1. ✅ Virtual environment is activated (you see `(venv)` in Command Prompt)
2. ✅ You're in the `backend` folder
3. ✅ XAMPP MySQL is running (XAMPP Control Panel shows MySQL in green)
   - OR MySQL service is running if you used MySQL Community

**If XAMPP MySQL is not running:**
- Open XAMPP Control Panel (Windows key → type "XAMPP")
- Click "Start" next to MySQL
- Wait for it to turn green

## Step 6.2: Run the App

1. **In Command Prompt (with venv activated), type:**
   ```cmd
   python run.py
   ```

2. **Press Enter**

3. **You should see:**
   ```
   ============================================================
   🏡 Cosy Cottage Food App
   ============================================================
   Environment: development
   Debug mode: True
   Database: localhost/foodapp
   ============================================================
   ✅ Database tables created successfully

   🚀 Starting server...
   📱 Access the app at: http://localhost:5000
   🛑 Press CTRL+C to stop

    * Serving Flask app 'app'
    * Debug mode: on
   WARNING: This is a development server. Do not use it in a production deployment.
    * Running on all addresses (0.0.0.0)
    * Running on http://127.0.0.1:5000
    * Running on http://192.168.X.X:5000
   Press CTRL+C to quit
   ```

4. **Windows Firewall might pop up:**
   - "Windows Defender Firewall has blocked some features of this app"
   - **Check BOTH boxes:** ☑ Private networks ☑ Public networks
   - Click "Allow access"

✅ **The app is running!**

**IMPORTANT:** Do NOT close this Command Prompt window while using the app!

---

# PART 7: OPEN THE APP IN YOUR BROWSER

## Step 7.1: Open Browser

1. **Open your web browser**
   - Chrome, Edge, Firefox - doesn't matter

2. **In the address bar, type EXACTLY:**
   ```
   localhost:5000
   ```
   
   OR
   
   ```
   127.0.0.1:5000
   ```
   
   OR
   
   ```
   http://localhost:5000
   ```

3. **Press Enter**

4. **The Cosy Cottage Food App login page appears!** 🎉
   - Beautiful brown/cream colors
   - "🏡 Cosy Cottage Food App" at the top
   - Login and Register tabs

## Step 7.2: Create Your Account

1. **Click the "Register" tab**

2. **Fill in the form:**
   - **Username:**
     - Letters, numbers, underscore (_), or hyphen (-) only
     - Example: `john_chef` or `sarah-cooks`
   
   - **Email:**
     - Any valid email format
     - Example: `myemail@example.com`
     - The app doesn't send emails, so it doesn't have to be real
   
   - **Password:**
     - Must be at least 8 characters
     - Must have at least one letter
     - Must have at least one number
     - Example: `MyPassword123`

3. **Click the "Register" button**

4. **If successful:**
   - You'll see a success message
   - The form switches to "Login" tab

5. **Click the "Login" tab** (if not already there)

6. **Enter:**
   - Your username
   - Your password

7. **Click "Login"**

8. **You're in!** 🎉
   - The page changes to the dashboard
   - You'll see:
     - Navigation bar at top (Dashboard, Recipes, Find Recipes, Pantry, Meal Plan, History)
     - Statistics cards showing 0 recipes, 0 pantry items, 0 meal plans
     - "Recent Recipes" section (empty for now)

---

# PART 8: USING THE APP

## Add Your First Recipe

1. **Click "Recipes" in the navigation bar** (at the top)

2. **Click the "+ Add Recipe" button** (top right)

3. **Fill in the recipe form:**
   - **Title:** Name of the recipe (e.g., "Chocolate Chip Cookies")
   - **Description:** Optional short description
   - **Prep Time:** Minutes (e.g., 15)
   - **Cook Time:** Minutes (e.g., 12)
   - **Servings:** How many people (e.g., 24 cookies)
   - **Instructions:** How to make it

4. **Add Ingredients:**
   - Click "+ Add Ingredient"
   - Fill in:
     - Ingredient name (e.g., "Flour")
     - Quantity (e.g., 2)
     - Unit (e.g., "cups")
   - Click "+ Add Ingredient" again for more

5. **Select Tags:**
   - Check boxes that apply (e.g., Vegetarian, Dessert)

6. **Click "Save Recipe"**

7. **Your recipe appears!**

## Import Recipe from URL

1. **Find a recipe online** (any recipe website)

2. **Copy the URL** (web address)

3. **In the app, click "Recipes"**

4. **Click "🔗 Import from URL"**

5. **Paste the URL**

6. **Click "Import"**

7. **Wait a few seconds** - the app scrapes the website

8. **Recipe appears in the form** - edit if needed

9. **Click "Save Recipe"**

## Add Pantry Items

1. **Click "Pantry" in navigation**

2. **Click "+ Add Item"**

3. **Fill in:**
   - Item name
   - Quantity (optional)
   - Unit (optional)
   - Expiry date (optional)

4. **Click "Add to Pantry"**

## Scan Barcode (if you have a webcam)

1. **Click "Pantry"**

2. **Click "📷 Scan Barcode"**

3. **Allow camera access** when browser asks

4. **Point camera at a product barcode**

5. **App reads barcode and looks up product info**

6. **Click "Add to Pantry"**

## Plan Meals

1. **Click "Meal Plan"**

2. **Click on a date in the calendar**

3. **Click "+ Add Recipe"**

4. **Select a recipe from dropdown**

5. **Choose meal type** (Breakfast, Lunch, Dinner, Snack)

6. **Click "Add Meal"**

7. **Meal appears on calendar!**

## Find Other Users' Recipes

1. **Click "🔍 Find Recipes"**

2. **Type a username** in the search box

3. **Click "Search"**

4. **Click "View Recipes" on a user**

5. **Browse their recipes**

6. **Click "Copy to My Recipes" to add one to your collection**

---

# STOPPING THE APP

## When You're Done Using It

1. **Go to the Command Prompt window** where the app is running

2. **Press `Ctrl + C`** on your keyboard

3. **The app stops**
   - You'll see: "Keyboard interrupt received, exiting"

4. **Type `exit` and press Enter** to close Command Prompt

**To use the app again later:**
1. Start XAMPP MySQL (if using XAMPP)
2. Open Command Prompt in backend folder
3. Activate venv: `venv\Scripts\activate`
4. Run: `python run.py`
5. Open browser to `localhost:5000`

---

# ACCESSING FROM PHONE OR TABLET (Same WiFi)

## Step 1: Find Your Computer's IP Address

1. **On your Windows PC, press Windows key + R**

2. **Type: `cmd`** and press Enter

3. **Type: `ipconfig`** and press Enter

4. **Look for "IPv4 Address"** under your active network
   - It looks like: `192.168.1.100` (your numbers will be different)
   - **Write this number down**

## Step 2: Access from Phone

1. **Connect your phone to the SAME WiFi** as your computer

2. **Make sure the app is running** on your computer

3. **Open your phone's web browser**

4. **Type in the address bar:**
   ```
   192.168.1.100:5000
   ```
   (Use YOUR IP address, not this example!)

5. **Press Go**

6. **The app loads on your phone!** 📱

## Step 3: Add to Home Screen (Makes it Feel Like an App)

**On Android (Chrome):**
1. Open the app in Chrome
2. Tap the three dots (⋮) in top right
3. Tap "Add to Home screen"
4. Name it "Cosy Cottage"
5. Tap "Add"
6. Icon appears on your home screen!

**On iPhone (Safari):**
1. Open the app in Safari
2. Tap the share button (square with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Name it "Cosy Cottage"
5. Tap "Add"
6. Icon appears on your home screen!

---

# TROUBLESHOOTING - COMMON PROBLEMS

## Problem: "Python is not recognized as an internal or external command"

**Cause:** Python is not in your PATH

**Solution:**
1. Uninstall Python (Settings → Apps → Python → Uninstall)
2. Download Python again
3. When installing, CHECK THE BOX "Add Python to PATH"
4. Install again

## Problem: "pip is not recognized..."

**Solution:**
Try using:
```cmd
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

## Problem: "Access is denied" when installing packages

**Solution:**
1. Close Command Prompt
2. Right-click Start menu → "Windows PowerShell (Admin)" or "Command Prompt (Admin)"
3. Navigate to backend folder again
4. Activate venv
5. Try installing again

## Problem: Can't connect to database - "Access denied for user 'foodapp_user'"

**Cause:** Wrong password in .env file

**Solution:**
1. Open backend/.env in Notepad
2. Check the DATABASE_URL line
3. Make sure the password matches what you set in MySQL
4. Save the file
5. Restart the app (Ctrl+C in Command Prompt, then `python run.py` again)

## Problem: "Can't connect to MySQL server on 'localhost'"

**Cause:** MySQL is not running

**Solution for XAMPP:**
1. Open XAMPP Control Panel
2. Click "Start" next to MySQL
3. Wait for it to turn green
4. Restart the app

**Solution for MySQL Community:**
1. Press Windows key + R
2. Type: `services.msc`
3. Press Enter
4. Find "MySQL80" in the list
5. Right-click it → Start
6. Restart the app

## Problem: "Port 5000 is already in use"

**Cause:** Something else is using port 5000

**Solution 1 - Find and close it:**
```cmd
netstat -ano | findstr :5000
```
Note the number at the end (PID)
```cmd
taskkill /PID <that_number> /F
```

**Solution 2 - Use different port:**
1. Open `backend/run.py` in Notepad
2. Find the line with `port=5000`
3. Change to `port=5001`
4. Save
5. Run app again
6. Access at `localhost:5001` instead

## Problem: Barcode scanner or image import doesn't work

**Cause:** Tesseract not found

**Solution:**
1. Make sure Tesseract is installed (Part 3)
2. Make sure you added it to PATH (Part 3.3)
3. Restart Command Prompt after adding to PATH
4. If still doesn't work, open .env and add:
   ```
   TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe
   ```

## Problem: "ModuleNotFoundError: No module named 'flask'"

**Cause:** Virtual environment not activated OR packages not installed

**Solution:**
1. Make sure you see `(venv)` at the start of your command prompt
2. If not, run: `venv\Scripts\activate`
3. If still error, run: `pip install -r requirements.txt` again

## Problem: Webpage doesn't load - "This site can't be reached"

**Check these:**
1. Is the app running? (Check Command Prompt - should show "Running on...")
2. Try `127.0.0.1:5000` instead of `localhost:5000`
3. Try `http://localhost:5000` with http:// at the front
4. Check Windows Firewall isn't blocking it

## Problem: App runs but shows errors when trying to use features

**Solution:**
1. Look at the Command Prompt window - errors show there
2. Most common cause: Database connection issue
3. Make sure MySQL is running
4. Check .env password is correct
5. Restart the app

---

# MAKING IT ACCESSIBLE FROM ANYWHERE (INTERNET)

See the separate guide: `WINDOWS_CLOUDFLARE_TUNNEL_SETUP.md`

**Quick preview:**
1. Download cloudflared for Windows
2. Run: `cloudflared tunnel --url http://localhost:5000`
3. Get a URL like: `https://random-words.trycloudflare.com`
4. Share that URL - works from anywhere!

---

# KEEPING THE APP RUNNING 24/7

If you want the app to always be available:

## Option 1: Leave Computer On
- Keep your PC on
- Keep Command Prompt window open
- Keep XAMPP running

## Option 2: Run as Windows Service
More advanced - see `WINDOWS_SERVICE_SETUP.md`

## Option 3: Use Cloudflare Tunnel
Can set up tunnel to run automatically on startup

---

# UPDATING THE APP IN THE FUTURE

If you get an updated version:

1. Stop the app (Ctrl+C in Command Prompt)
2. Replace files with new ones
3. In Command Prompt (with venv activated):
   ```cmd
   pip install -r requirements.txt --upgrade
   ```
4. Restart app: `python run.py`

---

# BACKING UP YOUR DATA

Your recipes are in the MySQL database.

**To backup:**
1. Open Command Prompt
2. Navigate to XAMPP:
   ```cmd
   cd C:\xampp\mysql\bin
   ```
3. Export database:
   ```cmd
   mysqldump -u root foodapp > C:\Users\YourName\Desktop\foodapp_backup.sql
   ```

**To restore:**
1. Open MySQL (in XAMPP shell or Command Prompt):
   ```cmd
   mysql -u root foodapp < C:\Users\YourName\Desktop\foodapp_backup.sql
   ```

---

# SUMMARY - QUICK REFERENCE

**Start the app:**
1. Open XAMPP Control Panel → Start MySQL
2. Open Command Prompt in `FoodApp_Windows\backend`
3. Run: `venv\Scripts\activate`
4. Run: `python run.py`
5. Open browser to `localhost:5000`

**Stop the app:**
- Press Ctrl+C in Command Prompt
- Type `exit` and press Enter

**Access from phone:**
- Same WiFi
- Use computer's IP: `192.168.1.X:5000`

**If something breaks:**
- Check MySQL is running (XAMPP green)
- Check venv is activated (see `(venv)`)
- Check .env has correct password
- Look at Command Prompt for error messages

---

# YOU'RE DONE! 🎉

You now have a fully functional food management app running on your Windows PC!

**What you can do:**
- ✅ Add recipes manually
- ✅ Import from URLs
- ✅ Import from images
- ✅ Scan barcodes
- ✅ Track pantry
- ✅ Plan meals
- ✅ Rate recipes
- ✅ Find other users' recipes
- ✅ Access from phone

**Enjoy your Cosy Cottage! 🏡🍳**
