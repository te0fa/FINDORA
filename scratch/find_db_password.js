const fs = require('fs');
const path = require('path');

const scratchDir = 'e:/FINDORA/scratch';
const files = fs.readdirSync(scratchDir);

for (const file of files) {
  if (file.endsWith('.js') || file.endsWith('.ts')) {
    const filePath = path.join(scratchDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('password') || content.includes('postgresql://') || content.includes('Client')) {
      // Find lines that might contain passwords
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('password:') || line.includes('password =') || line.includes('postgresql://') || line.includes('const key =')) {
          console.log(`${file}:${i + 1}: ${line.trim()}`);
        }
      }
    }
  }
}
