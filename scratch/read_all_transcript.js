const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\mosta\\.gemini\\antigravity\\brain\\ccd6d259-682a-42d3-a8e0-7d3d07d13a60\\.system_generated\\logs\\transcript_full.jsonl';

if (fs.existsSync(logPath)) {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line) => {
    try {
      const obj = JSON.parse(line);
      // Look for "25" in both user and model messages
      if (line.includes('25') || line.includes('مسار') || line.includes('role')) {
        console.log(`Step ${obj.step_index} (${obj.type}, ${obj.source}):`);
        // If content has "25" or lists paths, output a snippet
        const contentStr = obj.content || '';
        if (contentStr.includes('25') && (contentStr.includes('api') || contentStr.includes('route'))) {
          console.log(`  MATCH: ${contentStr.substring(contentStr.indexOf('25') - 50, contentStr.indexOf('25') + 150)}`);
        }
      }
    } catch (e) {}
  });
} else {
  console.log('Log file not found');
}
