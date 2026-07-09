const sharp = require('sharp');
const inputPath = 'e:\\FINDORA\\public\\logo-v4.png';
const outputPath = 'e:\\FINDORA\\public\\logo-v5.png'; // New version to bypass cache

async function run() {
  try {
    // 1. Load the transparent logo
    // 2. Simply trim the transparent pixels
    await sharp(inputPath)
      .trim()
      .toFile(outputPath);
    console.log('Successfully cropped and saved to', outputPath);
  } catch (err) {
    console.error(err);
  }
}
run();
