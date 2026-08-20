README.md

markdown
# PDF Report Generator

Generate PDF sales reports from SQL data — query, render, store, serve.

## Quick Start

```bash
npm install
npx playwright install chromium
npm run seed
npm run dev
API Endpoints

Method	Endpoint	Description
GET	/reports	List all reports
POST	/reports	Generate a report
GET	/reports/:id	Get metadata
GET	/reports/:id/file	View PDF
GET	/reports/:id/download	Download PDF
Demo

bash
# Generate a report
curl -X POST http://localhost:3000/reports \
  -H "Content-Type: application/json" \
  -d '{"days": 30}'

# List all reports
curl http://localhost:3000/reports

# Download a report
curl -o report.pdf http://localhost:3000/reports/abc-123/download
Stretch Goals

✅ Brand colors + page numbers
✅ Parameterized reports (days)
✅ Control panel (GET /reports)
✅ Nice filenames (sales-report-2026-08-20.pdf)
✅ Big-table experiment (npm run seed:big)
License

MIT