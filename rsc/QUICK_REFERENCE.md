# 📋 Quick Reference Card - Windows

Print this page and keep it handy!

---

## 🚀 STARTING THE APP

### Every Time You Want to Use It:

1. **Start MySQL:**
   - Open XAMPP Control Panel
   - Click "Start" next to MySQL (should turn green)

2. **Start Food App:**
   - Go to: `C:\Users\YourName\FoodApp_Windows\backend`
   - Double-click: `START_APP.bat`
   - Wait for "Running on http://127.0.0.1:5000"

3. **Open Browser:**
   - Go to: `http://localhost:5000`

---

## 🛑 STOPPING THE APP

1. Go to Command Prompt window (black window with app running)
2. Press `Ctrl + C`
3. Type `exit` and press Enter
4. Close XAMPP if you want (click "Stop" next to MySQL)

---

## 🌐 ACCESS FROM PHONE (Same WiFi)

1. **Find your PC's IP:**
   - Press Windows key + R
   - Type: `cmd` → Enter
   - Type: `ipconfig` → Enter
   - Look for "IPv4 Address" → Copy the number (like 192.168.1.100)

2. **On your phone:**
   - Open browser
   - Type: `http://192.168.1.100:5000` (use YOUR IP)
   - Press Go

---

## ☁️ ACCESS FROM ANYWHERE (Internet)

**See full guide:** `CLOUDFLARE_TUNNEL_WINDOWS.md`

**Quick version:**
```cmd
cd C:\cloudflared
cloudflared.exe tunnel --url http://localhost:5000
```
Copy the https:// URL it gives you - share with anyone!

---

## 🔧 COMMON PROBLEMS

### Can't Start App - "MySQL Connection Error"

**Fix:**
1. Open XAMPP Control Panel
2. Click "Start" next to MySQL
3. Wait for it to turn green
4. Try starting app again

### Can't Start App - "Port 5000 in use"

**Fix:**
```cmd
netstat -ano | findstr :5000
taskkill /PID <number> /F
```

### Can't Login - "Invalid Username/Password"

**Fix:**
- Make sure you registered first (Register tab)
- Check Caps Lock is off
- Username is case-sensitive

### Changes Don't Appear

**Fix:**
- Press Ctrl + F5 in browser (hard refresh)
- Clear browser cache
- Close and reopen browser

---

## 📁 IMPORTANT FILE LOCATIONS

### App Folder:
```
C:\Users\YourName\FoodApp_Windows
```

### Start App Script:
```
C:\Users\YourName\FoodApp_Windows\backend\START_APP.bat
```

### Configuration File:
```
C:\Users\YourName\FoodApp_Windows\backend\.env
```

### XAMPP Control Panel:
```
C:\xampp\xampp-control.exe
```

### MySQL Data:
```
C:\xampp\mysql\data\foodapp
```

---

## 💾 BACKUP YOUR RECIPES

### Backup (Save):
```cmd
cd C:\xampp\mysql\bin
mysqldump -u root foodapp > C:\backup\my_recipes.sql
```

### Restore (Load):
```cmd
mysql -u root foodapp < C:\backup\my_recipes.sql
```

---

## 🔐 DEFAULT PASSWORDS

### Your Database:
- **User:** `foodapp_user`
- **Password:** `CosyCottage2026` (or what you set)
- **Database:** `foodapp`

### Your App Account:
- **Username:** (whatever you chose when registering)
- **Password:** (whatever you chose)

**Change these if you make it public!**

---

## 📞 HELP RESOURCES

### Full Setup Guide:
```
WINDOWS_SETUP_GUIDE.md
```

### Internet Access:
```
CLOUDFLARE_TUNNEL_WINDOWS.md
```

### This README:
```
README.md
```

### All In One Folder:
```
C:\Users\YourName\FoodApp_Windows
```

---

## ⌨️ USEFUL COMMANDS

### Activate Virtual Environment:
```cmd
cd C:\Users\YourName\FoodApp_Windows\backend
venv\Scripts\activate
```

### Start App Manually:
```cmd
python run.py
```

### Install/Update Packages:
```cmd
pip install -r requirements.txt
```

### Check Python Version:
```cmd
python --version
```

### Check If App Is Running:
- Open browser to: `http://localhost:5000`
- If it loads → App is running!

---

## 🎯 QUICK FEATURES GUIDE

### Import Recipe from Website:
1. Recipes → 🔗 Import from URL
2. Paste URL → Import

### Scan Barcode:
1. Pantry → 📷 Scan Barcode
2. Allow camera → Point at barcode

### Plan Meal:
1. Meal Plan → Click date
2. Select recipe → Add Meal

### Find User's Recipes:
1. 🔍 Find Recipes
2. Type username → Search
3. View Recipes → Copy

### Rate Recipe:
1. History → Log Meal
2. Select recipe
3. Give stars (1-5)

---

## 🔄 DAILY ROUTINE

### Starting Your Day:
1. Start XAMPP MySQL
2. Double-click START_APP.bat
3. Open browser to localhost:5000

### Using The App:
- Add/view recipes
- Plan meals
- Check pantry
- Find new recipes from users

### Ending Your Day:
1. Press Ctrl+C in app window
2. Type exit
3. Stop MySQL in XAMPP (optional)

---

## 🆘 EMERGENCY RESET

**If Everything Breaks:**

1. **Restart Computer**

2. **Reinstall Database:**
   ```sql
   DROP DATABASE foodapp;
   CREATE DATABASE foodapp;
   ```

3. **Restore from Backup:**
   ```cmd
   mysql -u root foodapp < C:\backup\my_recipes.sql
   ```

4. **Or Start Fresh:**
   - Delete: `C:\xampp\mysql\data\foodapp`
   - Restart app (creates new empty database)

---

## 📱 PHONE APP SETUP

### Android:
1. Open localhost:5000 (or your IP) in Chrome
2. Menu → Add to Home Screen
3. Name it "Cosy Cottage"
4. Done! Icon on home screen

### iPhone:
1. Open in Safari
2. Share button → Add to Home Screen
3. Name it "Cosy Cottage"
4. Done! Icon on home screen

---

## ✅ PRE-FLIGHT CHECKLIST

Before starting app each time:

- [ ] MySQL is running (XAMPP green light)
- [ ] Not using port 5000 for anything else
- [ ] .env file has correct password
- [ ] Internet connected (if using Cloudflare)

---

## 🎉 SUCCESS INDICATORS

**You know it's working when:**

✅ Command Prompt shows "Running on http://127.0.0.1:5000"
✅ Browser loads the login page at localhost:5000
✅ You can log in and see the dashboard
✅ You can add/view recipes
✅ MySQL line in XAMPP is GREEN

---

**Keep this card handy for quick reference!**

**For detailed help, see:** `WINDOWS_SETUP_GUIDE.md`

🏡 Happy Cooking! 🍳
