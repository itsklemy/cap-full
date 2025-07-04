// firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyC3uIleabF_YrRISGBIej92-fRCf6N3Apw",
  authDomain: "dispo-app-94865.firebaseapp.com",
  projectId: "dispo-app-94865",
  storageBucket: "dispo-app-94865.appspot.com",
  messagingSenderId: "584093025882",
  appId: "1:584093025882:ios:6e0eab4928e57e3b1f7a63", // <-- Pour iOS, c’est bien celui-là !
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };