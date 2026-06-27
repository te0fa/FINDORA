const fs = require('fs');
const path = require('path');

function searchInDir(dir, patterns) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
        searchInDir(fullPath, patterns);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      patterns.forEach(pattern => {
        if (content.includes(pattern)) {
          console.log(`Found "${pattern}" in: ${fullPath}`);
          const lines = content.split('\n');
          lines.forEach((line, idx) => {
            if (line.includes(pattern)) {
              console.log(`  Line ${idx + 1}: ${line.trim()}`);
            }
          });
        }
      });
    }
  }
}

const patterns = ['contributor_wallets', 'balance_egp', 'points_balance', 'lifetime_earned_egp'];
console.log('Searching codebase for wallet mutations...');
searchInDir('e:\\FINDORA\\src', patterns);
