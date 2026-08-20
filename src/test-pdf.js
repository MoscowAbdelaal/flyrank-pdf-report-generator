const { getReportData } = require('./reportData');
const { generatePDF } = require('./generatePDF');
const path = require('path');

async function test() {
    console.log('📊 Generating test PDF...\n');

    const data = await getReportData(30);
    const outputPath = path.join(__dirname, '../reports/test.pdf');

    await generatePDF(data, outputPath);

    console.log(`\n✅ PDF saved to: ${outputPath}`);
    console.log(`📄 Open it with: open ${outputPath}`);
}

test().catch(console.error);