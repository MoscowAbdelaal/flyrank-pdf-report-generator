const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

function buildHTML(reportData) {
    const { total_orders, total_revenue, top_products, orders_per_day } = reportData;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Sales Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 40px;
            color: #333;
            max-width: 1100px;
            margin: 0 auto;
        }
        h1 {
            font-size: 28px;
            color: #1a1a2e;
            border-bottom: 3px solid #4a90d9;
            padding-bottom: 10px;
            margin-bottom: 10px;
        }
        .subtitle {
            color: #666;
            font-size: 14px;
            margin-bottom: 30px;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
        }
        .summary-card {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            border-left: 4px solid #4a90d9;
        }
        .summary-card .label {
            font-size: 12px;
            text-transform: uppercase;
            color: #888;
            letter-spacing: 0.5px;
        }
        .summary-card .value {
            font-size: 28px;
            font-weight: bold;
            color: #1a1a2e;
            margin-top: 4px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            font-size: 14px;
        }
        thead {
            display: table-header-group;
        }
        thead th {
            background: #1a1a2e;
            color: white;
            padding: 12px 15px;
            text-align: left;
            font-weight: 600;
            font-size: 13px;
        }
        tbody tr {
            break-inside: avoid;
        }
        tbody td {
            padding: 10px 15px;
            border-bottom: 1px solid #e9ecef;
        }
        tbody tr:nth-child(even) {
            background: #f8f9fa;
        }
        tbody tr:hover {
            background: #e9ecef;
        }
        .section-title {
            font-size: 18px;
            font-weight: bold;
            margin-top: 30px;
            margin-bottom: 10px;
            color: #1a1a2e;
        }
        .text-right {
            text-align: right;
        }
        .text-center {
            text-align: center;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            font-size: 12px;
            color: #888;
            text-align: center;
        }
        .badge {
            display: inline-block;
            padding: 2px 10px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
        }
        .badge-high { background: #d4edda; color: #155724; }
        .badge-medium { background: #fff3cd; color: #856404; }
        .badge-low { background: #f8d7da; color: #721c24; }
        .rank {
            display: inline-block;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: #4a90d9;
            color: white;
            text-align: center;
            line-height: 24px;
            font-size: 12px;
            font-weight: bold;
        }
        .rank-gold { background: #ffc107; color: #333; }
        .rank-silver { background: #adb5bd; color: #333; }
        .rank-bronze { background: #cd7f32; color: white; }
        @media print {
            body { padding: 20px; }
            .summary-card { break-inside: avoid; }
            tr { break-inside: avoid; }
            thead { display: table-header-group; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <h1>📊 Sales Report</h1>
    <div class="subtitle">Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</div>

    <div class="summary-grid">
        <div class="summary-card">
            <div class="label">Total Orders</div>
            <div class="value">${total_orders}</div>
        </div>
        <div class="summary-card">
            <div class="label">Total Revenue</div>
            <div class="value">$${total_revenue.toFixed(2)}</div>
        </div>
    </div>

    <div class="section-title">🏆 Top 5 Products by Revenue</div>
    <table>
        <thead>
            <tr>
                <th style="width:50px;">#</th>
                <th>Product</th>
                <th style="text-align:right;">Orders</th>
                <th style="text-align:right;">Revenue</th>
            </tr>
        </thead>
        <tbody>
            ${top_products.map((p, i) => {
                let rankClass = 'rank';
                if (i === 0) rankClass += ' rank-gold';
                else if (i === 1) rankClass += ' rank-silver';
                else if (i === 2) rankClass += ' rank-bronze';
                return `
                <tr>
                    <td><span class="${rankClass}">${i + 1}</span></td>
                    <td><strong>${p.product}</strong></td>
                    <td class="text-right">${p.orders}</td>
                    <td class="text-right"><strong>$${p.revenue.toFixed(2)}</strong></td>
                </tr>`;
            }).join('')}
        </tbody>
    </table>

    <div class="section-title">📅 Orders Per Day (Last 7 Days)</div>
    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th style="text-align:right;">Orders</th>
                <th style="text-align:right;">Revenue</th>
            </tr>
        </thead>
        <tbody>
            ${orders_per_day.map(d => `
                <tr>
                    <td>${d.day}</td>
                    <td class="text-right">${d.orders}</td>
                    <td class="text-right">$${d.revenue.toFixed(2)}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <div class="footer">
        Generated by FlyRank PDF Report Generator • Page <span class="pageNumber"></span> of <span class="totalPages"></span>
    </div>
</body>
</html>
    `;
}

async function generatePDF(reportData, outputPath) {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    const html = buildHTML(reportData);
    await page.setContent(html, { waitUntil: 'networkidle' });

    await page.pdf({
        path: outputPath,
        format: 'A4',
        printBackground: true,
        margin: {
            top: '20mm',
            bottom: '20mm',
            left: '15mm',
            right: '15mm'
        }
    });

    await browser.close();
    console.log(`✅ PDF generated: ${outputPath}`);
}

module.exports = { generatePDF, buildHTML };
