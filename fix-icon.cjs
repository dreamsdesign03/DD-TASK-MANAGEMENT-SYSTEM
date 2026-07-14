// Generates a valid ICO file directly from PNG using Jimp
// ICO format: 6-byte header + N*16-byte entries + N PNG/BMP data blobs
const Jimp = require('jimp')
const fs = require('fs')
const path = require('path')

const pngPath = path.join(__dirname, 'public', 'logo-square.png')
const outPath = path.join(__dirname, 'public', 'logo.ico')

async function buildIco() {
  const sizes = [256, 128, 64, 48, 32, 16]
  const pngChunks = []

  for (const size of sizes) {
    const img = await Jimp.read(pngPath)
    img.resize(size, size)
    const buf = await img.getBufferAsync(Jimp.MIME_PNG)
    pngChunks.push({ size, buf })
    console.log(`  Processed ${size}x${size} (${buf.length} bytes)`)
  }

  const count = pngChunks.length
  // ICO header: 6 bytes
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)     // reserved
  header.writeUInt16LE(1, 2)     // type: 1 = ICO
  header.writeUInt16LE(count, 4) // image count

  // Directory: 16 bytes per image
  const dirSize = count * 16
  const dir = Buffer.alloc(dirSize)
  let dataOffset = 6 + dirSize

  for (let i = 0; i < count; i++) {
    const { size, buf } = pngChunks[i]
    const w = size === 256 ? 0 : size  // 256 is stored as 0 in ICO
    const h = size === 256 ? 0 : size
    dir.writeUInt8(w, i * 16 + 0)
    dir.writeUInt8(h, i * 16 + 1)
    dir.writeUInt8(0, i * 16 + 2)     // color count
    dir.writeUInt8(0, i * 16 + 3)     // reserved
    dir.writeUInt16LE(1, i * 16 + 4)  // planes
    dir.writeUInt16LE(32, i * 16 + 6) // bit count
    dir.writeUInt32LE(buf.length, i * 16 + 8)   // data size
    dir.writeUInt32LE(dataOffset, i * 16 + 12)  // data offset
    dataOffset += buf.length
  }

  const ico = Buffer.concat([header, dir, ...pngChunks.map(c => c.buf)])
  fs.writeFileSync(outPath, ico)
  console.log('✅ ICO written:', outPath)
  console.log('   Size:', ico.length, 'bytes | Magic:', ico.slice(0, 4).toString('hex'), '(should be 00000100)')
}

buildIco().catch(e => { console.error('❌', e.message); process.exit(1) })
