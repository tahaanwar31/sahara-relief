// Turns manual.md into a PDF with a cover, a table of contents and page numbers.
//   node docs/gen/to_pdf.js
const fs = require('fs')
const path = require('path')
const MARKED = 'C:/Users/Talha/AppData/Local/Temp/claude/274f08e754d8c322/d41ea943-f152-4619-9238-722148e937bc/scratchpad/pdfbuild/node_modules/marked'
const { marked } = require(MARKED)
const { chromium } = require(path.join(__dirname, '..', '..', 'web', 'node_modules', 'playwright-core'))

const md = fs.readFileSync(path.join(__dirname, process.env.SRC || 'manual.md'), 'utf8')
const toc = []
const slug = (s) => s.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const used = new Set()
const renderer = new marked.Renderer()
renderer.heading = function (a, b) {
  // works with both old (text, level) and new ({text, depth}) marked versions
  const text = typeof a === 'object' ? a.text : a
  const depth = typeof a === 'object' ? a.depth : b
  const html = typeof a === 'object' && this.parser ? this.parser.parseInline(a.tokens) : text
  let id = slug(text) || 'x'
  while (used.has(id)) id += '-2'
  used.add(id)
  if (depth <= 2) toc.push({ depth, text: html.replace(/<[^>]+>/g, ''), id })
  return `<h${depth} id="${id}">${html}</h${depth}>\n`
}
marked.use({ renderer, gfm: true })
let body = marked.parse(md)

const tocHtml = '<div class="pagebreak"></div><h1 class="toc-title" style="border:none">Contents</h1><div class="toc">' +
  toc.filter((t) => !/^(sahara-relief-platform|the-complete-instruction-manual|how-to-read-this-manual)$/.test(t.id))
    .map((t) => `<div class="toc${t.depth}"><a href="#${t.id}">${t.text}</a></div>`).join('') + '</div>'
// put the contents right after the cover (before the first pagebreak after the cover)
body = body.replace('<div class="pagebreak"></div>', () => tocHtml + '\n<div class="pagebreak"></div>')

const css = `
@page { size: A4; margin: 16mm 14mm 18mm 14mm; }
* { box-sizing: border-box; }
body { font-family: "Segoe UI", Arial, "Noto Naskh Arabic", sans-serif; font-size: 10pt; line-height: 1.5; color: #14211f; }
.pagebreak { page-break-after: always; }
.cover { text-align: center; padding: 70mm 10mm 0; }
.cover h1 { font-size: 34pt; color: #0b4f4a; border: none; margin: 0; }
.cover h2 { font-size: 20pt; color: #c8963e; border: none; margin: 6px 0 24px; }
.cover p { font-size: 11.5pt; }
h1 { font-size: 21pt; color: #0b4f4a; border-bottom: 3px solid #0f6f66; padding-bottom: 6px; margin-top: 8px; page-break-after: avoid; }
h2 { font-size: 15pt; color: #0b4f4a; margin-top: 24px; border-bottom: 1px solid #cfdad7; padding-bottom: 3px; page-break-after: avoid; }
h3 { font-size: 11.8pt; color: #17312f; margin-top: 16px; page-break-after: avoid; }
a { color: #0f6f66; text-decoration: none; }
table { border-collapse: collapse; width: 100%; margin: 10px 0; font-size: 8.3pt; }
tr { page-break-inside: avoid; }
th { background: #0f6f66; color: #fff; text-align: left; }
th, td { border: 1px solid #c6d3d0; padding: 3.5px 6px; vertical-align: top; word-break: break-word; }
tr:nth-child(even) td { background: #f4f8f7; }
code { background: #eaf1ef; padding: 1px 4px; border-radius: 3px; font-size: 8.4pt; word-break: break-word; }
pre { background: #eaf1ef; padding: 8px; white-space: pre-wrap; font-size: 8.2pt; page-break-inside: avoid; }
pre code { background: none; padding: 0; }
blockquote { border-left: 4px solid #0f6f66; margin: 8px 0; padding: 4px 12px; background: #f4f8f7; }
hr { border: none; border-top: 1px solid #cfdad7; margin: 18px 0; }
li { margin: 2px 0; }
svg { page-break-inside: avoid; }
.toc div { padding: 2px 0; }
.toc1 { font-weight: 700; margin-top: 8px; font-size: 10.5pt; }
.toc2 { margin-left: 16px; font-size: 9.5pt; }
`
const html = `<!doctype html><html><head><meta charset="utf-8"><title>Sahara Relief: Instruction Manual</title><style>${css}</style></head><body>${body}</body></html>`
const out = path.join(__dirname, '..', process.env.OUT || 'Sahara_Relief_Instruction_Manual.pdf')
fs.writeFileSync(path.join(__dirname, process.env.HTML || 'manual.html'), html, 'utf8')

;(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
  const p = await b.newPage()
  await p.goto('file:///' + path.join(__dirname, process.env.HTML || 'manual.html').replace(/\\/g, '/'))
  await p.pdf({
    path: out, format: 'A4', printBackground: true, displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: '<div style="width:100%;font-size:8px;color:#5f6e6c;padding:0 14mm;display:flex;justify-content:space-between"><span>Sahara Relief: ' + (process.env.TITLE || 'Instruction Manual') + ' (prototype, made-up data)</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>',
    margin: { top: '16mm', bottom: '18mm', left: '14mm', right: '14mm' },
  })
  await b.close()
  console.log('wrote', out, fs.statSync(out).size, 'bytes')
})()
