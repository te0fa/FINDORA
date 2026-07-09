const sharp = require('sharp');
const potrace = require('potrace');
const fs = require('fs');

const inputPath = 'e:\\FINDORA\\public\\logo-new.png';
const binarizedPath = 'e:\\FINDORA\\scratch\\logo-binary.png';
const svgOutputPath = 'e:\\FINDORA\\scratch\\logo-traced.svg';

async function run() {
  await sharp(inputPath)
    .extractChannel('alpha')
    .negate()
    .toFile(binarizedPath);

  console.log('Binarized image created:', binarizedPath);

  const trace = new potrace.Potrace();
  trace.setParameters({
    turdSize: 5,
    alphaMax: 1.5,
    optCurve: true,
    optTolerance: 0.2,
    color: '#000000'
  });

  trace.loadImage(binarizedPath, function(err) {
    if (err) throw err;
    const svg = trace.getSVG();
    fs.writeFileSync(svgOutputPath, svg);
    console.log('SVG written to:', svgOutputPath);
  });
}

run().catch(console.error);
