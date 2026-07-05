import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { getFirestore, doc, getDoc } from 'firebase/firestore'

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

async function testLogin(email: string, password: string) {
  console.log(`\n═══════════════════════════════════════════`)
  console.log(`🔑 Probando login: ${email}`)
  console.log(`═══════════════════════════════════════════`)

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password)
    console.log(`✅ AUTH OK`)
    console.log(`   UID: ${cred.user.uid}`)
    console.log(`   Email: ${cred.user.email}`)
    console.log(`   emailVerified: ${cred.user.emailVerified}`)

    // Now check Firestore
    console.log(`\n📄 Buscando documento en Firestore: usuarios/${cred.user.uid}`)
    const docRef = doc(db, 'usuarios', cred.user.uid)
    const snap = await getDoc(docRef)

    if (snap.exists()) {
      console.log(`✅ DOCUMENTO ENCONTRADO:`)
      console.log(JSON.stringify(snap.data(), null, 2))
    } else {
      console.log(`❌ NO EXISTE documento en Firestore para este UID`)
      console.log(`   → Esto causa que la app no sepa el rol del usuario`)
    }
  } catch (err: any) {
    console.log(`❌ ERROR DE AUTH:`)
    console.log(`   Código: ${err.code}`)
    console.log(`   Mensaje: ${err.message}`)

    if (err.code === 'auth/invalid-credential') {
      console.log(`\n   → El email o contraseña son incorrectos`)
    } else if (err.code === 'auth/user-not-found') {
      console.log(`\n   → No existe cuenta con este email`)
    } else if (err.code === 'auth/wrong-password') {
      console.log(`\n   → Contraseña incorrecta`)
    } else if (err.code === 'auth/invalid-email') {
      console.log(`\n   → El formato del email es inválido`)
    } else if (err.code === 'auth/user-disabled') {
      console.log(`\n   → La cuenta está deshabilitada`)
    }
  }
}

async function main() {
  // Test with both possible emails
  await testLogin('admin@misantla.edu.mx', 'password123')
  await testLogin('admin@itsm.edu.mx', 'password123')

  console.log(`\n═══════════════════════════════════════════`)
  console.log(`✅ Test completado`)
  console.log(`═══════════════════════════════════════════\n`)

  process.exit(0)
}

main()
