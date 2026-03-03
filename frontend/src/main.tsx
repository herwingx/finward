import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { App } from './App';
import { Providers } from './app/providers';
import { registerSW } from 'virtual:pwa-register';
import { sileo } from 'sileo';

const updateSW = registerSW({
  onNeedRefresh() {
    sileo.action({
      title: 'Nueva versión disponible',
      description: 'Actualiza para obtener las últimas mejoras',
      duration: null,
      button: {
        title: 'Actualizar',
        onClick: () => updateSW(true),
      },
    });
  },
  onOfflineReady() {
    sileo.success({ title: 'App lista para usar sin conexión', duration: 3000 });
  },
  onRegisteredSW(swUrl: string, registration: ServiceWorkerRegistration | undefined) {
    if (registration) {
      setInterval(() => registration.update(), 60 * 1000);
    }
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Providers>
      <App />
    </Providers>
  </React.StrictMode>
);
