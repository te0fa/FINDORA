const sharp = require('sharp');
const fs = require('fs');

const inputPath = 'C:\\Users\\mosta\\.gemini\\antigravity\\brain\\889c76e8-ec4f-4989-90be-fe8e411795c9\\media__1783587992563.jpg';
const outputPath = 'e:\\FINDORA\\public\\logo-new.png';

async function processLogo() {
  try {
    console.log('Processing logo...');
    await sharp(inputPath)
      // Trim borders that are similar to the top-left pixel color
      .trim({
        background: { r: 10, g: 14, b: 23 }, // approximate dark navy color
        threshold: 30 // tolerance
      })
      // Crush blacks by modifying gamma or using a threshold
      // We can use modulate to increase contrast or use linear to crush blacks
      .linear(1.5, -40) // multiplier (contrast) and offset (brightness) -> crushes dark pixels to 0,0,0
      .toFile(outputPath);
      
    console.log('Logo processed successfully and saved to ' + outputPath);
  } catch (err) {
    console.error('Error processing logo:', err);
  }
}

processLogo();
