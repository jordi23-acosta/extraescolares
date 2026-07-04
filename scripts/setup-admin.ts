/**
 * Script para crear el documento de admin en Firestore.
 * Ejecutar con: npx tsx scripts/setup-admin.ts
 */
import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore'

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

  try {
    const cred = await signInWithEmailAndPassword(auth, EMAIL, PASSWORD)
    const uid = cred.user.uid
    console.log(`✅ Login exitoso. UID: ${uid}`)

    // Check if document already exists
    const docRef = doc(db, 'usuarios', uid)
    const snap = await getDoc(docRef)

    if (snap.exists()) {
      console.log(`📄 Documento ya existe:`, snap.data())
      console.log(`🔄 Actualizando role a "admin"...`)
    } else {
      console.log(`📄 Creando documento en usuarios/${uid}...`)
    }

    await setDoc(docRef, {
      email: EMAIL,
      role: 'admin',
      nombre: 'Administrador',
      registroCompleto: true,
      createdAt: new Date().toISOString(),
    }, { merge: true })

    console.log(`\n🎉 ¡Listo! El usuario admin@misantla.edu.mx ahora tiene rol "admin".`)
    console.log(`   Puedes iniciar sesión en la app.\n`)

  } catch (err: any) {
    console.error(`\n❌ Error: ${err.code ?? err.message}`)
    if (err.code === 'auth/user-not-found') {
      console.log('   → El usuario no existe en Firebase Auth.')
    } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
      console.log('   → Contraseña incorrecta.')
    }
  }

  process.exit(0)
}

main()
