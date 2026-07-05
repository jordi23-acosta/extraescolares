import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { getFirestore, doc, setDoc } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyCe1MxKwQMIrvcugsGo3JDCW9se6Wz5bdI",
  authDomain: "extraescolares-tec-misantla.firebaseapp.com",
  projectId: "extraescolares-tec-misantla",
  storageBucket: "extraescolares-tec-misantla.firebasestorage.app",
  messagingSenderId: "88211922494",
  appId: "1:88211922494:web:e560b3f91f6e7ca4d5fb6f",
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

async function main() {
  // Login with admin@itsm.edu.mx to get authenticated context
  const cred = await signInWithEmailAndPassword(auth, 'admin@itsm.edu.mx', 'password123')
  console.log(`✅ Login OK. UID: ${cred.user.uid}`)

  // Create the admin document
  await setDoc(doc(db, 'usuarios', cred.user.uid), {
    email: 'admin@itsm.edu.mx',
    role: 'admin',
    nombre: 'Administrador',
    registroCompleto: true,
    createdAt: new Date().toISOString(),
  })

  console.log(`✅ Documento creado: usuarios/${cred.user.uid} con role "admin"`)
  console.log(`\n🎉 Ahora puedes iniciar sesión con admin@itsm.edu.mx`)
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
