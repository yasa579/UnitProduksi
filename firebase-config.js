// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    deleteDoc, 
    doc, 
    orderBy, 
    serverTimestamp, 
    query,
    updateDoc,
    increment,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD_6QsmOJcp2CHGpp33mUrCdkJQe807WXA",
  authDomain: "global-db-bandengpresto.firebaseapp.com",
  databaseURL: "https://global-db-bandengpresto-default-rtdb.firebaseio.com",
  projectId: "global-db-bandengpresto",
  storageBucket: "global-db-bandengpresto.firebasestorage.app",
  messagingSenderId: "335046216591",
  appId: "1:335046216591:web:ec2bbf61ce270ca27559fa",
  measurementId: "G-XFGC0S9NQ1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { 
    db, 
    collection, 
    addDoc, 
    getDocs, 
    deleteDoc, 
    doc, 
    orderBy, 
    serverTimestamp, 
    query,
    updateDoc,
    increment,
    onSnapshot
};