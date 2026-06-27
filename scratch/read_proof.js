const fs = require('fs');
const path = require('path');

function readUtf16le(filename) {
  const filePath = path.join('e:/FINDORA', filename);
  if (fs.existsSync(filePath)) {
    console.log(`--- ${filename} ---`);
    const content = fs.readFileSync(filePath, 'utf16le');
    console.log(content.slice(0, 1000));
  } else {
    console.log(`${filename} does not exist.`);
  }
}

readUtf16le('verifier_output.txt');
readUtf16le('scratch/proof_output.txt');
