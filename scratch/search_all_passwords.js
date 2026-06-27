const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    let stat;
    try {
      stat = fs.statSync(filepath);
    } catch (e) {
      continue;
    }
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
        walk(filepath, callback);
      }
    } else {
      callback(filepath);
    }
  }
}

walk('e:/FINDORA', (filepath) => {
  if (filepath.endsWith('.json') || filepath.endsWith('.js') || filepath.endsWith('.ts') || filepath.endsWith('.txt') || filepath.endsWith('.sql') || filepath.endsWith('.md')) {
    let content;
    try {
      content = fs.readFileSync(filepath, 'utf8');
    } catch (e) {
      return;
    }
    if (content.includes('knsjvttjkbdztxmtjxpz') && (content.includes('password') || content.includes('pass') || content.includes('pwd'))) {
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('postgres.knsjvttjkbdztxmtjxpz') || line.includes('knsjvttjkbdztxmtjxpz') && (line.includes('pass') || line.includes('key'))) {
          console.log(`${filepath}:${i + 1}: ${line.trim()}`);
        }
      }
    }
  }
});
