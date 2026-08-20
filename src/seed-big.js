const { seed } = require('./seed');
const { getReportData } = require('./reportData');
const { generatePDF } = require('./generatePDF');
const path = require('path');
const fs = require('fs');

async function bigTableExperiment() {
    console.log('🧪 BIG TABLE EXPERIMENT\n');
    console.log('Seeding 5,000 orders...');
    
    const startSeed = Date.now();
    await seed(5000);
    const seedTime = (Date.now() - startSeed) / 1000;
    console.log(`✅ Seeded 5,000 orders in ${seedTime}s\n`);

    console.log('Generating PDF with 5,000 orders...');
    const startPdf = Date.now();
    const data = await getReportData(90);
    const outputPath = path.join(__dirname, '../reports/big-table-test.pdf');
    await generatePDF(data, outputPath);
    const pdfTime = (Date.now() - startPdf) / 1000;

    const stats = fs.statSync(outputPath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log(`\n📊 RESULTS:`);
    console.log(`  PDF generated in: ${pdfTime}s`);
    console.log(`  File size: ${sizeMB} MB`);
    console.log(`  Pages: ~${Math.floor(stats.size / 20000) + 1}`);
    console.log(`\n📁 PDF saved to: ${outputPath}`);
    console.log(`\n💡 What this tells us:`);
    console.log(`  Generating a 5,000-row PDF inside a request takes ~${pdfTime}s.`);
    console.log(`  This is why slow work should move to background jobs.`);
}

bigTableExperiment().catch(console.error);