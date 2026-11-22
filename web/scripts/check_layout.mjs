// Scans every screen (both languages, phone and desktop) for: overlapping text, text cut off by its box,
// sideways page scroll, text smaller than 12px, and buttons that are too small to tap.
//   node scripts/check_layout.mjs
import { chromium } from 'playwright-core'
const API = 'http://localhost:8000', WEB = 'http://localhost:5173/'
const login = async (email, secret) => (await fetch(API + '/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, secret }) })).json()
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })

const scan = () => {
  const out = { overlap: [], clipped: [], tiny: [], smallTap: [], scrollX: document.documentElement.scrollWidth > innerWidth + 2 }
  const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 1 && r.height > 1 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05 }
  const leaves = []
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  let n
  while ((n = walker.nextNode())) {
    const t = n.nodeValue.trim(); if (!t) continue
    const el = n.parentElement; if (!el || !vis(el) || el.closest('.sr-only, [aria-hidden="true"], svg, script, style')) continue
    const range = document.createRange(); range.selectNodeContents(n)
    const rects = [...range.getClientRects()].filter((r) => r.width > 1 && r.height > 1)
    if (!rects.length) continue
    const r = rects.reduce((a, c) => ({ left: Math.min(a.left, c.left), top: Math.min(a.top, c.top), right: Math.max(a.right, c.right), bottom: Math.max(a.bottom, c.bottom) }), { left: 1e9, top: 1e9, right: -1e9, bottom: -1e9 })
    leaves.push({ el, t: t.slice(0, 40), r })
    const fs = parseFloat(getComputedStyle(el).fontSize)
    if (fs < 11.5) out.tiny.push(`${fs}px "${t.slice(0, 30)}"`)
  }
  for (let i = 0; i < leaves.length; i++) for (let j = i + 1; j < leaves.length; j++) {
    const a = leaves[i], c = leaves[j]
    if (a.el === c.el || a.el.contains(c.el) || c.el.contains(a.el)) continue
    const w = Math.min(a.r.right, c.r.right) - Math.max(a.r.left, c.r.left), h = Math.min(a.r.bottom, c.r.bottom) - Math.max(a.r.top, c.r.top)
    if (w > 3 && h > 3 && w * h > 30) {
      // ignore layered pairs where one is positioned over the other on purpose (hero text over a decorative circle has no text)
      out.overlap.push(`"${a.t}" x "${c.t}" (${Math.round(w)}x${Math.round(h)})`)
    }
  }
  for (const el of document.querySelectorAll('body *')) {
    if (!vis(el)) continue
    const cs = getComputedStyle(el)
    if ((cs.overflowX === 'hidden' || cs.overflow === 'hidden' || cs.textOverflow === 'ellipsis') && el.scrollWidth > el.clientWidth + 2 && el.innerText && el.innerText.trim() && !cs.textOverflow.includes('ellipsis'))
      out.clipped.push(`"${el.innerText.trim().slice(0, 40)}" (${el.scrollWidth}>${el.clientWidth})`)
  }
  for (const el of document.querySelectorAll('button, a[href], [role="button"], input, select')) {
    if (!vis(el)) continue
    const r = el.getBoundingClientRect()
    if ((r.width < 36 || r.height < 36) && !el.closest('table')) out.smallTap.push(`${el.tagName.toLowerCase()} "${(el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 25)}" ${Math.round(r.width)}x${Math.round(r.height)}`)
  }
  return out
}

const roles = {
  citizen: ['fam-abc0e0aa070a@citizens.sahara.test', '246810'],
  zainab: ['zainab@citizens.sahara.test', '246810'],
  helper: ['yousuf@helpers.sahara.test', '246810'],
  officer: ['admin1@gov.sahara.test', 'Admin#2026'],
  admin: ['admin@gov.sahara.test', 'Admin#2026'],
}
const pages = [
  ['login', null, '#/login'], ['claim', 'citizen', '#/claim'], ['result', 'zainab', '#/claim'], ['consents', 'zainab', '#/consents'], ['scam', 'citizen', '#/scam'],
  ['helper', 'helper', '#/helper'], ['queue', 'officer', '#/queue'], ['case', 'officer', '#/queue', 'case'], ['rules', 'admin', '#/rules'],
  ['policy', 'admin', '#/policy'], ['twin', 'admin', '#/twin'], ['eval', 'admin', '#/eval'], ['audit', 'admin', '#/audit'],
]
const sizes = { phone: { width: 390, height: 844 }, desk: { width: 1280, height: 800 } }
let bad = 0
for (const lang of ['en', 'ur']) for (const [sz, vp] of Object.entries(sizes)) for (const [name, role, hash, extra] of pages) {
  const ctx = await b.newContext({ viewport: vp, locale: lang === 'ur' ? 'ur-PK' : 'en-US' })
  if (role) { const r = await login(...roles[role]); await ctx.addInitScript(([k, v, l]) => { localStorage.setItem(k, v); localStorage.setItem('sahara.lang', l) }, ['sahara.auth', JSON.stringify({ token: r.access_token, user: r.user, exp: Date.now() + 3600e3 }), lang]) }
  else await ctx.addInitScript((l) => localStorage.setItem('sahara.lang', l), lang)
  const p = await ctx.newPage(); const errs = []
  p.on('pageerror', (e) => errs.push(e.message))
  await p.goto(WEB + hash); await p.waitForTimeout(4500)
  if (extra === 'case') { await p.getByTestId('queue-row').first().click().catch(() => {}); await p.waitForTimeout(4500) }
  if (name === 'result') await p.getByRole('button', { name: /See my answer|میرا جواب دیکھیں/ }).click().catch(() => {}), await p.waitForTimeout(2500)
  const r = await p.evaluate(scan)
  const issues = [...r.overlap.slice(0, 4).map((x) => 'OVERLAP ' + x), ...r.clipped.slice(0, 3).map((x) => 'CLIPPED ' + x), ...r.tiny.slice(0, 3).map((x) => 'TINY ' + x), ...r.smallTap.slice(0, 3).map((x) => 'SMALL-TAP ' + x), ...(r.scrollX ? ['SIDEWAYS-SCROLL'] : []), ...errs.map((x) => 'JS-ERROR ' + x)]
  if (issues.length) { bad++; console.log(`\n[${lang} ${sz} ${name}]`); issues.forEach((i) => console.log('  ' + i)) }
  await ctx.close()
}
console.log(`\nchecked ${2 * 2 * pages.length} screens, ${bad} with issues`)
await b.close()
