require("dotenv").config();


const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const bcrypt = require("bcrypt");
const data = require("./data.json");

const app = express();

const PORT = process.env.PORT || 5000;


const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306
});







db.connect((err) => {
    if (err) {
        console.error("MySQL connection failed:", err);
        return;
    }

    console.log("Connected to KAPPA MySQL database!");
});





app.use(cors());

app.use(express.json());

app.get("/", (req, res) => {
    res.send("KAPPA Backend is running!");
});


app.get("/api/products", (req, res) => {

    const sql = "SELECT * FROM products";

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
            inStock: Boolean(product.in_stock)
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
    db.query("SELECT * FROM users", (err, results) => {
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

    db.query("DELETE FROM cart", (err) => {

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
app.get("/api/orders", (req, res) => {

    const orderSql = `
        SELECT * FROM orders
        ORDER BY created_at DESC
    `;

    db.query(orderSql, (err, orders) => {

        if (err) {
            console.error("Error fetching orders:", err);

            return res.status(500).json({
                message: "Failed to fetch orders"
            });
        }

        if (orders.length === 0) {
            return res.json([]);
        }

        const itemSql = `
            SELECT * FROM order_items
            ORDER BY id
        `;

        db.query(itemSql, (err, items) => {

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

                orderDate: order.created_at
            }));

            res.json(result);
        });
    });
});


// Place new order
app.post("/api/orders", (req, res) => {

    const newOrder = req.body;

    console.log("Order received:", newOrder);

    if (!newOrder.items || newOrder.items.length === 0) {
        return res.status(400).json({
            message: "Order must contain items"
        });
    }

    const subtotal = newOrder.total;
    const shipping = newOrder.deliveryCharges || 0;
    const finalTotal = subtotal + shipping;

    const orderSql = `
        INSERT INTO orders
        (
            customer_name,
            email,
            phone,
            address,
            subtotal,
            shipping,
            total,
            payment_method,
            status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const orderValues = [
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

    db.query(orderSql, orderValues, (err, result) => {

        if (err) {
            console.error("Error creating order:", err);

            return res.status(500).json({
                message: "Failed to create order"
            });
        }

        const orderId = result.insertId;

        const itemSql = `
            INSERT INTO order_items
            (
                order_id,
                product_id,
                name,
                brand,
                price,
                color,
                size,
                quantity
            )
            VALUES ?
        `;

        const itemValues = newOrder.items.map(item => [
            orderId,
            item.id,
            item.name,
            item.brand,
            item.price,
            item.color || null,
            item.size || null,
            item.quantity || 1
        ]);

        db.query(itemSql, [itemValues], (err) => {

            if (err) {
                console.error("Error saving order items:", err);

                return res.status(500).json({
                    message: "Order created but items could not be saved"
                });
            }

            res.status(201).json({
                message: "Order placed successfully",
                orderId: orderId
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




app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});