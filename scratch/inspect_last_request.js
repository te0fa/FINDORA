const fs = require('fs');
const crypto = require('crypto');

const file1 = 'C:\\Users\\mosta\\.gemini\\antigravity\\brain\\889c76e8-ec4f-4989-90be-fe8e411795c9\\media__1783587992563.jpg';
const file2 = 'e:\\FINDORA\\public\\logo-2-processed.png';
const file3 = 'e:\\FINDORA\\public\\logo-1-processed.png';

function getMd5(filePath) {
  if (!fs.existsSync(filePath)) return 'Does not exist';
  const content = fs.readFileSync(filePath);
  const hash = crypto.createHash('md5');
  hash.update(content);
  return hash.digest('hex') + ' (' + content.length + ' bytes)';
}

console.log('File 1 (Source):', getMd5(file1));
console.log('File 2 (logo-2):', getMd5(file2));
console.log('File 3 (logo-1):', getMd5(file3));
