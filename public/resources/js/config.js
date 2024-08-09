// -------------------------------------------------- Firebase Imports

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-database.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

// -------------------------------------------------- Firebase Configuration

const firebaseConfig = {
  apiKey: "AIzaSyBypU20joLwRToRC1rS96jIYEHytdQzsR4",
  authDomain: "canorecosystem-de381.firebaseapp.com",
  projectId: "canorecosystem-de381",
  storageBucket: "canorecosystem-de381.appspot.com",
  messagingSenderId: "1085481136734",
  appId: "1:1085481136734:web:c3c9f5ca05763988a67acf",
  measurementId: "G-VBYKNEHL53"
};

// -------------------------------------------------- Firebase Initialization

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const database = getDatabase(app);
const storage = getStorage(app);
const firestore = getFirestore(app);

export { app, database, storage, firestore, auth };
