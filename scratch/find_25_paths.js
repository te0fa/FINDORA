const fs = require('fs');
const path = require('path');

const rootDir = 'e:/FINDORA';

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
        searchDir(fullPath);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.md') || file.endsWith('.txt') || file.endsWith('.sql')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('25') || content.includes('٢٥')) {
        // Find line containing 25
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (line.includes('25') && (line.includes('/') || line.includes('path') || line.includes('route') || line.includes('api'))) {
            console.log(`Match in ${fullPath}:${idx + 1} - ${line.trim()}`);
          }
        });
      }
    }
  });
}

searchDir(rootDir);
