const fs = require('fs');
const path = require('path');

function searchInDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
        searchInDir(fullPath);
      }
    } else {
      // search for knsjvttjkbdztxmtjxpz
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('knsjvttjkbdztxmtjxpz') && !file.endsWith('.ts') && !file.endsWith('.js') && !file.endsWith('.json') && !file.endsWith('.sql')) {
        console.log(`Found reference in file: ${fullPath}`);
      }
    }
  }
}

console.log('Searching for files with project ref...');
searchInDir('e:\\FINDORA');
