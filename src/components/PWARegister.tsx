'use client';

import { useEffect } from 'react';

export default function PWARegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('Service Worker enregistré:', reg.scope))
        .catch((err) => console.error('Erreur Service Worker:', err));
    }
  }, []);

  return null;
}
