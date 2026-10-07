<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { config } from './config.js'
import { api } from './api.js'
import Ikon from './components/Ikon.vue'

const route = useRoute()
const auth = computed(() => api().auth)
const hiba = ref('')
const kellBelepes = computed(() => config.mode === 'drive' && !auth.value.loggedIn && !['/beallitas', '/tarolo'].includes(route.path))

async function belep() {
  hiba.value = ''
  try { await api().login() } catch (e) { hiba.value = e.message }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-800 print:bg-white">
    <header class="border-b border-slate-200 bg-white print:hidden">
      <div class="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
        <RouterLink to="/" class="font-semibold text-slate-900">Projektátadási beszámoló</RouterLink>
        <span v-if="config.mode === 'demo'" class="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Demó mód – csak ebben a böngészőben</span>
        <span class="ml-auto text-sm text-slate-500">{{ config.mode === 'drive' ? auth.email : '' }}</span>
        <RouterLink to="/tarolo" class="btn relative px-2" active-class="!bg-indigo-50 !border-indigo-300 !text-indigo-700" title="Tároló struktúra" aria-label="Tároló struktúra">
          <Ikon nev="struktura" />
          <span class="absolute -right-1 -top-1 flex h-2.5 w-2.5">
            <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
            <span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500"></span>
          </span>
        </RouterLink>
        <RouterLink to="/beallitas" class="btn group px-2" active-class="!bg-indigo-50 !border-indigo-300 !text-indigo-700" title="Beállítások" aria-label="Beállítások">
          <Ikon nev="cog" class="h-5 w-5 transition-transform duration-500 group-hover:rotate-90" />
        </RouterLink>
      </div>
    </header>

    <main class="mx-auto max-w-5xl px-4 py-6 print:max-w-none print:p-0">
      <div v-if="kellBelepes" class="card mx-auto max-w-md text-center">
        <p class="mb-4 text-sm">A folytatáshoz jelentkezz be a Google-fiókoddal.</p>
        <button class="btn btn-primary" @click="belep">Bejelentkezés Google-lel</button>
        <p v-if="hiba" class="mt-3 text-sm text-red-600">{{ hiba }}</p>
      </div>
      <RouterView v-else :key="route.fullPath" />
    </main>
  </div>
</template>
