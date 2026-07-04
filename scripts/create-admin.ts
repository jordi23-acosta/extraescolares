import { initializeApp } from 'firebase/app'
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
const db = getFirestore(app)

async function main() {
  const UID = 'qIDwyQsmIpfhCDWguFY0E4Uhg0n2'
  const EMAIL = 'admin@misantla.edu.mx'

  console.log(`\n📄 Creando documento usuarios/${UID}...`)

  await setDoc(doc(db, 'usuarios', UID), {
    email: EMAIL,
    role: 'admin',
    nombre: 'Administrador',
    registroCompleto: true,
    createdAt: new Date().toISOString(),
  })

  console.log(`✅ Documento creado exitosamente.`)
  console.log(`\n🎉 Ahora puedes iniciar sesión con:`)
  console.log(`   Email: ${EMAIL}`)
  console.log(`   Rol: admin\n`)

  process.exit(0)
}

main()
