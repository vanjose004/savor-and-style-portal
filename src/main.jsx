import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { MAINTENANCE_MODE } from './maintenanceMode.js'
import Maintenance from './pages/Maintenance.jsx'
import App from './App.jsx'

// Checked before App (and everything App pulls in — AuthProvider,
// BrowserRouter, every route) ever mounts, so when this is on, nothing
// makes a Supabase call or depends on one resolving. Flip MAINTENANCE_MODE
// back to false once the database is confirmed back up.
createRoot(document.getElementById('root')).render(
  <StrictMode>{MAINTENANCE_MODE ? <Maintenance /> : <App />}</StrictMode>,
)
