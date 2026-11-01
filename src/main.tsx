import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-mono/600.css';
import App from './App';
import './styles/index.css';

// Request persistent storage to protect local-first IndexedDB data from browser eviction
if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().then((persisted) => {
    if (persisted) {
      console.log('Seshat Notch: Persistent storage granted.');
    }
  }).catch(() => {
    // Non-blocking fallback
  });
}

// Register offline Service Worker (registers on deployed sites and local static servers; skips Vite HMR dev server)
if (
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  !document.querySelector('script[src*="/@vite/client"]')
) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
