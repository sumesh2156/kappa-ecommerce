-- Run this once on the Railway MySQL database BEFORE deploying the admin-enabled backend.
-- It keeps your existing products and adds inventory + safe deletion support.

ALTER TABLE products
  ADD COLUMN stock INT NOT NULL DEFAULT 20 AFTER in_stock,
  ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER stock;

-- Existing products that were previously marked out of stock start at 0.
UPDATE products SET stock = 0 WHERE in_stock = 0;

-- Product images uploaded from the admin panel are stored as data URLs.
-- LONGTEXT is required for those images.
ALTER TABLE products MODIFY COLUMN image LONGTEXT NULL;
