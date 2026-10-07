import { test } from 'node:test'
import assert from 'node:assert/strict'
import { valt, kezdoAllapot, forras, html, szoveg, hianyos, mappaId, valtozok, ujProjekt, sablonAlkalmaz, mozgat, whoisLink, aktivBlokkok, felsorol, listava, huDatum, whoisFeldolgoz, huDomain } from './render.js'

const blokk = {
  id: 'cms',
  opciok: [
    { id: 'wp', csoport: 'cms', szoveg: 'WP' },
    { id: 'mw', csoport: 'cms', szoveg: 'MW' },
    { id: 'tarhely', alap: true, szoveg: 'Tárhely {{domain}}' },
  ],
}

test('alap opciók, üres blokk nem releváns', () => {
  assert.deepEqual(kezdoAllapot(blokk).opciok.map(o => o.id), ['tarhely'])
  assert.equal(kezdoAllapot({ opciok: [] }).nemRelevans, true)
})

test('csoporton belül csak egy, sablon sorrendben, pillanatkép megmarad', () => {
  const a = kezdoAllapot(blokk)
  a.opciok[0].szoveg = 'átírt'
  valt(a, blokk, blokk.opciok[0], true)
  valt(a, blokk, blokk.opciok[1], true)
  assert.deepEqual(a.opciok, [{ id: 'mw', szoveg: 'MW' }, { id: 'tarhely', szoveg: 'átírt' }])
  valt(a, blokk, blokk.opciok[2], false)
  assert.deepEqual(a.opciok.map(o => o.id), ['mw'])
})

test('sablonból törölt opció pillanatképe nem vész el', () => {
  const a = { nemRelevans: false, opciok: [{ id: 'regi', szoveg: 'R' }], egyeni: '' }
  valt(a, blokk, blokk.opciok[0], true)
  assert.deepEqual(a.opciok.map(o => o.id), ['wp', 'regi'])
})

test('forrás: nem releváns és egyéni szöveg', () => {
  assert.equal(forras({ nemRelevans: true, opciok: [{ id: 'x', szoveg: 'X' }] }), 'Nem releváns')
  assert.equal(forras({ nemRelevans: false, opciok: [{ id: 'x', szoveg: 'X' }], egyeni: ' saját ' }), 'X\nsaját')
})

test('html: bekezdés, lista, félkövér, változó, escape', () => {
  const src = 'A {{domain}} <b>\n\n- **Slider:** s\n- c\nVége {{email}}'
  assert.equal(
    html(src, { domain: 'a.hu' }),
    '<p>A <strong>a.hu</strong> &lt;b&gt;</p><ul><li><strong>Slider:</strong> s</li><li>c</li></ul><p>Vége <mark>……………</mark></p>',
  )
  assert.equal(szoveg(src, { domain: 'a.hu' }), 'A a.hu <b>\n• Slider: s\n• c\nVége ……………')
  assert.equal(hianyos(src, { domain: 'a.hu' }), true)
  assert.equal(hianyos(src, { domain: 'a.hu', email: 'x@a.hu' }), false)
})

test('mappa link feldolgozás', () => {
  assert.equal(mappaId('https://drive.google.com/drive/folders/1AbC_d-EfGhIjKlM?usp=sharing'), '1AbC_d-EfGhIjKlM')
  assert.equal(mappaId('https://drive.google.com/open?id=1AbC_d-EfGhIjKlM'), '1AbC_d-EfGhIjKlM')
  assert.equal(mappaId('nem link'), null)
})

test('új projekt: sablon blokkjai aktívak, a könyvtár többi kihagyva; sablonváltás megtart', () => {
  const masik = { id: 'seo', opciok: [{ id: 'a', alap: true, szoveg: 'SEO' }] }
  const s = {
    beszamolok: [
      { id: 'b1', cim: 'C1', alcim: 'A1', blokkok: ['cms'] },
      { id: 'b2', cim: 'C2', alcim: 'A2', blokkok: ['seo', 'cms', 'torolt'] },
    ],
    blokkok: [blokk, masik],
  }
  const p = ujProjekt(s, { nev: 'x.hu', tipus: 'dimop', beszamolo: 'b1' })
  assert.deepEqual([p.cim, p.blokkSorrend, p.kihagyott, aktivBlokkok(p)], ['C1', ['cms', 'seo'], ['seo'], ['cms']])
  p.blokkok.cms.egyeni = 'kitöltve'
  sablonAlkalmaz(p, s, 'b2')
  assert.deepEqual([p.alcim, p.blokkSorrend, p.kihagyott, p.blokkok.cms.egyeni], ['A2', ['seo', 'cms'], [], 'kitöltve'])
  assert.deepEqual(valtozok(s), ['domain'])
})

test('mozgatás, whois link, dátum', () => {
  const l = ['a', 'b', 'c', 'd']
  mozgat(l, 0, 2)
  assert.deepEqual(l, ['b', 'c', 'a', 'd'])
  mozgat(l, 3, 0)
  assert.deepEqual(l, ['d', 'b', 'c', 'a'])
  mozgat(l, 0, 9)
  assert.deepEqual(l, ['d', 'b', 'c', 'a'])
  assert.equal(whoisLink(' https://www.Pelda.hu/ '), 'https://info.domain.hu/webwhois/hu/domain/pelda.hu')
  assert.equal(whoisLink('pelda.com'), null)
  assert.equal(huDatum('2027-07-15'), '2027.07.15.')
})

test('listás változók: "a, b és c"', () => {
  assert.equal(felsorol(['Facebook']), 'Facebook')
  assert.equal(felsorol(['Facebook', ' ', 'Instagram', 'LinkedIn']), 'Facebook, Instagram és LinkedIn')
  assert.deepEqual(listava('Facebook, Instagram és LinkedIn'), ['Facebook', 'Instagram', 'LinkedIn'])
  assert.equal(html('a(z) {{p}} oldal', { p: ['Facebook', 'Instagram'] }), '<p>a(z) <strong>Facebook és Instagram</strong> oldal</p>')
  assert.equal(hianyos('{{p}}', { p: [''] }), true)
})

test('whois oldal feldolgozása', () => {
  const html = '<td>Állapot: </td><td>Regisztrált</td> Zónában: Igen <p>Regisztrálva: 2026-07-15 09:45:28</p> <b>Lejárat:</b>\n<i>2027-07-15</i> Regisztrátor: BlazeArts Kft. Regisztrátor cim: HU 1096'
  assert.deepEqual(whoisFeldolgoz(html), { allapot: 'Regisztrált', regisztralva: '2026-07-15', lejarat: '2027-07-15', regisztrator: 'BlazeArts Kft.' })
  assert.equal(whoisFeldolgoz('Nincs találat').lejarat, null)
  assert.equal(huDomain('https://www.Pelda-Ceg.hu/rolunk'), 'pelda-ceg.hu')
  assert.equal(huDomain('pelda.com'), null)
})
