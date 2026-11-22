// Writes simple PNG app icons (no image library needed). Run once: npm run icons
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const c = Buffer.alloc(4)
  c.writeUInt32BE(crc(td))
  return Buffer.concat([len, td, c])
}

function png(size, maskable) {
  const bg = [14, 107, 99]
  const fg = [255, 255, 255]
  const stride = size * 4 + 1
  const raw = Buffer.alloc(stride * size)
  const c = size / 2
  const scale = maskable ? 0.7 : 1
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0
    for (let x = 0; x < size; x++) {
      const dx = (x - c) / c / scale
      const dy = (y - c) / c / scale
      const r = Math.hypot(dx, dy)
      // a white ring with a solid dot in the middle
      const on = (r > 0.52 && r < 0.68) || r < 0.22
      const col = on ? fg : bg
      const i = y * stride + 1 + x * 4
      raw[i] = col[0]
      raw[i + 1] = col[1]
      raw[i + 2] = col[2]
      raw[i + 3] = 255
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons')
mkdirSync(out, { recursive: true })
writeFileSync(join(out, 'icon-192.png'), png(192, false))
writeFileSync(join(out, 'icon-512.png'), png(512, false))
writeFileSync(join(out, 'icon-maskable-512.png'), png(512, true))
console.log('icons written')
