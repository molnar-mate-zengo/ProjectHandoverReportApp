// Pure logic: block state, template text → HTML / plain text. No Vue imports (tested with node --test).

export const HIANYZO = '……………'

export const VALTOZO_CIMKEK = {
  domain: 'Domain',
  domainLejarat: 'Domain lejárata',
  email: 'E-mail fiók',
  kozossegiPlatformok: 'Közösségi platformok',
  nyelvek: 'Nyelv(ek)',
  aloldalak: 'Aloldalak',
}

// Entered one item per row; the text gets "a, b és c".
export const LISTA_VALTOZOK = ['kozossegiPlatformok', 'nyelvek']

export function felsorol(lista) {
  const l = lista.map(x => x.trim()).filter(Boolean)
  return l.length < 2 ? (l[0] ?? '') : `${l.slice(0, -1).join(', ')} és ${l.at(-1)}`
}

// Old projects stored list fields as one string.
export const listava = v => (Array.isArray(v) ? v : (v ?? '').split(/\s*,\s*|\s+és\s+/).filter(Boolean))

const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const ertek = (v, k) => (Array.isArray(v?.[k]) ? felsorol(v[k]) : (v?.[k] ?? '').trim())

// Every {{placeholder}} used in the templates → one input field on the project form.
export function valtozok(sablonok) {
  const s = new Set()
  for (const b of sablonok.blokkok) for (const o of b.opciok) for (const [, k] of o.szoveg.matchAll(/\{\{(\w+)\}\}/g)) s.add(k)
  const sorrend = Object.keys(VALTOZO_CIMKEK)
  const hely = k => (sorrend.includes(k) ? sorrend.indexOf(k) : sorrend.length)
  return [...s].sort((a, b) => hely(a) - hely(b))
}

export function kezdoAllapot(blokk) {
  const opciok = blokk.opciok.filter(o => o.alap).map(o => ({ id: o.id, szoveg: o.szoveg }))
  return { nemRelevans: opciok.length === 0, opciok, egyeni: '' }
}

// Project type is only a label; the report template is a starting point the project copies
// (title, subtitle, block list) and then freely changes.
export function ujProjekt(sablonok, { nev = '', ugyfelNev = '', tipus, beszamolo }) {
  const p = { nev, ugyfelNev, tipus, valtozok: {}, fejlec: { szoveg: '', kepek: [] }, blokkok: {} }
  sablonAlkalmaz(p, sablonok, beszamolo)
  return p
}

// Every library block is in the project's list; the ones not in the report template start as
// skipped (`kihagyott`: not printed, can be switched on). Existing block states are kept.
export function sablonAlkalmaz(p, sablonok, beszamoloId) {
  const b = sablonok.beszamolok.find(x => x.id === beszamoloId)
  Object.assign(p, { beszamolo: b.id, cim: b.cim, alcim: b.alcim, blokkSorrend: [...b.blokkok], kihagyott: [] })
  blokkokPotol(p, sablonok)
}

// Drops ids no longer in the library (their filled state stays in p.blokkok), appends library
// blocks the project doesn't list yet as skipped, and gives every block a default state.
export function blokkokPotol(p, sablonok) {
  const ismert = new Set(sablonok.blokkok.map(b => b.id))
  p.blokkSorrend = p.blokkSorrend.filter(id => ismert.has(id))
  p.kihagyott = (p.kihagyott ?? []).filter(id => ismert.has(id))
  for (const b of sablonok.blokkok) {
    if (!p.blokkSorrend.includes(b.id)) p.blokkSorrend.push(b.id), p.kihagyott.push(b.id)
    p.blokkok[b.id] ??= kezdoAllapot(b)
  }
}

export const aktivBlokkok = p => p.blokkSorrend.filter(id => !p.kihagyott?.includes(id))

// Drag & drop: move item from index `honnan` to index `hova`.
export function mozgat(lista, honnan, hova) {
  if (honnan === hova || hova < 0 || hova >= lista.length) return
  lista.splice(hova, 0, ...lista.splice(honnan, 1))
}

// "2027-07-15" (whois) → "2027.07.15." (as written in the report)
export const huDatum = iso => iso.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$1.$2.$3.')

// "https://www.Pelda.hu/x" → "pelda.hu"; null if not a .hu domain (only those are in info.domain.hu).
export function huDomain(domain) {
  const d = (domain ?? '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
  return /^[^\s:?#]+\.hu$/.test(d) ? d : null
}
export const whoisLink = domain => huDomain(domain) && `https://info.domain.hu/webwhois/hu/domain/${encodeURIComponent(huDomain(domain))}`

// Fields from the info.domain.hu result page (HTML or tag-stripped text).
export function whoisFeldolgoz(html) {
  const t = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
  const m = re => t.match(re)?.[1] ?? null
  return {
    allapot: m(/Állapot:\s*(\S+)/),
    regisztralva: m(/Regisztrálva:\s*(\d{4}-\d{2}-\d{2})/),
    lejarat: m(/Lejárat:\s*(\d{4}-\d{2}-\d{2})/),
    regisztrator: m(/Regisztrátor:\s*(.+?)\s+Regisztrátor cim:/),
  }
}

// Toggle one option. Same `csoport` = radio. Selected texts are snapshotted into the project,
// kept in template order; snapshots whose option was since removed from the template stay at the end.
export function valt(allapot, blokk, opcio, be) {
  const ids = new Set(allapot.opciok.map(o => o.id))
  if (be) {
    if (opcio.csoport) for (const o of blokk.opciok) if (o.csoport === opcio.csoport) ids.delete(o.id)
    ids.add(opcio.id)
  } else ids.delete(opcio.id)
  const regi = Object.fromEntries(allapot.opciok.map(o => [o.id, o.szoveg]))
  const sablonIds = new Set(blokk.opciok.map(o => o.id))
  allapot.opciok = [
    ...blokk.opciok.filter(o => ids.has(o.id)).map(o => ({ id: o.id, szoveg: regi[o.id] ?? o.szoveg })),
    ...allapot.opciok.filter(o => !sablonIds.has(o.id) && ids.has(o.id)),
  ]
  if (be) allapot.nemRelevans = false
}

export function forras(allapot) {
  if (!allapot || allapot.nemRelevans) return 'Nem releváns'
  return [...allapot.opciok.map(o => o.szoveg), allapot.egyeni?.trim()].filter(Boolean).join('\n')
}

const sorok = src => src.split('\n').map(s => s.trim()).filter(Boolean)

// Each non-empty line is a paragraph; "- " lines are list items; **bold**; {{var}} → bold value or highlighted gap.
export function html(src, v) {
  const out = []
  let ul = null
  for (const sor of sorok(src)) {
    const li = sor.startsWith('- ')
    const t = esc(li ? sor.slice(2) : sor)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\{\{(\w+)\}\}/g, (_, k) => (ertek(v, k) ? `<strong>${esc(ertek(v, k))}</strong>` : `<mark>${HIANYZO}</mark>`))
    if (li) {
      if (!ul) out.push((ul = []))
      ul.push(`<li>${t}</li>`)
    } else {
      ul = null
      out.push(`<p>${t}</p>`)
    }
  }
  return out.map(x => (Array.isArray(x) ? `<ul>${x.join('')}</ul>` : x)).join('')
}

export function szoveg(src, v) {
  return sorok(src)
    .map(sor => (sor.startsWith('- ') ? '• ' + sor.slice(2) : sor).replace(/\*\*(.+?)\*\*/g, '$1').replace(/\{\{(\w+)\}\}/g, (_, k) => ertek(v, k) || HIANYZO))
    .join('\n')
}

export const hianyos = (src, v) => [...src.matchAll(/\{\{(\w+)\}\}/g)].some(([, k]) => !ertek(v, k))

// Accepts a Drive folder link, an ?id= link or a bare id.
export function mappaId(link) {
  const s = link.trim()
  return s.match(/\/folders\/([\w-]+)/)?.[1] ?? s.match(/[?&]id=([\w-]+)/)?.[1] ?? (/^[\w-]{10,}$/.test(s) ? s : null)
}
