// Live check in the installed Chrome: real web app (5173) -> real service (8000) -> real database.
//   start the stack first (scripts/dev.ps1 or the Supabase setup), then: node scripts/smoke_live.mjs
import { chromium } from 'playwright-core'
import assert from 'node:assert/strict'
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const WEB = 'http://localhost:5173/', API = 'http://localhost:8000'
const login = async (email, secret) => (await fetch(API + '/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, secret }) })).json()
const browser = await chromium.launch({ executablePath: CHROME, headless: true })
let failed = null
const bad = []
const open = async (email, secret, hash, vp = { width: 390, height: 844 }) => {
  const r = await login(email, secret)
  assert.ok(r.access_token, 'login failed for ' + email)
  const ctx = await browser.newContext({ viewport: vp, locale: 'en-US' })
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); localStorage.setItem('sahara.lang', 'en') } catch {} }, ['sahara.auth', JSON.stringify({ token: r.access_token, user: r.user, exp: Date.now() + 3600e3 })])
  const page = await ctx.newPage()
  page.on('pageerror', (e) => bad.push(email + ' PAGE ERROR ' + e.message))
  page.on('response', (x) => { if (x.url().startsWith(API) && x.status() >= 500) bad.push(email + ' ' + x.status() + ' ' + x.url()) })
  await page.goto(WEB + hash)
  return page
}
try {
  let p = await open('zainab@citizens.sahara.test', '246810', '#/')
  await p.getByTestId('step-1').waitFor({ timeout: 30000 }); console.log('citizen home OK')
  await p.goto(WEB + '#/consents'); await p.waitForTimeout(6000); console.log((await p.locator('main').innerText()).slice(0, 300)); console.log('citizen consent centre OK')
  p = await open('yousuf@helpers.sahara.test', '246810', '#/helper')
  await p.getByTestId('family').first().waitFor({ timeout: 30000 })
  console.log('helper families OK:', await p.getByTestId('family').count())
  const none = p.getByTestId('family').filter({ hasText: /\*\*\*/ }).first()
  await none.click()
  await p.getByTestId('her-pin').waitFor({ timeout: 10000 }); console.log('helper consent asks for HER PIN OK')
  p = await open('admin1@gov.sahara.test', 'Admin#2026', '#/queue', { width: 1280, height: 800 })
  await p.getByTestId('queue-row').first().waitFor({ timeout: 30000 })
  console.log('officer queue OK:', await p.getByTestId('queue-row').count())
  await p.getByTestId('queue-row').first().click()
  await p.getByRole('heading', { name: 'Decision card' }).waitFor({ timeout: 30000 }); console.log('officer case + decision card OK')
  p = await open('admin@gov.sahara.test', 'Admin#2026', '#/rules', { width: 1280, height: 800 })
  await p.getByRole('heading').first().waitFor({ timeout: 30000 })
  await p.goto(WEB + '#/twin'); await p.getByRole('heading').first().waitFor({ timeout: 30000 }); console.log('admin rules + twin pages load OK')
  p = await open('admin@gov.sahara.test', 'Admin#2026', '#/audit', { width: 1280, height: 800 })
  await p.getByRole('heading').first().waitFor({ timeout: 30000 }); console.log('auditor diary page loads OK')
  assert.equal(bad.length, 0, bad.join('\n'))
  console.log('no server errors or page errors')
} catch (e) { failed = e; console.error('LIVE SMOKE FAILED:', e.message, bad.join('\n')) }
await browser.close()
process.exit(failed ? 1 : 0)
