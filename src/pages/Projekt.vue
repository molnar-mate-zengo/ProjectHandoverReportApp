<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { api } from '../api.js'
import { valtozok, forras, hianyos, blokkokPotol, sablonAlkalmaz, mozgat, huDomain, listava, LISTA_VALTOZOK, VALTOZO_CIMKEK } from '../render.js'
import BlokkSzerkeszto from '../components/BlokkSzerkeszto.vue'
import ListaMezo from '../components/ListaMezo.vue'
import Ikon from '../components/Ikon.vue'
import WhoisModal from '../components/WhoisModal.vue'

const OX_TIPP = 'Tipp: az OX levelezésből szedhető ki (az ügyféllel, PM-mel folytatott levelek).'
const TIPPEK = { email: OX_TIPP, kozossegiPlatformok: OX_TIPP, nyelvek: OX_TIPP, aloldalak: OX_TIPP }
const JAVASLATOK = {
  kozossegiPlatformok: ['Facebook', 'Instagram', 'LinkedIn', 'TikTok', 'YouTube', 'X (Twitter)', 'Pinterest'],
  nyelvek: ['angol', 'német', 'francia', 'spanyol', 'olasz', 'román', 'szlovák', 'horvát'],
}
const PELDAK = { aloldalak: 'Főoldal, Rólunk, Kapcsolat', domainLejarat: 'éééé.hh.nn.' }

const props = defineProps({ id: String })
const data = ref(null)
const sablonok = ref(null)
const verzio = ref(null)
const valtozott = ref(false)
const hiba = ref('')
const mentes = ref(false)
const whoisNyitva = ref(false)
const huzas = ref(null) // active drag: { i, kezdoY, dy, cel, lepes, kozepek }
const projektek = ref(null)
const kepUrl = ref({})
const ujratoltes = ref(0) // bumps block editor keys after "átvétel"

// The project owns its block list: every library block, in its own order; skipped ones aren't printed.
const blokkok = computed(() => data.value.blokkSorrend.map(id => sablonok.value.blokkok.find(b => b.id === id)))
const kihagyva = id => data.value.kihagyott.includes(id)
const aktivak = computed(() => blokkok.value.filter(b => !kihagyva(b.id)))
const domain = computed(() => huDomain(data.value.valtozok.domain || data.value.nev))
const lejaratForras = computed(() => data.value.valtozokForras?.domainLejarat)
const mezok = computed(() => (sablonok.value ? valtozok(sablonok.value) : []))
const osszesito = computed(() => {
  const c = { kesz: 0, hianyos: 0, ures: 0, nemRelevans: 0 }
  for (const b of aktivak.value) {
    const a = data.value.blokkok[b.id]
    const s = forras(a)
    if (a.nemRelevans) c.nemRelevans++
    else if (!s.trim()) c.ures++
    else if (hianyos(s, data.value.valtozok)) c.hianyos++
    else c.kesz++
  }
  return c
})


async function fut(fn) {
  hiba.value = ''
  try { await fn() } catch (e) { hiba.value = e.message }
}

onMounted(() => fut(async () => {
  const [p, s] = await Promise.all([api().projektBetolt(props.id), api().sablonokBetolt()])
  if (!s?.beszamolok) throw new Error('Nincsenek sablonok (vagy régi formátumúak), importáld őket a Beállításokban.')
  sablonok.value = s
  p.data.blokkSorrend ??= Object.keys(p.data.blokkok) // projects saved before report templates existed
  blokkokPotol(p.data, s)
  for (const k of LISTA_VALTOZOK) p.data.valtozok[k] = listava(p.data.valtozok[k]) // older projects: one string
  p.data.valtozokForras ??= {}
  data.value = p.data
  verzio.value = p.verzio
  for (const id of data.value.fejlec.kepek) kepBetolt(id)
  watch(data, () => (valtozott.value = true), { deep: true, flush: 'sync' })
}))

// The spinner stays at least 600 ms so a fast save is still visible.
const ment = () => fut(async () => {
  if (mentes.value) return
  mentes.value = true
  try {
    const [r] = await Promise.all([api().projektMent(props.id, data.value, verzio.value), new Promise(ok => setTimeout(ok, 600))])
    verzio.value = r.verzio
    valtozott.value = false
  } finally {
    mentes.value = false
  }
})

function lejaratAtvesz(datum, forrasAdat) {
  data.value.valtozok.domainLejarat = datum
  if (forrasAdat) data.value.valtozokForras.domainLejarat = forrasAdat
  else delete data.value.valtozokForras.domainLejarat
}
const idopont = s => new Date(s).toLocaleString('hu-HU', { dateStyle: 'short', timeStyle: 'short' })

const kepBetolt = id => fut(async () => { kepUrl.value[id] = await api().fajlUrl(id) })
const kepFeltolt = e => fut(async () => {
  for (const file of e.target.files) {
    const id = await api().fajlFeltolt(props.id, file)
    data.value.fejlec.kepek.push(id)
    kepBetolt(id)
  }
  e.target.value = ''
})
const kepTorol = i => data.value.fejlec.kepek.splice(i, 1) // ponytail: file stays in the Drive folder

const projektekKell = () => projektek.value ?? fut(async () => { projektek.value = (await api().projektek()).filter(p => p.id !== props.id) })
const atvesz = (blokkId, projektId) => fut(async () => {
  const { data: masik } = await api().projektBetolt(projektId)
  if (!masik.blokkok[blokkId]) throw new Error('A kiválasztott projektben nincs ilyen blokk.')
  data.value.blokkok[blokkId] = structuredClone(masik.blokkok[blokkId])
  ujratoltes.value++
})

function aktivValt(id) {
  const k = data.value.kihagyott
  k.includes(id) ? k.splice(k.indexOf(id), 1) : k.push(id)
}

// Pointer-based sorting: the grabbed row follows the pointer, the rows it passes slide out of the
// way by its height. Targets come from positions measured at grab time (page coords, so scrolling
// while dragging is fine), so nothing flickers. The order is committed on release; Esc cancels.
// Alt+↑/↓ on the handle does the same from the keyboard.
// ponytail: no auto-scroll at the screen edge; scroll with the wheel while dragging if needed.
const lista = ref(null)
function huzasKezd(e, i) {
  if (e.button !== 0) return
  e.preventDefault()
  getSelection()?.removeAllRanges()
  const t = [...lista.value.querySelectorAll('[data-sor]')].map(s => s.getBoundingClientRect())
  const res = t.length > 1 ? t[1].top - t[0].bottom : 8
  huzas.value = { i, kezdoY: e.pageY, dy: 0, cel: i, lepes: t[i].height + res, kozepek: t.map(r => r.top + scrollY + r.height / 2) }
  e.currentTarget.setPointerCapture(e.pointerId)
  addEventListener('keydown', huzasEsc)
}
function huzasMozog(e) {
  const h = huzas.value
  if (!h) return
  h.dy = e.pageY - h.kezdoY
  const y = h.kozepek[h.i] + h.dy
  h.cel = h.kozepek.filter((k, j) => j !== h.i && k < y).length
}
function huzasVeg() {
  const h = huzas.value
  if (h) mozgat(data.value.blokkSorrend, h.i, h.cel)
  huzasMegszakit()
}
function huzasMegszakit() {
  huzas.value = null
  removeEventListener('keydown', huzasEsc)
}
const huzasEsc = e => e.key === 'Escape' && huzasMegszakit()
// Vertical offset of row j while dragging.
function eltolas(j) {
  const h = huzas.value
  if (j === h.i) return h.dy
  if (h.i < j && j <= h.cel) return -h.lepes
  if (h.cel <= j && j < h.i) return h.lepes
  return 0
}

function sablonBetolt(e) {
  const id = e.target.value
  e.target.value = ''
  if (!id || !confirm('A cím, az alcím, a szolgáltatások sorrendje és az aktív/kihagyott állapot a sablon szerint áll be. A már kitöltött szolgáltatások beállításai megmaradnak. Folytatod?')) return
  sablonAlkalmaz(data.value, sablonok.value, id)
}

// Ctrl+S saves; leaving with unsaved changes asks first.
const billentyu = e => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); ment() } }
const elhagy = e => { if (valtozott.value) e.preventDefault() }
onMounted(() => { addEventListener('keydown', billentyu); addEventListener('beforeunload', elhagy) })
onBeforeUnmount(() => { removeEventListener('keydown', billentyu); removeEventListener('beforeunload', elhagy) })
onBeforeRouteLeave(() => !valtozott.value || confirm('Nem mentett módosításaid vannak. Biztosan kilépsz?'))
</script>

<template>
  <p v-if="hiba" class="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{{ hiba }}</p>
  <div v-if="!data" class="text-sm text-slate-500">{{ hiba ? '' : 'Betöltés…' }}</div>
  <div v-else class="space-y-4">
    <!-- Ragadós eszköztár -->
    <div class="sticky top-0 z-10 -mx-4 flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur">
      <RouterLink to="/" class="text-sm text-slate-500 hover:text-slate-800">← Projektek</RouterLink>
      <h1 class="mr-auto truncate text-xl font-semibold">{{ data.nev || 'Névtelen projekt' }}</h1>
      <span class="text-xs text-slate-500">
        <span class="text-green-700">{{ osszesito.kesz }} kész</span> ·
        <span class="text-amber-700">{{ osszesito.hianyos }} hiányos</span> ·
        <span class="text-red-700">{{ osszesito.ures }} üres</span> ·
        {{ osszesito.nemRelevans }} nem releváns
      </span>
      <RouterLink :to="`/projekt/${id}/nyomtatas`" class="btn px-2" title="Nyomtatási nézet" aria-label="Nyomtatási nézet">
        <Ikon nev="nyomtato" />
      </RouterLink>
      <button
        class="btn min-w-28 justify-center transition-colors"
        :class="valtozott || mentes ? 'btn-primary' : 'border-green-600 bg-green-50 text-green-700 hover:bg-green-50'"
        :disabled="mentes || !valtozott"
        title="Mentés (Ctrl+S)"
        @click="ment"
      >
        <template v-if="mentes"><Ikon nev="tolto" class="h-4 w-4" /> Mentés…</template>
        <template v-else-if="valtozott">Mentés</template>
        <template v-else><Ikon nev="pipa" class="h-4 w-4 animate-[pop_.35s_ease-out]" /> Mentve</template>
      </button>
    </div>

    <!-- Alapadatok -->
    <section class="card grid gap-3 sm:grid-cols-3">
      <div>
        <label class="label" for="nev">Projekt neve</label>
        <input id="nev" v-model="data.nev" class="input" />
      </div>
      <div>
        <label class="label" for="ugyfel">Ügyfél neve (Kedvezményezett)</label>
        <input id="ugyfel" v-model="data.ugyfelNev" class="input" />
      </div>
      <div>
        <label class="label" for="tipus">Projekttípus</label>
        <select id="tipus" v-model="data.tipus" class="input">
          <option v-for="t in sablonok.tipusok" :key="t.id" :value="t.id">{{ t.nev }}</option>
        </select>
      </div>
      <div v-for="k in mezok" :key="k">
        <label class="label" :for="`v-${k}`">{{ VALTOZO_CIMKEK[k] ?? k }}</label>
        <ListaMezo v-if="LISTA_VALTOZOK.includes(k)" :id="`v-${k}`" v-model="data.valtozok[k]" :javaslatok="JAVASLATOK[k]" />
        <div v-else class="flex gap-1">
          <input
            :id="`v-${k}`"
            v-model="data.valtozok[k]"
            class="input"
            :class="{ 'border-amber-400 bg-amber-50': !data.valtozok[k]?.trim() }"
            :placeholder="PELDAK[k] ?? ''"
            @input="k === 'domainLejarat' && kezziModositva()"
          />
          <button v-if="k === 'domainLejarat'" type="button" class="btn shrink-0 px-2" :disabled="!domain" :title="domain ? 'Lekérdezés az info.domain.hu oldalról' : 'Csak .hu domain kérdezhető le'" @click="whoisNyitva = true">
            <Ikon nev="kereses" class="h-4 w-4" />
          </button>
        </div>
        <template v-if="k === 'domainLejarat'">
          <p v-if="lejaratForras" class="mt-1 text-xs text-slate-500">
            Forrás: <a :href="lejaratForras.forras" target="_blank" rel="noopener" class="text-indigo-600 hover:underline">info.domain.hu</a>
            · {{ idopont(lejaratForras.lekerdezve) }}<template v-if="lejaratForras.allapot"> · {{ lejaratForras.allapot }}</template>
          </p>
        </template>
        <p v-if="TIPPEK[k]" class="mt-1 text-xs text-slate-500">{{ TIPPEK[k] }}</p>
      </div>
      <div class="sm:col-span-3">
        <label class="label" for="cim">Beszámoló címe</label>
        <input id="cim" v-model="data.cim" class="input" />
      </div>
      <div class="sm:col-span-3">
        <label class="label" for="alcim">Alcím</label>
        <input id="alcim" v-model="data.alcim" class="input" />
      </div>
    </section>

    <!-- Fejléc -->
    <section class="card space-y-3">
      <h2 class="font-medium">Fejléc <span class="text-xs font-normal text-slate-500">(az ügyféltől / a hivatalos szervtől kapott képek és szöveg)</span></h2>
      <div class="flex flex-wrap items-center gap-3">
        <div v-for="(k, i) in data.fejlec.kepek" :key="k" class="relative">
          <img v-if="kepUrl[k]" :src="kepUrl[k]" alt="Fejléc kép" class="h-16 rounded border border-slate-200 object-contain" />
          <div v-else class="flex h-16 w-24 items-center justify-center rounded border border-slate-200 text-xs text-slate-400">Betöltés…</div>
          <button class="absolute -right-2 -top-2 h-5 w-5 rounded-full bg-red-600 text-xs text-white" title="Eltávolítás" @click="kepTorol(i)">×</button>
        </div>
        <label class="btn cursor-pointer">
          <Ikon nev="feltolt" class="h-4 w-4" /> Képek feltöltése
          <input type="file" accept="image/*" multiple class="sr-only" @change="kepFeltolt" />
        </label>
      </div>
      <textarea v-model="data.fejlec.szoveg" rows="2" class="input" placeholder="Fejléc szövege (opcionális)"></textarea>
    </section>

    <!-- Blokkok -->
    <section class="space-y-2">
      <div class="flex flex-wrap items-center gap-2">
        <h2 class="mr-auto font-medium">
          Szolgáltatások
          <span class="text-xs font-normal text-slate-500">({{ aktivak.length }} a beszámolóban, {{ blokkok.length - aktivak.length }} kihagyva · húzd a fogantyúnál a sorrendhez)</span>
        </h2>
        <select class="input w-auto text-sm" @change="sablonBetolt">
          <option value="">Beszámolósablon betöltése…</option>
          <option v-for="b in sablonok.beszamolok" :key="b.id" :value="b.id">{{ b.nev }}</option>
        </select>
      </div>
      <div ref="lista" class="space-y-2" :class="{ 'cursor-grabbing select-none': huzas }">
      <div
        v-for="(b, i) in blokkok"
        :key="`${b.id}-${ujratoltes}`"
        data-sor
        class="relative flex items-start gap-1 rounded-lg"
        :class="huzas && (huzas.i === i ? 'z-10 scale-[1.01] bg-white shadow-2xl ring-2 ring-indigo-400' : 'transition-transform duration-200 ease-out')"
        :style="huzas ? { transform: `translateY(${eltolas(i)}px)` } : null"
      >
        <div class="flex flex-col items-center pt-2 text-slate-400">
          <button
            class="cursor-grab touch-none rounded p-0.5 hover:bg-slate-200 hover:text-slate-700 active:cursor-grabbing"
            title="Húzd a sorrend módosításához (billentyűzettel: Alt+↑/↓, megszakítás: Esc)"
            :aria-label="`${b.cim} áthelyezése`"
            @mousedown.prevent
            @pointerdown="huzasKezd($event, i)"
            @pointermove="huzasMozog"
            @pointerup="huzasVeg"
            @pointercancel="huzasMegszakit"
            @keydown.alt.up.prevent="mozgat(data.blokkSorrend, i, i - 1)"
            @keydown.alt.down.prevent="mozgat(data.blokkSorrend, i, i + 1)"
          >
            <Ikon nev="fogo" class="h-4 w-4" />
          </button>
          <button
            class="rounded p-0.5 hover:bg-slate-200"
            :class="kihagyva(b.id) ? 'text-slate-400 hover:text-slate-700' : 'text-indigo-500 hover:text-indigo-700'"
            :title="kihagyva(b.id) ? 'Visszavétel a beszámolóba' : 'Kihagyás a beszámolóból (inaktív)'"
            @click="aktivValt(b.id)"
          >
            <Ikon :nev="kihagyva(b.id) ? 'szemZart' : 'szem'" class="h-4 w-4" />
          </button>
        </div>
        <BlokkSzerkeszto
          class="min-w-0 flex-1"
          :blokk="b"
          :allapot="data.blokkok[b.id]"
          :inaktiv="kihagyva(b.id)"
          :valtozok="data.valtozok"
          :projektek="projektek"
          @projektek-kell="projektekKell"
          @atvesz="pid => atvesz(b.id, pid)"
        />
      </div>
      </div>
    </section>
    <WhoisModal v-if="whoisNyitva" :domain="domain" @atvesz="lejaratAtvesz" @bezar="whoisNyitva = false" />
  </div>
</template>
