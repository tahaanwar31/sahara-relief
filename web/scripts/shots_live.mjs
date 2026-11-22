import { chromium } from 'playwright-core'
globalThis.LANG = 'en'
import { mkdirSync } from 'node:fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const WEB = 'http://localhost:5173/', API = 'http://localhost:8000'
mkdirSync('.shots', { recursive: true })
const login = async (email, secret) => (await fetch(API + '/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, secret }) })).json()
const b = await chromium.launch({ executablePath: CHROME, headless: true })
const shoot = async (name, email, secret, hash, vp) => {
  const ctx = await b.newContext({ viewport: vp, locale: 'en-US' }); await ctx.addInitScript(() => { try { if (!localStorage.getItem('sahara.lang')) localStorage.setItem('sahara.lang', 'en') } catch {} })
  if (email) { const r = await login(email, secret); await ctx.addInitScript(([k, v, LANGV]) => { localStorage.setItem(k, v); localStorage.setItem('sahara.lang', LANGV) }, ['sahara.auth', JSON.stringify({ token: r.access_token, user: r.user, exp: Date.now() + 3600e3 })]) }
  const p = await ctx.newPage(); const errs = []
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)) })
  await p.goto(WEB + hash); await p.waitForTimeout(4500)
  await p.screenshot({ path: `.shots/${name}.png` }); console.log(name, errs.length ? 'ERRORS ' + errs.join(' | ') : 'ok'); await ctx.close()
}
const M = { width: 390, height: 844 }, D = { width: 1280, height: 800 }
await shoot('01-login', null, null, '#/login', M)
await shoot('02-login-desktop', null, null, '#/login', D)
await shoot('03-citizen', 'fam-abc0e0aa070a@citizens.sahara.test', '246810', '#/', M)
await shoot('04-citizen-desktop', 'fam-abc0e0aa070a@citizens.sahara.test', '246810', '#/', D)
await shoot('05-helper', 'yousuf@helpers.sahara.test', '246810', '#/helper', M)
await shoot('06-officer', 'admin1@gov.sahara.test', 'Admin#2026', '#/queue', D)
await shoot('07-admin', 'admin@gov.sahara.test', 'Admin#2026', '#/twin', D)
await shoot('08-policy', 'admin@gov.sahara.test', 'Admin#2026', '#/policy', D)
await shoot('09-audit', 'admin@gov.sahara.test', 'Admin#2026', '#/audit', D)
await b.close()
