const fs = require('fs');

const svgContent = fs.readFileSync('e:\\FINDORA\\scratch\\logo-traced.svg', 'utf-8');
const match = svgContent.match(/d="([^"]+)"/);

if (match && match[1]) {
  const dPath = match[1];

  const componentCode = `import React from 'react';

export default function FindoraLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 620 230"
      preserveAspectRatio="xMidYMid meet"
      {...props}
    >
      <defs>
        <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F2D06B" />
          <stop offset="35%" stopColor="#C59B3C" />
          <stop offset="50%" stopColor="#F9E29C" />
          <stop offset="80%" stopColor="#B3862A" />
          <stop offset="100%" stopColor="#E2BA55" />
        </linearGradient>
      </defs>
      <path
        d="${dPath}"
        fill="url(#gold-gradient)"
        fillRule="evenodd"
      />
    </svg>
  );
}
`;

  fs.writeFileSync('e:\\FINDORA\\src\\components\\FindoraLogo.tsx', componentCode);
  console.log('Successfully generated src/components/FindoraLogo.tsx');
} else {
  console.error('Could not extract path from SVG');
}
