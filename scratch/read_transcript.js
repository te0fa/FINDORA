const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\mosta\\.gemini\\antigravity\\brain\\ccd6d259-682a-42d3-a8e0-7d3d07d13a60\\.system_generated\\logs\\transcript.jsonl';

if (fs.existsSync(logPath)) {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  console.log(`Found ${lines.length} lines in transcript.`);
  
  // Search for the word "25" or "paths" or similar
  lines.forEach((line, idx) => {
    if (line.includes('25') || line.includes('مسار') || line.includes('role') || line.includes('bypass')) {
      try {
        const obj = JSON.parse(line);
        if (obj.type === 'USER_INPUT') {
          console.log(`--- Step ${obj.step_index} (${obj.type}) ---`);
          console.log(obj.content.substring(0, 1000));
        }
      } catch (e) {
        // Not JSON or parse error
      }
    }
  });
} else {
  console.log('Log file not found');
}
