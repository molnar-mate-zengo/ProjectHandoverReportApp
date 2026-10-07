<script setup>
import { ref, computed } from 'vue'
import { valt, forras, html, szoveg, hianyos } from '../render.js'

// `allapot` is the project's block state object; edited in place (the parent owns save/dirty tracking).
const props = defineProps({ blokk: Object, allapot: Object, inaktiv: Boolean, valtozok: Object, projektek: Array })
const emit = defineEmits(['atvesz', 'projektekKell'])

const egyeniNyitva = ref(!!props.allapot.egyeni)
const masolva = ref(false)
const atvetelNyitva = ref(false)

const src = computed(() => forras(props.allapot))
const elonezet = computed(() => html(src.value, props.valtozok))
const kivalasztott = id => props.allapot.opciok.find(o => o.id === id)
const statusz = computed(() => {
  if (props.inaktiv) return { szoveg: 'Kihagyva', szin: 'bg-slate-200 text-slate-500' }
  if (props.allapot.nemRelevans) return { szoveg: 'Nem releváns', szin: 'bg-slate-100 text-slate-600' }
  if (!src.value.trim()) return { szoveg: 'Nincs kiválasztva', szin: 'bg-red-100 text-red-700' }
  if (hianyos(src.value, props.valtozok)) return { szoveg: 'Hiányzó adat', szin: 'bg-amber-100 text-amber-800' }
  return { szoveg: 'Kész', szin: 'bg-green-100 text-green-700' }
})

function egyeniValt(e) {
  egyeniNyitva.value = e.target.checked
  if (e.target.checked) props.allapot.nemRelevans = false
  else props.allapot.egyeni = ''
}

async function masol() {
  const t = szoveg(src.value, props.valtozok)
  try {
    // Rich copy keeps bold/lists when pasted into Word or Docs.
    await navigator.clipboard.write([new ClipboardItem({ 'text/plain': new Blob([t], { type: 'text/plain' }), 'text/html': new Blob([elonezet.value], { type: 'text/html' }) })])
  } catch {
    await navigator.clipboard.writeText(t)
  }
  masolva.value = true
  setTimeout(() => (masolva.value = false), 1500)
}

function atvetelValt() {
  atvetelNyitva.value = !atvetelNyitva.value
  if (atvetelNyitva.value) emit('projektekKell')
}
function atvesz(e) {
  if (!e.target.value) return
  emit('atvesz', e.target.value)
  atvetelNyitva.value = false
}
</script>

<template>
  <details class="group rounded-lg border border-slate-200 bg-white shadow-sm transition" :class="{ 'border-dashed bg-slate-50 opacity-60 shadow-none': inaktiv }">
    <summary class="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
      <span class="text-lg leading-none text-slate-400 transition group-open:rotate-90">›</span>
      <span class="flex-1 font-medium" :class="{ 'text-slate-500 line-through decoration-slate-400': inaktiv }">
        {{ blokk.cim }}
        <span v-if="blokk.megjegyzes" class="block text-xs font-normal italic text-slate-500">{{ blokk.megjegyzes }}</span>
      </span>
      <span class="rounded px-2 py-0.5 text-xs font-medium" :class="statusz.szin">{{ statusz.szoveg }}</span>
    </summary>

    <div class="grid gap-4 border-t border-slate-200 p-4 md:grid-cols-2">
      <!-- Választás -->
      <div class="space-y-2" :class="{ 'opacity-50': allapot.nemRelevans }">
        <div v-for="o in blokk.opciok" :key="o.id" class="space-y-1">
          <label class="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              class="mt-0.5"
              :class="{ 'rounded-full': o.csoport }"
              :checked="!!kivalasztott(o.id)"
              @change="valt(allapot, blokk, o, $event.target.checked)"
            />
            <span>{{ o.cimke }} <span v-if="o.csoport" class="text-xs text-slate-400">(egy választható)</span></span>
          </label>
          <div v-if="kivalasztott(o.id)" class="pl-6">
            <textarea v-model="kivalasztott(o.id).szoveg" rows="4" class="input text-xs"></textarea>
            <button v-if="kivalasztott(o.id).szoveg !== o.szoveg" class="text-xs text-indigo-600 hover:underline" @click="kivalasztott(o.id).szoveg = o.szoveg">
              Visszaállítás a sablon szövegére
            </button>
          </div>
        </div>
      </div>
      <div class="space-y-2 md:col-start-1">
        <label class="flex items-center gap-2 text-sm">
          <input type="checkbox" :checked="egyeniNyitva" @change="egyeniValt" />
          Egyéni szöveg
        </label>
        <textarea v-if="egyeniNyitva" v-model="allapot.egyeni" rows="3" class="input text-xs" placeholder="Saját leírás… (új sor = új bekezdés, „- ” = felsorolás)"></textarea>
        <label class="flex items-center gap-2 text-sm">
          <input type="checkbox" v-model="allapot.nemRelevans" />
          Nem releváns
        </label>
      </div>

      <!-- Előnézet -->
      <div class="md:col-start-2 md:row-span-2 md:row-start-1">
        <div class="mb-1 flex items-center gap-2">
          <span class="label mb-0 mr-auto">Előnézet</span>
          <button class="text-xs text-indigo-600 hover:underline" @click="atvetelValt">Átvétel másik projektből</button>
          <button class="btn py-0.5 text-xs" @click="masol">{{ masolva ? 'Másolva ✓' : 'Másolás' }}</button>
        </div>
        <select v-if="atvetelNyitva" class="input mb-2 text-xs" @change="atvesz">
          <option value="">{{ projektek ? 'Válassz projektet…' : 'Betöltés…' }}</option>
          <option v-for="p in projektek" :key="p.id" :value="p.id">{{ p.nev }}{{ p.ugyfelNev ? ` – ${p.ugyfelNev}` : '' }}</option>
        </select>
        <div class="cella rounded-md border border-slate-200 bg-slate-50 p-3 text-sm" v-html="elonezet"></div>
      </div>
    </div>
  </details>
</template>
