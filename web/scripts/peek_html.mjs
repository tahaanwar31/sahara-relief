// node scripts/peek_html.mjs <file.html> <out.png> [height]  : screenshot the top of an HTML file as it prints
import { chromium } from 'playwright-core'
import { pathToFileURL } from 'node:url'
const [, , html, out, h = '2400'] = process.argv
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
const p = await b.newPage({ viewport: { width: 794, height: 1123 } })
await p.emulateMedia({ media: 'print' })
await p.goto(pathToFileURL(html).href)
await p.screenshot({ path: out, clip: { x: 0, y: 0, width: 794, height: +h }, fullPage: true })
await b.close()
