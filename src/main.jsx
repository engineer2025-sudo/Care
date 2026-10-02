import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { initializeCareStorage } from './lib/secureCareStorage'
import './index.css'

const mountCareSphere = () => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}

// Hydrate encrypted browser storage before persisted React hooks initialize.
// On failure, the app still opens in memory and Settings explains that saves
// are disabled rather than silently falling back to plaintext storage.
void initializeCareStorage().finally(mountCareSphere)

// Installable PWA: register the offline service worker in production builds
// only (it would interfere with Vite HMR in development).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
