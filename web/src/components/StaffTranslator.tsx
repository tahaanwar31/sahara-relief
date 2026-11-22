// When the language is Urdu, swaps the English text on staff screens for the Urdu in staffUr.ts. English puts it back.
import { useEffect } from 'react'
import { useLang } from '../i18n'
import { STAFF_UR } from '../i18n/staffUr'

const norm = (s: string) => s.replace(/\s+/g, ' ').trim()
const MAP = new Map(Object.entries(STAFF_UR).map(([k, v]) => [norm(k), v]))
const ATTRS = ['placeholder', 'aria-label', 'title']

export function StaffTranslator() {
  const { lang } = useLang()
  useEffect(() => {
    const textOrig = new WeakMap<Text, string>()
    const attrOrig = new WeakMap<Element, Record<string, string>>()
    const doText = (n: Text) => {
      const cur = n.nodeValue ?? ''
      const key = norm(textOrig.get(n) ?? cur)
      if (lang === 'ur') {
        const ur = MAP.get(key)
        if (ur && cur !== ur) { if (!textOrig.has(n)) textOrig.set(n, cur); n.nodeValue = ur }
      } else if (textOrig.has(n)) { n.nodeValue = textOrig.get(n)!; textOrig.delete(n) }
    }
    const doEl = (el: Element) => {
      for (const a of ATTRS) {
        const cur = el.getAttribute(a)
        if (cur == null) continue
        const saved = attrOrig.get(el) ?? {}
        const key = norm(saved[a] ?? cur)
        if (lang === 'ur') {
          const ur = MAP.get(key)
          if (ur && cur !== ur) { saved[a] = saved[a] ?? cur; attrOrig.set(el, saved); el.setAttribute(a, ur) }
        } else if (saved[a] != null) { el.setAttribute(a, saved[a]); delete saved[a] }
      }
    }
    const walk = (root: Node) => {
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT)
      let n: Node | null = w.currentNode
      while (n) {
        if (n.nodeType === 3) doText(n as Text)
        else if (n.nodeType === 1) doEl(n as Element)
        n = w.nextNode()
      }
    }
    walk(document.body)
    let busy = false
    const mo = new MutationObserver(() => {
      if (busy) return
      busy = true
      requestAnimationFrame(() => { walk(document.body); busy = false })
    })
    mo.observe(document.body, { childList: true, subtree: true, characterData: true })
    return () => mo.disconnect()
  }, [lang])
  return null
}
