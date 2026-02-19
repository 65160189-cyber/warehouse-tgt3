const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database
const db = new sqlite3.Database('./warehouse.db');

// JWT Secret
const JWT_SECRET = 'TGT3_MULTIUSER_SECRET_2024';

// Socket.io Authentication
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error('Authentication error'));
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return next(new Error('Authentication error'));
        }
        socket.userId = user.id;
        socket.userRole = user.role;
        next();
    });
});

io.on('connection', (socket) => {
    console.log(`User ${socket.userId} connected (${socket.userRole})`);
    
    // Join room based on role
    if (socket.userRole === 'admin') {
        socket.join('admin');
    }
    socket.join('warehouse');
    
    // Broadcast user count
    const userCount = io.sockets.sockets.size;
    io.emit('user-count', { count: userCount });
    
    socket.on('disconnect', () => {
        console.log(`User ${socket.userId} disconnected`);
        io.emit('user-count', { count: io.sockets.sockets.size });
    });
});

// Broadcast function
const broadcastUpdate = (event, data) => {
    io.emit(event, data);
};

// Auth routes
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }
    
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Internal server error' });
        }
        
        if (!user || !user.is_active) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        try {
            const isValid = await bcrypt.compare(password, user.password_hash);
            if (!isValid) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            
            // Update last login
            db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
            
            const token = jwt.sign(
                { id: user.id, username: user.username, role: user.role },
                JWT_SECRET,
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
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    });
});

// Verify token endpoint
app.get('/api/auth/verify', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        res.json({
            valid: true,
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        });
    });
});

// Orders routes
app.get('/api/orders', (req, res) => {
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

// Dashboard stats
app.get('/api/dashboard/stats', (req, res) => {
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

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        users: io.sockets.sockets.size
    });
});

// Initialize database tables
db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT,
        role TEXT DEFAULT 'user',
        is_active BOOLEAN DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
    )`);
    
    // Customers table
    db.run(`CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        code TEXT UNIQUE,
        is_active BOOLEAN DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Orders table
    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER,
        sale_part TEXT NOT NULL,
        kanban_id TEXT,
        order_no TEXT,
        delivery_date DATE,
        origin_qty INTEGER DEFAULT 0,
        shipped_qty INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending',
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
    )`);
    
    // Dispatch history table
    db.run(`CREATE TABLE IF NOT EXISTS dispatch_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer TEXT NOT NULL,
        round TEXT NOT NULL,
        destination TEXT,
        items_json TEXT NOT NULL,
        total_quantity INTEGER DEFAULT 0,
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
    )`);
    
    // Create default admin user
    bcrypt.hash('admin123', 10, (err, hash) => {
        if (!err) {
            db.run(`INSERT OR IGNORE INTO users (username, password_hash, full_name, role) 
                    VALUES (?, ?, ?, ?)`, ['admin', hash, 'System Administrator', 'admin']);
        }
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`🚀 TGT3 Multi-user Warehouse System running on port ${PORT}`);
    console.log(`📱 Open: http://localhost:${PORT}`);
    console.log(`🔑 Default login: admin / admin123`);
    console.log(`👥 Real-time updates enabled`);
});
