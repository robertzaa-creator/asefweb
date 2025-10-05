// /js/firebase-init.js
// Evita reinicializaciones múltiples
if (!window.__FIREBASE_INIT__) {
    window.__FIREBASE_INIT__ = true;

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
    const app = firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();
    const storage = firebase.storage();

    // --- Exposición global ---
    window.firebaseApp = app;
    window.firebaseAuth = auth;
    window.firebaseDB = db;
    window.firebaseStorage = storage;

    console.log("[Firebase] Inicializado correctamente");
}

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCg7CM5QL_By-nAG79xm_pQdY_wQZBZMDc",
    authDomain: "asef-7c7ac.firebaseapp.com",
    projectId: "asef-7c7ac",
    storageBucket: "asef-7c7ac.appspot.com",
    messagingSenderId: "551971742869",
    appId: "1:551971742869:web:bd3ce6448d5d27eff3279c",
    measurementId: "G-93S38S5RL0"
};

// Evita doble inicialización
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("[Firebase] Inicializado correctamente");
} else {
    firebase.app(); // usa la instancia existente
}

// 🔹 Inicializa servicios y los expone globalmente
window.firebaseAuth = firebase.auth();
window.firebaseDb = firebase.firestore();
window.firebaseStorage = firebase.storage();