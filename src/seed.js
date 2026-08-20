const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

async function seed(count = 200) {
    const db = await open({
        filename: path.join(__dirname, '../report.db'),
        driver: sqlite3.Database
    });

    // Create orders table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer TEXT NOT NULL,
            product TEXT NOT NULL,
            amount REAL NOT NULL,
            created_at TEXT NOT NULL
        )
    `);

    // Delete all rows (safe to run twice)
    await db.run('DELETE FROM orders');

    // Products and customers
    const products = [
        'Laptop', 'Keyboard', 'Mouse', 'Monitor', 'Headphones',
        'Charger', 'Speakers', 'Webcam', 'Desk Lamp', 'USB Hub',
        'Tablet', 'Smartwatch', 'Drone', 'Camera', 'Printer',
        'Scanner', 'External Drive', 'Router', 'Cable', 'Adapter'
    ];
    const customers = [
        'Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank',
        'Grace', 'Henry', 'Ivy', 'Jack', 'Kate', 'Leo',
        'Mia', 'Noah', 'Olivia', 'Peter', 'Quinn', 'Ruby',
        'Sam', 'Tina', 'Uma', 'Victor', 'Wendy', 'Xavier',
        'Yara', 'Zack', 'Amy', 'Brian', 'Clara', 'David'
    ];

    // Generate orders
    const orders = [];
    const now = Date.now();
    const daysMs = count === 5000 ? 90 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;

    for (let i = 0; i < count; i++) {
        const customer = customers[Math.floor(Math.random() * customers.length)];
        const product = products[Math.floor(Math.random() * products.length)];
        const amount = Math.round((5 + Math.random() * 195) * 100) / 100;
        const date = new Date(now - Math.random() * daysMs);
        const dateStr = date.toISOString().slice(0, 19).replace('T', ' ');
        orders.push({ customer, product, amount, date: dateStr });
    }

    // Insert orders in batches
    for (const order of orders) {
        await db.run(
            'INSERT INTO orders (customer, product, amount, created_at) VALUES (?, ?, ?, ?)',
            [order.customer, order.product, order.amount, order.date]
        );
    }

    const result = await db.get('SELECT COUNT(*) as count FROM orders');
    console.log(`✅ Seeded ${result.count} orders`);

    await db.close();
}

// Run with count from command line
const count = parseInt(process.argv[2]) || 200;
seed(count).catch(console.error);