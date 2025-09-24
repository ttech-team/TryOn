import { initializeApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import { getAuth } from "firebase/auth"

const firebaseConfig = {
  apiKey: "AIzaSyCm1-lgkA2mBLNhRO-w0y86ECMuY1d0MRE",
  authDomain: "tltdtryon.firebaseapp.com",
  projectId: "tltdtryon",
  storageBucket: "tltdtryon.firebasestorage.app",
  messagingSenderId: "957395192950",
  appId: "1:957395192950:web:4b666932fd078228556357",
  measurementId: "G-3X0GV8E3D9",
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)
export default app
