import * as drive from './drive.js'

// Storage backend (Google Drive). Kept behind a function so another backend can be swapped in.
export const api = () => drive
