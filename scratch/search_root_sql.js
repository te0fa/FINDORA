const fs = require('fs');
const path = require('path');

const rootDir = 'e:/FINDORA';
const files = fs.readdirSync(rootDir);

for (const file of files) {
  if (file.endsWith('.sql')) {
    const filePath = path.join(rootDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('fn_exec_sql')) {
      console.log(`Found fn_exec_sql in: ${file}`);
    }
  }
}
