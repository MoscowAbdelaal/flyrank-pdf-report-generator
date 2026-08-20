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

async function getAllReports() {
    return await db.all('SELECT * FROM reports ORDER BY created_at DESC');
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
// STRETCH 3: CONTROL PANEL - List all reports
// ============================================
app.get('/reports', async (req, res) => {
    try {
        const reports = await getAllReports();
        const reportsWithLinks = reports.map(r => ({
            ...r,
            file: `/reports/${r.id}/file`,
            download: `/reports/${r.id}/download`
        }));
        res.json({ reports: reportsWithLinks });
    } catch (error) {
        console.error('Error listing reports:', error);
        res.status(500).json({ error: 'Failed to list reports' });
    }
});

// ============================================
// POST /reports - Generate a new report
// STRETCH 2: Parameterized report (days)
// ============================================
app.post('/reports', async (req, res) => {
    try {
        const { days = 30, force } = req.body;

        // Validate days
        if (days < 1 || days > 365) {
            return res.status(400).json({ error: 'Days must be between 1 and 365' });
        }

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
                    existing: true,
                    days: days
                });
            }
        }

        // Generate new report
        const id = uuidv4();
        // STRETCH 4: Nice filenames
        const today = new Date().toISOString().slice(0, 10);
        const filename = `sales-report-${today}-${id.slice(0, 8)}.pdf`;
        const filePath = path.join(REPORTS_DIR, filename);

        console.log(`📝 Generating report ${id} for last ${days} days...`);

        // Get data and generate PDF
        const data = await getReportData(days);
        await generatePDF(data, filePath);

        // Save to database
        await saveReport(id, filePath);

        const fileLink = `/reports/${id}/file`;
        const downloadLink = `/reports/${id}/download`;

        console.log(`✅ Report ${id} generated`);

        res.status(201).json({
            id,
            file: fileLink,
            download: downloadLink,
            filename: filename,
            days: days,
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
        const downloadLink = `/reports/${report.id}/download`;
        res.json({
            id: report.id,
            file: fileLink,
            download: downloadLink,
            created_at: report.created_at
        });
    } catch (error) {
        console.error('Error getting report:', error);
        res.status(500).json({ error: 'Failed to get report' });
    }
});

// ============================================
// GET /reports/:id/file - View PDF in browser
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

        // STRETCH 4: Nice filename
        const filename = path.basename(filePath);
        res.sendFile(filePath, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="${filename}"`
            }
        });
    } catch (error) {
        console.error('Error serving PDF:', error);
        res.status(500).json({ error: 'Failed to serve PDF' });
    }
});

// ============================================
// GET /reports/:id/download - Download PDF (attachment)
// ============================================
app.get('/reports/:id/download', async (req, res) => {
    try {
        const report = await getReport(req.params.id);
        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }

        const filePath = report.path;
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'PDF file not found' });
        }

        const filename = path.basename(filePath);
        res.download(filePath, filename);
    } catch (error) {
        console.error('Error downloading PDF:', error);
        res.status(500).json({ error: 'Failed to download PDF' });
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
        console.log(`  GET  /reports                 - List all reports`);
        console.log(`  POST /reports                 - Generate a report`);
        console.log(`  GET  /reports/:id             - Get report metadata`);
        console.log(`  GET  /reports/:id/file        - View PDF`);
        console.log(`  GET  /reports/:id/download    - Download PDF`);
        console.log(`\n💡 Examples:`);
        console.log(`  Generate: curl -X POST http://localhost:${PORT}/reports -H "Content-Type: application/json" -d '{"days":7}'`);
        console.log(`  Force new: curl -X POST http://localhost:${PORT}/reports -H "Content-Type: application/json" -d '{"force":true}'`);
        console.log(`  List: curl http://localhost:${PORT}/reports`);
    });
}

start().catch(console.error);