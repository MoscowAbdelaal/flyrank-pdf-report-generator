# PDF Report Generator

Generate PDF sales reports from SQL data — query, render, store, serve.

## Quick Start

```bash
# Install dependencies
npm install

# Install Playwright browser
npx playwright install chromium

# Seed the database
npm run seed

# Start the server
npm run dev
API Endpoints

Method	Endpoint	Description
POST	/reports	Generate a report (returns 201 + link)
GET	/reports/:id	Get report metadata
GET	/reports/:id/file	Download the PDF
Database Schema

sql
CREATE TABLE orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer TEXT NOT NULL,
    product TEXT NOT NULL,
    amount REAL NOT NULL,
    created_at TEXT NOT NULL
);
Aggregation SQL

sql
-- Total orders
SELECT COUNT(*) as count FROM orders;

-- Total revenue
SELECT SUM(amount) as total FROM orders;

-- Top 5 products by revenue
SELECT 
    product,
    COUNT(*) as order_count,
    SUM(amount) as total_revenue
FROM orders
GROUP BY product
ORDER BY total_revenue DESC
LIMIT 5;

-- Orders per day for last 7 days
SELECT 
    DATE(created_at) as day,
    COUNT(*) as order_count,
    SUM(amount) as daily_revenue
FROM orders
WHERE created_at >= DATE('now', '-7 days')
GROUP BY DATE(created_at)
ORDER BY day DESC;
Demo

bash
# Generate a report
curl -X POST http://localhost:3000/reports \
  -H "Content-Type: application/json" \
  -d '{}'

# Response: {"id":"abc-123","file":"/reports/abc-123/file","message":"Report generated successfully"}

# Download the PDF
curl -o report.pdf http://localhost:3000/reports/abc-123/file

# Check metadata
curl http://localhost:3000/reports/abc-123
Idempotency

Same day requests return the same report:

bash
# First request → creates report
curl -X POST http://localhost:3000/reports -H "Content-Type: application/json" -d '{}'
# Response: {"id":"abc-123","file":"..."}

# Second request same day → returns existing report
curl -X POST http://localhost:3000/reports -H "Content-Type: application/json" -d '{}'
# Response: {"id":"abc-123","file":"...","existing":true}
Force a new report:

bash
curl -X POST http://localhost:3000/reports -H "Content-Type: application/json" -d '{"force":true}'
Why This Works

Stage 4: The POST request takes a few seconds because PDF generation runs inside the request. This is fine for one user clicking one button — but for big reports or many users, the work should move to a background job.

Stage 5: Idempotency prevents duplicate reports. Two identical requests on the same day produce one file, not two. Without this, a user double-clicking "Generate" would waste time, disk space, and money.

Screenshot

https://./screenshot.png

Tech Stack

Node.js + Express
SQLite3 (built-in)
Playwright (headless browser → PDF)
uuid (for report IDs)
Author

Marwan Abdelaal
