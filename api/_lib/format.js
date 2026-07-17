// Reuses the app's own formatting helpers instead of re-implementing peso
// formatting here — single source of truth. src/lib/utils.js is pure JS
// (no Vite-only syntax), and date-fns is a runtime `dependency` (not
// devDependency), so Vercel's function bundler can trace this import
// cleanly from api/*.js entrypoints.
export { formatCurrency, formatDate } from '../../src/lib/utils.js'
