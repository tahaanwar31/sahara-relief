// node docs/gen/guide2_pdf.mjs   -> docs/gen/_g_footer.pdf (all pages with page numbers) and docs/gen/_g_nofooter.pdf (for the cover page)
// then python docs/gen/guide2_merge.py joins them (cover from the second file, the rest from the first).
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const here = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const { chromium } = require(path.join(here, '..', '..', 'web', 'node_modules', 'playwright-core'))
const html = path.join(here, 'guide2.html')
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
const p = await b.newPage()
await p.goto(pathToFileURL(html).href)
await p.emulateMedia({ media: 'print' })
const base = { format: 'A4', printBackground: true, preferCSSPageSize: true }
await p.pdf({ ...base, path: path.join(here, '_g_footer.pdf'), displayHeaderFooter: true, headerTemplate: '<span></span>',
  footerTemplate: '<div style="width:100%;font-size:8px;color:#8a7d73;padding:0 15mm;display:flex;justify-content:space-between;font-family:Segoe UI,Arial"><span>Sahara Relief: The Complete Guide &nbsp;·&nbsp; prototype with invented data</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>' })
await p.pdf({ ...base, path: path.join(here, '_g_nofooter.pdf'), displayHeaderFooter: false })
await b.close()
console.log('ok')
