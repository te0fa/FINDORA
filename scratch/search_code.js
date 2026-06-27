const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    const stat = fs.statSync(filepath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next') {
        walk(filepath, callback);
      }
    } else {
      callback(filepath);
    }
  }
}

walk('e:/FINDORA', (filepath) => {
  if (filepath.endsWith('.ts') || filepath.endsWith('.tsx') || filepath.endsWith('.js')) {
    const content = fs.readFileSync(filepath, 'utf8');
    if (content.includes('pg') || content.includes('postgres://') || content.includes('DATABASE_URL')) {
      console.log('Found reference in:', filepath);
    }
  }
});
