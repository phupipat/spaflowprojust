// Import the functions you need from the SDKs you need
// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBIusUrhY2zB-WqBSwI8uklU6-_W90_bnM",
  authDomain: "login-spa-7921d.firebaseapp.com",
  projectId: "login-spa-7921d",
  storageBucket: "login-spa-7921d.firebasestorage.app",
  messagingSenderId: "476246251600",
  appId: "1:476246251600:web:11e68deecbb23376711955"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };