// info.domain.hu has no CORS: production goes through the Apps Script proxy (proxy/whois.gs),
// `npm run dev` through Vite's dev proxy (vite.config.js). Parsing happens here (render.js).
import { whoisFeldolgoz } from './render.js'

const PROXY = import.meta.env.VITE_WHOIS_PROXY_URL
export const whoisElerheto = !!PROXY || import.meta.env.DEV

export async function whoisLekerdez(domain) {
  const d = encodeURIComponent(domain)
  let html
  if (PROXY) {
    const r = await (await fetch(`${PROXY}?domain=${d}`)).json()
    if (r.hiba) throw new Error(r.hiba)
    html = r.html
  } else {
    html = await (await fetch(`/infodomain/webwhois/hu/domain/${d}`, { method: 'POST' })).text()
  }
  const adat = whoisFeldolgoz(html)
  if (!adat.lejarat) throw new Error('Nem található lejárat – lehet, hogy a domain nincs regisztrálva.')
  return { ...adat, lekerdezve: new Date().toISOString() }
}
