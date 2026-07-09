const sharp = require('sharp');

const inputPath = 'C:\\Users\\mosta\\.gemini\\antigravity\\brain\\889c76e8-ec4f-4989-90be-fe8e411795c9\\media__1783587992563.jpg';
const outputPath = 'e:\\FINDORA\\public\\logo-new.png'; // Overwrite the previous one

async function run() {
  try {
    console.log('Generating alpha mask...');
    
    // 1. Create a high-contrast alpha mask from the original image
    const mask = await sharp(inputPath)
      .greyscale()
      // We know the background is very dark (rgb ~10,14,23). Gold is bright.
      // We will multiply the brightness by a large factor and subtract an offset.
      // E.g. multiplier 3, offset -60: darks (20) * 3 - 60 = 0. brights (100) * 3 - 60 = 240.
      .linear(3, -60)
      .toBuffer();

    // 2. Apply the mask to the original image and save as transparent PNG
    await sharp(inputPath)
      .ensureAlpha() // Add alpha channel if missing
      .joinChannel(mask) // Replace alpha channel with our custom mask
      .trim({
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        threshold: 10
      })
      .toFile(outputPath);

    console.log('Successfully created fully transparent logo:', outputPath);
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
