-- TGT3 Warehouse Management System Database Schema
-- Multi-user Database Structure

CREATE DATABASE IF NOT EXISTS tgt3_warehouse CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE tgt3_warehouse;

-- Users table for authentication
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role ENUM('admin', 'operator', 'viewer') DEFAULT 'operator',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL
);

-- Customers table
CREATE TABLE customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table (main data)
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    sale_part VARCHAR(100) NOT NULL,
    kanban_id VARCHAR(50),
    order_no VARCHAR(50) NOT NULL,
    delivery_date DATE NOT NULL,
    origin_qty INT NOT NULL,
    shipped_qty INT DEFAULT 0,
    remaining_qty INT GENERATED ALWAYS AS (origin_qty - shipped_qty) STORED,
    round ENUM('เช้า', 'บ่าย') DEFAULT 'เช้า',
    status ENUM('pending', 'partial', 'completed', 'delayed') DEFAULT 'pending',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_customer_delivery (customer_id, delivery_date),
    INDEX idx_status (status),
    INDEX idx_delivery_date (delivery_date),
    INDEX idx_order_no (order_no),
    INDEX idx_kanban_id (kanban_id)
);

-- Dispatch history table
CREATE TABLE dispatch_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    round ENUM('เช้า', 'บ่าย') NOT NULL,
    destination ENUM('TMRD', 'TGT1', 'TGT2', 'TGT3') DEFAULT 'TGT3',
    total_items INT NOT NULL,
    total_quantity INT NOT NULL,
    items_json JSON NOT NULL,
    dispatched_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (dispatched_by) REFERENCES users(id),
    INDEX idx_dispatch_date (created_at),
    INDEX idx_dispatched_by (dispatched_by)
);

-- Stock movements table for tracking all changes
CREATE TABLE stock_movements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    movement_type ENUM('import', 'dispatch', 'refund', 'adjustment') NOT NULL,
    quantity_change INT NOT NULL,
    quantity_before INT NOT NULL,
    quantity_after INT NOT NULL,
    reference_id INT NULL, -- Reference to dispatch_history or adjustment record
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_movement_date (created_at),
    INDEX idx_order_movement (order_id, created_at)
);

-- System settings table
CREATE TABLE system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(50) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    updated_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- Insert default admin user (password: admin123)
INSERT INTO users (username, password_hash, full_name, role) VALUES 
('admin', '$2a$10$rOzJqQjQjQjQjQjQjQjQjOzJqQjQjQjQjQjQjQjQjQjQjQjQjQjQ', 'System Administrator', 'admin');

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES 
('daily_target', '500', 'Daily shipping target quantity'),
('warehouse_name', 'TGT3 Warehouse', 'Warehouse display name'),
('auto_backup', 'true', 'Enable automatic data backup');

-- Insert some sample customers
INSERT INTO customers (name, code) VALUES 
('Toyota Motor Thailand', 'TMT'),
('Honda Thailand', 'HT'),
('Nissan Thailand', 'NT'),
('Mitsubishi Thailand', 'MT');
