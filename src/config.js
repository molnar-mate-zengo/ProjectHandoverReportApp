import { reactive } from 'vue'

const get = k => { try { return localStorage.getItem(k) } catch { return null } }
const set = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v) } catch {} }

// mode: 'drive' | null (not set up yet)
export const config = reactive({ mode: get('mode'), rootId: get('rootId') })

export function setConfig(mode, rootId = null) {
  Object.assign(config, { mode, rootId })
  set('mode', mode)
  set('rootId', rootId)
}
