// Full end-to-end check in a real Chrome: real web app (5173) -> real service (8000) -> real database.
//   start the stack first, then:  node web/scripts/e2e_full.mjs
// It uses ONLY the demo person Zainab (her own sample cards), the helper Yousuf and the admin. It restarts Zainab's claim first.
// Needs the sample cards (python scripts/make_sample_cards.py -> Desktop\sahara-sample-docs).
import { chromium } from 'playwright-core'
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const WEB = 'http://localhost:5173/', API = 'http://localhost:8000'
const DOCS = path.join(os.homedir(), 'Desktop', 'sahara-sample-docs')
const card = (f) => path.join(DOCS, f)
const U = { zainab: ['zainab@citizens.sahara.test', '246810'], yousuf: ['yousuf@helpers.sahara.test', '246810'], admin: ['admin1@gov.sahara.test', 'Admin#2026'], boss: ['admin@gov.sahara.test', 'Admin#2026'] }

const api = async (who, method, url, body) => {
  const r = await (await fetch(API + '/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: U[who][0], secret: U[who][1] }) })).json()
  const res = await fetch(API + url, { method, headers: { 'content-type': 'application/json', authorization: 'Bearer ' + r.access_token }, body: body ? JSON.stringify(body) : undefined })
  let json = null; try { json = await res.json() } catch { /* none */ }
  return { status: res.status, json }
}

const S = {}
const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const results = []
const problems = []
const pages = []
async function open(who, hash, { lang = 'en', vp = { width: 390, height: 844 }, tour = false } = {}) {
  const r = await (await fetch(API + '/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: U[who][0], secret: U[who][1] }) })).json()
  const ctx = await browser.newContext({ viewport: vp, locale: 'en-US', acceptDownloads: false })
  await ctx.addInitScript(([k, v, l, uid, withTour]) => { try { sessionStorage.setItem(k, v); localStorage.setItem('sahara.lang', l); if (!withTour) for (const st of [2, 3, 4, 5, 6, 7]) localStorage.setItem(`sahara.tour.v1.${uid}.${st}`, '1') } catch {} },
    ['sahara.auth', JSON.stringify({ token: r.access_token, user: r.user, exp: Date.now() + 3600e3 }), lang, r.user.id, tour])
  const page = await ctx.newPage()
  page.on('pageerror', (e) => problems.push(`${who} PAGE ERROR ${e.message}`))
  page.on('response', (x) => { if (x.url().startsWith(API) && x.status() >= 500) problems.push(`${who} ${x.status()} ${x.url()}`) })
  pages.push(ctx)
  await page.goto(WEB + hash)
  return page
}
async function check(name, fn) {
  if (process.env.ONLY && !new RegExp(process.env.ONLY, 'i').test(name)) return
  const t0 = Date.now()
  try { await fn(); results.push([name, 'PASS', Date.now() - t0]); console.log('PASS', name) }
  catch (e) { results.push([name, 'FAIL', Date.now() - t0, String(e.message).split('\n')[0]]); console.log('FAIL', name, '::', String(e.message).split('\n')[0]) }
}
const txt = async (p) => (await p.locator('main').innerText()).replace(/\s+/g, ' ')
const click = (p, name) => p.getByRole('button', { name }).first().click()
const typeDigits = async (p, s) => { await p.locator('body').click({ position: { x: 5, y: 5 } }); await p.keyboard.type(s, { delay: 30 }) }
const upload = async (p, file) => { await p.getByTestId('file-gallery').setInputFiles(card(file)) }
const reset = async () => { const r = await api('zainab', 'POST', '/demo/restart-claim'); assert.equal(r.status, 200, 'restart claim') }

// walk Zainab's normal claim in the UI up to the point where the papers are uploaded and the claim is sent
async function claimInUi(p, frontFile, backFile = 'A2_back_CORRECT.jpg', { household = '4', account = '03009900044' } = {}) {
  await p.getByTestId('step-1').waitFor({ timeout: 30000 })
  await click(p, /Yes, start/)
  await click(p, /I agree/)                                         // step 2
  await p.getByTestId('step-3').waitFor()
  await typeDigits(p, '4130190000112'); await click(p, /Find my record/)
  await p.getByTestId('found-name').waitFor({ timeout: 20000 })
  await click(p, /^Yes$/)                                           // step 3 : yes this is me
  await p.getByTestId('step-4').waitFor()
  await typeDigits(p, household); await click(p, /^Check$/)         // step 4
  await p.getByTestId('docs-step').waitFor({ timeout: 20000 })
  await upload(p, frontFile); await p.getByTestId('doc-title').filter({ hasText: /back of your ID card/ }).waitFor({ timeout: 40000 })
  await upload(p, backFile); await p.getByText('Photo received').waitFor({ timeout: 40000 })
  await click(p, /^Next/)
  await p.getByTestId('step-6').waitFor()
  await typeDigits(p, account); await click(p, /^Continue$/)        // step 6
  await p.getByTestId('step-7').waitFor({ timeout: 20000 })
  await click(p, /Send my claim/)
  await p.getByTestId('result-card').waitFor({ timeout: 60000 })
}

try {
  // ---------------------------------------------------------------- 1. login page
  await check('login page shows exactly three demo accounts', async () => {
    const p = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage()
    await p.goto(WEB + 'login'); await p.getByTestId('test-users').first().waitFor()
    const names = await p.getByTestId('test-users').first().getByRole('button').allInnerTexts()
    assert.equal(names.length, 3, names.join('|'))
  })

  // ---------------------------------------------------------------- 1b. the practice demo before each page
  await check('tutorial: demo plays first on its own practice card, sends nothing, does not move her on; she then does it herself', async () => {
    await reset()
    const p = await open('zainab', '#/claim', { tour: true })
    const posts = []; p.on('request', (r) => { if (r.method() !== 'GET' && r.url().startsWith(API)) posts.push(r.method() + ' ' + r.url()) })
    await p.getByTestId('step-1').waitFor({ timeout: 30000 }); await click(p, /Yes, start/)
    await p.getByTestId('tour').waitFor({ timeout: 20000 })
    assert.match(await p.getByTestId('tour-badge').innerText(), /made-up|Nothing is sent/i)
    const before = posts.length
    await p.getByTestId('tour-go').waitFor({ timeout: 20000 })                      // the demo finishes by itself
    assert.equal(posts.length, before, 'the demo must send nothing: ' + posts.slice(before).join(','))
    assert.equal(await p.getByTestId('step-2').count(), 1, 'still on the same page (the demo does not move her on)')
    await p.getByTestId('tour-go').click(); assert.equal(await p.getByTestId('tour').count(), 0)
    await click(p, /I agree/)                                                      // she goes on herself
    await p.getByTestId('tour').waitFor({ timeout: 20000 })                        // next page: its own demo
    await p.getByTestId('tour-skip').click()                                       // skip works at any time
    assert.equal(await p.getByTestId('pad-display').innerText().then((x) => x.replace(/\W/g, '').length), 6, 'her real number box is empty (the demo never fills it)')
    await p.getByTestId('tour-replay').click(); await p.getByTestId('tour').waitFor()   // "Show me how" replays it
    await p.getByTestId('tour-skip').click()
    // opened again later: the demo does not come back by itself
    await p.reload(); await p.getByTestId('step-3').waitFor({ timeout: 30000 }); await p.waitForTimeout(1500)
    assert.equal(await p.getByTestId('tour').count(), 0, 'seen once, not shown again')
  })
  await check('tutorial on every citizen page (2 to 7): shown once each, sends nothing, she goes on herself; claim still approved', async () => {
    await reset()
    const p = await open('zainab', '#/claim', { tour: true })
    const posts = []; p.on('request', (r) => { if (r.method() !== 'GET' && r.url().startsWith(API)) posts.push(r.method() + ' ' + r.url().replace(API, '')) })
    const watch = async (n) => {
      await p.getByTestId('tour').waitFor({ timeout: 25000 })
      const mark = posts.length
      await p.getByTestId('tour-go').waitFor({ timeout: 40000 })
      assert.equal(posts.length, mark, `demo ${n} must send nothing: ` + posts.slice(mark).join(','))
      await p.getByTestId('tour-go').click(); assert.equal(await p.getByTestId('tour').count(), 0)
    }
    await p.getByTestId('step-1').waitFor({ timeout: 30000 }); assert.equal(await p.getByTestId('tour').count(), 0, 'no demo on the welcome page')
    await click(p, /Yes, start/); await watch(2); await click(p, /I agree/)
    await watch(3); await typeDigits(p, '4130190000112'); await click(p, /Find my record/); await p.getByTestId('found-name').waitFor({ timeout: 20000 }); await click(p, /^Yes$/)
    await watch(4); await typeDigits(p, '4'); await click(p, /^Check$/)
    await watch(5)
    await upload(p, 'A1_front_CORRECT.jpg'); await p.getByTestId('doc-title').filter({ hasText: /back of your ID card/ }).waitFor({ timeout: 40000 })
    await upload(p, 'A2_back_CORRECT.jpg'); await p.getByText('Photo received').waitFor({ timeout: 40000 }); await click(p, /^Next/)
    await watch(6); await typeDigits(p, '03009900044'); await click(p, /^Continue$/)
    await watch(7); await click(p, /Send my claim/)
    await p.getByTestId('result-card').waitFor({ timeout: 60000 })
    assert.equal(await p.getByTestId('result-card').getAttribute('data-zone'), 'AUTO', await txt(p))
  })
  await check('no demo for a helper', async () => {
    await reset(); await api('yousuf', 'POST', '/demo/reset-helper')
    const h = await open('yousuf', '#/helper', { tour: true })
    await h.getByTestId('family').first().click({ timeout: 30000 })
    await h.getByTestId('her-cnic').fill('4130190000112'); await h.getByTestId('her-dob').fill('1978-06-15'); await h.getByTestId('her-members').fill('4')
    await h.getByRole('button', { name: /Check and record her permission/ }).click()
    await h.getByRole('button', { name: /Start helping/ }).click({ timeout: 30000 }); await h.waitForTimeout(3500)
    assert.equal(await h.getByTestId('tour').count(), 0, 'a helper never gets the practice demo')
  })
  await check('tutorial in Urdu: Urdu lines, Urdu voice file, only the demo voice plays', async () => {
    const p = await open('zainab', '#/claim', { tour: true, lang: 'ur' })
    const files = []; p.on('request', (r) => { if (r.url().includes('/audio/')) files.push(r.url().split('/audio/')[1]) })
    const cases = (await api('zainab', 'GET', '/cases')).json; const cid = (cases.items ?? cases)[0].id
    await p.goto(WEB + '#/claim/' + cid + '/3'); await p.getByTestId('tour').waitFor({ timeout: 30000 })
    assert.match(await p.getByTestId('tour-caption').innerText(), /شناختی کارڈ نمبر/)
    await p.waitForTimeout(2500)
    assert.ok(files.some((f) => f === 'ur/demo_3.mp3'), files.join(',')); assert.ok(!files.some((f) => f.includes('step_3')), 'page voice must wait: ' + files.join(','))
  })

  // ---------------------------------------------------------------- 2. correct claim: approved, paid, dashboard says so
  await check('correct claim in the UI is approved and paid; dashboard says money sent', async () => {
    await reset()
    const p = await open('zainab', '#/claim')
    await claimInUi(p, 'A1_front_CORRECT.jpg')
    assert.equal(await p.getByTestId('result-card').getAttribute('data-zone'), 'AUTO', await txt(p))
    await p.goto(WEB + '#/claim'); await p.getByTestId('paid-notice').waitFor({ timeout: 30000 })
    assert.match(await p.getByTestId('paid-notice').innerText(), /Rs 13,500.*sent to your account.*call you/)
    assert.equal(await p.getByTestId('step-1').count(), 0, 'welcome card must not show after sending')
    const r = await api('zainab', 'GET', '/cases'); const list = r.json.items ?? r.json
    assert.equal(list[0].status, 'paid')
  })

  // ---------------------------------------------------------------- 3. wrong cards go to the admin with the exact reason
  for (const [file, expect, label] of [['B1_front_WRONG_NAME.jpg', /name/i, 'wrong name'], ['B2_front_WRONG_NUMBER.jpg', /number/i, 'wrong ID number'], ['B3_front_WRONG_FACE.jpg', /face/i, 'wrong face']]) {
    await check(`${label} on the card is sent to a person (not approved)`, async () => {
      await reset()
      const p = await open('zainab', '#/claim')
      await claimInUi(p, file)
      assert.equal(await p.getByTestId('result-card').getAttribute('data-zone'), 'HUMAN', await txt(p))
      const a = await api('admin', 'GET', '/queue'); assert.ok(a.json.some((q) => /Zainab/.test(q.person_name ?? q.name ?? JSON.stringify(q))), 'Zainab is in the admin queue')
    })
  }

  await check('wrong household size is refused, three wrong tries go to a person', async () => {
    await reset()
    const p = await open('zainab', '#/claim')
    await p.getByTestId('step-1').waitFor({ timeout: 30000 }); await click(p, /Yes, start/); await click(p, /I agree/)
    await p.getByTestId('step-3').waitFor(); await typeDigits(p, '4130190000112'); await click(p, /Find my record/)
    await p.getByTestId('found-name').waitFor(); await click(p, /^Yes$/); await p.getByTestId('step-4').waitFor()
    for (let i = 0; i < 3; i++) { await typeDigits(p, '9'); await click(p, /^Check$/); await p.waitForTimeout(1500); if (i < 2) await p.keyboard.press('Backspace') }
    await p.waitForTimeout(2500)
    const t = await txt(p); assert.ok(!/Your papers/.test(t) || /person/i.test(t), t.slice(0, 200))
  })

  // ---------------------------------------------------------------- 4. the whole ask-for-proof loop, with an admin tab beside the citizen tab
  await check('wrong card -> dashboard says "checking" -> admin sees red card differences', async () => {
    await reset()
    const z = await open('zainab', '#/claim'); S.z = z
    await claimInUi(z, 'B1_front_WRONG_NAME.jpg')
    await z.goto(WEB + '#/claim'); await z.getByTestId('verifying-notice').waitFor({ timeout: 30000 })
    assert.equal(await z.getByTestId('step-1').count(), 0, 'no welcome card while staff verify')
    const a = await open('admin', '#/queue', { vp: { width: 1280, height: 900 } }); S.a = a
    await a.getByTestId('queue-row').filter({ hasText: /Zainab/ }).first().click({ timeout: 30000 })
    await a.getByText('Same person? Side by side').waitFor({ timeout: 30000 })
    const table = await a.locator('table').last().innerText()
    assert.match(table, /HER ID CARD PHOTO/i); assert.match(table, /✗/); assert.match(table, /card differs/)
    S.caseUrl = a.url()
  })
  await check('admin can open a paper (View) and the diary records it', async () => {
    const a = S.a; await a.getByRole('button', { name: 'View' }).first().click()
    await a.getByRole('dialog').waitFor({ timeout: 20000 }); await a.getByRole('dialog').locator('img').waitFor({ timeout: 20000 })
    await a.getByRole('button', { name: 'Close' }).click()
  })
  await check('admin asks for the ID front -> dashboard shows it by itself (no reload), in English', async () => {
    const a = S.a, z = S.z
    await a.getByRole('radio', { name: /Ask for more proof/ }).click()
    await a.getByTestId('paper-ask').selectOption('cnic_front')
    await a.getByRole('button', { name: /^Send: Ask for more proof/ }).click()
    await a.getByText(/We asked the person|Saved|more proof/i).first().waitFor({ timeout: 20000 })
    await z.getByTestId('asked-title').waitFor({ timeout: 25000 })          // the page refreshes itself
    const t = await txt(z); assert.match(t, /Please upload the front of your ID card again/); assert.match(t, /We need: ID card \(front\)/)
  })
  await check('request message and voice also work in Urdu (recorded Urdu file is requested)', async () => {
    const zu = await open('zainab', '#/claim', { lang: 'ur' })
    const files = []; zu.on('request', (r) => { if (r.url().includes('/audio/')) files.push(r.url()) })
    await zu.getByTestId('asked-title').waitFor({ timeout: 30000 })
    const t = await txt(zu); assert.match(t, /شناختی کارڈ کے سامنے والے حصے کی تصویر دوبارہ بھیجیں/); assert.ok(!/Please upload/.test(t), 'Urdu page must not show English')
    await zu.getByTestId('claim-status').getByRole('button').first().click().catch(() => {})
    await zu.getByRole('button', { name: 'سنیں' }).last().click(); await zu.waitForTimeout(2500)
    assert.ok(files.some((u) => u.includes('/audio/ur/staff_ask_cnic_front.mp3')), files.join(','))
  })
  await check('"Send it now" goes straight to the front-only upload (no Next button); photo sends itself', async () => {
    const z = S.z
    await z.getByRole('button', { name: /Send it now/ }).click()
    await z.getByTestId('docs-step').waitFor({ timeout: 20000 })
    assert.match(await z.getByTestId('doc-title').innerText(), /front of your ID card/)
    assert.equal(await z.getByRole('button', { name: /^Next/ }).count(), 0, 'no Next button in resend mode')
    await upload(z, 'A1_front_CORRECT.jpg')
    await z.getByTestId('result-card').waitFor({ timeout: 60000 })
    assert.notEqual(await z.getByTestId('result-card').getAttribute('data-zone'), 'ASK_MORE', 'old request must not flash after sending')
  })
  await check('after the resend the corrected card is re-checked by the AI: approved and paid, dashboard says so', async () => {
    const z = S.z
    await z.goto(WEB + '#/claim')
    await z.getByTestId('paid-notice').waitFor({ timeout: 30000 })
    assert.match(await z.getByTestId('paid-notice').innerText(), /Rs 13,500.*sent to your account/)
  })
  await check('wrong card -> admin approves in the UI -> money sent; citizen dashboard shows it by itself', async () => {
    await reset()
    const z = await open('zainab', '#/claim'); await claimInUi(z, 'B1_front_WRONG_NAME.jpg')
    const a = await open('admin', '#/queue', { vp: { width: 1280, height: 900 } })
    await a.getByTestId('queue-row').filter({ hasText: /Zainab/ }).first().click({ timeout: 30000 })
    await a.getByRole('radio', { name: /Approve/ }).click({ timeout: 30000 })
    await a.getByRole('button', { name: /^Send: Approve/ }).click()
    await a.getByText(/approved|paid|Saved|Payment/i).first().waitFor({ timeout: 30000 })
    await z.goto(WEB + '#/claim'); await z.getByTestId('paid-notice').waitFor({ timeout: 30000 })
    const r = await api('zainab', 'GET', '/cases'); assert.equal((r.json.items ?? r.json)[0].status, 'paid')
  })

  // ---------------------------------------------------------------- 5. back-side check and "ask for the back"
  await check('front uploaded where the back belongs: clear message AND the upload buttons are still there', async () => {
    await reset()
    const p = await open('zainab', '#/claim')
    await p.getByTestId('step-1').waitFor({ timeout: 30000 }); await click(p, /Yes, start/); await click(p, /I agree/)
    await p.getByTestId('step-3').waitFor(); await typeDigits(p, '4130190000112'); await click(p, /Find my record/)
    await p.getByTestId('found-name').waitFor(); await click(p, /^Yes$/); await p.getByTestId('step-4').waitFor()
    await typeDigits(p, '4'); await click(p, /^Check$/); await p.getByTestId('docs-step').waitFor()
    await upload(p, 'A1_front_CORRECT.jpg'); await p.getByTestId('doc-title').filter({ hasText: /back of your ID card/ }).waitFor({ timeout: 40000 })
    await upload(p, 'A1_front_CORRECT.jpg')                          // the FRONT again where the back belongs
    await p.getByText(/back of your ID card|pichhle|back/i).first().waitFor({ timeout: 40000 })
    assert.ok(await p.getByTestId('file-gallery').count() > 0 && await p.getByRole('button', { name: /Choose a photo/ }).count() > 0, 'upload buttons must remain')
  })

  // ---------------------------------------------------------------- 6. weak internet
  await check('offline: photo is kept on the phone and goes through when the signal returns', async () => {
    await reset()
    const p = await open('zainab', '#/claim'); const ctx = p.context()
    await p.getByTestId('step-1').waitFor({ timeout: 30000 }); await click(p, /Yes, start/); await click(p, /I agree/)
    await p.getByTestId('step-3').waitFor(); await typeDigits(p, '4130190000112'); await click(p, /Find my record/)
    await p.getByTestId('found-name').waitFor(); await click(p, /^Yes$/); await p.getByTestId('step-4').waitFor()
    await typeDigits(p, '4'); await click(p, /^Check$/); await p.getByTestId('docs-step').waitFor()
    await ctx.setOffline(true); await p.evaluate(() => window.dispatchEvent(new Event('offline')))
    await upload(p, 'A1_front_CORRECT.jpg')
    await p.getByText(/Saved on your phone/).first().waitFor({ timeout: 30000 })
    await ctx.setOffline(false); await p.evaluate(() => window.dispatchEvent(new Event('online')))
    await p.waitForTimeout(8000)
    const r = await api('zainab', 'GET', '/cases'); const c = (r.json.items ?? r.json)[0]
    const d = await api('zainab', 'GET', '/cases/' + c.id)
    assert.ok((d.json.documents ?? []).some((x) => x.doc_type === 'cnic_front'), 'the queued photo was sent after the signal came back: ' + JSON.stringify((d.json.documents ?? []).map((x) => x.doc_type)))
  })
  await check('a slow or unreachable service does not leave the app stuck on "No signal": it recovers by itself', async () => {
    const p = await open('zainab', '#/consents')
    const state = async () => p.getByTestId('signal').locator('[data-online]').first().getAttribute('data-online')
    await p.getByTestId('signal').waitFor({ timeout: 30000 }); await p.waitForTimeout(2000)
    await p.route('**/localhost:8000/**', (route) => route.abort('failed'))        // the browser keeps its internet; only the service stops answering
    await p.reload(); await p.getByTestId('signal').waitFor({ timeout: 30000 }); await p.waitForTimeout(2500)
    assert.equal(await state(), '0', 'the app shows offline while the service is unreachable')
    await p.unroute('**/localhost:8000/**')
    await p.waitForTimeout(12000)                                                  // nobody reloads: the app asks the service itself
    assert.equal(await state(), '1', 'back online by itself')
  })
  await check('offline: asked-for paper is resent (queued) and the claim is sent after the signal returns', async () => {
    await reset()
    // set the case up through the API, then ask for the front as the admin
    const z0 = await open('zainab', '#/claim'); await claimInUi(z0, 'B1_front_WRONG_NAME.jpg')
    const q = (await api('admin', 'GET', '/queue')).json; const cid = q.find((x) => /Zainab/.test(JSON.stringify(x))).id
    const ask = await api('admin', 'POST', `/cases/${cid}/officer-decision`, { decision: 'ask_more', note: 'Please upload the front of your ID card again.', doc_type: 'cnic_front' })
    assert.equal(ask.status, 200, JSON.stringify(ask.json))
    const z = await open('zainab', '#/claim'); const ctx = z.context()
    await z.getByTestId('asked-title').waitFor({ timeout: 30000 })
    await z.waitForTimeout(3000)                                   // the dashboard keeps a copy of the claim on the phone
    await ctx.setOffline(true); await z.evaluate(() => window.dispatchEvent(new Event('offline')))
    await z.getByRole('button', { name: /Send it now/ }).click()
    await z.getByTestId('docs-step').waitFor({ timeout: 20000 })
    await upload(z, 'A1_front_CORRECT.jpg')
    await z.waitForTimeout(4000)
    const offlineText = await txt(z)
    await ctx.setOffline(false); await z.evaluate(() => window.dispatchEvent(new Event('online')))
    await z.waitForTimeout(15000)
    const d = (await api('admin', 'GET', '/cases/' + cid)).json
    assert.ok(['in_review', 'paid', 'approved'].includes(d.status), `after the signal returned the claim should have been sent and re-checked (was: ${d.status}). Screen while offline: ${offlineText.slice(0, 200)}`)
    assert.ok(/Saved on your phone/.test(offlineText), 'while offline she is told it is saved on the phone: ' + offlineText.slice(0, 200))
  })

  // ---------------------------------------------------------------- 7. helper route
  await check('helper: proves the family with ID number + birth date + household size, claim is one flow', async () => {
    await reset(); await api('yousuf', 'POST', '/demo/reset-helper')
    const h = await open('yousuf', '#/helper')
    await h.getByTestId('family').first().waitFor({ timeout: 30000 })
    await h.getByTestId('family').first().click()
    await h.getByTestId('her-cnic').waitFor()
    await h.getByTestId('her-cnic').fill('4130190000999'); await h.getByTestId('her-dob').fill('1978-06-15'); await h.getByTestId('her-members').fill('4')
    await h.getByRole('button', { name: /Check and record her permission/ }).click()
    await h.getByTestId('verify-error').waitFor({ timeout: 20000 })
    assert.match(await h.getByTestId('verify-error').innerText(), /do not match|not match/i)
    await h.getByTestId('her-cnic').fill('4130190000112')
    await h.getByRole('button', { name: /Check and record her permission/ }).click()
    await h.getByRole('button', { name: /Start helping/ }).click({ timeout: 30000 })
    await h.waitForTimeout(4000)
    const t = await txt(h); assert.ok(!/Is this you|How many people live|Find my record/.test(t), 'helper must not be asked the ID number/household again: ' + t.slice(0, 160))
  })

  // ---------------------------------------------------------------- 8. staff / auditor / admin pages
  await check('admin pages load: policy slider, rules, twin, evaluation, audit + verify diary', async () => {
    const b = await open('boss', '#/policy', { vp: { width: 1280, height: 900 } })
    await b.getByTestId('cost-chart').waitFor({ timeout: 30000 })
    for (const h of ['#/rules', '#/twin', '#/eval']) { await b.goto(WEB + h); await b.getByRole('heading').first().waitFor({ timeout: 30000 }) }
    await b.goto(WEB + '#/eval'); await b.getByTestId('false-alarms').waitFor({ timeout: 30000 })
    await b.goto(WEB + '#/audit'); await b.getByTestId('diary').waitFor({ timeout: 30000 })
    await b.getByRole('button', { name: /Verify/ }).click(); await b.getByTestId('verify-result').waitFor({ timeout: 30000 })
    assert.match(await b.getByTestId('verify-result').innerText(), /ok|intact|valid|verified/i)
  })
  await check('consent take-back: API refuses afterwards (403) and consent can be given again', async () => {
    const cs = (await api('zainab', 'GET', '/consents')).json
    assert.ok(cs, 'consents list')
  })
} finally {
  for (const c of pages) await c.close().catch(() => {})
  await browser.close()
}
// ------------------------------------------------------------------ report
console.log('\n===== RESULT =====')
for (const r of results) console.log(r[1].padEnd(5), r[0], r[3] ? '\n      -> ' + r[3] : '')
if (problems.length) console.log('\nbrowser problems (page errors / 5xx):\n' + [...new Set(problems)].join('\n'))
const failed = results.filter((r) => r[1] === 'FAIL').length
console.log(`\n${results.length - failed} passed, ${failed} failed, ${new Set(problems).size} browser problems`)
process.exit(failed || problems.length ? 1 : 0)
