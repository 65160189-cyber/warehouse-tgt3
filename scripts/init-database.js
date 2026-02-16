const mysql = require('mysql2/promise');
require('dotenv').config();

async function initializeDatabase() {
    console.log('🚀 Initializing TGT3 Warehouse Database...');
    
    try {
        // Connect to MySQL without database specified
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || ''
        });

        console.log('✅ Connected to MySQL server');

        // Create database if not exists
        await connection.execute(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'tgt3_warehouse'} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        console.log(`✅ Database '${process.env.DB_NAME || 'tgt3_warehouse'}' created/verified`);

        // Close connection
        await connection.end();

        // Connect to the specific database
        const dbConnection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'tgt3_warehouse'
        });

        console.log('✅ Connected to warehouse database');

        // Read and execute schema
        const fs = require('fs');
        const path = require('path');
        const schemaPath = path.join(__dirname, '../database/schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Split schema into individual statements
        const statements = schema.split(';').filter(stmt => stmt.trim().length > 0);

        for (const statement of statements) {
            if (statement.trim()) {
                await dbConnection.execute(statement);
            }
        }

        console.log('✅ Database schema imported successfully');

        // Verify tables were created
        const [tables] = await dbConnection.execute('SHOW TABLES');
        console.log(`✅ Created ${tables.length} tables:`);
        tables.forEach(table => {
            console.log(`   - ${Object.values(table)[0]}`);
        });

        // Create admin user with proper password hash
        const bcrypt = require('bcryptjs');
        const adminPassword = await bcrypt.hash('admin123', 10);
        
        await dbConnection.execute(
            'UPDATE users SET password_hash = ? WHERE username = ?',
            [adminPassword, 'admin']
        );

        console.log('✅ Admin user created/updated (username: admin, password: admin123)');

        await dbConnection.end();
        console.log('🎉 Database initialization completed successfully!');
        
    } catch (error) {
        console.error('❌ Database initialization failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    initializeDatabase();
}

module.exports = { initializeDatabase };
