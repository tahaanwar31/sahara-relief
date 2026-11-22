// A tiny store that says "do we have signal?". It follows the browser's online/offline events
// and also learns from real requests (a request that cannot reach the service means no signal).
type Listener = () => void
const listeners = new Set<Listener>()

let browserOnline = typeof navigator === 'undefined' ? true : navigator.onLine
let lastRequestOk = true

function emit() { listeners.forEach((l) => l()) }

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { browserOnline = true; lastRequestOk = true; emit() })
  window.addEventListener('offline', () => { browserOnline = false; emit() })
}

export function reportNetwork(ok: boolean) {
  if (lastRequestOk !== ok) { lastRequestOk = ok; emit() }
}
export function isOnline(): boolean {
  if (typeof navigator !== 'undefined') browserOnline = navigator.onLine
  return browserOnline && lastRequestOk
}
export function subscribeNet(l: Listener) { listeners.add(l); return () => { listeners.delete(l) } }
