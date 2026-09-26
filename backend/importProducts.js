require("dotenv").config();
const mysql = require("mysql2");
const data = require("./data.json");

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306
});

db.connect((err) => {
    if (err) {
        console.error("Database connection failed:", err);
        return;
    }

    console.log("Connected to MySQL");

    importProducts();
});

function importProducts() {

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
            in_stock
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    data.products.forEach(product => {

        const values = [
            product.id,
            product.name,
            product.brand,
            product.category,
            product.price,
            product.originalPrice,
            product.discount,
            product.rating,
            product.description,
            product.image,
            JSON.stringify(product.colors),
            JSON.stringify(product.sizes),
            product.inStock
        ];

        db.query(sql, values, (err) => {
            if (err) {
                console.error(`Error importing ${product.name}:`, err.message);
            } else {
                console.log(`Imported: ${product.name}`);
            }
        });
    });
}