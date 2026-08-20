const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { chromium } = require('playwright');

const app = express();
const PORT = process.env.PORT || 3000;
const REPORTS_DIR = path.join(__dirname, '../reports');

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

app.use(express.json());

// ============================================
// DATABASE SETUP
// ============================================
let db;

async function initDatabase() {
    db = await open({
        filename: path.join(__dirname, '../report.db'),
        driver: sqlite3.Database
    });

    // Create reports table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS reports (
            id TEXT PRIMARY KEY,
            path TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    console.log('✅ Database ready');
}

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// ============================================
// START SERVER
// ============================================
async function start() {
    await initDatabase();
    app.listen(PORT, () => {
        console.log(`\n🚀 Server running at http://localhost:${PORT}`);
        console.log(`📚 Health: http://localhost:${PORT}/health`);
    });
}

start().catch(console.error);
