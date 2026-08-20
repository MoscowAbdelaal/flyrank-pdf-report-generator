const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { chromium } = require('playwright');
const { getReportData } = require('./reportData');
const { generatePDF } = require('./generatePDF');

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
// REPORTS TABLE FUNCTIONS
// ============================================
async function getReport(id) {
    return await db.get('SELECT * FROM reports WHERE id = ?', [id]);
}

async function saveReport(id, filePath) {
    await db.run('INSERT INTO reports (id, path) VALUES (?, ?)', [id, filePath]);
}

async function getTodaysReport() {
    return await db.get(`
        SELECT * FROM reports 
        WHERE DATE(created_at) = DATE('now') 
        ORDER BY created_at DESC 
        LIMIT 1
    `);
}

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// ============================================
// POST /reports - Generate a new report
// ============================================
app.post('/reports', async (req, res) => {
    try {
        const { force } = req.body;

        // Check if a report was already generated today (idempotency)
        if (!force) {
            const existing = await getTodaysReport();
            if (existing) {
                const fileLink = `/reports/${existing.id}/file`;
                console.log(`🔄 Idempotency: Returning existing report ${existing.id}`);
                return res.status(200).json({
                    id: existing.id,
                    file: fileLink,
                    message: 'Report already generated today',
                    existing: true
                });
            }
        }

        // Generate new report
        const id = uuidv4();
        const filename = `report-${id}.pdf`;
        const filePath = path.join(REPORTS_DIR, filename);

        console.log(`📝 Generating report ${id}...`);

        // Get data and generate PDF
        const data = await getReportData();
        await generatePDF(data, filePath);

        // Save to database
        await saveReport(id, filePath);

        const fileLink = `/reports/${id}/file`;

        console.log(`✅ Report ${id} generated`);

        res.status(201).json({
            id,
            file: fileLink,
            message: 'Report generated successfully'
        });

    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
});

// ============================================
// GET /reports/:id - Get report metadata
// ============================================
app.get('/reports/:id', async (req, res) => {
    try {
        const report = await getReport(req.params.id);
        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }

        const fileLink = `/reports/${report.id}/file`;
        res.json({
            id: report.id,
            file: fileLink,
            created_at: report.created_at
        });
    } catch (error) {
        console.error('Error getting report:', error);
        res.status(500).json({ error: 'Failed to get report' });
    }
});

// ============================================
// GET /reports/:id/file - Download the PDF
// ============================================
app.get('/reports/:id/file', async (req, res) => {
    try {
        const report = await getReport(req.params.id);
        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }

        const filePath = report.path;
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'PDF file not found' });
        }

        res.sendFile(filePath, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="report-${report.id}.pdf"`
            }
        });
    } catch (error) {
        console.error('Error serving PDF:', error);
        res.status(500).json({ error: 'Failed to serve PDF' });
    }
});

// ============================================
// START SERVER
// ============================================
async function start() {
    await initDatabase();
    app.listen(PORT, () => {
        console.log(`\n🚀 Server running at http://localhost:${PORT}`);
        console.log(`📚 Health: http://localhost:${PORT}/health`);
        console.log(`\n📋 Endpoints:`);
        console.log(`  POST /reports            - Generate a report`);
        console.log(`  GET  /reports/:id        - Get report metadata`);
        console.log(`  GET  /reports/:id/file   - Download the PDF`);
        console.log(`\n💡 Test idempotency: curl -X POST http://localhost:${PORT}/reports -H "Content-Type: application/json" -d '{}'`);
        console.log(`   Then run the same command again — you'll get the same ID.`);
        console.log(`   To force a new report: curl -X POST http://localhost:${PORT}/reports -H "Content-Type: application/json" -d '{"force":true}'`);
    });
}

start().catch(console.error);
