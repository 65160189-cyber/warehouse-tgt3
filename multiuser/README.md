# TGT3 Warehouse Multi-user System

## 🎯 คุณสมบัติ
- 👥 **Multi-user** - หลายคนพร้อมกัน
- 🔐 **Authentication** - Login/Logout ด้วย JWT
- ⚡ **Real-time** - Socket.io updates
- 🗄️ **SQLite Database** - ฐานข้อมูลกลาง
- 📊 **Live Dashboard** - สถิติแบบ Real-time
- 👥 **User Management** - จัดการผู้ใช้
- 📱 **Web-based** - ใช้ผ่าน Browser
- 🔄 **Auto-sync** - อัปเดตข้อมูลทันที

## 🚀 การติดตั้ง

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. เริ่ม Server
```bash
npm start
# หรือ
node server.js
```

### 3. เปิด Browser
```
http://localhost:3001
```

## 🔑 Login ครั้งแรก
- Username: `admin`
- Password: `admin123`

## 📋 ฟังก์ชันหลัก

### 👥 Multi-user Features
- **Login System** - ผู้ใช้หลายคน
- **User Roles** - Admin/User permissions
- **Session Management** - JWT tokens
- **Real-time Status** - ดูว่าใครออนไลน์

### ⚡ Real-time Updates
- **Live Dashboard** - สถิติอัปเดตทันที
- **Activity Log** - บันทึกการกระทำ
- **User Count** - จำนวนผู้ใช้ออนไลน์
- **Instant Notifications** - แจ้งเตือนทันที

### 🗄️ Database Management
- **SQLite** - ฐานข้อมูลกลาง
- **Orders** - จัดการออเดอร์
- **Users** - จัดการผู้ใช้
- **History** - บันทึกประวัติ
- **Customers** - ข้อมูลลูกค้า

### 📊 Dashboard
- **Today's Progress** - สถิติวันนี้
- **Delayed Orders** - รายการค้างส่ง
- **System Load** - ภาระงานทั้งหมด
- **Live Updates** - อัปเดตแบบ Real-time

### 🔄 API Endpoints
- `POST /api/auth/login` - Login
- `GET /api/auth/verify` - Verify token
- `GET /api/orders` - ดูรายการ
- `GET /api/dashboard/stats` - สถิติ
- `GET /api/health` - ตรวจสอบ Server

## 🛠️ การพัฒนา

### เพิ่ม User ใหม่
```sql
INSERT INTO users (username, password_hash, full_name, role) 
VALUES ('user1', 'hashed_password', 'User One', 'user');
```

### แก้ไข Port
```javascript
const PORT = process.env.PORT || 3001;
```

### Custom JWT Secret
```javascript
const JWT_SECRET = 'your-secret-key';
```

## 📁 โครงสร้างโฟลเดอร์
```
multiuser/
├── server.js              # Backend Server
├── package.json           # Dependencies
├── warehouse.db           # SQLite Database
└── public/
    └── index.html         # Frontend
```

## 🔧 Dependencies
- **express** - Web framework
- **socket.io** - Real-time communication
- **sqlite3** - Database
- **bcrypt** - Password hashing
- **jsonwebtoken** - JWT tokens
- **cors** - Cross-origin requests
- **helmet** - Security

## 🎯 การใช้งาน

### 1. เปิดหลาย Browser
- เปิด `http://localhost:3001` ในหลาย Tab
- Login ด้วย admin/admin123
- ดู Online Users เพิ่มขึ้น

### 2. Real-time Test
- Tab 1: Login แล้วดู Dashboard
- Tab 2: Login อีกครั้ง
- ดู Activity Log อัปเดตทันที

### 3. Multi-user Features
- ดูว่าใครออนไลน์
- แจ้งเตือนการกระทำ
- อัปเดตข้อมูล Real-time

## 🔒 ความปลอดภัย
- JWT Authentication
- Password hashing (bcrypt)
- CORS protection
- Helmet security headers
- Session management

## 📱 Browser Support
- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

## 🚀 Performance
- Lightweight SQLite
- Efficient Socket.io
- Optimized queries
- Real-time updates

---
**เหมาะสำหรับ:** ทีมงาน, หลายคนใช้พร้อมกัน, ข้อมูลกลาง
