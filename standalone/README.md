# TGT3 Warehouse Standalone System

## 🎯 คุณสมบัติ
- ✅ **ใช้ได้คนเดียว** - ไม่ต้อง Server
- 📦 **IndexedDB** - ข้อมูลในเครื่อง
- 📱 **Responsive** - Desktop & Mobile
- 📊 **ฟังก์ชันครบ** - Dashboard, Dispatch, Stock, History
- 📤 **Excel import** - นำเข้าข้อมูล
- 🖨️ **PDF export** - พิมพ์ใบส่งของ
- 📷 **Barcode scanner** - สแกนผ่านกล้อง
- 🌙 **Dark mode** - สลับธีม

## 🚀 วิธีใช้งาน

### วิธีที่ 1: เปิดไฟล์ตรง
1. ดับเบิลคลิก `index.html`
2. ใช้งานได้ทันที

### วิธีที่ 2: ใช้ Server (แนะนำ)
```bash
# Python 3
python -m http.server 8000

# Node.js
npx serve .

# PHP
php -S localhost:8000
```

## 📋 ฟังก์ชันหลัก

### 📊 Dashboard
- สถิติการส่งวันนี้
- รายการค้างส่ง
- ภาระงานทั้งหมด
- ตารางรายการ Order

### 🚚 Dispatch Center
- สแกน Barcode ผ่านกล้อง
- เลือกรายการแบบ Multi-select
- สร้างใบส่งของ (Delivery Bill)
- QR Code สำหรับยืนยัน

### 📦 Inventory
- ดูสต็อกทั้งหมด
- ค้นหาแบบ Real-time
- แสดงจำนวนคงเหลือ
- กรองตาม Customer/Part

### 📜 History
- ประวัติการส่งทั้งหมด
- พิมพ์ PDF ใบส่งของ
- คืนสินค้า (Refund)
- ค้นหาประวัติ

## 📤 Excel Import
- รองรับไฟล์ Excel (.xlsx, .xls)
- ตรวจสอบข้อมูลซ้ำอัตโนมัติ
- นำเข้าหลายรายการพร้อมกัน
- แจ้งจำนวนที่นำเข้า/ซ้ำ

## 🎨 UI/UX
- Modern design ด้วย Tailwind CSS
- Responsive สำหรับทุกขนาดหน้าจอ
- Dark/Light mode
- Smooth animations
- Mobile-first approach

## 💾 ข้อมูล
- เก็บใน IndexedDB (Browser)
- ไม่ต้อง Internet
- ข้อมูลอยู่ในเครื่องเท่านั้น
- สามารถ Export ข้อมูลได้

## 🔧 ความต้องการ
- Modern Browser (Chrome, Firefox, Safari, Edge)
- ไม่ต้องติดตั้งโปรแกรมเพิ่ม
- ไม่ต้อง Internet connection
- ไม่ต้อง Database server

## 📱 มือถือ
- รองรับ Camera สำหรับสแกน Barcode
- Touch-friendly interface
- Responsive design
- PWA ready

---
**เหมาะสำหรับ:** งานขนาดเล็ก, ทดสอบ, การใช้งานคนเดียว
