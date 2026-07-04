import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore'

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
  const EMAIL = 'admin@misantla.edu.mx'
  const PASSWORD = 'password123'

  console.log(`\n🔑 Iniciando sesión con ${EMAIL}...`)
  const cred = await signInWithEmailAndPassword(auth, EMAIL, PASSWORD)
  const uid = cred.user.uid
  console.log(`✅ UID: ${uid}`)

  const docRef = doc(db, 'usuarios', uid)
  const snap = await getDoc(docRef)

  if (snap.exists()) {
    console.log(`\n📄 Documento actual:`)
    console.log(JSON.stringify(snap.data(), null, 2))
    
    const data = snap.data()
    if (data.role !== 'admin') {
      console.log(`\n⚠️  Rol actual: "${data.role}" — cambiando a "admin"...`)
      await setDoc(docRef, { role: 'admin', registroCompleto: true }, { merge: true })
      console.log(`✅ Rol actualizado a "admin".`)
    } else {
      console.log(`\n✅ El rol ya es "admin". El problema puede ser otro.`)
    }
  } else {
    console.log(`\n❌ No existe documento. Creándolo...`)
    await setDoc(docRef, {
      email: EMAIL,
      role: 'admin',
      nombre: 'Administrador',
      registroCompleto: true,
      createdAt: new Date().toISOString(),
    })
    console.log(`✅ Documento creado con rol admin.`)
  }

  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
