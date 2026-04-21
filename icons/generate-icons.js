// Run with Node.js to generate icons: node generate-icons.js
// Or use any online PWA icon generator with the SVG below
const fs = require('fs');
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const svg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size*0.2}" fill="#1a237e"/>
  <text x="50%" y="55%" font-size="${size*0.55}" text-anchor="middle" dominant-baseline="middle" fill="white" font-family="Arial">🏛</text>
</svg>`;
sizes.forEach(s => fs.writeFileSync(`icon-${s}.png`, svg(s)));
console.log('Icons generated (SVG fallback - replace with real PNGs)');
