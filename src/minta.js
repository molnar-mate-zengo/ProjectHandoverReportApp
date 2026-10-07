// Demo sample data: invented templates and project (not the real company texts — this repo is public).
import { ujProjekt, valt } from './render.js'

export const mintaSablonok = {
  tipusok: [
    { id: 'dimop', nev: 'DIMOP' },
    { id: 'gimop', nev: 'GIMOP' },
    { id: 'demjan', nev: 'Demján' },
  ],
  beszamolok: [
    {
      id: 'minta_honlap',
      nev: 'Minta – honlapkészítés',
      cim: 'SZAKMAI BESZÁMOLÓ ÉS NYILATKOZAT',
      alcim: 'Minta támogatási program alapján nyújtott támogatáshoz',
      blokkok: ['domain', 'weblap', 'cms', 'email', 'kibervedelem', 'kozossegi', 'seo', 'tamogatas'],
    },
    {
      id: 'minta_webshop',
      nev: 'Minta – webshop',
      cim: 'SZAKMAI BESZÁMOLÓ',
      alcim: 'Minta webshop-fejlesztési program alapján nyújtott támogatáshoz',
      blokkok: ['domain', 'weblap', 'cms', 'webshop', 'seo', 'tobbnyelvu', 'tamogatas'],
    },
  ],
  blokkok: [
    {
      id: 'domain',
      cim: 'Domain név foglalása',
      opciok: [{ id: 'mi', cimke: 'A domaint mi foglaltuk le', szoveg: 'A domain foglalása az ügyfél nevében megtörtént. A domain lejárati dátuma: {{domainLejarat}}' }],
    },
    {
      id: 'weblap',
      cim: 'Weblap elkészítése',
      opciok: [
        { id: 'uj', cimke: 'Új weboldal', csoport: 'fejlesztes', alap: true, szoveg: 'A {{domain}} weboldal elkészült és élesítésre került.' },
        { id: 'ujraepites', cimke: 'Meglévő oldal újraépítése', csoport: 'fejlesztes', szoveg: 'A meglévő {{domain}} weboldal újratervezése és újraépítése megtörtént.' },
        { id: 'tarhely', cimke: 'Tárhely', alap: true, szoveg: 'A weboldal üzemeltetéséhez szükséges tárhelyet a Minta Kft. biztosítja.' },
      ],
    },
    {
      id: 'cms',
      cim: 'Tartalomkezelő rendszer (CMS)',
      opciok: [
        { id: 'wordpress', cimke: 'WordPress', csoport: 'cms', alap: true, szoveg: 'A weboldal WordPress tartalomkezelővel készült, a tartalmak az ügyfél által is szerkeszthetők.' },
        { id: 'egyedi', cimke: 'Egyedi rendszer', csoport: 'cms', szoveg: 'A weboldal egyedi fejlesztésű tartalomkezelővel készült.' },
      ],
    },
    {
      id: 'email',
      cim: 'E-mail fiókok',
      opciok: [{ id: 'fiok', cimke: '1 db fiók', alap: true, szoveg: 'Létrehozásra került 1 db e-mail fiók ({{email}}).' }],
    },
    {
      id: 'kibervedelem',
      cim: 'Alap kibervédelem',
      opciok: [{ id: 'ssl', cimke: 'SSL tanúsítvány', alap: true, szoveg: 'Az oldal SSL tanúsítvánnyal rendelkezik, a kapcsolat titkosított (HTTPS).' }],
    },
    {
      id: 'kozossegi',
      cim: 'Közösségi média integráció',
      opciok: [{ id: 'linkek', cimke: 'Hivatkozások', alap: true, szoveg: 'A weboldalon elhelyezésre kerültek a(z) {{kozossegiPlatformok}} oldalakra mutató hivatkozások.' }],
    },
    {
      id: 'seo',
      cim: 'Keresőoptimalizálás (SEO)',
      opciok: [
        { id: 'alap', cimke: 'Alapbeállítások', alap: true, szoveg: 'A keresőoptimalizálási alapbeállítások (metaadatok, sitemap) elkészültek.' },
        { id: 'aloldalak', cimke: 'Aloldalak szövegei', szoveg: '- **Optimalizált aloldalak:** {{aloldalak}}' },
      ],
    },
    {
      id: 'tobbnyelvu',
      cim: 'Többnyelvű weboldal',
      opciok: [{ id: 'nyelvek', cimke: 'Nyelvválasztó', szoveg: 'A weboldal magyar mellett {{nyelvek}} nyelven is elérhető.' }],
    },
    {
      id: 'webshop',
      cim: 'Webshop',
      opciok: [{ id: 'alap', cimke: 'Webshop + fizetés', szoveg: 'A webshop beállítása, a termékek feltöltése és az online fizetés bekötése megtörtént.' }],
    },
    {
      id: 'tamogatas',
      cim: 'Informatikai támogatás',
      opciok: [{ id: 'fel_ev', cimke: '6 hónap támogatás', alap: true, szoveg: 'A szerződés szerint 6 hónapig kiemelt támogatást biztosítunk (mentések, frissítések, hibajavítás).' }],
    },
  ],
}

// A partly filled sample project, so every status (kész, hiányzó adat, nem releváns, kihagyva) shows up.
export function mintaProjekt() {
  const p = ujProjekt(mintaSablonok, { nev: 'minta-pekseg.hu', ugyfelNev: 'Minta Pékség Bt.', tipus: 'demjan', beszamolo: 'minta_honlap' })
  Object.assign(p.valtozok, { domain: 'minta-pekseg.hu', email: 'info@minta-pekseg.hu', kozossegiPlatformok: ['Facebook', 'Instagram'], nyelvek: [], aloldalak: '' })
  const seo = mintaSablonok.blokkok.find(b => b.id === 'seo')
  valt(p.blokkok.seo, seo, seo.opciok[1], true) // needs {{aloldalak}} → "Hiányzó adat"
  p.blokkok.domain.nemRelevans = true
  p.blokkok.tamogatas.egyeni = 'A támogatás e-mailben és telefonon érhető el.'
  return p
}
