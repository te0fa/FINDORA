const sharp = require('sharp');

const inputPath = 'C:\\Users\\mosta\\.gemini\\antigravity\\brain\\889c76e8-ec4f-4989-90be-fe8e411795c9\\media__1783587992563.jpg';

async function run() {
  const image = sharp(inputPath);
  const metadata = await image.metadata();
  console.log('Image Metadata:', metadata);

  const { data, info } = await image
    .raw()
    .toBuffer({ resolveWithObject: true });

  let minX = info.width;
  let maxX = 0;
  let minY = info.height;
  let maxY = 0;

  // channels depends on the image format
  const channels = info.channels;
  console.log('Channels:', channels);

  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const idx = (y * info.width + x) * channels;
      const r = data[idx];
      const g = data[idx+1];
      const b = data[idx+2];

      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum > 40) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  console.log('Logo Bounding Box:');
  console.log(`Left: ${minX}, Right: ${maxX}, Top: ${minY}, Bottom: ${maxY}`);
  console.log(`Width: ${maxX - minX}, Height: ${maxY - minY}`);
}

run().catch(console.error);
