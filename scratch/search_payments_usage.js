const fs = require('fs');
const path = require('path');

const files = [
  'src/app/[locale]/staff/intelligence/actions/page.tsx',
  'src/app/[locale]/staff/intelligence/crm/page.tsx',
  'src/app/[locale]/staff/intelligence/growth/page.tsx',
  'src/app/[locale]/staff/intelligence/moat/tracker/page.tsx',
  'src/app/[locale]/staff/intelligence/network/page.tsx',
  'src/app/[locale]/staff/intelligence/north-star/page.tsx',
  'src/app/[locale]/staff/intelligence/roadmap/page.tsx',
  'src/lib/dal/archive.ts',
  'src/lib/dal/intelligence-dashboard.ts',
  'src/lib/dal/marketing.ts',
  'src/lib/dal/scoring/customer-scoring.ts',
  'src/lib/dal/scoring/platform-scoring.ts'
];

files.forEach(f => {
  const fp = path.join(__dirname, '..', f);
  if (!fs.existsSync(fp)) {
    console.log(`File not found: ${f}`);
    return;
  }
  const lines = fs.readFileSync(fp, 'utf8').split('\n');
  console.log(`\n=== FILE: ${f} ===`);
  lines.forEach((l, idx) => {
    if (l.includes("from('payments')") || l.includes('from("payments")')) {
      console.log(`Line ${idx + 1}: ${l.trim()}`);
      for (let i = Math.max(0, idx - 2); i <= Math.min(lines.length - 1, idx + 4); i++) {
        console.log(`  [${i + 1}]: ${lines[i].trim()}`);
      }
    }
  });
});
