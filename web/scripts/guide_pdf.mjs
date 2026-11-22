// node scripts/guide_pdf.mjs <input.html> <output.pdf>   (prints an HTML file to an A4 PDF with Chrome, with page numbers)
import { chromium } from 'playwright-core'
import { pathToFileURL } from 'node:url'
const [, , html, out] = process.argv
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
const p = await b.newPage()
await p.goto(pathToFileURL(html).href)
await p.pdf({
  path: out, format: 'A4', printBackground: true, displayHeaderFooter: true,
  headerTemplate: '<span></span>',
  footerTemplate: '<div style="width:100%;font-size:8px;color:#7B6F66;padding:0 14mm;display:flex;justify-content:space-between"><span>Sahara Relief: Complete Guide (prototype, made-up data)</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>',
  margin: { top: '16mm', bottom: '18mm', left: '14mm', right: '14mm' },
})
await b.close()
console.log('ok', out)
