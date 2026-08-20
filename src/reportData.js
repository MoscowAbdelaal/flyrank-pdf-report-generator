const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

async function getReportData() {
    const db = await open({
        filename: path.join(__dirname, '../report.db'),
        driver: sqlite3.Database
    });

    // 1. Total number of orders
    const totalOrders = await db.get('SELECT COUNT(*) as count FROM orders');

    // 2. Total revenue (SUM of all amounts)
    const totalRevenue = await db.get('SELECT SUM(amount) as total FROM orders');

    // 3. Top 5 products by revenue
    const topProducts = await db.all(`
        SELECT 
            product,
            COUNT(*) as order_count,
            SUM(amount) as total_revenue
        FROM orders
        GROUP BY product
        ORDER BY total_revenue DESC
        LIMIT 5
    `);

    // 4. Orders per day for the last 7 days
    const ordersPerDay = await db.all(`
        SELECT 
            DATE(created_at) as day,
            COUNT(*) as order_count,
            SUM(amount) as daily_revenue
        FROM orders
        WHERE created_at >= DATE('now', '-7 days')
        GROUP BY DATE(created_at)
        ORDER BY day DESC
    `);

    await db.close();

    return {
        total_orders: totalOrders.count,
        total_revenue: Math.round(totalRevenue.total * 100) / 100,
        top_products: topProducts.map(p => ({
            product: p.product,
            orders: p.order_count,
            revenue: Math.round(p.total_revenue * 100) / 100
        })),
        orders_per_day: ordersPerDay.map(d => ({
            day: d.day,
            orders: d.order_count,
            revenue: Math.round(d.daily_revenue * 100) / 100
        }))
    };
}

module.exports = { getReportData };
