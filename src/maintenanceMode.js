// Single switch for site-wide maintenance mode (src/main.jsx renders
// <Maintenance /> instead of <App /> when true — nothing else mounts, so
// no Supabase call is ever made while this is on). Flip back to false and
// redeploy once the database is confirmed back up.
export const MAINTENANCE_MODE = false
