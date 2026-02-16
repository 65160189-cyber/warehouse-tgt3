// SQLite Version - No MySQL Required
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const http = require('http');
const socketIo = require('socket.io');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ["http://localhost:3000"],
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ["http://localhost:3000"],
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use('/api/', limiter);

// SQLite Database
const db = new sqlite3.Database('./tgt3_warehouse.db');

// Initialize tables
db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT DEFAULT 'operator',
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME
    )`);

    // Customers table
    db.run(`CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Orders table
    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        sale_part TEXT NOT NULL,
        kanban_id TEXT,
        order_no TEXT NOT NULL,
        delivery_date TEXT NOT NULL,
        origin_qty INTEGER NOT NULL,
        shipped_qty INTEGER DEFAULT 0,
        round TEXT DEFAULT 'เช้า',
        status TEXT DEFAULT 'pending',
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
    )`);

    // Dispatch history table
    db.run(`CREATE TABLE IF NOT EXISTS dispatch_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        round TEXT NOT NULL,
        destination TEXT DEFAULT 'TGT3',
        total_items INTEGER NOT NULL,
        total_quantity INTEGER NOT NULL,
        items_json TEXT NOT NULL,
        dispatched_by INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (dispatched_by) REFERENCES users(id)
    )`);

    // Insert default admin user
    bcrypt.hash('admin123', 10, (err, hash) => {
        if (!err) {
            db.run(`INSERT OR IGNORE INTO users (username, password_hash, full_name, role) 
                    VALUES (?, ?, ?, ?)`, ['admin', hash, 'System Administrator', 'admin']);
        }
    });

    // Insert sample customers
    db.run(`INSERT OR IGNORE INTO customers (name, code) VALUES 
            ('Toyota Motor Thailand', 'TMT'),
            ('Honda Thailand', 'HT'),
            ('Nissan Thailand', 'NT'),
            ('Mitsubishi Thailand', 'MT')`);
});

// JWT middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'default_secret', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Socket.io authentication
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error('Authentication error'));
    }
    
    jwt.verify(token, process.env.JWT_SECRET || 'default_secret', (err, user) => {
        if (err) {
            return next(new Error('Authentication error'));
        }
        socket.userId = user.id;
        socket.userRole = user.role;
        next();
    });
});

io.on('connection', (socket) => {
    console.log(`User ${socket.userId} connected`);
    socket.emit('join-room', 'warehouse');
    
    socket.on('disconnect', () => {
        console.log(`User ${socket.userId} disconnected`);
    });
});

const broadcastUpdate = (event, data) => {
    io.emit(event, data);
};

// Auth routes
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }
    
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Internal server error' });
        }
        
        if (!user || !user.is_active) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        bcrypt.compare(password, user.password_hash, (err, isValid) => {
            if (err || !isValid) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            
            // Update last login
            db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
            
            const token = jwt.sign(
                { id: user.id, username: user.username, role: user.role },
                process.env.JWT_SECRET || 'default_secret',
                { expiresIn: '24h' }
            );
            
            res.json({
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    fullName: user.full_name,
                    role: user.role
                }
            });
        });
    });
});

// Orders routes
app.get('/api/orders', authenticateToken, (req, res) => {
    const { customer, part, kanban, orderNo, deliveryDate, status } = req.query;
    
    let query = `
        SELECT o.*, c.name as customer_name, c.code as customer_code,
               u.username as created_by_username,
               (o.origin_qty - o.shipped_qty) as remaining_qty
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        LEFT JOIN users u ON o.created_by = u.id
        WHERE 1=1
    `;
    const params = [];
    
    if (customer) {
        query += ' AND c.name LIKE ?';
        params.push(`%${customer}%`);
    }
    if (part) {
        query += ' AND o.sale_part LIKE ?';
        params.push(`%${part}%`);
    }
    if (kanban) {
        query += ' AND o.kanban_id LIKE ?';
        params.push(`%${kanban}%`);
    }
    if (orderNo) {
        query += ' AND o.order_no LIKE ?';
        params.push(`%${orderNo}%`);
    }
    if (deliveryDate) {
        query += ' AND o.delivery_date = ?';
        params.push(deliveryDate);
    }
    if (status) {
        query += ' AND o.status = ?';
        params.push(status);
    }
    
    query += ' ORDER BY o.delivery_date ASC, o.created_at DESC';
    
    db.all(query, params, (err, orders) => {
        if (err) {
            return res.status(500).json({ error: 'Internal server error' });
        }
        res.json(orders);
    });
});

app.post('/api/orders', authenticateToken, (req, res) => {
    const { customerId, salePart, kanbanId, orderNo, deliveryDate, qty } = req.body;
    
    // Check if order already exists
    db.get('SELECT id FROM orders WHERE customer_id = ? AND sale_part = ? AND order_no = ? AND kanban_id = ?',
        [customerId, salePart, orderNo, kanbanId], (err, existing) => {
        
        if (err) {
            return res.status(500).json({ error: 'Internal server error' });
        }
        
        if (existing) {
            return res.status(400).json({ error: 'Order already exists' });
        }
        
        db.run(`INSERT INTO orders (customer_id, sale_part, kanban_id, order_no, delivery_date, origin_qty, shipped_qty, created_by)
                VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
            [customerId, salePart, kanbanId, orderNo, deliveryDate, qty, req.user.id],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Internal server error' });
                }
                
                broadcastUpdate('orders-updated', { action: 'create', orderId: this.lastID });
                res.json({ id: this.lastID, message: 'Order created successfully' });
            }
        );
    });
});

// Dashboard stats
app.get('/api/dashboard/stats', authenticateToken, (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    
    // Get today's shipped quantity
    db.get(`SELECT COALESCE(SUM(total_quantity), 0) as shipped_today
            FROM dispatch_history 
            WHERE DATE(created_at) = ?`, [today], (err, shippedResult) => {
        
        if (err) {
            return res.status(500).json({ error: 'Internal server error' });
        }
        
        // Get delayed orders
        db.get(`SELECT COUNT(*) as delay_count
                FROM orders 
                WHERE (origin_qty - shipped_qty) > 0 AND delivery_date < ?`, [today], (err, delayResult) => {
            
            if (err) {
                return res.status(500).json({ error: 'Internal server error' });
            }
            
            // Get total system load
            db.get(`SELECT COALESCE(SUM(origin_qty - shipped_qty), 0) as total_load
                    FROM orders`, (err, loadResult) => {
                
                if (err) {
                    return res.status(500).json({ error: 'Internal server error' });
                }
                
                const dailyTarget = 500;
                const shippedToday = shippedResult.shipped_today;
                const delayCount = delayResult.delay_count;
                const systemLoad = loadResult.total_load;
                
                res.json({
                    dailyTarget,
                    shippedToday,
                    remaining: Math.max(0, dailyTarget - shippedToday),
                    delay: delayCount,
                    totalLoad: systemLoad
                });
            });
        });
    });
});

// Customers routes
app.get('/api/customers', authenticateToken, (req, res) => {
    db.all('SELECT * FROM customers WHERE is_active = 1 ORDER BY name', (err, customers) => {
        if (err) {
            return res.status(500).json({ error: 'Internal server error' });
        }
        res.json(customers);
    });
});

// Import Excel endpoint
app.post('/api/orders/import-excel', authenticateToken, (req, res) => {
    const { orders } = req.body;
    
    if (!orders || !Array.isArray(orders)) {
        return res.status(400).json({ error: 'Invalid orders data' });
    }
    
    let addedCount = 0;
    let duplicateCount = 0;
    
    // Process each order
    const processOrder = (order, callback) => {
        // Check if customer exists, if not create
        db.get('SELECT id FROM customers WHERE code = ?', [order.customerCode], (err, customer) => {
            if (err) return callback(err);
            
            let customerId;
            if (customer) {
                customerId = customer.id;
                processOrderCheck();
            } else {
                db.run('INSERT INTO customers (name, code) VALUES (?, ?)', 
                    [order.customerName, order.customerCode], 
                    function(err) {
                        if (err) return callback(err);
                        customerId = this.lastID;
                        processOrderCheck();
                    }
                );
            }
            
            function processOrderCheck() {
                // Check if order already exists
                db.get('SELECT id FROM orders WHERE customer_id = ? AND sale_part = ? AND order_no = ? AND kanban_id = ?',
                    [customerId, order.salePart, order.orderNo, order.kanbanId], (err, existing) => {
                    
                    if (err) return callback(err);
                    
                    if (existing) {
                        duplicateCount++;
                        processNext();
                    } else {
                        // Insert new order
                        db.run(`INSERT INTO orders (customer_id, sale_part, kanban_id, order_no, delivery_date, origin_qty, shipped_qty, created_by)
                                VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
                            [customerId, order.salePart, order.kanbanId, order.orderNo, order.deliveryDate, order.qty, req.user.id],
                            function(err) {
                                if (err) return callback(err);
                                addedCount++;
                                processNext();
                            }
                        );
                    }
                });
            }
        });
    };
    
    let index = 0;
    const processNext = () => {
        if (index < orders.length) {
            processOrder(orders[index++], processNext);
        } else {
            // All orders processed
            res.json({ 
                message: 'Import completed', 
                addedCount, 
                duplicateCount 
            });
        }
    };
    
    processNext();
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 TGT3 Warehouse Server (SQLite) running on port ${PORT}`);
    console.log(`📱 Open: http://localhost:${PORT}`);
    console.log(`🔑 Login: admin / admin123`);
});
app.use(express.static(__dirname));