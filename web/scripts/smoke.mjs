// End-to-end smoke test in the installed Google Chrome (no browser download), against the MOCK build.
//   npm run build:mock && npm run smoke
// citizen: log in, go through the claim steps, lose signal on the way, get it back, see the result card.
// officer: log in and see the queue.
import { preview } from 'vite'
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import assert from 'node:assert/strict'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const shots = join(root, '.smoke')
mkdirSync(shots, { recursive: true })
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

const server = await preview({ root, build: { outDir: 'dist-mock' }, preview: { port: 4199, strictPort: true, host: '127.0.0.1' } })
const base = 'http://127.0.0.1:4199/'
const browser = await chromium.launch({ executablePath: CHROME, headless: true })
// a tiny valid PNG as the "photo"
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
const photo = { name: 'paper.png', mimeType: 'image/png', buffer: png }
let failed = null

try {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, locale: 'ur-PK' })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message))
  const btn = (name) => page.getByRole('button', { name, exact: true })

  // ---------- citizen
  await page.goto(base + '#/login')
  await btn('Zainab (widow)').click()
  await page.getByTestId('step-1').waitFor()
  await page.screenshot({ path: join(shots, '01-welcome.png') })
  await btn('جی ہاں، شروع کریں').click()
  await page.getByTestId('step-2').waitFor()
  await btn('میں متفق ہوں').click()
  await page.getByTestId('step-3').waitFor()
  assert.match(await page.getByTestId('found-name').innerText(), /زینب/)
  await btn('جی ہاں').click()
  await page.getByTestId('step-4').waitFor()
  await btn('جی ہاں').click()
  await page.getByTestId('step-5').waitFor()

  // first paper online, second paper with no signal
  await page.getByTestId('file-gallery').setInputFiles(photo)
  await page.getByText('کاغذ 2 از 2').waitFor()
  await ctx.setOffline(true)
  await page.locator('[data-online="0"]').waitFor()
  await page.getByTestId('file-gallery').setInputFiles(photo)
  await page.getByText('آپ کے فون میں محفوظ ہے').first().waitFor()
  await page.getByTestId('outbox-count').waitFor()
  await page.screenshot({ path: join(shots, '02-offline-queued.png') })
  await btn('آگے').click()
  await page.getByTestId('step-6').waitFor()

  // signal returns: the waiting photo and draft are sent by themselves
  await ctx.setOffline(false)
  await page.locator('[data-online="1"]').waitFor()
  await page.getByTestId('outbox-count').waitFor({ state: 'detached', timeout: 20000 })
  await page.keyboard.type('03001234567')
  await btn('یہ اکاؤنٹ جانچیں').click()
  assert.match(await page.getByTestId('account-title').innerText(), /ZAINAB/)
  await btn('جی ہاں').click()
  await page.getByTestId('step-7').waitFor()

  // send with no signal: it waits on the phone, then goes out when signal returns
  await ctx.setOffline(true)
  await page.locator('[data-online="0"]').waitFor()
  await btn('میرا دعویٰ بھیجیں').click()
  await page.getByTestId('waiting-send').waitFor()
  await page.screenshot({ path: join(shots, '03-waiting-send.png') })
  await ctx.setOffline(false)
  const card = page.getByTestId('result-card')
  await card.waitFor({ timeout: 30000 })
  assert.equal(await card.getAttribute('data-zone'), 'HUMAN')
  assert.match(await page.getByTestId('result-reason').innerText(), /نام/)
  assert.ok(await page.getByTestId('what-next').isVisible())
  await page.screenshot({ path: join(shots, '04-result-human.png') })
  console.log('citizen flow OK (offline then online, result card HUMAN)')

  // ---------- officer
  await page.evaluate(() => { localStorage.removeItem('sahara.auth') })
  await page.goto(base + '#/login')
  await page.reload()
  await btn('Officer 1').click()
  await page.getByTestId('queue').waitFor()
  const rows = await page.getByTestId('queue-row').count()
  assert.ok(rows >= 5, 'queue has ' + rows)
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.screenshot({ path: join(shots, '05-queue.png') })
  await page.getByTestId('queue-row').first().click()
  await page.getByRole('heading', { name: 'Decision card' }).waitFor()
  await page.screenshot({ path: join(shots, '06-case.png') })
  console.log('officer queue OK (' + rows + ' cases)')
} catch (e) {
  failed = e
  console.error('SMOKE FAILED:', e.message)
} finally {
  await browser.close()
  server.httpServer.close()
}
process.exit(failed ? 1 : 0)
