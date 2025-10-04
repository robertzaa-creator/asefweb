// js/firebase-init.js
(function () {
  // Evita ejecutar este archivo más de una vez
  if (window.__FIREBASE_CONFIG_LOADED__) return;
  window.__FIREBASE_CONFIG_LOADED__ = true;

  // Config
  const cfg = {
    apiKey: "AIzaSyCg7CM5QL_By-nAG79xm_pQdY_wQZBZMDc",
    authDomain: "asef-7c7ac.firebaseapp.com",
    projectId: "asef-7c7ac",
    storageBucket: "asef-7c7ac.appspot.com",
    messagingSenderId: "551971742869",
    appId: "1:551971742869:web:bd3ce6448d5d27eff3279c",
    measurementId: "G-93S38S5RL0"
  };

  // Inicializa la app UNA sola vez
  try {
    if (!firebase.apps || !firebase.apps.length) {
      firebase.initializeApp(cfg);
    } else {
      // Ya había una app, no volver a inicializar
    }
  } catch (e) {
    console.warn('Ignorando re-init de Firebase:', e);
  }

  // Expone SIEMPRE las mismas instancias
  window.firebaseApp  = firebase.app();
  window.firebaseAuth = window.firebaseAuth || firebase.auth();
  window.firebaseDb   = window.firebaseDb   || firebase.firestore();
  try {
    window.firebaseStorage = window.firebaseStorage || firebase.storage();
  } catch (e) {
    console.warn('Storage no disponible:', e);
  }

  console.log('Firebase initialized successfully');
})();
