// /js/firebase-init.js
// =======================================================
// Inicialización controlada de Firebase
// Compatible con carga por demanda (desde main.js)
// =======================================================

(function () {
  // Evita inicializaciones múltiples
  if (window.__FIREBASE_INIT__) {
    console.log('[Firebase] Ya estaba inicializado. Omitiendo duplicado.');
    return;
  }
  window.__FIREBASE_INIT__ = true;

  try {
    // --- Configuración de Firebase ---
    const firebaseConfig = {
      apiKey: "AIzaSyCg7CM5QL_By-nAG79xm_pQdY_wQZBZMDc",
      authDomain: "asef-7c7ac.firebaseapp.com",
      projectId: "asef-7c7ac",
      storageBucket: "asef-7c7ac.appspot.com",
      messagingSenderId: "551971742869",
      appId: "1:551971742869:web:bd3ce6448d5d27eff3279c",
      measurementId: "G-93S38S5RL0"
    };

    // --- Inicialización Firebase ---
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
      console.log('[Firebase] Inicializado correctamente.');
    } else {
      firebase.app(); // Usa la instancia existente
      console.log('[Firebase] Instancia existente reutilizada.');
    }

    // --- Inicializa servicios principales ---
    const auth = firebase.auth();
    const db = firebase.firestore();

    // Storage puede no estar incluido (por demanda)
    let storage = null;
    if (firebase.storage) {
      storage = firebase.storage();
      console.log('[Firebase] Storage disponible.');
    } else {
      console.warn('[Firebase] Storage no disponible (no se cargó firebase-storage.js).');
    }

    // --- Exposición global ---
    window.firebaseApp = firebase.app();
    window.firebaseAuth = auth;
    window.firebaseDB = db;
    window.firebaseStorage = storage;

  } catch (error) {
    console.error('[Firebase] Error durante inicialización:', error);
  }
})();
