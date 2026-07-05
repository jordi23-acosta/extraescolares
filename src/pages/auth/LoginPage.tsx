import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { auth, db } from '../../firebase'
import { Mail, Lock, UserPlus, LogIn } from 'lucide-react'
import logo from '/logo_TecMisantla-BzNub4Q9.png'
import { useAuth } from '../../context/AuthContext'

type Tab = 'login' | 'register'

export default function LoginPage() {
  const { currentUser, userProfile } = useAuth()
  const [tab, setTab] = useState<Tab>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  // If already logged in with a valid profile, redirect
  if (currentUser && userProfile && userProfile.role) {
    if (userProfile.role === 'admin') return <Navigate to="/admin" replace />
    if (userProfile.role === 'instructor') return <Navigate to="/instructor" replace />
    if (userProfile.registroCompleto) return <Navigate to="/panel" replace />
    return <Navigate to="/completar-registro" replace />
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err: unknown) {
      const firebaseErr = err as { code?: string }
      if (firebaseErr.code === 'auth/network-request-failed') {
        setError('Error de red: algo en tu computadora bloquea Firebase. Prueba en otro navegador (Firefox), en modo incógnito, o desactiva antivirus/proxy.')
      } else if (firebaseErr.code === 'auth/invalid-credential') {
        setError('Correo o contraseña incorrectos.')
      } else if (firebaseErr.code === 'auth/too-many-requests') {
        setError('Demasiados intentos. Intenta más tarde.')
      } else {
        setError(`Error: ${firebaseErr.code || 'Error desconocido'}`)
      }
      setLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (!email.endsWith('@itsm.edu.mx')) {
      setError('Debes usar un correo institucional (@itsm.edu.mx).')
      return
    }
    setLoading(true)
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      await setDoc(doc(db, 'usuarios', cred.user.uid), {
        email,
        role: 'estudiante',
        registroCompleto: false,
        createdAt: new Date().toISOString(),
      })
      navigate('/completar-registro')
    } catch (err: unknown) {
      const e = err as { code?: string }
      if (e.code === 'auth/email-already-in-use') {
        setError('Este correo ya está registrado. Intenta iniciar sesión.')
      } else {
        setError('Error al crear la cuenta. Intenta de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      setError('Ingresa tu correo para recuperar la contraseña.')
      return
    }
    try {
      await sendPasswordResetEmail(auth, email)
      setMessage('Se envió un correo de recuperación.')
      setError('')
    } catch {
      setError('No se pudo enviar el correo de recuperación.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#c00415] to-[#646464]">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Extraescolares</h1>
            <p className="text-sm text-gray-500">Tecnológico de Misantla</p>
          </div>
          <img src={logo} alt="Logo TecMisantla" className="w-16 h-16 object-contain" />
        </div>

        {/* Tabs */}
        <div className="flex rounded-lg border border-gray-200 mb-6 overflow-hidden">
          <button
            onClick={() => { setTab('login'); setError(''); setMessage('') }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors ${
              tab === 'login' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <LogIn className="w-4 h-4" />
            Iniciar Sesión
          </button>
          <button
            onClick={() => { setTab('register'); setError(''); setMessage('') }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors ${
              tab === 'register' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Registrarse
          </button>
        </div>

        {/* Error / Message */}
        {error && <p className="text-red-600 text-sm mb-4 bg-red-50 p-2 rounded">{error}</p>}
        {message && <p className="text-green-600 text-sm mb-4 bg-green-50 p-2 rounded">{message}</p>}

        {tab === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo Institucional</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  placeholder="usuario@itsm.edu.mx"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="text-right mt-1">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-blue-600 hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60"
            >
              {loading ? 'Ingresando...' : 'Ingresar al Sistema'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo Institucional</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  placeholder="usuario@itsm.edu.mx"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Usa el mismo correo con el que fuiste registrado (como alumno o instructor)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  placeholder="••••••••••"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60"
            >
              {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
            </button>
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                <span className="font-semibold">Importante:</span> Para ver tus actividades, debes registrar tu cuenta con el{' '}
                <span className="font-semibold">mismo correo</span> institucional que fue dado de alta en el sistema (ya sea como Alumno o Instructor).
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
