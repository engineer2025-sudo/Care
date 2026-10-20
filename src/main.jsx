import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { initializeCareStorage } from './lib/secureCareStorage'
import './index.css'

const mountCareSphere = () => {
  const container = document.getElementById('root')
  ReactDOM.createRoot(container).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
  window.requestAnimationFrame(() => {
    container.removeAttribute('aria-busy')
    document.getElementById('boot-screen')?.remove()
    document.documentElement.dataset.appReady = 'true'
  })
}

void initializeCareStorage().finally(mountCareSphere)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
