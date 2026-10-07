<script setup>
import { ref, computed, onMounted } from 'vue'
import { config } from '../config.js'
import { api } from '../api.js'
import Ikon from '../components/Ikon.vue'

const SZEREPEK = [
  { id: 'pm', nev: 'PM', szin: 'bg-violet-500' },
  { id: 'fejleszto', nev: 'Fejlesztő', szin: 'bg-sky-500' },
  { id: 'tesztelo', nev: 'Tesztelő', szin: 'bg-emerald-500' },
  { id: 'ugyfel', nev: 'Ügyfél', szin: 'bg-amber-500' },
]
const CSAPAT = { pm: 'Szerkesztő', fejleszto: 'Szerkesztő', tesztelo: 'Szerkesztő', ugyfel: null }

const ELEMEK = [
  {
    id: 'gyoker', szint: 0, ikon: 'mappa', nev: 'Projektátadás/', cimke: 'Gyökérmappa', jog: CSAPAT,
    leiras: 'A belső közös tér. Az app ezt a mappát kapja meg a Beállításokban, minden más ezen belül jön létre.',
    teendok: ['Hozd létre egyszer a Drive-on.', 'Oszd meg a csapattal (PM, fejlesztők, tesztelők) Szerkesztő joggal, név szerint.', 'Az ügyfelet ide ne vedd fel.'],
    figyelem: 'Soha ne legyen „Bárki, aki rendelkezik a linkkel” megosztás: ügyféladatok vannak benne.',
  },
  {
    id: 'sablonok', szint: 1, ikon: 'fajl', nev: 'sablonok.json', cimke: 'Beszámolósablonok + szolgáltatások', jog: CSAPAT,
    leiras: 'A beszámolósablonok (cím, alcím, szolgáltatáslista) és a szolgáltatások szövegei. A „Beszámolósablon betöltése” innen olvas, és a projektbe másolja a sablont, a jogosultságokat nem változtatja.',
    teendok: ['A Beállítások → Sablonok importálással kerül ide.', 'Exportálással menthető, vagy egy módosított változat tölthető fel.'],
    figyelem: 'A Drive-ban egy fájl nem kaphat szűkebb jogot, mint a mappája: aki a gyökérmappát szerkeszti, a sablonokat is felülírhatja.',
  },
  {
    id: 'projektek', szint: 1, ikon: 'mappa', nev: 'projektek/', cimke: 'Automatikus', jog: CSAPAT, auto: true,
    leiras: 'Az összes projekt mappája. Az app az első projekt létrehozásakor magától létrehozza.',
    teendok: ['Nincs teendő.'],
  },
  {
    id: 'projekt', szint: 2, ikon: 'mappa', nev: 'pelda.hu/', cimke: 'Projektenként egy', jog: CSAPAT, auto: true,
    leiras: 'Minden projekt saját mappát kap, a projekt nevével. A projekt törlése a Drive kukájába teszi, 30 napig visszaállítható.',
    teendok: ['Nincs teendő, az app kezeli.'],
  },
  {
    id: 'json', szint: 3, ikon: 'fajl', nev: 'project.json', cimke: 'A projekt adatai', jog: CSAPAT, auto: true,
    leiras: 'A projekt összes adata: változók, kiválasztott szövegek, sorrend. Az app ebből készíti a beszámolót.',
    teendok: ['Csak az appból szerkeszd. Kézi módosítás esetén az app ütközést jelezhet.'],
  },
  {
    id: 'kepek', szint: 3, ikon: 'fajl', nev: 'fejléc képek…', cimke: 'Feltöltött fájlok', jog: CSAPAT, auto: true,
    leiras: 'Az appban a „Képek feltöltése” gombbal feltöltött fejléc képek.',
    teendok: ['Nincs teendő.'],
  },
  {
    id: 'ugyfelmappa', szint: 3, ikon: 'mappa', nev: 'Ügyfél anyagai/', cimke: 'Tervezett', jog: { ...CSAPAT, ugyfel: 'Szerkesztő' }, tervezett: true,
    leiras: 'Az egyetlen hely, amit az ügyfél is lát: ide teheti a logókat, az infoblokkot és a szövegeket. Mivel a jog lefelé öröklődik, felfelé nem, az ügyfél a projekt többi részét nem látja.',
    teendok: ['Ezt csak az ügyféllel oszd meg, e-mail cím alapján.', 'Feltöltéshez az ügyfélnek Google-fiók kell; ha nincs, e-mailben küldi, és a PM vagy a fejlesztő teszi be.'],
  },
]

const aktiv = ref('gyoker')
const szerep = ref(null)
const elem = computed(() => ELEMEK.find(e => e.id === aktiv.value))
const halvany = e => szerep.value && !e.jog[szerep.value]

// Live sharing of the root folder (Drive mode only).
const SZEREP_NEV = { owner: 'Tulajdonos', organizer: 'Kezelő', fileOrganizer: 'Tartalomkezelő', writer: 'Szerkesztő', commenter: 'Megjegyző', reader: 'Olvasó' }
const megosztas = ref(null)
const hiba = ref('')
const nyilvanos = computed(() => megosztas.value?.some(p => p.type === 'anyone'))
onMounted(async () => {
  if (config.mode !== 'drive' || !config.rootId || !api().auth.loggedIn) return
  try { megosztas.value = await api().megosztasok(config.rootId) } catch (e) { hiba.value = e.message }
})
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-semibold">Tároló struktúra</h1>
      <p class="mt-1 max-w-3xl text-sm text-slate-600">
        Hol vannak az adatok a Google Drive-on, és ki mihez fér hozzá. Vidd az egeret egy mappára a részletekért, vagy egy szerepre, hogy lásd, ő mit ér el.
      </p>
    </div>

    <!-- Szerepek -->
    <div class="flex flex-wrap items-center gap-2" @mouseleave="szerep = null">
      <span class="text-xs font-medium text-slate-500">Szerepek:</span>
      <button
        v-for="s in SZEREPEK"
        :key="s.id"
        class="flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition"
        :class="szerep === s.id ? 'border-slate-800 bg-slate-800 text-white shadow' : 'border-slate-300 bg-white hover:border-slate-500'"
        @mouseenter="szerep = s.id"
        @focus="szerep = s.id"
        @blur="szerep = null"
      >
        <span class="h-2.5 w-2.5 rounded-full" :class="s.szin"></span>{{ s.nev }}
      </button>
    </div>

    <div class="grid gap-6 lg:grid-cols-5">
      <!-- Fa -->
      <div class="card space-y-1.5 lg:col-span-3">
        <div
          v-for="e in ELEMEK"
          :key="e.id"
          class="relative"
          :style="{ marginLeft: `${e.szint * 1.75}rem` }"
        >
          <span v-if="e.szint" class="absolute top-1/2 -left-4 h-px w-4 bg-slate-300"></span>
          <span v-if="e.szint" class="absolute -top-1.5 -left-4 h-[calc(50%+0.375rem)] w-px bg-slate-300"></span>
          <button
            class="flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition duration-200"
            :class="[
              aktiv === e.id ? 'border-indigo-400 bg-indigo-50 shadow-sm' : 'border-slate-200 bg-white hover:-translate-y-px hover:border-indigo-300 hover:shadow-md',
              e.tervezett ? 'border-dashed' : '',
              halvany(e) ? 'opacity-30' : '',
              szerep && !halvany(e) ? 'ring-2 ring-offset-1 ring-slate-800' : '',
            ]"
            @mouseenter="aktiv = e.id"
            @focus="aktiv = e.id"
          >
            <Ikon :nev="e.ikon" class="h-5 w-5 shrink-0" :class="e.ikon === 'mappa' ? 'text-amber-500' : 'text-slate-400'" />
            <span class="min-w-0 flex-1">
              <span class="block truncate font-mono text-sm">{{ e.nev }}</span>
              <span class="block text-xs text-slate-500">{{ e.cimke }}</span>
            </span>
            <span v-if="e.auto" class="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">az app kezeli</span>
            <span v-if="e.tervezett" class="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800">tervezett</span>
            <span class="flex gap-1" aria-hidden="true">
              <span v-for="s in SZEREPEK" :key="s.id" class="h-2.5 w-2.5 rounded-full" :class="e.jog[s.id] ? s.szin : 'bg-slate-200'" :title="`${s.nev}: ${e.jog[s.id] ?? 'nincs hozzáférés'}`"></span>
            </span>
          </button>
        </div>

        <!-- Öröklődés -->
        <div class="group mt-4 flex items-center gap-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50">
          <div class="flex flex-col items-center font-mono">
            <span class="rounded border bg-white px-2 py-0.5">mappa</span>
            <span class="text-lg leading-none text-emerald-600 transition group-hover:translate-y-0.5">↓</span>
            <span class="rounded border bg-white px-2 py-0.5">almappa</span>
          </div>
          <p><b>A jog lefelé öröklődik, felfelé nem.</b> Aki egy mappát megkap, az alatta lévő mindent is látja. Aki csak egy almappát kap meg (például az ügyfél az „Ügyfél anyagai/” mappát), az a felette lévő mappákat nem látja.</p>
        </div>
      </div>

      <!-- Részletek -->
      <aside class="lg:col-span-2">
        <div class="card sticky top-4 space-y-3">
          <div class="flex items-center gap-2">
            <Ikon :nev="elem.ikon" class="h-5 w-5" :class="elem.ikon === 'mappa' ? 'text-amber-500' : 'text-slate-400'" />
            <h2 class="font-mono text-sm font-semibold">{{ elem.nev }}</h2>
          </div>
          <p class="text-sm text-slate-700">{{ elem.leiras }}</p>
          <table class="w-full text-xs"><tbody>
            <tr v-for="s in SZEREPEK" :key="s.id" class="border-t border-slate-100">
              <td class="py-1"><span class="mr-1.5 inline-block h-2 w-2 rounded-full" :class="s.szin"></span>{{ s.nev }}</td>
              <td class="py-1 text-right" :class="elem.jog[s.id] ? 'font-medium text-slate-800' : 'text-slate-400'">{{ elem.jog[s.id] ?? 'nincs hozzáférés' }}</td>
            </tr>
          </tbody></table>
          <div>
            <h3 class="label">Teendő</h3>
            <ul class="list-disc space-y-0.5 pl-4 text-sm text-slate-700">
              <li v-for="t in elem.teendok" :key="t">{{ t }}</li>
            </ul>
          </div>
          <p v-if="elem.figyelem" class="flex gap-2 rounded-md bg-amber-50 p-2 text-xs text-amber-900">
            <Ikon nev="figyelem" class="h-4 w-4 shrink-0" />{{ elem.figyelem }}
          </p>
        </div>
      </aside>
    </div>

    <!-- Jelenlegi beállítás -->
    <section class="card space-y-3">
      <h2 class="font-medium">A gyökérmappa jelenlegi megosztása</h2>
      <p v-if="config.mode !== 'drive'" class="text-sm text-slate-500">Előbb állítsd be a Drive mappát a Beállításokban.</p>
      <p v-else-if="!api().auth.loggedIn" class="text-sm text-slate-500">Jelentkezz be a megtekintéshez.</p>
      <p v-else-if="hiba" class="text-sm text-red-600">{{ hiba }}</p>
      <p v-else-if="!megosztas" class="text-sm text-slate-500">Betöltés…</p>
      <template v-else>
        <p v-if="nyilvanos" class="flex gap-2 rounded-md bg-red-50 p-2 text-sm text-red-800">
          <Ikon nev="figyelem" class="h-5 w-5 shrink-0" /> A mappa linkkel nyilvános! Állítsd át „Korlátozott” módra a Drive megosztás ablakában.
        </p>
        <p v-else class="flex gap-2 rounded-md bg-green-50 p-2 text-sm text-green-800">
          <Ikon nev="lakat" class="h-5 w-5 shrink-0" /> Nincs nyilvános link, a hozzáférés név szerinti.
        </p>
        <ul class="divide-y divide-slate-100 text-sm">
          <li v-for="(p, i) in megosztas" :key="i" class="flex justify-between gap-2 py-1.5 transition hover:bg-slate-50">
            <span>{{ p.type === 'anyone' ? 'Bárki, akinek megvan a link' : p.displayName || p.emailAddress || p.domain }} <span class="text-slate-400">{{ p.type === 'user' ? p.emailAddress : '' }}</span></span>
            <span class="text-slate-600">{{ SZEREP_NEV[p.role] ?? p.role }}</span>
          </li>
        </ul>
      </template>
    </section>
  </div>
</template>
