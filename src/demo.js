// Demo backend: everything in this browser's localStorage. For trying the UI before the Google setup.
// ponytail: images as data URLs, so localStorage's ~5 MB limit caps the demo; Drive mode has no such limit.
import { reactive } from 'vue'

export const auth = reactive({ email: 'demo', loggedIn: true })
export const login = async () => {}
export const logout = () => {}
export const mappaEllenoriz = async () => 'Demó'

const kulcs = 'demo:'
function olvas(k, alap = null) {
  try { return JSON.parse(localStorage.getItem(kulcs + k)) ?? alap } catch { return alap }
}
function ir(k, v) {
  try { localStorage.setItem(kulcs + k, JSON.stringify(v)) } catch { throw new Error('A böngésző tárhelye megtelt vagy le van tiltva (demó mód).') }
}
const uid = () => crypto.randomUUID()

export const sablonokBetolt = async () => olvas('sablonok')
export const sablonokMent = async data => ir('sablonok', data)

export async function projektek() {
  return Object.entries(olvas('projektek', {}))
    .map(([id, p]) => ({ id, nev: p.data.nev, ugyfelNev: p.data.ugyfelNev, modositva: p.verzio }))
    .sort((a, b) => b.modositva.localeCompare(a.modositva))
}

export async function projektBetolt(id) {
  const p = olvas('projektek', {})[id]
  if (!p) throw new Error('Nincs ilyen projekt.')
  return p
}

export async function projektMent(id, data, verzio) {
  const all = olvas('projektek', {})
  if (id && verzio && all[id]?.verzio !== verzio) throw new Error('Közben a projekt egy másik lapon módosult. Töltsd újra az oldalt.')
  id ??= uid()
  const most = new Date().toISOString()
  all[id] = { data: { ...data, modositva: most, modositotta: 'demo' }, verzio: most }
  ir('projektek', all)
  return { id, verzio: most }
}

export async function projektTorol(id) {
  const all = olvas('projektek', {})
  delete all[id]
  ir('projektek', all)
}

export async function fajlFeltolt(_projektId, file) {
  const url = await new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result)
    r.onerror = () => rej(r.error)
    r.readAsDataURL(file)
  })
  const id = uid()
  ir('fajl:' + id, url)
  return id
}

export const fajlUrl = async id => olvas('fajl:' + id)
export const megosztasok = async () => []

// Fills the demo storage with the sample templates and one sample project (replaces everything).
export async function mintaBetolt() {
  const { mintaSablonok, mintaProjekt } = await import('./minta.js')
  try { for (const k of Object.keys(localStorage)) if (k.startsWith(kulcs)) localStorage.removeItem(k) } catch {}
  await sablonokMent(mintaSablonok)
  await projektMent(null, mintaProjekt())
}
