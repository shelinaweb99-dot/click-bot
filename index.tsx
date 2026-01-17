
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initMockData } from './services/mockDb';

const RootComponent = () => {
  useEffect(() => {
    // Hide native splash screen when React is ready
    if ((window as any).APP_HIDE_SPLASH) {
      (window as any).APP_HIDE_SPLASH();
    }
  }, []);

  return <App />;
};

// Register Service Worker with update detection
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      console.log('Core Engine Ready');
      
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            const shouldUpdate = window.confirm("New security update available! Reload to upgrade?");
            if (shouldUpdate) window.location.reload();
          }
        });
      });
    }).catch(err => {
      console.warn('Offline features disabled');
    });
  });
}

// Background handshake
initMockData();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Root missing");

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <RootComponent />
  </React.StrictMode>
);
