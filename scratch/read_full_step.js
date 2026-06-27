const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\mosta\\.gemini\\antigravity\\brain\\ccd6d259-682a-42d3-a8e0-7d3d07d13a60\\.system_generated\\logs\\transcript_full.jsonl';

if (fs.existsSync(logPath)) {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line) => {
    try {
      const obj = JSON.parse(line);
      if (obj.step_index === 128 && obj.type === 'USER_INPUT') {
        console.log(`--- Step ${obj.step_index} (${obj.type}) ---`);
        console.log(obj.content);
      }
    } catch (e) {}
  });
} else {
  console.log('Log file not found');
}
