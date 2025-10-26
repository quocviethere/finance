import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCiEQBicJPGNU0YPK9KlbJNDw0Vu9XbIa4",
  authDomain: "finance-tracker-81a65.firebaseapp.com",
  projectId: "finance-tracker-81a65",
  storageBucket: "finance-tracker-81a65.firebasestorage.app",
  messagingSenderId: "3056931749",
  appId: "1:3056931749:web:026e5cb70c4d57b4590e4c",
  measurementId: "G-MSHPXJ8VB8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Enable offline persistence so data stays in IndexedDB and appears instantly after reload.
enableIndexedDbPersistence(db).catch((err) => {
  // Ignore if persistence is already enabled in another tab or unsupported.
  if (err.code !== 'failed-precondition' && err.code !== 'unimplemented') {
    console.warn('Persistence error', err);
  }
});

export { db }; 