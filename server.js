const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
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
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Database connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'tgt3_warehouse',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true
});

// JWT middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
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
    
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return next(new Error('Authentication error'));
        }
        socket.userId = user.id;
        socket.userRole = user.role;
        next();
    });
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log(`User ${socket.userId} connected`);
    
    socket.on('join-room', (room) => {
        socket.join(room);
        console.log(`User ${socket.userId} joined room: ${room}`);
    });
    
    socket.on('disconnect', () => {
        console.log(`User ${socket.userId} disconnected`);
    });
});

// Helper function to broadcast updates
const broadcastUpdate = (event, data, room = 'warehouse') => {
    io.to(room).emit(event, data);
};

// Auth routes
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }
        
        const [users] = await pool.execute(
            'SELECT id, username, password_hash, full_name, role, is_active FROM users WHERE username = ?',
            [username]
        );
        
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const user = users[0];
        if (!user.is_active) {
            return res.status(401).json({ error: 'Account is disabled' });
        }
        
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Update last login
        await pool.execute('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);
        
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
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
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Orders routes
app.get('/api/orders', authenticateToken, async (req, res) => {
    try {
        const { customer, part, kanban, orderNo, deliveryDate, status } = req.query;
        
        let query = `
            SELECT o.*, c.name as customer_name, c.code as customer_code,
                   u.username as created_by_username
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
        
        const [orders] = await pool.execute(query, params);
        res.json(orders);
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/orders', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { customerId, salePart, kanbanId, orderNo, deliveryDate, qty } = req.body;
        
        // Check if order already exists
        const [existing] = await connection.execute(
            'SELECT id FROM orders WHERE customer_id = ? AND sale_part = ? AND order_no = ? AND kanban_id = ?',
            [customerId, salePart, orderNo, kanbanId]
        );
        
        if (existing.length > 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'Order already exists' });
        }
        
        const [result] = await connection.execute(
            `INSERT INTO orders (customer_id, sale_part, kanban_id, order_no, delivery_date, origin_qty, shipped_qty, remaining_qty, created_by)
             VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
            [customerId, salePart, kanbanId, orderNo, deliveryDate, qty, qty, req.user.id]
        );
        
        // Create stock movement record
        await connection.execute(
            `INSERT INTO stock_movements (order_id, movement_type, quantity_change, quantity_before, quantity_after, created_by)
             VALUES (?, 'import', ?, 0, ?, ?)`,
            [result.insertId, qty, qty, req.user.id]
        );
        
        await connection.commit();
        
        // Broadcast update
        broadcastUpdate('orders-updated', { action: 'create', orderId: result.insertId });
        
        res.json({ id: result.insertId, message: 'Order created successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Create order error:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        connection.release();
    }
});

app.post('/api/orders/import-excel', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { orders } = req.body; // Array of order objects
        let addedCount = 0;
        let duplicateCount = 0;
        
        for (const orderData of orders) {
            // Check if customer exists, if not create
            let [customers] = await connection.execute(
                'SELECT id FROM customers WHERE code = ?',
                [orderData.customerCode]
            );
            
            let customerId;
            if (customers.length === 0) {
                const [newCustomer] = await connection.execute(
                    'INSERT INTO customers (name, code) VALUES (?, ?)',
                    [orderData.customerName, orderData.customerCode]
                );
                customerId = newCustomer.insertId;
            } else {
                customerId = customers[0].id;
            }
            
            // Check if order already exists
            const [existing] = await connection.execute(
                'SELECT id FROM orders WHERE customer_id = ? AND sale_part = ? AND order_no = ? AND kanban_id = ?',
                [customerId, orderData.salePart, orderData.orderNo, orderData.kanbanId]
            );
            
            if (existing.length > 0) {
                duplicateCount++;
                continue;
            }
            
            const [result] = await connection.execute(
                `INSERT INTO orders (customer_id, sale_part, kanban_id, order_no, delivery_date, origin_qty, shipped_qty, remaining_qty, created_by)
                 VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
                [customerId, orderData.salePart, orderData.kanbanId, orderData.deliveryDate, orderData.qty, orderData.qty, req.user.id]
            );
            
            // Create stock movement record
            await connection.execute(
                `INSERT INTO stock_movements (order_id, movement_type, quantity_change, quantity_before, quantity_after, created_by)
                 VALUES (?, 'import', ?, 0, ?, ?)`,
                [result.insertId, orderData.qty, orderData.qty, req.user.id]
            );
            
            addedCount++;
        }
        
        await connection.commit();
        
        // Broadcast update
        broadcastUpdate('orders-updated', { action: 'bulk-import', addedCount, duplicateCount });
        
        res.json({ 
            message: 'Import completed', 
            addedCount, 
            duplicateCount 
        });
    } catch (error) {
        await connection.rollback();
        console.error('Import orders error:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        connection.release();
    }
});

// Dispatch routes
app.post('/api/dispatch', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { orderIds, quantities, round, destination } = req.body;
        
        if (!orderIds || !quantities || orderIds.length !== quantities.length) {
            return res.status(400).json({ error: 'Invalid dispatch data' });
        }
        
        let totalQuantity = 0;
        const dispatchItems = [];
        let primaryCustomerId = null;
        
        // Process each order
        for (let i = 0; i < orderIds.length; i++) {
            const orderId = orderIds[i];
            const quantity = quantities[i];
            
            // Get order details
            const [orders] = await connection.execute(
                'SELECT * FROM orders WHERE id = ? AND remaining_qty >= ?',
                [orderId, quantity]
            );
            
            if (orders.length === 0) {
                await connection.rollback();
                return res.status(400).json({ error: `Invalid order or insufficient quantity for order ID: ${orderId}` });
            }
            
            const order = orders[0];
            primaryCustomerId = order.customer_id;
            
            // Update order quantities
            const newShippedQty = order.shipped_qty + quantity;
            const newRemainingQty = order.remaining_qty - quantity;
            const newStatus = newRemainingQty === 0 ? 'completed' : 'partial';
            
            await connection.execute(
                'UPDATE orders SET shipped_qty = ?, status = ? WHERE id = ?',
                [newShippedQty, newStatus, orderId]
            );
            
            // Create stock movement record
            await connection.execute(
                `INSERT INTO stock_movements (order_id, movement_type, quantity_change, quantity_before, quantity_after, created_by)
                 VALUES (?, 'dispatch', ?, ?, ?, ?)`,
                [orderId, quantity, order.remaining_qty, newRemainingQty, req.user.id]
            );
            
            dispatchItems.push({
                orderId: order.id,
                salePart: order.sale_part,
                orderNo: order.order_no,
                kanbanId: order.kanban_id,
                qty: quantity
            });
            
            totalQuantity += quantity;
        }
        
        // Create dispatch history record
        const [historyResult] = await connection.execute(
            `INSERT INTO dispatch_history (customer_id, round, destination, total_items, total_quantity, items_json, dispatched_by)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [primaryCustomerId, round, destination, dispatchItems.length, totalQuantity, JSON.stringify(dispatchItems), req.user.id]
        );
        
        await connection.commit();
        
        // Broadcast updates
        broadcastUpdate('dispatch-completed', { 
            historyId: historyResult.insertId,
            items: dispatchItems,
            totalQuantity
        });
        
        res.json({ 
            historyId: historyResult.insertId,
            message: 'Dispatch completed successfully',
            totalQuantity
        });
    } catch (error) {
        await connection.rollback();
        console.error('Dispatch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        connection.release();
    }
});

// History routes
app.get('/api/history', authenticateToken, async (req, res) => {
    try {
        const { customer, destination, startDate, endDate } = req.query;
        
        let query = `
            SELECT dh.*, c.name as customer_name, c.code as customer_code,
                   u.username as dispatched_by_username
            FROM dispatch_history dh
            LEFT JOIN customers c ON dh.customer_id = c.id
            LEFT JOIN users u ON dh.dispatched_by = u.id
            WHERE 1=1
        `;
        const params = [];
        
        if (customer) {
            query += ' AND c.name LIKE ?';
            params.push(`%${customer}%`);
        }
        if (destination) {
            query += ' AND dh.destination = ?';
            params.push(destination);
        }
        if (startDate) {
            query += ' AND dh.created_at >= ?';
            params.push(startDate);
        }
        if (endDate) {
            query += ' AND dh.created_at <= ?';
            params.push(endDate);
        }
        
        query += ' ORDER BY dh.created_at DESC';
        
        const [history] = await pool.execute(query, params);
        res.json(history);
    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Dashboard stats
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        // Get today's shipped quantity
        const [todayShipped] = await pool.execute(
            `SELECT COALESCE(SUM(total_quantity), 0) as shipped_today
             FROM dispatch_history 
             WHERE DATE(created_at) = ?`,
            [today]
        );
        
        // Get delayed orders
        const [delayedOrders] = await pool.execute(
            `SELECT COUNT(*) as delay_count
             FROM orders 
             WHERE remaining_qty > 0 AND delivery_date < ?`,
            [today]
        );
        
        // Get total system load
        const [totalLoad] = await pool.execute(
            `SELECT COALESCE(SUM(remaining_qty), 0) as total_load
             FROM orders`
        );
        
        // Get daily target from settings
        const [settings] = await pool.execute(
            'SELECT setting_value FROM system_settings WHERE setting_key = ?',
            ['daily_target']
        );
        
        const dailyTarget = settings.length > 0 ? parseInt(settings[0].setting_value) : 500;
        const shippedToday = todayShipped[0].shipped_today;
        const delayCount = delayedOrders[0].delay_count;
        const systemLoad = totalLoad[0].total_load;
        
        res.json({
            dailyTarget,
            shippedToday,
            remaining: Math.max(0, dailyTarget - shippedToday),
            delay: delayCount,
            totalLoad: systemLoad
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Customers routes
app.get('/api/customers', authenticateToken, async (req, res) => {
    try {
        const [customers] = await pool.execute(
            'SELECT * FROM customers WHERE is_active = TRUE ORDER BY name'
        );
        res.json(customers);
    } catch (error) {
        console.error('Get customers error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`TGT3 Warehouse Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
