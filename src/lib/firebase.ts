import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBU9fDCniS_vKWht2yg2wZ5-cfJg1-lPrY",
  authDomain: "studio-4209846898-d5885.firebaseapp.com",
  projectId: "studio-4209846898-d5885",
  storageBucket: "studio-4209846898-d5885.firebasestorage.app",
  messagingSenderId: "619088904904",
  appId: "1:619088904904:web:d232924297b2cb43551bfd",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
