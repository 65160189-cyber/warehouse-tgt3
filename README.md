# TGT3 Warehouse Management System - Multi-User Version

ระบบจัดการคลังสินค้าแบบ Multi-User สำหรับ TGT3 รองรับการทำงานพร้อมกันหลายเครื่องพร้อม Real-time Updates

## Features

### 🔐 User Authentication
- Login system with role-based access (Admin, Operator, Viewer)
- JWT token-based authentication
- Session management

### 📊 Dashboard
- Real-time statistics
- Daily target tracking
- Delay alerts
- System load monitoring

### 🚚 Dispatch Center
- Multi-order selection
- Barcode scanning (camera & manual)
- Real-time inventory updates
- Delivery bill generation

### 📦 Inventory Management
- Stock level tracking
- Search & filter capabilities
- Automatic status updates

### 📋 History & Reports
- Complete dispatch logs
- PDF export functionality
- Delay reports
- Refund/return functionality

### 🔄 Real-time Features
- Live updates across all connected users
- Socket.io integration
- Automatic data synchronization

## Installation

### Prerequisites
- Node.js 16+ 
- MySQL 8.0+
- npm or yarn

### Database Setup

1. Create MySQL database:
```sql
CREATE DATABASE tgt3_warehouse CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. Import schema:
```bash
mysql -u root -p tgt3_warehouse < database/schema.sql
```

### Server Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. Start server:
```bash
# Development
npm run dev

# Production
npm start
```

### Frontend Setup

1. Open `index-multiuser.html` in browser
2. Or serve with static file server:
```bash
npx serve . -p 3000
```

## Default Login

- **Username**: admin
- **Password**: admin123

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/health` - Health check

### Orders
- `GET /api/orders` - Get all orders
- `POST /api/orders` - Create new order
- `POST /api/orders/import-excel` - Bulk import from Excel

### Dispatch
- `POST /api/dispatch` - Process dispatch
- `GET /api/history` - Get dispatch history

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

### Customers
- `GET /api/customers` - Get all customers

## Real-time Events

### Socket.io Events
- `orders-updated` - When orders are modified
- `dispatch-completed` - When dispatch is processed
- `join-room` - Join warehouse room for updates

## Database Schema

### Tables
- `users` - User accounts and authentication
- `customers` - Customer information
- `orders` - Order management
- `dispatch_history` - Dispatch records
- `stock_movements` - Inventory change tracking
- `system_settings` - Configuration

## Security Features

- JWT authentication
- Rate limiting
- CORS protection
- Input validation
- SQL injection prevention
- Helmet.js security headers

## Development

### Project Structure
```
├── server.js              # Main server file
├── database/
│   └── schema.sql         # Database schema
├── index-multiuser.html   # Multi-user frontend
├── index.html            # Original standalone version
├── package.json          # Dependencies
└── README.md             # This file
```

### Environment Variables
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=tgt3_warehouse
JWT_SECRET=your_secret_key
PORT=3000
ALLOWED_ORIGINS=http://localhost:3000
```

## Migration from Standalone

### Data Migration
1. Export data from IndexedDB (original system)
2. Convert to MySQL format
3. Import using provided scripts

### Key Differences
- **Storage**: MySQL database instead of IndexedDB
- **Authentication**: Multi-user login system
- **Real-time**: Live updates across all users
- **API**: RESTful API endpoints
- **Security**: User roles and permissions

## Troubleshooting

### Common Issues

1. **Database Connection**
   - Check MySQL service is running
   - Verify credentials in .env file
   - Ensure database exists

2. **Authentication Errors**
   - Verify JWT_SECRET is set
   - Check token expiration
   - Clear browser localStorage

3. **Real-time Updates**
   - Ensure Socket.io client is loaded
   - Check firewall settings
   - Verify CORS configuration

4. **Excel Import Issues**
   - Check file format (.xlsx)
   - Verify required columns exist
   - Check data types

## Performance Optimization

### Database Indexes
- Customer and delivery date indexes
- Order number and kanban ID indexes
- Status and date-based queries

### Caching
- Static file caching
- API response caching
- Database query optimization

## Support

For technical support:
1. Check console logs for errors
2. Verify database connection
3. Test API endpoints directly
4. Review environment configuration

## License

MIT License - See LICENSE file for details
