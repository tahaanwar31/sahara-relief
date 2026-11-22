// Records the demo video: the real app in Chrome with a visible cursor, timed to the narration clips.
//   DRY=1 node video/record.mjs     fast run to check the flow (no waiting for the voice)
//   node video/record.mjs           the real recording -> video/out/raw/*.webm and video/out/timeline.json
// Needs: the stack running (5173 + 8000), the sample cards on the Desktop, video/out/durations.json (make_voice.py).
import { createRequire } from 'node:module'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const here = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const { chromium } = require(path.join(here, '..', 'web', 'node_modules', 'playwright-core'))

const DRY = !!process.env.DRY
const WEB = process.env.WEB || 'http://localhost:5173/', API = process.env.API || 'http://localhost:8000'
const CARDS = path.join(os.homedir(), 'Desktop', 'sahara-sample-docs')
const card = (f) => path.join(CARDS, f)
const D = JSON.parse(fs.readFileSync(path.join(here, 'out', 'durations.json'), 'utf8'))
const OUT = path.join(here, 'out'); fs.mkdirSync(path.join(OUT, 'raw'), { recursive: true })
const U = { zainab: ['zainab@citizens.sahara.test', '246810'], yousuf: ['yousuf@helpers.sahara.test', '246810'], admin: ['admin1@gov.sahara.test', 'Admin#2026'] }
const sleep = (ms) => new Promise((r) => setTimeout(r, DRY ? Math.min(ms, 120) : ms))

async function api(who, method, url, body) {
  const r = await (await fetch(API + '/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: U[who][0], secret: U[who][1] }) })).json()
  const res = await fetch(API + url, { method, headers: { 'content-type': 'application/json', authorization: 'Bearer ' + r.access_token }, body: body ? JSON.stringify(body) : undefined })
  return res.status
}

const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: DRY ? undefined : { dir: path.join(OUT, 'raw'), size: { width: 1280, height: 720 } } })
await ctx.addInitScript(() => {
  try { localStorage.setItem('sahara.lang', 'ur') } catch {}
  // a visible cursor and a click ripple (the recorded video does not show the real mouse)
  const mount = () => {
    if (!document.body) return requestAnimationFrame(mount)
    if (document.getElementById('__cur')) return
    const c = document.createElement('div'); c.id = '__cur'
    c.style.cssText = 'position:fixed;left:0;top:0;width:26px;height:26px;z-index:2147483647;pointer-events:none;transition:transform .02s linear;will-change:transform;filter:drop-shadow(0 2px 3px rgba(0,0,0,.45))'
    c.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M3 2l7.5 19 2.6-7.4L20.5 11z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg>'
    document.body.appendChild(c)
    document.addEventListener('mousemove', (e) => { c.style.transform = `translate(${e.clientX - 3}px,${e.clientY - 2}px)` }, true)
    document.addEventListener('mousedown', (e) => {
      const r = document.createElement('div')
      r.style.cssText = `position:fixed;left:${e.clientX - 20}px;top:${e.clientY - 20}px;width:40px;height:40px;border-radius:50%;border:3px solid #D9602E;z-index:2147483646;pointer-events:none;transition:all .45s ease-out;opacity:.95`
      document.body.appendChild(r); requestAnimationFrame(() => { r.style.transform = 'scale(1.9)'; r.style.opacity = '0' }); setTimeout(() => r.remove(), 600)
    }, true)
  }
  mount()
})
const T0 = Date.now()
const p = await ctx.newPage()
const timeline = []
const now = () => (Date.now() - T0) / 1000
let mx = 640, my = 360

// ---------------------------------------------------------------- helpers
async function glide(x, y, steps = DRY ? 2 : 22) {
  for (let i = 1; i <= steps; i++) {
    const k = i / steps, e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2
    await p.mouse.move(mx + (x - mx) * e, my + (y - my) * e); if (!DRY) await p.waitForTimeout(14)
  }
  mx = x; my = y
}
async function mclick(loc, { pause = 380 } = {}) {
  const l = loc.first(); await l.waitFor({ state: 'visible', timeout: 60000 }); await l.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' })).catch(() => {}); await sleep(250)
  let b = await l.boundingBox(); await glide(b.x + b.width / 2, b.y + b.height / 2)
  for (let k = 0; k < 3; k++) {   // the page can move while the cursor travels: aim again until the cursor is on the button
    await sleep(120); b = await l.boundingBox(); const cx = b.x + b.width / 2, cy = b.y + b.height / 2
    if (Math.abs(cx - mx) < 5 && Math.abs(cy - my) < 5) break
    await glide(cx, cy, DRY ? 2 : 8)
  }
  await sleep(120); await p.mouse.down(); await sleep(70); await p.mouse.up(); await sleep(pause)
}
async function tapDigits(digits, gap = 160) {
  for (const d of digits) await mclick(p.locator('.ltr.grid.grid-cols-3 button').filter({ has: p.locator('span', { hasText: new RegExp('^' + d + '$') }) }), { pause: gap })
}
async function typeInto(loc, text, delay = 85) {
  await mclick(loc); await p.keyboard.type(text, { delay: DRY ? 0 : delay })
}
async function choose(file) {
  const [fc] = await Promise.all([p.waitForEvent('filechooser'), mclick(p.locator('button', { hasText: 'Choose a photo' }))])
  await fc.setFiles(card(file))
}
async function say(key, action, lead = 0.8) {
  const start = now(); timeline.push({ key, start: Math.round(start * 100) / 100 }); console.log(`[${start.toFixed(1)}s] ${key}`)
  if (action) { await sleep(lead * 1000); try { await action() } catch (e) { await p.screenshot({ path: path.join(OUT, 'fail.png') }).catch(() => {}); console.log('FAILED in', key, '::', String(e.message).slice(0, 160), ' url:', p.url()); throw e } }
  const need = (D[key] ?? 0) + 0.6 - (now() - start)
  if (need > 0) await sleep(need * 1000)
}
async function english() { if ((await p.evaluate(() => document.documentElement.lang)) === 'ur') await mclick(p.getByRole('button', { name: 'EN', exact: true })) }
async function login(who, label) {
  await mclick(p.locator('[data-testid=test-users]:visible').getByRole('button', { name: label }))
  await p.waitForFunction(() => !!sessionStorage.getItem('sahara.auth'), null, { timeout: 30000 }); await sleep(1500)
}
async function logout() { await mclick(p.getByRole('button', { name: /Log out|باہر/ })); await p.locator('[data-testid=test-users]').first().waitFor({ timeout: 30000 }); await sleep(700) }
async function scrollTo(loc, block = 'center') {
  await loc.first().evaluate((el, b) => el.scrollIntoView({ behavior: 'smooth', block: b }), block); await sleep(1100)
}
async function card_(title, sub) {   // a title card over the page
  await p.evaluate(([t, s]) => {
    document.getElementById('__title')?.remove(); const d = document.createElement('div'); d.id = '__title'
    d.style.cssText = 'position:fixed;inset:0;z-index:2147483645;background:linear-gradient(160deg,#2B2420 0%,#2B2420 60%,#D9602E 60.2%);color:#fff;display:grid;place-items:center;text-align:center;font-family:Segoe UI,Arial,sans-serif;opacity:0;transition:opacity .6s'
    d.innerHTML = `<div><div style="font-size:64px;font-weight:800;letter-spacing:-1px">${t}</div><div style="font-size:24px;margin-top:14px;opacity:.9;max-width:800px">${s}</div></div>`
    document.body.appendChild(d); requestAnimationFrame(() => { d.style.opacity = '1' })
  }, [title, sub])
}
async function hideCard() { await p.evaluate(() => { const d = document.getElementById('__title'); if (d) { d.style.opacity = '0'; setTimeout(() => d.remove(), 650) } }); await sleep(700) }
async function setTourSeen(steps) {
  await p.evaluate((st) => { const u = JSON.parse(sessionStorage.getItem('sahara.auth')).user.id; for (const s of st) localStorage.setItem(`sahara.tour.v1.${u}.${s}`, '1') }, steps)
}
// one full citizen claim (used for the short, fast claims)
async function claimFast(front, back = 'A2_back_CORRECT.jpg', acct = '03009900044') {
  await mclick(p.getByRole('button', { name: /Yes, start/ })); await mclick(p.getByRole('button', { name: /I agree/ }))
  await p.getByTestId('step-3').waitFor(); await tapDigits('4130190000112', 90); await mclick(p.getByRole('button', { name: /Find my record/ }))
  await p.getByTestId('found-name').waitFor({ timeout: 30000 }); await mclick(p.getByRole('button', { name: /^Yes$/ }))
  await p.getByTestId('step-4').waitFor(); await tapDigits('4', 90); await mclick(p.getByRole('button', { name: /^Check$/ }))
  await p.getByTestId('docs-step').waitFor({ timeout: 30000 })
  await choose(front); await p.getByTestId('doc-title').filter({ hasText: /back of your ID card/ }).waitFor({ timeout: 60000 })
  await choose(back); await p.getByText('Photo received').waitFor({ timeout: 60000 }); await sleep(600); await mclick(p.getByRole('button', { name: /^Next/ }))
  await p.getByTestId('step-6').waitFor(); await tapDigits(acct, 90); await mclick(p.getByRole('button', { name: /^Continue$/ }))
  await p.getByTestId('step-7').waitFor({ timeout: 30000 }); await mclick(p.getByRole('button', { name: /Send my claim/ }))
  await p.getByTestId('result-card').waitFor({ timeout: 90000 })
}

// ================================================================= the story
try {
console.log('API reset', await api('zainab', 'POST', '/demo/restart-claim'), await api('yousuf', 'POST', '/demo/reset-helper'))
await p.goto(WEB + '#/login'); await p.locator('[data-testid=test-users]').first().waitFor({ timeout: 60000 })
await card_('Sahara Relief', 'A relief-payment platform for a woman who cannot read, and the helper beside her')
await say('0_intro', async () => { await sleep(7000); await hideCard(); await glide(900, 420) })

// ----------------------------------------------------------------- 1. the citizen
await say('1_login', async () => { await login('zainab', /Zainab/) })
await p.getByTestId('step-1').waitFor({ timeout: 60000 })
await say('1_lang', async () => { await english() })
await setTourSeen([3, 4, 5, 6, 7])
await say('1_start', async () => { await mclick(p.getByRole('button', { name: /Yes, start/ })) })
await say('1_tour', async () => {
  await p.getByTestId('tour').waitFor({ timeout: 30000 }); await p.getByTestId('tour-go').waitFor({ timeout: 40000 })
  await sleep(1200); await mclick(p.getByTestId('tour-again')); await p.getByTestId('tour-go').waitFor({ timeout: 40000 })
}, 0.5)
await mclick(p.getByTestId('tour-go'))
await say('1_consent', async () => { await sleep(8000); await mclick(p.getByRole('button', { name: /I agree/ })) })
await say('1_cnic', async () => { await p.getByTestId('step-3').waitFor(); await tapDigits('4130190000112', 200); await sleep(500); await mclick(p.getByRole('button', { name: /Find my record/ })) }, 0.4)
await say('1_cnic2', async () => { await p.getByTestId('found-name').waitFor({ timeout: 30000 }); await sleep(6500); await mclick(p.getByRole('button', { name: /^Yes$/ })) }, 0.3)
await say('1_house', async () => { await p.getByTestId('step-4').waitFor(); await sleep(3800); await tapDigits('4', 300); await mclick(p.getByRole('button', { name: /^Check$/ })) }, 0.3)
await say('1_front', async () => { await p.getByTestId('docs-step').waitFor({ timeout: 30000 }); await choose('A1_front_CORRECT.jpg') }, 0.6)
await say('1_front2', async () => { await p.getByTestId('doc-title').filter({ hasText: /back of your ID card/ }).waitFor({ timeout: 60000 }); await glide(900, 300) }, 0.2)
await say('1_back', async () => { await choose('A2_back_CORRECT.jpg'); await p.getByText('Photo received').waitFor({ timeout: 60000 }); await sleep(900); await mclick(p.getByRole('button', { name: /^Next/ })) }, 0.4)
await say('1_acct', async () => { await p.getByTestId('step-6').waitFor(); await tapDigits('03009900044', 230); await sleep(500); await mclick(p.getByRole('button', { name: /^Continue$/ })) }, 0.8)
await say('1_send', async () => { await p.getByTestId('step-7').waitFor({ timeout: 30000 }); await sleep(900); await mclick(p.getByRole('button', { name: /Send my claim/ })) }, 0.4)
await say('1_result', async () => { await p.getByTestId('result-card').waitFor({ timeout: 90000 }) }, 0.2)
await say('1_dash', async () => {
  await mclick(p.getByRole('link', { name: /My claim/ }).or(p.getByText('My claim', { exact: true })))
  await p.getByTestId('paid-notice').waitFor({ timeout: 60000 }); await glide(640, 420)
}, 0.5)

// ----------------------------------------------------------------- 2. the helper
await say('2_reset', async () => { await api('zainab', 'POST', '/demo/restart-claim'); await api('yousuf', 'POST', '/demo/reset-helper'); await logout() })
await say('2_login', async () => { await login('yousuf', /Yousuf/); await english() })
await say('2_families', async () => { await p.getByTestId('family').first().waitFor({ timeout: 60000 }); await glide(500, 330) })
await say('2_proof', async () => {
  await mclick(p.getByTestId('family')); await p.getByTestId('her-cnic').waitFor()
  await typeInto(p.getByTestId('her-cnic'), '4130190000999'); await p.getByTestId('her-dob').fill('1978-06-15'); await typeInto(p.getByTestId('her-members'), '4')
  await mclick(p.getByRole('button', { name: /Check and record her permission/ })); await p.getByTestId('verify-error').waitFor({ timeout: 30000 })
}, 0.4)
await say('2_proof2', async () => {
  await sleep(1500); await p.getByTestId('her-cnic').fill(''); await typeInto(p.getByTestId('her-cnic'), '4130190000112')
  await mclick(p.getByRole('button', { name: /Check and record her permission/ })); await p.getByRole('button', { name: /Start helping/ }).waitFor({ timeout: 40000 })
}, 0.4)
await say('2_claim', async () => {
  await mclick(p.getByRole('button', { name: /Start helping/ })); await p.getByTestId('step-1').waitFor({ timeout: 40000 }); await sleep(1200)
  await mclick(p.getByRole('button', { name: /Yes, start|^Continue/ })); await p.getByTestId('step-2').waitFor({ timeout: 40000 }); await sleep(1800)
  await mclick(p.getByRole('button', { name: /^Next/ })); await p.getByTestId('docs-step').waitFor({ timeout: 60000 })
  await choose('A1_front_CORRECT.jpg'); await p.getByTestId('doc-title').filter({ hasText: /back of your ID card/ }).waitFor({ timeout: 60000 })
  await choose('A2_back_CORRECT.jpg'); await p.getByText('Photo received').waitFor({ timeout: 60000 }); await sleep(700); await mclick(p.getByRole('button', { name: /^Next/ }))
}, 0.8)
await say('2_acct', async () => {
  await p.getByTestId('step-6').waitFor(); await tapDigits('03009900044', 200); await mclick(p.getByRole('button', { name: /^Continue$/ }))
  await p.getByTestId('step-7').waitFor({ timeout: 30000 }); await sleep(800); await mclick(p.getByRole('button', { name: /Send my claim/ }))
}, 0.4)
await say('2_result', async () => { await p.getByTestId('result-card').waitFor({ timeout: 90000 }) }, 0.2)
await say('2_limit', async () => { await glide(640, 380) }, 0.5)

// ----------------------------------------------------------------- 3. the faulty claim and the admin
await say('3_reset', async () => { await api('zainab', 'POST', '/demo/restart-claim'); await api('yousuf', 'POST', '/demo/reset-helper'); await logout(); await login('zainab', /Zainab/); await english() })
await say('3_faulty', async () => { await p.getByTestId('step-1').waitFor({ timeout: 60000 }); await claimFast('B1_front_WRONG_NAME.jpg') }, 0.5)
await say('3_held', async () => { await glide(640, 400) }, 0.2)
await say('3_adminlogin', async () => { await logout(); await login('admin', /Admin/) })
await say('3_queue', async () => { await p.getByTestId('queue-row').first().waitFor({ timeout: 60000 }); await glide(560, 300) })
await say('3_case', async () => {
  await mclick(p.getByTestId('queue-row')); await p.getByText('Decision card').first().waitFor({ timeout: 60000 }); await sleep(1500)
  await scrollTo(p.getByRole('heading', { name: 'Checks' }), 'start')
}, 0.4)
await say('3_notes', async () => { await scrollTo(p.getByText('"I am not sure" notes').first(), 'start') }, 0.4)
await say('3_table', async () => { await scrollTo(p.getByText('Same person? Side by side'), 'start') }, 0.4)
await say('3_view', async () => {
  await scrollTo(p.getByRole('heading', { name: 'Papers' }), 'start'); await mclick(p.getByRole('button', { name: 'View' }))
  await p.getByRole('dialog').locator('img').waitFor({ timeout: 30000 }); await sleep(3200); await mclick(p.getByRole('button', { name: 'Close' }))
}, 0.3)
await say('3_ask', async () => {
  await scrollTo(p.getByRole('heading', { name: 'Your decision' }), 'start'); await mclick(p.getByRole('radio', { name: /Ask for more proof/ }))
  await p.getByTestId('paper-ask').selectOption('cnic_front'); await sleep(900)
  await mclick(p.getByRole('button', { name: /^Send: Ask for more proof/ })); await sleep(1500)
}, 0.3)
await say('3_cit', async () => { await logout(); await login('zainab', /Zainab/); await english(); await p.getByTestId('asked-title').waitFor({ timeout: 60000 }) }, 0.2)
await say('3_resend', async () => { await mclick(p.getByRole('button', { name: /Send it now/ })); await p.getByTestId('docs-step').waitFor({ timeout: 30000 }); await choose('A1_front_CORRECT.jpg'); await p.getByTestId('result-card').waitFor({ timeout: 90000 }) }, 0.5)
await say('3_fixed', async () => { await mclick(p.getByRole('link', { name: /My claim/ }).or(p.getByText('My claim', { exact: true }))); await p.getByTestId('paid-notice').waitFor({ timeout: 60000 }) }, 0.4)
await say('3_admin2', async () => { await logout(); await login('admin', /Admin/); await mclick(p.getByRole('link', { name: 'Rules' })); await p.getByTestId('rule-sets').waitFor({ timeout: 30000 }) })
await say('3_twin', async () => {
  await mclick(p.getByRole('link', { name: /Digital Twin/ })); await sleep(1500)
  const run = p.getByRole('button', { name: /Run the replay/ }); if (await run.count()) { await mclick(run); await p.getByTestId('twin-result').waitFor({ timeout: 60000 }).catch(() => {}) }
}, 0.4)
await say('3_policy', async () => {
  await mclick(p.getByRole('link', { name: 'Policy' })); await p.getByTestId('cost-chart').waitFor({ timeout: 30000 })
  const s = p.locator('input[type=range]').first(); if (await s.count()) { await mclick(s); for (let i = 0; i < 6; i++) { await p.keyboard.press('ArrowRight'); await sleep(350) } }
}, 0.4)
await say('3_eval', async () => { await mclick(p.getByRole('link', { name: 'Evaluation' })); await p.getByTestId('false-alarms').waitFor({ timeout: 60000 }); await scrollTo(p.getByTestId('false-alarms'), 'center') }, 0.4)
await say('3_diary', async () => { await mclick(p.getByRole('link', { name: /Diary/ })); await mclick(p.getByRole('button', { name: /Verify the diary/ })); await p.getByTestId('verify-result').waitFor({ timeout: 60000 }) }, 0.4)
await card_('Sahara Relief', 'Prototype on invented data. Two models trained by us, a person for every doubtful case, a diary nobody can edit.')
await say('9_outro', async () => { await sleep(1500) }, 0)
await sleep(1200)

} catch (e) { console.log('STOPPED EARLY:', String(e.message).slice(0, 200)) }
fs.writeFileSync(path.join(OUT, 'timeline.json'), JSON.stringify({ totalSeconds: Math.round(now() * 10) / 10, clips: timeline }, null, 1))
console.log('total', Math.round(now()), 's, clips', timeline.length)
await ctx.close(); await browser.close()
if (!DRY) { const vids = fs.readdirSync(path.join(OUT, 'raw')).filter((f) => f.endsWith('.webm')).sort(); console.log('video files:', vids.join(', ')) }
