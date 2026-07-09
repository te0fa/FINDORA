const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputPath = 'C:\\Users\\mosta\\.gemini\\antigravity\\brain\\889c76e8-ec4f-4989-90be-fe8e411795c9\\media__1783587992563.jpg';
const outputPath = 'e:\\FINDORA\\public\\logo-new.png';

async function run() {
  // Bounding box: Left: 213, Right: 805, Top: 255, Bottom: 460
  // Crop parameters with small padding
  const left = 200;
  const top = 240;
  const width = 620;
  const height = 230;

  // First crop the image using sharp
  const croppedBuffer = await sharp(inputPath)
    .extract({ left, top, width, height })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data, info } = croppedBuffer;

  // Create new transparent buffer
  const outBuffer = Buffer.alloc(info.width * info.height * 4);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i+1];
    const b = data[i+2];

    // Compute luminance
    const y = 0.299 * r + 0.587 * g + 0.114 * b;

    // Determine alpha transition
    let alpha = 255;
    const thresholdLow = 20;
    const thresholdHigh = 45;

    if (y < thresholdLow) {
      alpha = 0;
    } else if (y < thresholdHigh) {
      alpha = Math.round(((y - thresholdLow) / (thresholdHigh - thresholdLow)) * 255);
    }

    // Keep gold pixels opaque and crisp
    const isGold = r > 65 && g > 45 && r > b * 1.15;
    if (isGold) {
      alpha = Math.max(alpha, 255);
    }

    outBuffer[i] = r;
    outBuffer[i+1] = g;
    outBuffer[i+2] = b;
    outBuffer[i+3] = alpha;
  }

  // Save the new image as PNG with transparency
  await sharp(outBuffer, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4
    }
  })
  .png()
  .toFile(outputPath);

  // Overwrite other files in public folder
  fs.copyFileSync(outputPath, 'e:\\FINDORA\\public\\logo-1-processed.png');
  fs.copyFileSync(outputPath, 'e:\\FINDORA\\public\\logo-2-processed.png');

  console.log('Successfully cropped and generated transparent PNG logos!');
}

run().catch(console.error);
