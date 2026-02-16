# TGT3 Warehouse System - Troubleshooting Guide

## 🚨 Common Issues & Solutions

### 1. Database Connection Issues

**Problem**: `ECONNREFUSED` or database connection errors

**Solutions**:
```bash
# Check if MySQL is running
mysqladmin ping -h localhost -u root -p

# Start MySQL service (Windows)
net start mysql

# Start MySQL service (Linux/Mac)
sudo systemctl start mysql
sudo service mysql start
```

**Check .env configuration**:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_actual_password
DB_NAME=tgt3_warehouse
```

### 2. Node.js Installation Issues

**Problem**: `node is not recognized`

**Solutions**:
1. Install Node.js from https://nodejs.org/
2. Verify installation:
```bash
node --version
npm --version
```
3. Restart terminal/command prompt after installation

### 3. Port Already in Use

**Problem**: `EADDRINUSE: address already in use :::3000`

**Solutions**:
```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Or change port in .env
PORT=3001
```

### 4. Database Schema Issues

**Problem**: Tables not created or schema errors

**Solutions**:
```bash
# Re-initialize database
node scripts/init-database.js

# Or manually import schema
mysql -u root -p tgt3_warehouse < database/schema.sql
```

### 5. Authentication Issues

**Problem**: Login fails with "Invalid credentials"

**Solutions**:
1. Check admin user exists:
```sql
USE tgt3_warehouse;
SELECT * FROM users WHERE username = 'admin';
```

2. Reset admin password:
```sql
UPDATE users SET password_hash = '$2a$10$rOzJqQjQjQjQjQjQjQjQjOzJqQjQjQjQjQjQjQjQjQjQjQjQjQjQ' WHERE username = 'admin';
```

3. Default credentials: `admin / admin123`

### 6. Frontend Issues

**Problem**: Page not loading or JavaScript errors

**Solutions**:
1. Use `index-multiuser.html` (not the original `index.html`)
2. Check browser console for errors (F12)
3. Ensure server is running and accessible
4. Check CORS settings in .env

### 7. Real-time Updates Not Working

**Problem**: Changes don't appear on other users' screens

**Solutions**:
1. Check Socket.io is loaded (browser network tab)
2. Verify WebSocket connection in console
3. Check firewall settings
4. Ensure both users are logged in with valid tokens

## 🔧 Diagnostic Commands

### Test Server Connection
```bash
# Test if server responds
curl http://localhost:3000/api/health

# Or use Node.js test script
node test-api.js
```

### Check Database Connection
```bash
# Test MySQL connection
mysql -h localhost -u root -p -e "SELECT 1"

# Check if database exists
mysql -u root -p -e "SHOW DATABASES LIKE 'tgt3_warehouse'"
```

### Verify Dependencies
```bash
# Check installed packages
npm list

# Reinstall if needed
rm -rf node_modules package-lock.json
npm install
```

## 📋 Step-by-Step Setup Checklist

### ✅ Prerequisites
- [ ] Node.js 16+ installed
- [ ] MySQL 8.0+ installed and running
- [ ] Git (optional)

### ✅ Installation Steps
1. [ ] Clone/download project files
2. [ ] Copy `.env.example` to `.env`
3. [ ] Configure database credentials in `.env`
4. [ ] Run `npm install`
5. [ ] Run `node scripts/init-database.js`
6. [ ] Start server with `npm start`

### ✅ Testing Steps
1. [ ] Server starts without errors
2. [ ] Health endpoint responds: http://localhost:3000/api/health
3. [ ] Login works: admin/admin123
4. [ ] Dashboard loads data
5. [ ] Multiple browsers can connect simultaneously

## 🆘 Getting Help

### Debug Information to Collect
1. **Server logs** - Copy any error messages from server console
2. **Browser console** - Press F12, check Console tab for JavaScript errors
3. **Network tab** - Check failed API requests
4. **Database status** - Confirm MySQL is running and accessible

### Common Error Messages & Meanings

| Error | Meaning | Solution |
|-------|---------|----------|
| `ECONNREFUSED` | Cannot connect to MySQL | Start MySQL service, check credentials |
| `ER_ACCESS_DENIED_ERROR` | Wrong MySQL password | Update .env with correct password |
| `ER_BAD_DB_ERROR` | Database doesn't exist | Run database initialization script |
| `JWT expired` | Login session expired | Login again |
| `CORS policy error` | Frontend can't access API | Update ALLOWED_ORIGINS in .env |

### Performance Issues

**If system is slow**:
1. Check database indexes exist
2. Monitor MySQL performance
3. Check network latency
4. Reduce number of simultaneous users for testing

## 🔄 Reset System

**Complete reset** (deletes all data):
```bash
# Drop and recreate database
mysql -u root -p -e "DROP DATABASE IF EXISTS tgt3_warehouse; CREATE DATABASE tgt3_warehouse CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Re-import schema
mysql -u root -p tgt3_warehouse < database/schema.sql

# Reset admin user
mysql -u root -p tgt3_warehouse -e "UPDATE users SET password_hash = '\$2a\$10\$rOzJqQjQjQjQjQjQjQjQjOzJqQjQjQjQjQjQjQjQjQjQjQjQjQjQ' WHERE username = 'admin';"
```

## 📞 Support

If issues persist:
1. Check this guide first
2. Search error messages online
3. Review server and browser logs
4. Test with minimal setup (single user)
5. Document exact steps to reproduce the issue
