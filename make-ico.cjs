const Jimp = require('jimp');
const pngToIco = require('png-to-ico');
const fs = require('fs');
const path = require('path');

async function main() {
  try {
    const img = await Jimp.read('public/logo.png');
    const w = img.bitmap.width;
    const h = img.bitmap.height;
    
    // Make a square image
    const size = Math.max(w, h);
    const bg = new Jimp(size, size, 0x00000000); // transparent background
    
    bg.composite(img, (size - w) / 2, (size - h) / 2);
    
    await bg.writeAsync('public/logo-square.png');
    console.log('Created square PNG');
    
    const buf = await pngToIco('public/logo-square.png');
    fs.writeFileSync('public/logo.ico', buf);
    console.log('Created ICO');
  } catch (err) {
    console.error(err);
  }
}

main();
