<script setup>
import { ref, computed, onMounted } from 'vue'
import { config, setConfig } from '../config.js'
import { api } from '../api.js'
import * as drive from '../drive.js'
import * as demoTar from '../demo.js'
import { mappaId } from '../render.js'

const hiba = ref('')
const uzenet = ref('')
const link = ref('')
const mappaNev = ref('')
const sablonok = ref(undefined) // undefined = not checked yet, null = missing
const kesz = computed(() => config.mode && (config.mode === 'demo' || config.rootId))

async function fut(fn) {
  hiba.value = uzenet.value = ''
  try { await fn() } catch (e) { hiba.value = e.message }
}

// Old format (before report templates existed) counts as missing → re-import.
const sablonEllenoriz = () => fut(async () => { const s = await api().sablonokBetolt(); sablonok.value = s?.beszamolok ? s : null })

const belep = () => fut(drive.login)

const mappaMent = () => fut(async () => {
  const id = mappaId(link.value)
  if (!id) throw new Error('Ez nem tűnik Google Drive mappa linknek.')
  mappaNev.value = await drive.mappaEllenoriz(id)
  setConfig('drive', id)
  await sablonEllenoriz()
})

// Demo mode starts with sample data (if this browser has none yet).
const demo = () => fut(async () => {
  setConfig('demo')
  if (!(await demoTar.sablonokBetolt())) await demoTar.mintaBetolt()
  await sablonEllenoriz()
})
const mintaVissza = () => fut(async () => {
  if (!confirm('A demó összes adata törlődik, és a mintaadatok töltődnek be. Folytatod?')) return
  await demoTar.mintaBetolt()
  await sablonEllenoriz()
  uzenet.value = 'Mintaadatok visszaállítva.'
})

function torol() {
  if (!confirm('Biztosan leválasztod? Az adatok a Drive-on (vagy demóban a böngészőben) megmaradnak.')) return
  if (config.mode === 'drive') drive.logout()
  setConfig(null)
  sablonok.value = undefined
}

const importal = e => fut(async () => {
  const file = e.target.files[0]
  e.target.value = ''
  if (!file) return
  const data = JSON.parse(await file.text())
  if (!['blokkok', 'tipusok', 'beszamolok'].every(k => Array.isArray(data[k]))) throw new Error('A fájlban nincs "blokkok", "tipusok" és "beszamolok" lista.')
  if (sablonok.value && !confirm('A meglévő sablonokat felülírja. A már elkészült projektek szövegét ez nem érinti. Folytatod?')) return
  await api().sablonokMent(data)
  sablonok.value = data
  uzenet.value = `Sablonok importálva: ${data.blokkok.length} szolgáltatás, ${data.beszamolok.length} beszámolósablon, ${data.tipusok.length} projekttípus.`
})

function exportal() {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([JSON.stringify(sablonok.value, null, 2)], { type: 'application/json' }))
  a.download = 'sablonok.json'
  a.click()
}

onMounted(() => { if (kesz.value && api().auth.loggedIn) sablonEllenoriz() })
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-4">
    <h1 class="text-xl font-semibold">Beállítások</h1>
    <p v-if="hiba" class="rounded-md bg-red-50 p-3 text-sm text-red-700">{{ hiba }}</p>
    <p v-if="uzenet" class="rounded-md bg-green-50 p-3 text-sm text-green-700">{{ uzenet }}</p>

    <!-- 1. Adattár -->
    <section class="card space-y-3">
      <h2 class="font-medium">1. Adattár</h2>
      <template v-if="!config.mode">
        <p class="text-sm text-slate-600">Az adatok egy megosztott Google Drive mappában vannak. Kipróbáláshoz használhatod a demó módot is: mintaadatokkal indul, és minden csak ebben a böngészőben tárolódik.</p>
        <div v-if="!drive.auth.loggedIn" class="flex flex-wrap gap-2">
          <button class="btn btn-primary" @click="belep">Bejelentkezés Google-lel</button>
          <button class="btn" @click="demo">Demó mód (mintaadatokkal)</button>
        </div>
        <div v-else class="space-y-2">
          <p class="text-sm">Bejelentkezve: <b>{{ drive.auth.email }}</b></p>
          <label class="label" for="link">A megosztott gyökérmappa linkje</label>
          <div class="flex gap-2">
            <input id="link" v-model="link" class="input" placeholder="https://drive.google.com/drive/folders/…" @keyup.enter="mappaMent" />
            <button class="btn btn-primary" @click="mappaMent">Mentés</button>
          </div>
        </div>
      </template>
      <div v-else class="flex items-center justify-between gap-2 text-sm">
        <span v-if="config.mode === 'demo'" class="flex flex-wrap items-center gap-2">
          Demó mód (csak ebben a böngészőben)
          <button class="text-xs text-indigo-600 hover:underline" @click="mintaVissza">Mintaadatok visszaállítása</button>
        </span>
        <span v-else>Google Drive mappa{{ mappaNev ? `: ${mappaNev}` : '' }} <code class="text-xs text-slate-500">{{ config.rootId }}</code></span>
        <button class="btn btn-danger" @click="torol">Leválasztás</button>
      </div>
    </section>

    <!-- 2. Sablonok -->
    <section v-if="kesz" class="card space-y-3">
      <h2 class="font-medium">2. Sablonok</h2>
      <p v-if="sablonok === undefined" class="text-sm text-slate-500">
        <button class="btn" @click="sablonEllenoriz">Sablonok ellenőrzése</button>
      </p>
      <p v-else-if="sablonok === null" class="text-sm text-amber-700">Még nincsenek sablonok (vagy régi formátumúak). Importáld a <code>sablonok-seed.json</code> fájlt.</p>
      <p v-else class="text-sm">{{ sablonok.blokkok.length }} szolgáltatás · beszámolósablonok: {{ sablonok.beszamolok.map(b => b.nev).join(', ') }} · típusok: {{ sablonok.tipusok.map(t => t.nev).join(', ') }}</p>
      <div v-if="sablonok !== undefined" class="flex flex-wrap gap-2">
        <label class="btn cursor-pointer">
          Importálás JSON fájlból
          <input type="file" accept=".json,application/json" class="sr-only" @change="importal" />
        </label>
        <button v-if="sablonok" class="btn" @click="exportal">Exportálás (mentés)</button>
        <RouterLink v-if="sablonok" to="/" class="btn btn-primary">Tovább a projektekhez</RouterLink>
      </div>
    </section>
  </div>
</template>
