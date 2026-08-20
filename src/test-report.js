const { getReportData } = require('./reportData');

async function test() {
    console.log('\n📊 REPORT DATA\n');
    console.log('=' .repeat(50));

    const data = await getReportData();

    console.log(`\n📦 Total Orders: ${data.total_orders}`);
    console.log(`💰 Total Revenue: $${data.total_revenue.toFixed(2)}`);

    console.log('\n🏆 Top 5 Products by Revenue:');
    console.log('-'.repeat(50));
    data.top_products.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.product.padEnd(15)} | Orders: ${p.orders.toString().padStart(3)} | Revenue: $${p.revenue.toFixed(2)}`);
    });

    console.log('\n📅 Orders Per Day (Last 7 Days):');
    console.log('-'.repeat(50));
    data.orders_per_day.forEach(d => {
        console.log(`  ${d.day} | Orders: ${d.orders.toString().padStart(3)} | Revenue: $${d.revenue.toFixed(2)}`);
    });

    console.log('\n✅ Report data ready!');
}

test().catch(console.error);
