const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  const oldBuffer = execSync('git show 5c52d6a:public/logo-2-processed.png');
  fs.writeFileSync('e:\\FINDORA\\public\\logo-old-backup.png', oldBuffer);
  console.log('Successfully saved original logo as logo-old-backup.png. Size:', oldBuffer.length);
} catch (err) {
  console.error('Error restoring old logo:', err);
}
