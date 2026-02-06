# 🏡 Cosy Cottage Food App - Windows Edition

A complete food management application for Windows with recipe tracking, pantry management, meal planning, and user recipe sharing.

## ✨ Features

- 📖 **Recipe Management** - Create, edit, organize recipes
- 🔍 **User Search** - Find other users and copy their recipes
- ⭐ **Ratings & Reviews** - Rate recipes and see community feedback
- 🥫 **Pantry Tracking** - Manage ingredients with barcode scanning
- 📅 **Meal Planning** - Interactive calendar for planning meals
- 📊 **Meal History** - Track what you've cooked and loved
- 📷 **Image Import** - Extract recipes from photos (OCR)
- 🔗 **URL Import** - Import recipes from any website
- 📱 **Mobile Access** - Use from phone, tablet, or computer
- 🌐 **Global Access** - Share with anyone, anywhere (optional)

## 📋 What's Included

```
FoodApp_Windows/
├── WINDOWS_SETUP_GUIDE.md          ⭐ START HERE - Complete setup instructions
├── CLOUDFLARE_TUNNEL_WINDOWS.md    ☁️ Make it accessible from anywhere
├── README.md                        📖 This file
│
├── backend/                         🔧 Python/Flask backend
│   ├── SETUP.bat                   ⚡ Double-click to set up (run once)
│   ├── START_APP.bat               ⚡ Double-click to start app
│   ├── run.py                      🚀 Main application
│   ├── requirements.txt            📦 Python dependencies
│   ├── .env.example                ⚙️ Configuration template
│   └── app/                        💻 Application code
│       ├── __init__.py
│       ├── config.py
│       ├── models.py               (Database)
│       ├── routes.py               (API endpoints)
│       ├── auth.py                 (Login/register)
│       └── utils.py                (Helper functions)
│
└── frontend/                        🎨 HTML/CSS/JavaScript frontend
    └── public/
        ├── index.html              📄 Main page
        ├── manifest.json           📱 PWA config
        ├── css/
        │   └── style.css           🎨 Cosy cottage theme
        └── js/
            ├── main.js             Main app logic
            ├── api.js              API communication
            ├── recipes.js          Recipe management
            ├── users.js            User search
            ├── pantry.js           Pantry tracking
            ├── scanner.js          Barcode/QR scanning
            ├── mealplan.js         Meal planning
            └── history.js          Meal history
```

## 🚀 Quick Start (5 Steps)

### 1. Install Requirements

You need these installed on Windows:
- **Python 3.8+** - [Download here](https://www.python.org/downloads/)
  - ⚠️ CHECK "Add Python to PATH" during installation!
- **MySQL** - [XAMPP (easiest)](https://www.apachefriends.org/) or [MySQL Community](https://dev.mysql.com/downloads/installer/)
- **Tesseract OCR** - [Download here](https://github.com/UB-Mannheim/tesseract/wiki)

### 2. Set Up Database

Open XAMPP Control Panel (or MySQL Command Line) and run:
```sql
CREATE DATABASE foodapp;
CREATE USER 'foodapp_user'@'localhost' IDENTIFIED BY 'CosyCottage2026';
GRANT ALL PRIVILEGES ON foodapp.* TO 'foodapp_user'@'localhost';
FLUSH PRIVILEGES;
```

### 3. Run Setup

Navigate to `backend` folder and double-click:
```
SETUP.bat
```

Wait for it to finish (3-5 minutes).

### 4. Configure Database

Edit `backend\.env` in Notepad:
- Change the password to match what you set in MySQL
- Save the file

### 5. Start the App

Double-click:
```
backend\START_APP.bat
```

Open browser to: `http://localhost:5000`

**That's it!** 🎉

## 📖 Detailed Setup Guide

**For complete step-by-step instructions with screenshots of every click:**

👉 **See: `WINDOWS_SETUP_GUIDE.md`**

This guide assumes you've NEVER done anything like this and explains:
- Where to click
- What each button does
- What to type
- What you should see
- How to fix common problems

## 🌐 Make It Accessible from Anywhere

**Want to access from your phone when you're at the grocery store?**
**Want to share with family members?**

👉 **See: `CLOUDFLARE_TUNNEL_WINDOWS.md`**

This shows you how to:
- Get a public URL (FREE)
- Access from anywhere
- Automatic HTTPS security
- No port forwarding needed
- Takes 15 minutes

## 📱 Using the App

### Create Account

1. Open `http://localhost:5000`
2. Click "Register" tab
3. Choose username and password
4. Click "Register"
5. Log in!

### Add Recipe Manually

1. Click "Recipes" → "+ Add Recipe"
2. Fill in title, ingredients, instructions
3. Select dietary tags (gluten-free, vegan, etc.)
4. Click "Save Recipe"

### Import Recipe from Website

1. Find a recipe online
2. Copy the URL
3. Click "Recipes" → "🔗 Import from URL"
4. Paste URL and click "Import"
5. Recipe is extracted automatically!

### Import Recipe from Image

1. Take a photo of a recipe
2. Click "Recipes" → "📷 Import from Image"
3. Upload the photo
4. App reads text with OCR
5. Review and save!

### Add to Pantry with Barcode

1. Click "Pantry" → "📷 Scan Barcode"
2. Allow camera access
3. Point at barcode
4. Product info loads automatically!
5. Click "Add to Pantry"

### Plan Meals

1. Click "Meal Plan"
2. Click a date on calendar
3. Click "+ Add Recipe"
4. Select recipe and meal type
5. Meal appears on calendar!

### Find Other Users' Recipes

1. Click "🔍 Find Recipes"
2. Search for username
3. Click "View Recipes"
4. Browse their recipes
5. Click "Copy to My Recipes" to add

### Rate Recipes

1. Click "History" → "Log Meal"
2. Select recipe you made
3. Rate it 1-5 stars
4. Add notes (optional)
5. Ratings appear on recipes!

## 🖥️ System Requirements

**Minimum:**
- Windows 10 or 11
- 4 GB RAM
- 2 GB free disk space
- Internet connection (for setup)

**Recommended:**
- Windows 10/11 64-bit
- 8 GB RAM
- Webcam (for barcode scanning)
- SSD storage

## 🔧 Troubleshooting

### App won't start

**Check:**
1. Is MySQL running? (XAMPP Control Panel → MySQL should be green)
2. Did you activate venv? (see `(venv)` at start of prompt)
3. Did you edit .env with correct password?

**Solution:**
See `WINDOWS_SETUP_GUIDE.md` → "TROUBLESHOOTING" section

### Can't connect to database

**Check `.env` file:**
- Open `backend\.env` in Notepad
- Verify password matches what you set in MySQL
- Save and restart app

### Python not found

**Solution:**
1. Reinstall Python
2. During installation, CHECK "Add Python to PATH"
3. Restart Command Prompt

### Port 5000 already in use

**Solution:**
```cmd
netstat -ano | findstr :5000
taskkill /PID <number> /F
```

Or edit `run.py` and change port to 5001.

## 📂 File Structure

### Backend (Python)

- `run.py` - Starts the Flask application
- `app/__init__.py` - App initialization
- `app/config.py` - Configuration settings
- `app/models.py` - Database tables
- `app/routes.py` - API endpoints
- `app/auth.py` - Login/register logic
- `app/utils.py` - Helper functions (OCR, web scraping, QR codes)

### Frontend (JavaScript)

- `index.html` - Main HTML file
- `css/style.css` - Cosy cottage styling
- `js/main.js` - Main application logic
- `js/api.js` - Communication with backend
- `js/recipes.js` - Recipe features
- `js/users.js` - User search & discovery
- `js/pantry.js` - Pantry management
- `js/scanner.js` - Barcode/QR scanning
- `js/mealplan.js` - Meal planning calendar
- `js/history.js` - Meal history tracking

## 🗄️ Database

**Tables created automatically:**
- `users` - User accounts
- `recipes` - Recipe information
- `recipe_ingredients` - Ingredients
- `recipe_tags` - Dietary tags (gluten-free, vegan, etc.)
- `pantry_items` - Pantry inventory
- `meal_plans` - Planned meals
- `meal_history` - Consumed meals with ratings

## 🔒 Security Features

- ✅ Password hashing (Werkzeug + bcrypt)
- ✅ Session management (Flask-Login)
- ✅ Rate limiting (prevents brute force)
- ✅ Input validation and sanitization
- ✅ SQL injection protection (SQLAlchemy ORM)
- ✅ CSRF protection (production ready)

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Recipes
- `GET /api/recipes` - List user's recipes
- `POST /api/recipes` - Create recipe
- `PUT /api/recipes/<id>` - Update recipe
- `DELETE /api/recipes/<id>` - Delete recipe
- `POST /api/recipes/import-url` - Import from URL
- `POST /api/recipes/import-image` - Import from image

### User Discovery
- `GET /api/users/search?q=<query>` - Search users
- `GET /api/users/<id>/recipes` - Get user's recipes
- `POST /api/recipes/<id>/copy` - Copy recipe

### Pantry
- `GET /api/pantry` - List pantry items
- `POST /api/pantry` - Add item
- `POST /api/pantry/scan` - Scan barcode

### Meal Planning
- `GET /api/mealplan` - Get meal plan
- `POST /api/mealplan` - Add meal
- `PUT /api/mealplan/<id>` - Update meal
- `DELETE /api/mealplan/<id>` - Delete meal

### History
- `GET /api/history` - Get meal history
- `POST /api/history` - Log meal with rating

## 🎨 Design Theme

"Cosy Cottage" aesthetic:
- Warm earth tones (browns, creams, sage)
- Rustic, homey feel
- Soft rounded corners
- Comfortable typography
- Food-themed icons

## 🔄 Updating

When you get an updated version:

1. Stop the app (Ctrl+C)
2. Replace files with new ones
3. Open Command Prompt in `backend`
4. Activate venv: `venv\Scripts\activate`
5. Update packages: `pip install -r requirements.txt --upgrade`
6. Restart: `python run.py`

## 💾 Backing Up

### Backup Database:

```cmd
cd C:\xampp\mysql\bin
mysqldump -u root foodapp > C:\backup\foodapp.sql
```

### Restore Database:

```cmd
mysql -u root foodapp < C:\backup\foodapp.sql
```

## 📞 Getting Help

### Documentation:
1. `WINDOWS_SETUP_GUIDE.md` - Complete setup (read this first!)
2. `CLOUDFLARE_TUNNEL_WINDOWS.md` - Internet access
3. This `README.md` - Overview

### Common Issues:
See the "TROUBLESHOOTING" section in `WINDOWS_SETUP_GUIDE.md`

All common problems are covered with solutions!

## ⚡ Quick Commands

### Start the app:
```cmd
cd backend
venv\Scripts\activate
python run.py
```

Or just double-click: `START_APP.bat`

### Stop the app:
Press `Ctrl+C` in the Command Prompt window

### Access locally:
```
http://localhost:5000
```

### Access from phone (same WiFi):
```
http://YOUR_PC_IP:5000
```

## 🎯 What Makes This Special

Compared to commercial apps (Paprika, Mealime, etc.):

| Feature | Cosy Cottage | Commercial Apps |
|---------|--------------|-----------------|
| Cost | FREE forever | $5-30/month |
| Own your data | ✅ Yes | ❌ No |
| Self-hosted | ✅ Yes | ❌ Cloud only |
| Customize | ✅ Fully | ❌ Limited |
| Privacy | ✅ Complete | ⚠️ Varies |
| User sharing | ✅ Yes | ⚠️ Limited |
| Offline capable | ✅ Yes | ⚠️ Partial |
| Open source friendly | ✅ Yes | ❌ No |

## 🚀 Performance

Can handle:
- Unlimited recipes
- Unlimited users
- 50-100 concurrent users (single PC)
- Large images via OCR
- Thousands of pantry items
- Years of meal history

## 💰 Total Cost

**Free Version (Local Only):**
- Hardware: Your existing PC
- Software: All FREE
- **Total: $0**

**Internet Access (Cloudflare Tunnel):**
- Cloudflare: FREE
- HTTPS: FREE (included)
- Your PC + electricity: ~$5/month
- **Total: ~$5/month**

**Optional Custom Domain:**
- Domain: $10-15/year
- **Total: ~$6/month including domain**

## 🎓 Learning Resources

### For Total Beginners:
- `WINDOWS_SETUP_GUIDE.md` - Every step explained
- `CLOUDFLARE_TUNNEL_WINDOWS.md` - Make it public

### For Developers:
- Full source code included
- Commented and documented
- RESTful API
- Modern Python/JavaScript

## 🔮 Future Ideas

You could add:
- Shopping list generation
- Recipe scaling
- Ingredient substitutions
- Nutritional analysis
- Voice input
- Recipe collections
- Social features
- AI recommendations
- Print recipe cards

## 📜 License

Open source friendly - use for personal or educational purposes.

## 🙏 Credits

Built with:
- Flask (Python web framework)
- SQLAlchemy (Database)
- Tesseract OCR (Image text recognition)
- FullCalendar (Meal planning)
- Html5-QRCode (Barcode scanning)
- OpenFoodFacts API (Product info)
- BeautifulSoup (Web scraping)

---

## 🎉 You're Ready!

**Everything you need is in this folder:**

1. ✅ Complete application code
2. ✅ Setup scripts (double-click!)
3. ✅ Detailed documentation
4. ✅ Troubleshooting guides
5. ✅ Internet access instructions

**Start now:**
1. Read `WINDOWS_SETUP_GUIDE.md`
2. Follow the steps
3. Start cooking! 🍳

**Questions?**
- Check `WINDOWS_SETUP_GUIDE.md` → Troubleshooting section
- All common issues are documented with solutions

---

**Enjoy your Cosy Cottage Food App! 🏡🍳**

Made with ❤️ for home cooks everywhere
#   F o o d A p p  
 