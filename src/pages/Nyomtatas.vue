<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from '../api.js'
import { forras, html, hianyos, blokkokPotol, aktivBlokkok } from '../render.js'
import Ikon from '../components/Ikon.vue'

const props = defineProps({ id: String })
const data = ref(null)
const sablonok = ref(null)
const kepek = ref([])
const hiba = ref('')

const sorok = computed(() =>
  aktivBlokkok(data.value)
    .map(id => sablonok.value.blokkok.find(b => b.id === id))
    .filter(Boolean)
    .map(b => {
      const src = forras(data.value.blokkok[b.id])
      return { blokk: b, html: html(src, data.value.valtozok), hianyos: !src.trim() || hianyos(src, data.value.valtozok) }
    }),
)
const nyomtat = () => window.print()
const hianyosDb = computed(() => sorok.value.filter(s => s.hianyos).length)

onMounted(async () => {
  try {
    const [p, s] = await Promise.all([api().projektBetolt(props.id), api().sablonokBetolt()])
    p.data.blokkSorrend ??= Object.keys(p.data.blokkok) // projects saved before report templates existed
    blokkokPotol(p.data, s)
    data.value = p.data
    sablonok.value = s
    kepek.value = await Promise.all(p.data.fejlec.kepek.map(id => api().fajlUrl(id)))
  } catch (e) {
    hiba.value = e.message
  }
})
</script>

<template>
  <p v-if="hiba" class="rounded-md bg-red-50 p-3 text-sm text-red-700">{{ hiba }}</p>
  <div v-else-if="!data" class="text-sm text-slate-500">Betöltés…</div>
  <div v-else>
    <div class="mb-4 flex flex-wrap items-center gap-2 print:hidden">
      <RouterLink :to="`/projekt/${id}`" class="text-sm text-slate-500 hover:text-slate-800">← Vissza a szerkesztéshez</RouterLink>
      <span v-if="hianyosDb" class="ml-auto rounded bg-amber-100 px-2 py-1 text-xs text-amber-800">{{ hianyosDb }} sor hiányos (sárgával jelölve)</span>
      <button class="btn btn-primary" :class="{ 'ml-auto': !hianyosDb }" @click="nyomtat"><Ikon nev="nyomtato" class="h-4 w-4" /> Nyomtatás / PDF</button>
    </div>

    <!-- A4 lap: képernyőn papírszerű, nyomtatásban a @page margók érvényesek -->
    <article class="mx-auto max-w-[210mm] bg-white p-[16mm] text-[10.5pt] leading-snug text-black shadow print:max-w-none print:p-0 print:shadow-none">
      <header v-if="kepek.length || data.fejlec.szoveg" class="mb-6 text-center">
        <div v-if="kepek.length" class="mb-2 flex flex-wrap items-center justify-center gap-4">
          <img v-for="(u, i) in kepek" :key="i" :src="u" alt="" class="max-h-24 object-contain" />
        </div>
        <p v-if="data.fejlec.szoveg" class="whitespace-pre-line text-[9pt]">{{ data.fejlec.szoveg }}</p>
      </header>

      <h1 class="text-center text-[13pt] font-bold uppercase">{{ data.cim }}</h1>
      <p class="mb-4 text-center italic">{{ data.alcim }}</p>
      <p class="mb-4"><b>Kedvezményezett:</b> {{ data.ugyfelNev || '……………' }}</p>

      <table class="w-full border-collapse">
        <thead class="table-header-group">
          <tr>
            <th class="w-[31%] border border-black p-2 text-left align-top">Szolgáltatás megnevezése</th>
            <th class="border border-black p-2 text-left align-top">Támogatás céljának és a kötelezettségek megvalósításának eredménye</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in sorok" :key="s.blokk.id" class="break-inside-avoid" :class="{ 'bg-amber-50 print:bg-transparent': s.hianyos }">
            <td class="border border-black p-2 align-top">
              <b>{{ s.blokk.cim }}</b>
              <i v-if="s.blokk.megjegyzes" class="mt-1 block text-[9pt]">{{ s.blokk.megjegyzes }}</i>
            </td>
            <td class="cella border border-black p-2 align-top" v-html="s.html"></td>
          </tr>
        </tbody>
      </table>
    </article>
  </div>
</template>
