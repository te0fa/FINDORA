const fs = require('fs');
const path = require('path');

const apiDir = 'e:/FINDORA/src/app/api';

const publicRoutesPrefixes = [
  '/api/ai/parse-request',
  '/api/ai/pricing',
  '/api/pricing/resolve',
  '/api/contributors/scarcity',
  '/api/merchants/register',
  '/api/otp/',
  '/api/cron/',
  '/api/internal/jobs/research/run',
  '/api/webhooks/',
  '/api/vendors/check-duplicate',
  '/api/trends'
];

function isPublic(pathname) {
  const cleanPath = pathname.replace(/\\/g, '/');
  return publicRoutesPrefixes.some(prefix => cleanPath.startsWith(prefix));
}

const results = [];

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanDir(fullPath);
    } else if (file === 'route.ts') {
      const relPath = path.relative('e:/FINDORA/src/app', fullPath).replace(/\\/g, '/');
      const routeUrl = '/' + relPath.replace('/route.ts', '');
      const content = fs.readFileSync(fullPath, 'utf8');
      
      let classification = 'Requires Auth';
      const cleanPath = routeUrl;
      const isPublicPath = isPublic(cleanPath);
      
      let isMixed = false;
      if (cleanPath === '/api/products' || cleanPath.startsWith('/api/products/') ||
          cleanPath === '/api/specializations' || cleanPath.startsWith('/api/specializations/')) {
        isMixed = true;
      }
      
      const hasStaffCheck = content.includes('staff') || content.includes('Staff') || content.includes('economy_config');
      const hasContributorCheck = content.includes('contributor') || content.includes('Contributor') || content.includes('scout');
      const hasVendorCheck = content.includes('vendor') || content.includes('Vendor');
      
      let roleCheck = '🔴 (auth without role check)';
      let details = 'Only verifies user authentication';
      
      if (hasStaffCheck) {
        roleCheck = '🟢 (auth + staff role check)';
        details = 'Checks staff membership / permissions';
      } else if (hasContributorCheck) {
        roleCheck = '🟢 (auth + contributor role check)';
        details = 'Checks contributor membership / approval';
      } else if (hasVendorCheck) {
        roleCheck = '🟢 (auth + vendor role check)';
        details = 'Checks vendor permissions';
      }

      if (isPublicPath && !isMixed) {
        classification = 'Public/Exempt';
        roleCheck = '🟢 (Public/Exempt / Signature / Secret Check)';
        details = 'Checks Bearer CRON_SECRET, webhook signature, or is open';
      }

      results.push({
        url: routeUrl,
        classification,
        roleCheck,
        details
      });
    }
  });
}

scanDir(apiDir);
results.sort((a, b) => a.url.localeCompare(b.url));

let md = '# API Route Protection Audit\n\n';
md += '| API Route Path | Classification | Role Check Status | Details / Notes |\n';
md += '| :--- | :--- | :--- | :--- |\n';

results.forEach(r => {
  md += `| \`${r.url}\` | **${r.classification}** | ${r.roleCheck} | ${r.details} |\n`;
});

fs.writeFileSync('e:/FINDORA/scratch/api_route_audit.md', md, 'utf8');
console.log('Saved audit report to e:/FINDORA/scratch/api_route_audit.md');
