<script setup>
import { ref, onMounted } from 'vue'
import { whoisLink, huDatum } from '../render.js'
import { whoisElerheto, whoisLekerdez } from '../whois.js'
import Ikon from './Ikon.vue'

// Expiry lookup in a modal: fetched data with "✓ Átvétel" on top, the official page embedded below.
const props = defineProps({ domain: String })
const emit = defineEmits(['atvesz', 'bezar'])

const dialog = ref(null)
const fut = ref(false)
const hiba = ref('')
const eredmeny = ref(null)
const kezi = ref('')
const oldalNyitva = ref(false)
const link = whoisLink(props.domain)

async function lekerdez() {
  if (!whoisElerheto) return
  fut.value = true
  hiba.value = ''
  eredmeny.value = null
  try { eredmeny.value = await whoisLekerdez(props.domain) } catch (e) {
    hiba.value = e.message === 'Failed to fetch' ? 'A lekérdezés nem sikerült (hálózat vagy közvetítő).' : e.message
  } finally { fut.value = false }
}

function atvesz(datum, forras) {
  emit('atvesz', datum, forras)
  dialog.value.close()
}
const atveszLekerdezett = () =>
  atvesz(huDatum(eredmeny.value.lejarat), { forras: link, lekerdezve: eredmeny.value.lekerdezve, allapot: eredmeny.value.allapot })
const keziOk = () => /^\d{4}\.\d{2}\.\d{2}\.?$/.test(kezi.value.trim())
const atveszKezi = () => atvesz(kezi.value.trim().replace(/\.?$/, '.'), null)

const ido = s => new Date(s).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })

onMounted(() => {
  dialog.value.showModal()
  lekerdez()
})
</script>

<template>
  <dialog
    ref="dialog"
    class="m-auto w-[min(56rem,calc(100vw-2rem))] rounded-xl p-0 shadow-2xl backdrop:bg-slate-900/50 backdrop:backdrop-blur-sm"
    aria-labelledby="whois-cim"
    @close="emit('bezar')"
  >
    <div class="flex items-center gap-3 border-b border-slate-200 px-5 py-3">
      <h2 id="whois-cim" class="mr-auto font-semibold">Domain lejárata – <span class="font-mono">{{ domain }}</span></h2>
      <a :href="link" target="_blank" rel="noopener" class="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline">Megnyitás új lapon <Ikon nev="kulso" class="h-3.5 w-3.5" /></a>
      <button class="btn px-1.5" title="Bezárás (Esc)" @click="dialog.close()"><Ikon nev="x" class="h-4 w-4" /></button>
    </div>

    <div class="space-y-4 p-5">
      <!-- Lekérdezett adat -->
      <div v-if="fut" class="flex items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-800">
        <Ikon nev="tolto" /> Lekérdezés az info.domain.hu oldalról…
      </div>

      <div v-else-if="eredmeny" class="flex flex-wrap items-center gap-6 rounded-lg border border-green-200 bg-green-50 p-4">
        <div>
          <div class="text-xs font-medium uppercase tracking-wide text-green-700">Lejárat</div>
          <div class="text-2xl font-semibold text-green-900">{{ huDatum(eredmeny.lejarat) }}</div>
        </div>
        <dl class="grid flex-1 grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
          <dt class="text-slate-500">Állapot</dt><dd>{{ eredmeny.allapot ?? '–' }}</dd>
          <dt class="text-slate-500">Regisztrálva</dt><dd>{{ eredmeny.regisztralva ? huDatum(eredmeny.regisztralva) : '–' }}</dd>
          <dt class="text-slate-500">Regisztrátor</dt><dd>{{ eredmeny.regisztrator ?? '–' }}</dd>
          <dt class="text-slate-500">Forrás</dt><dd>info.domain.hu · {{ ido(eredmeny.lekerdezve) }}</dd>
        </dl>
        <div class="flex flex-col gap-2">
          <button class="btn btn-primary justify-center" autofocus @click="atveszLekerdezett"><Ikon nev="pipa" class="h-4 w-4" /> Átvétel</button>
          <button class="text-xs text-slate-500 hover:text-slate-800" @click="lekerdez">Újra lekérdez</button>
        </div>
      </div>

      <div v-else class="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
        <p v-if="hiba" class="text-amber-900">{{ hiba }}</p>
        <p v-else class="text-amber-900">Az automatikus lekérdezés nincs beállítva (SETUP.md, 6. pont). Nyisd le alul az info.domain.hu oldalt, és olvasd le a lejáratot:</p>
        <div class="flex flex-wrap items-center gap-2">
          <input v-model="kezi" class="input w-40" placeholder="éééé.hh.nn." aria-label="Lejárat kézzel" @keydown.enter="keziOk() && atveszKezi()" />
          <button class="btn btn-primary" :disabled="!keziOk()" @click="atveszKezi"><Ikon nev="pipa" class="h-4 w-4" /> Átvétel</button>
          <button v-if="hiba" class="btn" @click="lekerdez">Újra lekérdez</button>
        </div>
      </div>

      <!-- Az eredeti oldal -->
      <!-- Closed by default; the iframe only loads once opened. -->
      <details class="group rounded-lg border border-slate-200" @toggle="oldalNyitva = $event.target.open">
        <summary class="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
          <span class="text-lg leading-none text-slate-400 transition group-open:rotate-90">›</span>
          Az info.domain.hu oldal (ellenőrzéshez)
        </summary>
        <iframe v-if="oldalNyitva" :src="link" title="info.domain.hu domain információ" class="h-[45vh] w-full rounded-b-lg border-t border-slate-200 bg-white" referrerpolicy="no-referrer"></iframe>
      </details>
    </div>
  </dialog>
</template>
