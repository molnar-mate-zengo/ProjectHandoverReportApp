# Projektátadási beszámoló – specifikáció

## Cél

A weboldalt tesztelő kolléga a tesztelés után összeállítja a projekt **szakmai beszámolóját**, amelyet az ügyfél kinyomtatva, postán kap meg. A beszámoló előre megírt, választható szövegblokkokból áll („legózás”).

## Architektúra

```
GitHub (public repo) → GitHub Pages (statikus) → Vue 3 + Vite SPA
  → Google bejelentkezés (Google Identity Services, böngészőben)
  → Google Drive API (fetch) → megosztott gyökérmappa
```

- Nincs szerver és nincs adatbázis. Az adat a megosztott Drive mappában van JSON fájlokként.
- **Belépés:** Google-fiókkal. Céges @zengo.eu címre is lehet Google-fiókot regisztrálni, Workspace nem kell.
- **Jogosultság:** aki látja a Drive mappát, az dolgozhat benne. A hozzáférést a Drive megosztás szabályozza.
- **OAuth:** a Google Cloud projekt „Testing” módban fut, a kollégák tesztfelhasználók (legfeljebb 100 fő). Scope: `https://www.googleapis.com/auth/drive`.
- **A Client ID** build-time érték (`VITE_GOOGLE_CLIENT_ID`). Nem titok, a repóban lehet.
- **A gyökérmappa linkje** a beállító képernyőn adható meg. Az app kiolvassa belőle a mappa azonosítóját, és a böngészőben eltárolja.
- **Függőségek:** `vue`, `vue-router`, Tailwind CSS (formavilág). A Drive hívások sima `fetch`, a PDF a böngésző nyomtatásával készül, a másolás a `navigator.clipboard` segítségével.

**A repóba soha nem kerül:** ügyféladat, kitöltött beszámoló, sablonszöveg, jelszó vagy hozzáférés.

## Drive mappaszerkezet

```
<gyökérmappa>/
├── sablonok.json              ← projekttípusok + blokksablonok
└── projektek/
    └── <projekt-nev>/
        ├── project.json       ← a projekt összes adata
        └── <feltöltött fájlok> ← fejléc képek, egyéb csatolmányok
```

### sablonok.json

Három lista:
- **`tipusok`:** projekttípus (DIMOP, GIMOP, Demján). Csak címke a szűréshez és a nyilvántartáshoz.
- **`beszamolok`:** beszámolósablonok. Mindegyik egy kiindulópont: cím, alcím és a szolgáltatások listája. Most egy van belőle, a Demján-féle „minden vállalkozásnak legyen saját honlapja”.
- **`blokkok`:** a szolgáltatások közös könyvtára. Bármelyik beszámolóba bármelyik bekerülhet, így vegyes beszámoló is összeállítható.

```json
{
  "tipusok": [{ "id": "dimop", "nev": "DIMOP" }],
  "beszamolok": [
    { "id": "demjan_honlap", "nev": "Demján – …", "cim": "SZAKMAI BESZÁMOLÓ ÉS NYILATKOZAT …", "alcim": "A „minden vállalkozásnak …", "blokkok": ["domain", "weblap", "..."] }
  ],
  "blokkok": [
    {
      "id": "cms",
      "cim": "Tartalomkezelő rendszer (CMS)",
      "megjegyzes": null,
      "opciok": [
        { "id": "wordpress", "cimke": "WordPress", "csoport": "cms", "szoveg": "A weboldal WordPress CMS rendszer alkalmazásával készült…" }
      ]
    }
  ]
}
```

- `megjegyzes`: dőlt betűs kiegészítés a bal oszlopban, például „(I. sz. Szakmai-műszaki mellékletben Alapcsomag – Dinamikus tartalmak)”.
- `csoport`: az azonos csoportba tartozó opciók közül csak egy választható (rádiógomb). Csoport nélkül az opció jelölőnégyzet.
- `alap: true`: az új projektben ez az opció eleve be van jelölve.
- **Formázás a szövegben:** `**félkövér**`, a `- ` kezdetű sor felsorolás, a `{{valtozo}}` helyére a projekt mezője kerül (félkövéren).

### project.json

```json
{
  "nev": "pelda.hu",
  "ugyfelNev": "…",
  "tipus": "dimop",
  "beszamolo": "demjan_honlap",
  "cim": "SZAKMAI BESZÁMOLÓ …",
  "alcim": "…",
  "blokkSorrend": ["domain", "weblap", "cms"],
  "valtozok": { "domain": "pelda.hu", "domainLejarat": "2027.01.01.", "email": "info@pelda.hu", "kozossegiPlatformok": "Facebook", "nyelvek": "angol", "aloldalak": "Főoldal, Rólunk, Kapcsolat" },
  "fejlec": { "szoveg": "…", "kepek": ["<drive fileId>"] },
  "blokkok": {
    "cms": { "nemRelevans": false, "opciok": [{ "id": "wordpress", "szoveg": "…" }], "egyeni": "" }
  },
  "modositva": "2026-10-07T08:00:00Z",
  "modositotta": "kolléga@zengo.eu"
}
```

- **A projekt a sablonból másolja a címet és az alcímet.** A `blokkSorrend` a könyvtár összes szolgáltatását tartalmazza: a sablonban szereplők aktívak, a többi `kihagyott`. A kihagyott szolgáltatás nem kerül nyomtatásba, de a beállításai megmaradnak. A sorrend húzással módosítható. Sablonváltáskor a már kitöltött szolgáltatások megmaradnak.
- **Listás változók** (`kozossegiPlatformok`, `nyelvek`): soronként adhatók meg, a szövegbe „a, b és c” formában kerülnek.
- **`valtozokForras`:** honnan származik egy érték (most a domain lejárata, ha az info.domain.hu oldalról kérdeztük le), és mikor kérdeztük le.
- **A kiválasztott opciók szövege a projektbe másolódik (pillanatkép).** Ha később módosul a sablon, a már kész beszámolók szövege nem változik.
- **Ütközés:** mentés előtt az app összeveti a Drive fájl `modifiedTime` értékét a betöltéskorival. Ha közben más is mentett, figyelmeztet és nem írja felül.

## Beszámoló felépítése (nyomtatásban)

1. **Fejléc:** a projekthez feltöltött kép(ek) és szöveg. Ezeket az ügyfél vagy a hivatalos szerv küldi.
2. **Cím és alcím** (projektenként szerkeszthető).
3. **Kedvezményezett:** az ügyfél neve.
4. **Kétoszlopos táblázat:** a bal oszlopban a szolgáltatás megnevezése (és a `megjegyzes`), a jobb oldalon az eredmény.
5. **Lábléc:** oldalszám.

Az oldal A4-es nyomtatási CSS-t kap. A táblázat sorai nem törnek ketté oldalhatáron, ha elférnek.

**A jobb oldali cella tartalma:** a kiválasztott opciók szövege a sablon sorrendjében, ezt követi az egyéni szöveg. Ha a blokk „Nem releváns”, a cellába ennyi kerül: „Nem releváns”.

## Képernyők

| Útvonal | Tartalom |
|---|---|
| `/beallitas` | Google bejelentkezés, gyökérmappa linkjének megadása. Ha nincs `sablonok.json`: importálás helyi fájlból. |
| `/` | Projektlista (keresés név és ügyfél szerint), új projekt, projekt duplikálása |
| `/projekt/:id` | Projekt adatai és változói, fejléc feltöltése, blokkok szerkesztése |
| `/tarolo` | Tároló struktúra: interaktív ábra a Drive mappákról és jogosultságokról, valamint a gyökérmappa tényleges megosztása |
| `/projekt/:id/nyomtatas` | A4-es nyomtatási előnézet, Nyomtatás vagy PDF gomb |

### Blokkszerkesztő (minden blokknál)

- **A bal oldali oszlop szövege fix:** a szolgáltatás megnevezése.
- **Opciók:** rádiógomb vagy jelölőnégyzet a `csoport` alapján. Utolsóként mindig ott van az **„Egyéni szöveg”** (szövegdoboz) és a **„Nem releváns”**.
- **Élő előnézet** arról, mi kerül a cellába.
- **Másolás gomb** a cella szövegével.
- **Átvétel másik projektből:** a blokk beállításainak átmásolása egy másik projektből.

## Ütemezés

**1. fázis:** a fenti funkciók, a sablonok a `sablonok.json` importjából. A demó mód mintaadatokkal a `feat/demo` ágon van.

**2. fázis** (igény szerint):
- sablonszerkesztő felület,
- jogi szövegek modul (ÁSZF, Adatvédelmi, Impresszum): sablontár, projektenkénti szöveg, másolás.

## Nyitott kérdések

- Hogyan jut a tesztelő az ügyféllel folytatott levelezésből származó adatokhoz (e-mail fiók, platformok, nyelvek, aloldalak, fejléc)? → lásd a megbeszélést.
- Drive mappaszerkezet és jogosultságok (belső kontra ügyfél által látható rész).
- A fejléc csak az első oldalon jelenjen meg, vagy minden oldalon? Feltételezés: csak az első oldalon.
