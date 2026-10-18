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

void initializeCareStorage().finally(mountCareSphere)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
