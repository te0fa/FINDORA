const fs = require('fs');
const path = require('path');

function searchFunctions(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchFunctions(fullPath);
    } else if (file.endsWith('.sql')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const matches = content.match(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(\w+\.?\w*)/gi);
      if (matches) {
        console.log(`Functions in ${file}:`);
        matches.forEach(m => console.log('  ' + m.trim()));
      }
    }
  }
}

searchFunctions('e:\\FINDORA\\supabase\\migrations');
