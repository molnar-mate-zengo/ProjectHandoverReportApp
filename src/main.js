import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import './style.css'
import App from './App.vue'
import { config } from './config.js'
import Beallitas from './pages/Beallitas.vue'
import Projektek from './pages/Projektek.vue'
import Projekt from './pages/Projekt.vue'
import Nyomtatas from './pages/Nyomtatas.vue'
import Tarolo from './pages/Tarolo.vue'

// Hash history: GitHub Pages has no SPA fallback.
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: Projektek },
    { path: '/beallitas', component: Beallitas },
    { path: '/tarolo', component: Tarolo },
    { path: '/projekt/:id', component: Projekt, props: true },
    { path: '/projekt/:id/nyomtatas', component: Nyomtatas, props: true },
  ],
})
router.beforeEach(to => (!['/beallitas', '/tarolo'].includes(to.path) && !config.mode ? '/beallitas' : true))

createApp(App).use(router).mount('#app')
