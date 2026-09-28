require("dotenv").config();


const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const bcrypt = require("bcrypt");
const crypto = require("crypto");
const data = require("./data.json");

const app = express();

const PORT = process.env.PORT || 5000;


const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    timezone: "Z"
});

// Test one connection at startup. The pool can create a fresh connection later
// if a local Railway tunnel or a database connection is interrupted.
db.getConnection((err, connection) => {
    if (err) {
        console.error("MySQL connection failed:", err);
        return;
    }
    console.log("Connected to KAPPA MySQL database!");
    connection.release();
});





app.use(cors());

app.use(express.json({ limit: "8mb" }));

app.get("/", (req, res) => {
    res.send("KAPPA Backend is running!");
});


app.get("/api/products", (req, res) => {

    const sql = "SELECT * FROM products WHERE is_active = 1";

    db.query(sql, (err, results) => {

        if (err) {
            console.error("Error fetching products:", err);
            return res.status(500).json({
                message: "Failed to fetch products"
            });
        }

        const products = results.map(product => ({
            id: product.id,
            name: product.name,
            brand: product.brand,
            category: product.category,
            price: Number(product.price),
            originalPrice: Number(product.original_price),
            discount: product.discount,
            rating: Number(product.rating),
            description: product.description,
            image: product.image,
            colors: product.colors,
            sizes: product.sizes,
            stock: Number(product.stock || 0),
            inStock: Number(product.stock || 0) > 0
        }));

        res.json(products);
    });
});


app.get("/api/categories", (req, res) => {
    res.json(data.categories);
});





app.post("/api/user", (req, res) => {
    console.log("POST /api/user received");
console.log("User data:", req.body);
    const { name, email, phone, address } = req.body;

    if (!name || !email) {
        return res.status(400).json({
            message: "Name and email are required"
        });
    }

    const sql = `
        INSERT INTO users (name, email, phone, address)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            phone = VALUES(phone),
            address = VALUES(address)
    `;

    db.query(sql, [name, email, phone, address], (err, result) => {
        if (err) {
            console.error("Error saving user:", err);
            return res.status(500).json({
                message: "Failed to save user"
            });
        }

        res.json({
            message: "Information saved successfully"
        });
    });
});





app.get("/api/users", (req, res) => {
    db.query("SELECT id, name, email, phone, address FROM users", (err, results) => {
        if (err) {
            console.error("Error fetching users:", err);
            return res.status(500).json({
                message: "Failed to fetch users"
            });
        }

        res.json(results);
    });
});












// =========================
// CART - MYSQL
// =========================

// Get cart
app.get("/api/cart", (req, res) => {

    const userId = req.query.userId;

    if (!userId) {
        return res.status(400).json({
            message: "User ID is required"
        });
    }

    const sql = `
        SELECT *
        FROM cart
        WHERE user_id = ?
        ORDER BY id
    `;

    db.query(sql, [userId], (err, results) => {

        if (err) {
            console.error("Error fetching cart:", err);

            return res.status(500).json({
                message: "Failed to fetch cart"
            });
        }

        const cart = results.map(item => ({
            id: item.product_id,
            name: item.name,
            brand: item.brand,
            price: Number(item.price),
            originalPrice: Number(item.original_price),
            discount: item.discount,
            image: item.image,
            color: item.color,
            size: item.size,
            quantity: item.quantity
        }));

        res.json(cart);
    });
});


// Add item to cart
app.post("/api/cart", (req, res) => {

    const item = req.body;

    // Get logged-in user's ID from frontend
    const userId = item.userId;

    if (!userId) {
        return res.status(400).json({
            message: "User ID is required"
        });
    }

    const sql = `
        INSERT INTO cart
        (
            user_id,
            product_id,
            name,
            brand,
            price,
            original_price,
            discount,
            image,
            color,
            size,
            quantity
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
        userId,
        item.id,
        item.name,
        item.brand,
        item.price,
        item.originalPrice,
        item.discount,
        item.image,
        item.color || null,
        item.size || null,
        item.quantity || 1
    ];

    db.query(sql, values, (err, result) => {

        if (err) {
            console.error("Error adding item to cart:", err);

            return res.status(500).json({
                message: "Failed to add item to cart"
            });
        }

        res.status(201).json({
            message: "Item added to cart"
        });
    });
});


// Update entire cart
app.put("/api/cart", (req, res) => {

    const { userId, cart: newCart } = req.body;

    // Check user ID
    if (!userId) {
        return res.status(400).json({
            message: "User ID is required"
        });
    }

    // Check cart
    if (!Array.isArray(newCart)) {
        return res.status(400).json({
            message: "Cart must be an array"
        });
    }

    // Delete ONLY this user's old cart
    db.query(
        "DELETE FROM cart WHERE user_id = ?",
        [userId],
        (err) => {

            if (err) {
                console.error("Error clearing user cart:", err);

                return res.status(500).json({
                    message: "Failed to update cart"
                });
            }

            // If cart is empty, we're finished
            if (newCart.length === 0) {
                return res.json({
                    message: "Cart updated successfully",
                    cart: []
                });
            }

            const sql = `
                INSERT INTO cart
                (
                    user_id,
                    product_id,
                    name,
                    brand,
                    price,
                    original_price,
                    discount,
                    image,
                    color,
                    size,
                    quantity
                )
                VALUES ?
            `;

            const values = newCart.map(item => [
                userId,
                item.id,
                item.name,
                item.brand,
                item.price,
                item.originalPrice,
                item.discount,
                item.image,
                item.color || null,
                item.size || null,
                item.quantity || 1
            ]);

            db.query(sql, [values], (err) => {

                if (err) {
                    console.error("Error updating cart:", err);

                    return res.status(500).json({
                        message: "Failed to update cart"
                    });
                }

                res.json({
                    message: "Cart updated successfully",
                    cart: newCart
                });
            });
        }
    );
});






// Clear cart
app.delete("/api/cart", (req, res) => {

    const userId = req.query.userId;
    if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
    }

    db.query("DELETE FROM cart WHERE user_id = ?", [userId], (err) => {

        if (err) {
            console.error("Error clearing cart:", err);

            return res.status(500).json({
                message: "Failed to clear cart"
            });
        }

        res.json({
            message: "Cart cleared successfully"
        });
    });
});




// =========================
// ORDERS - MYSQL
// =========================

// Get all orders
app.get("/api/orders/:userId", (req, res) => {

    const userId = Number(req.params.userId);

    if (!userId) {
        return res.status(400).json({
            message: "User ID is required"
        });
    }

    const orderSql = `
        SELECT * FROM orders
        WHERE user_id = ?
        ORDER BY created_at DESC
    `;

    db.query(orderSql, [userId], (err, orders) => {

        if (err) {
            console.error("Error fetching orders:", err);

            return res.status(500).json({
                message: "Failed to fetch orders"
            });
        }

        if (orders.length === 0) {
            return res.json([]);
        }

        const orderIds = orders.map(order => order.id);

        const itemSql = `
            SELECT * FROM order_items
            WHERE order_id IN (?)
            ORDER BY id
        `;

        db.query(itemSql, [orderIds], (err, items) => {

            if (err) {
                console.error("Error fetching order items:", err);

                return res.status(500).json({
                    message: "Failed to fetch order items"
                });
            }

            const result = orders.map(order => ({
                id: order.id,

                items: items
                    .filter(item => item.order_id === order.id)
                    .map(item => ({
                        id: item.product_id,
                        name: item.name,
                        brand: item.brand,
                        price: Number(item.price),
                        color: item.color,
                        size: item.size,
                        quantity: item.quantity
                    })),

                total: Number(order.subtotal),
                deliveryCharges: Number(order.shipping),
                paymentMethod: order.payment_method,
                status: order.status,
                address: order.address,
                phone: order.phone,
                name: order.customer_name,
                orderDate: order.created_at,
                deliveryDate: new Date(new Date(order.created_at).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
            }));

            res.json(result);
        });
    });
});


// Place new order
app.post("/api/orders", (req, res) => {
    const newOrder = req.body;

    if (!newOrder.userId) {
        return res.status(400).json({ message: "User ID is required" });
    }

    if (!Array.isArray(newOrder.items) || newOrder.items.length === 0) {
        return res.status(400).json({ message: "Order must contain items" });
    }

    const requested = new Map();
    for (const item of newOrder.items) {
        const productId = Number(item.id);
        const quantity = Number(item.quantity || 1);
        if (!productId || quantity < 1) {
            return res.status(400).json({ message: "Invalid order item" });
        }
        requested.set(productId, (requested.get(productId) || 0) + quantity);
    }

    const productIds = [...requested.keys()];

    // Transactions must run on one dedicated connection from the pool.
    db.getConnection((connectionError, connection) => {
        if (connectionError) {
            console.error("Order connection error:", connectionError);
            return res.status(500).json({ message: "Failed to connect to database" });
        }

        const releaseWithError = (status, message, logLabel, error) => {
            connection.rollback(() => {
                if (error) console.error(logLabel, error);
                connection.release();
                if (!res.headersSent) res.status(status).json({ message });
            });
        };

        connection.beginTransaction((transactionError) => {
            if (transactionError) {
                console.error("Transaction start error:", transactionError);
                connection.release();
                return res.status(500).json({ message: "Failed to place order" });
            }

            const stockSql = `
                SELECT id, name, stock
                FROM products
                WHERE id IN (?) AND is_active = 1
                FOR UPDATE
            `;

            connection.query(stockSql, [productIds], (stockError, stockRows) => {
                if (stockError) {
                    return releaseWithError(500, "Failed to check stock", "Stock check error:", stockError);
                }

                if (stockRows.length !== productIds.length) {
                    return releaseWithError(409, "One or more products are no longer available");
                }

                for (const product of stockRows) {
                    const needed = requested.get(Number(product.id));
                    if (Number(product.stock) < needed) {
                        return releaseWithError(409, `${product.name} has only ${product.stock} item(s) left`);
                    }
                }

                const subtotal = Number(newOrder.total || 0);
                const shipping = Number(newOrder.deliveryCharges || 0);
                const finalTotal = subtotal + shipping;

                const orderSql = `
                    INSERT INTO orders
                    (user_id, customer_name, email, phone, address, subtotal, shipping, total, payment_method, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;

                const orderValues = [
                    newOrder.userId,
                    newOrder.name,
                    newOrder.email || null,
                    newOrder.phone,
                    newOrder.address,
                    subtotal,
                    shipping,
                    finalTotal,
                    newOrder.paymentMethod,
                    newOrder.status || "confirmed"
                ];

                connection.query(orderSql, orderValues, (orderError, orderResult) => {
                    if (orderError) {
                        return releaseWithError(500, "Failed to create order", "Error creating order:", orderError);
                    }

                    const orderId = orderResult.insertId;
                    const itemSql = `
                        INSERT INTO order_items
                        (order_id, product_id, name, brand, price, color, size, quantity)
                        VALUES ?
                    `;
                    const itemValues = newOrder.items.map(item => [
                        orderId, item.id, item.name, item.brand, item.price,
                        item.color || null, item.size || null, item.quantity || 1
                    ]);

                    connection.query(itemSql, [itemValues], (itemError) => {
                        if (itemError) {
                            return releaseWithError(500, "Failed to save order items", "Error saving order items:", itemError);
                        }

                        const updates = [...requested.entries()];
                        let index = 0;

                        const updateNextStock = () => {
                            if (index >= updates.length) {
                                return connection.commit((commitError) => {
                                    if (commitError) {
                                        return releaseWithError(500, "Failed to complete order", "Order commit error:", commitError);
                                    }
                                    connection.release();
                                    return res.status(201).json({
                                        message: "Order placed successfully",
                                        orderId
                                    });
                                });
                            }

                            const [productId, quantity] = updates[index++];
                            connection.query(
                                `UPDATE products
                                 SET stock = stock - ?,
                                     in_stock = CASE WHEN stock - ? > 0 THEN 1 ELSE 0 END
                                 WHERE id = ? AND is_active = 1 AND stock >= ?`,
                                [quantity, quantity, productId, quantity],
                                (updateError, updateResult) => {
                                    if (updateError || updateResult.affectedRows !== 1) {
                                        return releaseWithError(
                                            409,
                                            "Stock changed. Please try again.",
                                            "Stock update error:",
                                            updateError
                                        );
                                    }
                                    updateNextStock();
                                }
                            );
                        };

                        updateNextStock();
                    });
                });
            });
        });
    });
});


app.post("/api/register", async (req, res) => {
    try {
        const { name, email, password, phone, address } = req.body;

        // Check required fields
        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email and password are required"
            });
        }

        // Check whether email already exists
        const checkSql = "SELECT id FROM users WHERE email = ?";

        db.query(checkSql, [email], async (err, results) => {
            if (err) {
                console.error("Registration check error:", err);

                return res.status(500).json({
                    message: "Database error"
                });
            }

            if (results.length > 0) {
                return res.status(409).json({
                    message: "Email already registered"
                });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            const insertSql = `
                INSERT INTO users
                (name, email, password, phone, address)
                VALUES (?, ?, ?, ?, ?)
            `;

            db.query(
                insertSql,
                [
                    name,
                    email,
                    hashedPassword,
                    phone || null,
                    address || null
                ],
                (err, result) => {
                    if (err) {
                        console.error("Registration error:", err);

                        return res.status(500).json({
                            message: "Could not register user"
                        });
                    }

                    res.status(201).json({
                        message: "Registration successful",
                        userId: result.insertId
                    });
                }
            );
        });

    } catch (error) {
        console.error("Registration error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
});



app.post("/api/login", (req, res) => {

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            message: "Email and password are required"
        });
    }

    const sql = "SELECT * FROM users WHERE email = ?";

    db.query(sql, [email], async (err, results) => {

        if (err) {
            console.error("Login database error:", err);

            return res.status(500).json({
                message: "Database error"
            });
        }

        if (results.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const user = results[0];

        // Older users may not have a password yet
        if (!user.password) {
            return res.status(401).json({
                message: "This account does not have a password"
            });
        }

        try {
            const passwordMatches = await bcrypt.compare(
                password,
                user.password
            );

            if (!passwordMatches) {
                return res.status(401).json({
                    message: "Invalid email or password"
                });
            }

            // Never send password back to frontend
            res.json({
                message: "Login successful",

                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    address: user.address
                }
            });

        } catch (error) {
            console.error("Password comparison error:", error);

            res.status(500).json({
                message: "Login failed"
            });
        }
    });
});


// =========================
// ADMIN PANEL
// =========================
const adminTokens = new Set();

function requireAdmin(req, res, next) {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token || !adminTokens.has(token)) {
        return res.status(401).json({ message: "Admin login required" });
    }
    next();
}



app.post("/api/admin/login", (req, res) => {
    const { email, password } = req.body;
    const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();

    if (!adminEmail) {
        return res.status(503).json({ message: "ADMIN_EMAIL is not configured on the server" });
    }
    if (!email || !password || email.trim().toLowerCase() !== adminEmail) {
        return res.status(401).json({ message: "Invalid admin credentials" });
    }

    db.query("SELECT id, email, password FROM users WHERE email = ?", [email.trim()], async (err, rows) => {
        if (err) {
    console.error("Admin login database error:", err);
    return res.status(500).json({ message: "Database error" });
}
        if (rows.length === 0 || !rows[0].password) {
            return res.status(401).json({ message: "Invalid admin credentials" });
        }
        try {
            const matches = await bcrypt.compare(password, rows[0].password);
            if (!matches) return res.status(401).json({ message: "Invalid admin credentials" });
            const token = crypto.randomBytes(32).toString("hex");
            adminTokens.add(token);
            res.json({ message: "Admin login successful", token });
        } catch (error) {
            res.status(500).json({ message: "Admin login failed" });
        }
    });
});



app.post("/api/admin/logout", requireAdmin, (req, res) => {
    const token = req.headers.authorization.slice(7);
    adminTokens.delete(token);
    res.json({ message: "Logged out" });
});

app.get("/api/admin/products", requireAdmin, (req, res) => {
    db.query("SELECT * FROM products WHERE is_active = 1 ORDER BY id DESC", (err, rows) => {
        if (err) return res.status(500).json({ message: "Failed to fetch products" });
        res.json(rows.map(product => ({
            id: product.id,
            name: product.name,
            brand: product.brand,
            category: product.category,
            price: Number(product.price),
            originalPrice: Number(product.original_price),
            discount: Number(product.discount || 0),
            rating: Number(product.rating || 0),
            description: product.description || "",
            image: product.image || "",
            colors: product.colors || "[]",
            sizes: product.sizes || "[]",
            stock: Number(product.stock || 0)
        })));
    });
});

function normalizeList(value) {
    if (Array.isArray(value)) return JSON.stringify(value.filter(Boolean));
    if (!value) return "[]";
    return JSON.stringify(String(value).split(",").map(v => v.trim()).filter(Boolean));
}

app.post("/api/admin/products", requireAdmin, (req, res) => {
    const p = req.body;

    if (!p.name || !p.category || p.price === undefined) {
        return res.status(400).json({
            message: "Name, category and price are required"
        });
    }

    const stock = Math.max(0, Number(p.stock || 0));

    // Find the next available product ID
    db.query(
        "SELECT COALESCE(MAX(id), 0) + 1 AS nextId FROM products",
        (idErr, idResult) => {

            if (idErr) {
                console.error("Error generating product ID:", idErr);

                return res.status(500).json({
                    message: "Failed to generate product ID"
                });
            }

            const nextId = idResult[0].nextId;

            const sql = `
                INSERT INTO products
                (
                    id,
                    name,
                    brand,
                    category,
                    price,
                    original_price,
                    discount,
                    rating,
                    description,
                    image,
                    colors,
                    sizes,
                    in_stock,
                    stock,
                    is_active
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            `;

            const values = [
                nextId,
                p.name.trim(),
                (p.brand || "").trim(),
                p.category.trim(),
                Number(p.price),
                Number(p.originalPrice || p.price),
                Number(p.discount || 0),
                Number(p.rating || 0),
                p.description || "",
                p.image || "",
                normalizeList(p.colors),
                normalizeList(p.sizes),
                stock > 0 ? 1 : 0,
                stock
            ];

            db.query(sql, values, (err) => {

                if (err) {
                    console.error("Admin add product error:", err);

                    return res.status(500).json({
                        message: "Failed to add product"
                    });
                }

                res.status(201).json({
                    message: "Product added successfully",
                    id: nextId
                });
            });
        }
    );
});





app.put("/api/admin/products/:id", requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    const p = req.body;
    if (!id || !p.name || !p.category || p.price === undefined) {
        return res.status(400).json({ message: "Invalid product data" });
    }
    const stock = Math.max(0, Number(p.stock || 0));
    const sql = `
        UPDATE products SET
        name=?, brand=?, category=?, price=?, original_price=?, discount=?, rating=?,
        description=?, image=?, colors=?, sizes=?, in_stock=?, stock=?
        WHERE id=? AND is_active=1
    `;
    const values = [
        p.name.trim(), (p.brand || "").trim(), p.category.trim(), Number(p.price),
        Number(p.originalPrice || p.price), Number(p.discount || 0), Number(p.rating || 0),
        p.description || "", p.image || "", normalizeList(p.colors), normalizeList(p.sizes),
        stock > 0 ? 1 : 0, stock, id
    ];
    db.query(sql, values, (err, result) => {
        if (err) return res.status(500).json({ message: "Failed to update product" });
        if (!result.affectedRows) return res.status(404).json({ message: "Product not found" });
        res.json({ message: "Product updated" });
    });
});

// Soft delete: removes the product from the store while preserving old order history.
app.delete("/api/admin/products/:id", requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    db.query("UPDATE products SET is_active = 0, stock = 0, in_stock = 0 WHERE id = ?", [id], (err, result) => {
        if (err) return res.status(500).json({ message: "Failed to delete product" });
        if (!result.affectedRows) return res.status(404).json({ message: "Product not found" });
        res.json({ message: "Product deleted" });
    });
});

app.get("/api/admin/users", requireAdmin, (req, res) => {
    db.query("SELECT id, name, email, phone, address FROM users ORDER BY id DESC", (err, rows) => {
        if (err) return res.status(500).json({ message: "Failed to fetch users" });
        res.json(rows);
    });
});

app.get("/api/admin/orders", requireAdmin, (req, res) => {
    const sql = `
        SELECT
            o.*,
            oi.id AS item_id,
            oi.product_id,
            oi.name AS item_name,
            oi.brand AS item_brand,
            oi.price AS item_price,
            oi.color AS item_color,
            oi.size AS item_size,
            oi.quantity AS item_quantity
        FROM orders o
        LEFT JOIN order_items oi ON oi.order_id = o.id
        ORDER BY o.created_at DESC, oi.id ASC
    `;

    db.query(sql, (err, rows) => {
        if (err) {
            console.error("Admin orders error:", err);
            return res.status(500).json({ message: "Failed to fetch orders" });
        }

        const byId = new Map();
        for (const row of rows) {
            if (!byId.has(row.id)) {
                byId.set(row.id, {
                    id: row.id,
                    user_id: row.user_id,
                    customer_name: row.customer_name,
                    email: row.email,
                    phone: row.phone,
                    address: row.address,
                    subtotal: Number(row.subtotal || 0),
                    shipping: Number(row.shipping || 0),
                    total: Number(row.total || 0),
                    payment_method: row.payment_method,
                    status: row.status,
                    created_at: row.created_at,
                    items: []
                });
            }
            if (row.item_id) {
                byId.get(row.id).items.push({
                    product_id: row.product_id,
                    name: row.item_name,
                    brand: row.item_brand,
                    price: Number(row.item_price || 0),
                    color: row.item_color,
                    size: row.item_size,
                    quantity: Number(row.item_quantity || 0)
                });
            }
        }

        res.json([...byId.values()]);
    });
});

app.put("/api/admin/orders/:id/status", requireAdmin, (req, res) => {
    const allowed = ["confirmed", "processing", "shipped", "delivered", "cancelled"];
    const status = String(req.body.status || "").toLowerCase();
    if (!allowed.includes(status)) return res.status(400).json({ message: "Invalid status" });
    db.query("UPDATE orders SET status = ? WHERE id = ?", [status, Number(req.params.id)], (err, result) => {
        if (err) return res.status(500).json({ message: "Failed to update order" });
        if (!result.affectedRows) return res.status(404).json({ message: "Order not found" });
        res.json({ message: "Order status updated" });
    });
});




app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});