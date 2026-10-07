import { config } from './config.js'
import * as drive from './drive.js'
import * as demo from './demo.js'

// Both backends export the same functions.
export const api = () => (config.mode === 'demo' ? demo : drive)
