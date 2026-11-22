import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
for (const [w, h] of [[1910, 867], [1366, 650], [1280, 720], [1440, 800], [390, 844]]) {
  for (const lang of ['en', 'ur']) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } })
    await ctx.addInitScript((l) => localStorage.setItem('sahara.lang', l), lang)
    const p = await ctx.newPage(); await p.goto('http://localhost:5173/#/login'); await p.waitForTimeout(1500)
    const [sh, ih] = await p.evaluate(() => [document.documentElement.scrollHeight, innerHeight])
    console.log(w + 'x' + h, lang, sh <= ih ? 'FITS' : `scrolls (${sh} > ${ih})`)
    if (w === 1910 && lang === 'en') await p.screenshot({ path: 'C:/Users/Talha/Desktop/Hackathon/Coders Cup 26/sahara-relief/web/.shots/login-fit.png' })
    await ctx.close()
  }
}
await b.close()
