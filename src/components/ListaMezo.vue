<script setup>
import { ref } from 'vue'
import Ikon from './Ikon.vue'

// One item per row; the report text gets them as "a, b és c".
const lista = defineModel({ type: Array, default: () => [] })
const props = defineProps({ id: String, javaslatok: { type: Array, default: () => [] } })
const uj = ref('')

function hozzaad() {
  const v = uj.value.trim()
  if (v && !lista.value.includes(v)) lista.value = [...lista.value, v]
  uj.value = ''
}
</script>

<template>
  <div class="space-y-1">
    <div v-for="(elem, i) in lista" :key="i" class="flex gap-1">
      <input v-model="lista[i]" class="input" :aria-label="`${i + 1}. elem`" />
      <button type="button" class="btn px-2 text-slate-500 hover:text-red-600" title="Törlés" @click="lista = lista.filter((_, j) => j !== i)">
        <Ikon nev="x" class="h-4 w-4" />
      </button>
    </div>
    <div class="flex gap-1">
      <input :id="props.id" v-model="uj" :list="`${props.id}-javaslat`" class="input" :class="{ 'border-amber-400 bg-amber-50': !lista.length }" placeholder="Új sor…" @keydown.enter.prevent="hozzaad" />
      <button type="button" class="btn px-2" title="Hozzáadás" :disabled="!uj.trim()" @click="hozzaad">
        <Ikon nev="plusz" class="h-4 w-4" />
      </button>
    </div>
    <datalist :id="`${props.id}-javaslat`">
      <option v-for="j in javaslatok.filter(j => !lista.includes(j))" :key="j" :value="j" />
    </datalist>
  </div>
</template>
