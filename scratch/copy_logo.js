const fs = require('fs');
const path = require('path');

const srcFile = 'C:\\Users\\mosta\\.gemini\\antigravity\\brain\\889c76e8-ec4f-4989-90be-fe8e411795c9\\media__1783587992563.jpg';
const destFile = 'e:\\FINDORA\\public\\logo-new.png';

try {
  fs.copyFileSync(srcFile, destFile);
  console.log('Successfully copied to:', destFile);
} catch (err) {
  console.error('Error copying file:', err);
}
