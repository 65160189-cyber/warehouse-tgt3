# 🚀 TGT3 Warehouse - Quick Start Guide

## ⚡ Fast Setup (5 Minutes)

### 1. Install Requirements
```bash
# Install Node.js from https://nodejs.org/ (if not already installed)
node --version  # Should show v16+

# Install MySQL from https://dev.mysql.com/downloads/ (if not already installed)
# Start MySQL service on Windows: net start mysql
```

### 2. Setup Project
```bash
# Navigate to project folder
cd "c:\Users\ASUS\Desktop\Project Deploy"

# Install dependencies
npm install

# Setup environment (edit if needed)
copy .env.example .env
```

### 3. Start Database
```bash
# Initialize database (creates tables and admin user)
node scripts/init-database.js

# If this fails, check MySQL is running and .env settings are correct
```

### 4. Launch Server
```bash
# Start the server
npm start

# Server will run at: http://localhost:3000
# Default login: admin / admin123
```

### 5. Open Application
- Open `index-multiuser.html` in browser
- Or navigate to http://localhost:3000 (if serving static files)
- Login with: **admin** / **admin123**

## 🎯 Test Multi-User Feature

1. Open 2 browser windows/tabs
2. Login with same credentials in both
3. In one window, add/import orders
4. In other window, see real-time updates
5. Test dispatch operations sync across windows

## 🛠 One-Click Start (Windows)

Double-click `start-server.bat` file to:
- Check dependencies
- Install packages if needed
- Initialize database
- Start server automatically

## 🔧 If Something Goes Wrong

### Server Won't Start
```bash
# Check if port 3000 is free
netstat -ano | findstr :3000

# Kill process if needed
taskkill /PID <PID> /F
```

### Database Errors
```bash
# Test MySQL connection
mysql -u root -p -e "SELECT 1"

# Re-initialize database
node scripts/init-database.js
```

### Login Issues
- Username: `admin`
- Password: `admin123`
- Clear browser cache if needed

## 📱 Mobile Access

1. Find your computer's IP address:
```bash
ipconfig
```

2. Update .env file:
```env
ALLOWED_ORIGINS=http://YOUR_IP:3000,http://localhost:3000
```

3. Access from mobile: `http://YOUR_IP:3000`

## 🎉 Success Indicators

✅ Server starts without errors  
✅ Database tables created (7 tables)  
✅ Admin user created  
✅ Login works  
✅ Dashboard shows data  
✅ Real-time updates work  
✅ Multiple users can connect  

## 📞 Need Help?

Check `TROUBLESHOOTING.md` for detailed solutions to common issues.
