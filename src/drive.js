// Google Drive backend: GIS token in the browser + plain fetch to Drive API v3.
import { reactive } from 'vue'
import { config } from './config.js'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const SCOPE = 'https://www.googleapis.com/auth/drive'
const API = 'https://www.googleapis.com/drive/v3'
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3'
const FOLDER = 'application/vnd.google-apps.folder'
const ALL = 'supportsAllDrives=true&includeItemsFromAllDrives=true'

export const auth = reactive({ email: null, loggedIn: false })

// Token lives in sessionStorage so a reload doesn't force a new popup within the hour.
let token = null
try {
  const t = JSON.parse(sessionStorage.getItem('gtoken'))
  if (t?.exp > Date.now()) {
    token = t.token
    Object.assign(auth, { loggedIn: true, email: t.email })
  }
} catch {}

function kilep() {
  token = null
  auth.loggedIn = false
  try { sessionStorage.removeItem('gtoken') } catch {}
}

function loadGis() {
  if (window.google?.accounts) return Promise.resolve()
  return new Promise((res, rej) => {
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.onload = res
    s.onerror = () => rej(new Error('A Google bejelentkezés nem tölthető be.'))
    document.head.append(s)
  })
}

let tokenClient
export async function login() {
  if (!CLIENT_ID) throw new Error('Hiányzik a VITE_GOOGLE_CLIENT_ID beállítás (lásd SETUP.md).')
  await loadGis()
  const r = await new Promise((resolve, reject) => {
    tokenClient ??= google.accounts.oauth2.initTokenClient({ client_id: CLIENT_ID, scope: SCOPE, callback: () => {} })
    tokenClient.callback = r => (r.error ? reject(new Error(r.error_description || r.error)) : resolve(r))
    tokenClient.error_callback = e => reject(new Error(e.type === 'popup_closed' ? 'A bejelentkezési ablak bezárult.' : e.message || e.type))
    tokenClient.requestAccessToken()
  })
  token = r.access_token
  auth.loggedIn = true
  auth.email = (await json(`${API}/about?fields=user(emailAddress)`)).user.emailAddress
  try { sessionStorage.setItem('gtoken', JSON.stringify({ token, email: auth.email, exp: Date.now() + (r.expires_in - 60) * 1000 })) } catch {}
}

export function logout() {
  if (token) window.google?.accounts.oauth2.revoke(token)
  kilep()
}

async function req(url, opts = {}) {
  if (!token) throw new Error('Nincs bejelentkezve.')
  const r = await fetch(url, { ...opts, headers: { Authorization: `Bearer ${token}`, ...opts.headers } })
  if (r.status === 401) {
    kilep()
    throw new Error('Lejárt a bejelentkezés, lépj be újra.')
  }
  if (!r.ok) throw new Error(`Drive hiba (${r.status}): ${(await r.json().catch(() => ({}))).error?.message ?? ''}`)
  return r
}
const json = (url, opts) => req(url, opts).then(r => r.json())
const jsonBody = (method, body) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

async function list(query, fields = 'id,name,modifiedTime') {
  const out = []
  let page = ''
  do {
    const r = await json(`${API}/files?q=${encodeURIComponent(query + ' and trashed = false')}&fields=nextPageToken,files(${fields})&pageSize=1000&${ALL}${page && '&pageToken=' + page}`)
    out.push(...r.files)
    page = r.nextPageToken
  } while (page)
  return out
}
const find = async (parent, name) => (await list(`'${parent}' in parents and name = '${name}'`))[0]

// Drive accepts multipart/form-data with a JSON "metadata" part.
function upload(method, url, meta, blob) {
  const form = new FormData()
  form.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }))
  form.append('file', blob)
  return json(`${url}${url.includes('?') ? '&' : '?'}uploadType=multipart&fields=id,modifiedTime&${ALL}`, { method, body: form })
}
const jsonBlob = data => new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })

export async function mappaEllenoriz(id) {
  const f = await json(`${API}/files/${id}?fields=name,mimeType,capabilities(canAddChildren)&${ALL}`)
  if (f.mimeType !== FOLDER) throw new Error('A link nem mappára mutat.')
  if (!f.capabilities.canAddChildren) throw new Error('Ehhez a mappához nincs szerkesztési jogod.')
  return f.name
}

const projektekId = {} // per root folder
async function projektekMappa() {
  const root = config.rootId
  return (projektekId[root] ??=
    (await find(root, 'projektek'))?.id ??
    (await json(`${API}/files?${ALL}`, jsonBody('POST', { name: 'projektek', mimeType: FOLDER, parents: [root] }))).id)
}

export async function sablonokBetolt() {
  const f = await find(config.rootId, 'sablonok.json')
  return f ? json(`${API}/files/${f.id}?alt=media&${ALL}`) : null
}

export async function sablonokMent(data) {
  const f = await find(config.rootId, 'sablonok.json')
  if (f) await upload('PATCH', `${UPLOAD}/files/${f.id}`, {}, jsonBlob(data))
  else await upload('POST', `${UPLOAD}/files`, { name: 'sablonok.json', parents: [config.rootId], mimeType: 'application/json' }, jsonBlob(data))
}

// Project = folder; folder name and appProperties.ugyfel keep the list cheap (no per-project fetch).
export async function projektek() {
  const p = await projektekMappa()
  const f = await list(`'${p}' in parents and mimeType = '${FOLDER}'`, 'id,name,modifiedTime,appProperties')
  return f.map(x => ({ id: x.id, nev: x.name, ugyfelNev: x.appProperties?.ugyfel ?? '', modositva: x.modifiedTime }))
}

export async function projektBetolt(id) {
  const f = await find(id, 'project.json')
  if (!f) throw new Error('A projekt mappájában nincs project.json.')
  return { data: await json(`${API}/files/${f.id}?alt=media&${ALL}`), verzio: f.modifiedTime }
}

// `verzio` = modifiedTime seen at load; refuse to overwrite if someone saved in between.
export async function projektMent(id, data, verzio) {
  data = { ...data, modositva: new Date().toISOString(), modositotta: auth.email }
  const meta = { name: data.nev || 'Névtelen projekt', appProperties: { ugyfel: data.ugyfelNev ?? '' } }
  if (!id) {
    id = (await json(`${API}/files?${ALL}`, jsonBody('POST', { ...meta, mimeType: FOLDER, parents: [await projektekMappa()] }))).id
    const r = await upload('POST', `${UPLOAD}/files`, { name: 'project.json', parents: [id], mimeType: 'application/json' }, jsonBlob(data))
    return { id, verzio: r.modifiedTime }
  }
  const f = await find(id, 'project.json')
  if (verzio && f.modifiedTime !== verzio) throw new Error('Közben valaki más is mentette ezt a projektet. Töltsd újra az oldalt (a módosításaid elvesznek), vagy másold ki őket előbb.')
  const r = await upload('PATCH', `${UPLOAD}/files/${f.id}`, {}, jsonBlob(data))
  await json(`${API}/files/${id}?${ALL}`, jsonBody('PATCH', meta))
  return { id, verzio: r.modifiedTime }
}

// Trash, not delete: recoverable from Drive for 30 days.
export async function projektTorol(id) {
  await json(`${API}/files/${id}?${ALL}`, jsonBody('PATCH', { trashed: true }))
}

export async function fajlFeltolt(projektId, file) {
  return (await upload('POST', `${UPLOAD}/files`, { name: file.name, parents: [projektId] }, file)).id
}

const urlCache = new Map()
export async function fajlUrl(id) {
  if (!urlCache.has(id)) urlCache.set(id, URL.createObjectURL(await (await req(`${API}/files/${id}?alt=media&${ALL}`)).blob()))
  return urlCache.get(id)
}

// Who the root folder is shared with (for the "Tároló struktúra" page).
export async function megosztasok(id) {
  const r = await json(`${API}/files/${id}/permissions?fields=permissions(type,role,emailAddress,displayName,domain)&supportsAllDrives=true`)
  return r.permissions
}
