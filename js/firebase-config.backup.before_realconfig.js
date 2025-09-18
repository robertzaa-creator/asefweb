// Firebase Configuration
const firebaseConfig = {
    "apiKey": "AIzaSyCg7CM5QL_By-nAG79xm_pQdY_wQZBZMDc",
    "authDomain": "asef-7c7ac.firebaseapp.com",
    "projectId": "asef-7c7ac",
    "storageBucket": "asef-7c7ac.firebasestorage.app",
    "messagingSenderId": "551971742869",
    "appId": "1:551971742869:web:bd3ce6448d5d27eff3279c",
    "measurementId": "G-93S38S5RL0"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Export for use in other files
window.firebaseAuth = auth;
window.firebaseDb = db;
window.firebaseStorage = storage;

console.log('Firebase initialized successfully');