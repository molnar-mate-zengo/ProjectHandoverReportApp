# Beüzemelés

Egyszer kell elvégezni, nagyjából 15 perc. A Google-oldalakon a menüpontok neve kis mértékben eltérhet.

## 1. Google Cloud projekt és OAuth Client ID

1. Nyisd meg a <https://console.cloud.google.com/> oldalt azzal a Google-fiókkal, amelyikhez az alkalmazás tartozni fog.
2. **Új projekt:** a felső projektválasztóban „New project”, név például `projektatadas`.
3. **Drive API bekapcsolása:** *APIs & Services → Library* menüben keresd meg a „Google Drive API”-t, majd **Enable**.
4. **OAuth consent screen** (*APIs & Services → OAuth consent screen*, újabban *Google Auth Platform*):
   - User type: **External**
   - App name: `Projektátadási beszámoló`, a support e-mail a sajátod
   - **Audience / Test users:** add hozzá minden kolléga Google-fiókját (például a @zengo.eu címeket).
   - A *Publishing status* maradjon **Testing**. Így legfeljebb 100 tesztfelhasználó engedélyezett, és nem kell a Google ellenőrzése.
5. **Client ID** (*Credentials → Create credentials → OAuth client ID*):
   - Application type: **Web application**
   - **Authorized JavaScript origins:**
     - `https://molnar-mate-zengo.github.io`
     - `http://localhost:5173` (helyi fejlesztéshez)
   - A redirect URI mező maradjon üresen.
   - Másold ki a **Client ID**-t (`….apps.googleusercontent.com`). Ez nem titok.

> Első belépéskor a Google figyelmeztet, hogy „Google hasn't verified this app”. Tesztüzemmódban ez normális: *Continue*, majd engedélyezni kell a Drive-hozzáférést.

## 2. Kollégák Google-fiókja

Akinek nincs Google-fiókja: a <https://accounts.google.com/signup> oldalon a **„Use my current email address instead”** lehetőséggel a céges e-mail címére regisztrálhat. Gmail cím nem kell hozzá.

## 3. Drive mappa

1. Hozz létre egy mappát a Drive-on, például `Projektátadás`.
2. **Oszd meg** a kollégákkal **Szerkesztő** joggal. Ne „bárki, akinek megvan a link” módban.
3. A mappa linkjét másold ki, erre az alkalmazás első indításakor lesz szükség.

## 4. GitHub Pages

1. A repóban: *Settings → Pages → Build and deployment → Source:* **GitHub Actions**.
2. *Settings → Secrets and variables → Actions → Variables* fülön: **New repository variable**, a neve `GOOGLE_CLIENT_ID`, az értéke az 1. lépésben kimásolt Client ID.
3. A `main` ágra érkező minden push után az oldal automatikusan frissül itt: `https://molnar-mate-zengo.github.io/ProjectHandoverReportApp/`

## 5. Első indítás

1. Nyisd meg az oldalt, és lépj be a **Bejelentkezés Google-lel** gombbal.
2. Másold be a Drive mappa linkjét, majd **Mentés**.
3. **Sablonok → Importálás JSON fájlból:** válaszd ki a `sablonok-seed.json` fájlt. Ez a repón kívül van, mert a sablonszövegek nem kerülnek a publikus repóba. Ezt csak egyszer kell megtenni, utána a sablonok a Drive mappában vannak (`sablonok.json`).

A többi kollégának csak az 1. és 2. lépés kell (belépés, mappa link).

## 6. Domain lejárat lekérdezés (opcionális)

Az info.domain.hu nem engedi, hogy a böngésző közvetlenül lekérdezze, ezért egy kis Google Apps Script közvetít. Ingyenes, és a saját Google-fiókod futtatja.

1. Nyisd meg a <https://script.google.com/> oldalt, és válaszd a **New project** lehetőséget.
2. Töröld ki a kezdő kódot, és másold be a `proxy/whois.gs` tartalmát. **Mentés.**
3. **Deploy → New deployment**, típusnak válaszd a ⚙ → **Web app** lehetőséget:
   - Execute as: **Me**
   - Who has access: **Anyone**
4. **Deploy**, majd engedélyezd a hozzáférést, és másold ki a **Web app URL**-t (`https://script.google.com/macros/s/…/exec`).
5. Ezt az URL-t add meg:
   - GitHubon a repository variable-ök között `WHOIS_PROXY_URL` néven (*Settings → Secrets and variables → Actions → Variables*),
   - helyi fejlesztéshez a `.env.local` fájlban: `VITE_WHOIS_PROXY_URL=…`.

A szkript csak `.hu` domaint fogad, és csak az info.domain.hu oldalát kéri le. A feldolgozás az appban történik. Az info.domain.hu felhasználási feltételei szerint az adatok csak jogos célra (például a domain kezelése, technikai ügyek) kérhetők le. Projektenkénti egy-egy lekérdezés ugyanaz, mint amikor kézzel nézed meg.
Ha nincs beállítva, a modalban az info.domain.hu oldala beágyazva látszik, és a dátumot kézzel kell beírni. Helyi fejlesztésnél (`npm run dev`) a lekérdezés közvetítő nélkül is működik.

## Helyi fejlesztés

```bash
npm install
echo "VITE_GOOGLE_CLIENT_ID=….apps.googleusercontent.com" > .env.local
echo "VITE_WHOIS_PROXY_URL=https://script.google.com/macros/s/…/exec" >> .env.local   # opcionális
npm run dev     # http://localhost:5173
npm test
```

Client ID nélkül, mintaadatokkal a `feat/demo` ágon próbálható ki (demó mód, minden csak a böngészőben tárolódik).
