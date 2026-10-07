<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../api.js'
import { ujProjekt } from '../render.js'
import Ikon from '../components/Ikon.vue'

const router = useRouter()
const lista = ref(null)
const sablonok = ref(null)
const kereses = ref('')
const hiba = ref('')
const uj = ref(null) // { nev, ugyfelNev, tipus } while the form is open
const dolgozik = ref(false)

const szurt = computed(() => {
  const q = kereses.value.trim().toLowerCase()
  return (lista.value ?? []).filter(p => !q || `${p.nev} ${p.ugyfelNev}`.toLowerCase().includes(q))
})
const datum = s => (s ? new Date(s).toLocaleString('hu-HU', { dateStyle: 'medium', timeStyle: 'short' }) : '')

async function fut(fn) {
  hiba.value = ''
  dolgozik.value = true
  try { await fn() } catch (e) { hiba.value = e.message } finally { dolgozik.value = false }
}

onMounted(() => fut(async () => {
  const [l, s] = await Promise.all([api().projektek(), api().sablonokBetolt()])
  lista.value = l
  sablonok.value = s?.beszamolok ? s : null
}))

function ujNyit() {
  uj.value = { nev: '', ugyfelNev: '', tipus: sablonok.value.tipusok[0].id, beszamolo: sablonok.value.beszamolok[0].id }
}

const letrehoz = () => fut(async () => {
  if (!uj.value.nev.trim()) throw new Error('Add meg a projekt nevét (pl. a domaint).')
  const data = ujProjekt(sablonok.value, { ...uj.value, nev: uj.value.nev.trim(), ugyfelNev: uj.value.ugyfelNev.trim() })
  data.valtozok.domain = data.nev
  const { id } = await api().projektMent(null, data)
  router.push(`/projekt/${id}`)
})

const duplikal = p => fut(async () => {
  const nev = prompt('Az új projekt neve:', `${p.nev} (másolat)`)
  if (!nev) return
  const { data } = await api().projektBetolt(p.id)
  // Header images belong to the source folder; the copy starts without them.
  await api().projektMent(null, { ...structuredClone(data), nev, fejlec: { ...data.fejlec, kepek: [] } })
  lista.value = await api().projektek()
})

const torol = p => fut(async () => {
  if (!confirm(`Törlöd a(z) „${p.nev}” projektet? (Drive módban a kukából 30 napig visszaállítható.)`)) return
  await api().projektTorol(p.id)
  lista.value = lista.value.filter(x => x.id !== p.id)
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-2">
      <h1 class="mr-auto text-xl font-semibold">Projektek</h1>
      <input v-model="kereses" class="input max-w-xs" placeholder="Keresés név vagy ügyfél szerint…" />
      <button class="btn btn-primary" :disabled="!sablonok" @click="ujNyit">+ Új projekt</button>
    </div>

    <p v-if="hiba" class="rounded-md bg-red-50 p-3 text-sm text-red-700">{{ hiba }}</p>
    <p v-if="lista && !sablonok" class="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
      Még nincsenek sablonok. <RouterLink to="/beallitas" class="underline">Importáld őket a Beállításokban.</RouterLink>
    </p>

    <form v-if="uj" class="card grid gap-3 sm:grid-cols-2" @submit.prevent="letrehoz">
      <div>
        <label class="label" for="nev">Projekt neve (pl. domain)</label>
        <input id="nev" v-model="uj.nev" class="input" placeholder="pelda.hu" autofocus />
      </div>
      <div>
        <label class="label" for="ugyfel">Ügyfél neve</label>
        <input id="ugyfel" v-model="uj.ugyfelNev" class="input" />
      </div>
      <div>
        <label class="label" for="tipus">Projekttípus</label>
        <select id="tipus" v-model="uj.tipus" class="input">
          <option v-for="t in sablonok.tipusok" :key="t.id" :value="t.id">{{ t.nev }}</option>
        </select>
      </div>
      <div>
        <label class="label" for="beszamolo">Beszámolósablon (kiindulópont, később módosítható)</label>
        <select id="beszamolo" v-model="uj.beszamolo" class="input">
          <option v-for="b in sablonok.beszamolok" :key="b.id" :value="b.id">{{ b.nev }}</option>
        </select>
      </div>
      <div class="flex gap-2 sm:col-span-2">
        <button class="btn btn-primary" :disabled="dolgozik">Létrehozás</button>
        <button type="button" class="btn" @click="uj = null">Mégse</button>
      </div>
    </form>

    <div v-if="lista === null" class="text-sm text-slate-500">Betöltés…</div>
    <div v-else-if="!szurt.length" class="card text-center text-sm text-slate-500">
      {{ lista.length ? 'Nincs találat.' : 'Még nincs projekt. Hozd létre az elsőt!' }}
    </div>
    <ul v-else class="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
      <li v-for="p in szurt" :key="p.id" class="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-slate-50">
        <RouterLink :to="`/projekt/${p.id}`" class="min-w-0 flex-1">
          <div class="truncate font-medium text-slate-900">{{ p.nev }}</div>
          <div class="truncate text-sm text-slate-500">{{ p.ugyfelNev || '—' }} · módosítva: {{ datum(p.modositva) }}</div>
        </RouterLink>
        <RouterLink :to="`/projekt/${p.id}/nyomtatas`" class="btn px-2" title="Nyomtatási nézet" aria-label="Nyomtatási nézet"><Ikon nev="nyomtato" /></RouterLink>
        <button class="btn" :disabled="dolgozik" @click="duplikal(p)">Duplikálás</button>
        <button class="btn btn-danger" :disabled="dolgozik" @click="torol(p)">Törlés</button>
      </li>
    </ul>
  </div>
</template>
