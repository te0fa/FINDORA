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
  'src/lib/dal/scoring/platform-scoring.ts',
  'src/lib/dal/payments.ts'
];

files.forEach(f => {
  const fp = path.join(__dirname, '..', f);
  if (!fs.existsSync(fp)) return;
  const content = fs.readFileSync(fp, 'utf8');
  console.log(`\n=== File: ${f} ===`);
  const regexes = [
    /status['\"`]?\s*[=!]==?\s*['\"`](\w+)['\"`]/g,
    /payment_status['\"`]?\s*[=!]==?\s*['\"`](\w+)['\"`]/g,
    /eq\(['\"`]payment_status['\"`]\s*,\s*['\"`](\w+)['\"`]\)/g,
    /eq\(['\"`]status['\"`]\s*,\s*['\"`](\w+)['\"`]\)/g
  ];
  regexes.forEach(re => {
    let match;
    while ((match = re.exec(content)) !== null) {
      console.log(`  Match: ${match[0]} (Value: ${match[1]})`);
    }
  });
});
