-- Seed data for products table
INSERT INTO products (name, description, price, image_url, stock_quantity) VALUES
    ('Laptop Pro 15"', 'High-performance laptop with 16GB RAM and 512GB SSD', 1299.99, 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400', 50),
    ('Wireless Mouse', 'Ergonomic wireless mouse with precision tracking', 29.99, 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400', 200),
    ('Mechanical Keyboard', 'RGB mechanical keyboard with Cherry MX switches', 149.99, 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400', 75),
    ('USB-C Hub', '7-in-1 USB-C hub with HDMI, USB 3.0, and SD card reader', 49.99, 'https://images.unsplash.com/photo-1625948515291-69613efd103f?w=400', 150),
    ('Webcam HD', '1080p HD webcam with built-in microphone', 79.99, 'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=400', 100),
    ('Noise-Cancelling Headphones', 'Premium wireless headphones with active noise cancellation', 299.99, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400', 60),
    ('Portable SSD 1TB', 'Ultra-fast portable SSD with USB-C connectivity', 129.99, 'https://images.unsplash.com/photo-1531492746076-161ca9bcad58?w=400', 120),
    ('Monitor 27" 4K', '27-inch 4K UHD monitor with HDR support', 449.99, 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400', 40),
    ('Desk Lamp LED', 'Adjustable LED desk lamp with touch controls', 39.99, 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400', 180),
    ('Laptop Stand', 'Aluminum laptop stand with adjustable height', 59.99, 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400', 90),
    ('Wireless Charger', 'Fast wireless charging pad for smartphones', 24.99, 'https://images.unsplash.com/photo-1591290619762-c588f7e8e86f?w=400', 250),
    ('Graphics Tablet', 'Digital drawing tablet with pressure-sensitive pen', 199.99, 'https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?w=400', 45);

-- Verify data insertion
SELECT COUNT(*) as product_count FROM products;
