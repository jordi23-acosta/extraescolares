import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyCe1MxKwQMIrvcugsGo3JDCW9se6Wz5bdI",
  authDomain: "extraescolares-tec-misantla.firebaseapp.com",
  projectId: "extraescolares-tec-misantla",
  storageBucket: "extraescolares-tec-misantla.firebasestorage.app",
  messagingSenderId: "88211922494",
  appId: "1:88211922494:web:e560b3f91f6e7ca4d5fb6f",
  measurementId: "G-R2PHJE6TJJ"
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export default app
