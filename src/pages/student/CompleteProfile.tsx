import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../context/AuthContext'
import { CARRERAS, SEMESTRES } from '../../types'

export default function CompleteProfile() {
  const { currentUser, userProfile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [numeroControl, setNumeroControl] = useState('')
  const [nombre, setNombre] = useState('')
  const [carrera, setCarrera] = useState(CARRERAS[0])
  const [semestre, setSemestre] = useState('1')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!currentUser) return
    setLoading(true)
    try {
      // Check if alumno exists with this email
      const alumnosRef = collection(db, 'alumnos')
      const q = query(alumnosRef, where('correo', '==', currentUser.email))
      const snap = await getDocs(q)

      await updateDoc(doc(db, 'usuarios', currentUser.uid), {
        numeroControl,
        nombre,
        carrera,
        semestre,
        registroCompleto: true,
        alumnoId: snap.empty ? null : snap.docs[0].id,
      })
      await refreshProfile()
      navigate('/panel')
    } catch {
      setError('Error al guardar el registro. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar placeholder */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="flex items-center gap-2 p-4 border-b border-gray-100">
          <img src="/logo_TecMisantla-BzNub4Q9.png" alt="Logo" className="w-8 h-8 object-contain" />
          <span className="font-bold text-gray-800 text-sm">Extraescolares</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {['Mi Panel', 'Mis Actividades', 'Mi Perfil'].map(item => (
            <div key={item} className="px-3 py-2 text-sm text-gray-400">{item}</div>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <p className="text-xs text-gray-500">Sesión iniciada como</p>
          <p className="text-xs font-medium text-blue-600 truncate">{userProfile?.email}</p>
          <p className="text-xs text-red-500">Estudiante</p>
        </div>
      </aside>

      <main className="flex-1 flex items-start justify-center p-8">
        <div className="w-full max-w-lg">
          <div className="bg-blue-600 text-white rounded-xl p-6 mb-6">
            <h2 className="text-xl font-bold mb-1">¡Bienvenido!</h2>
            <p className="text-blue-100 text-sm">Para continuar, por favor completa tu registro de alumno.</p>
          </div>

          {error && <p className="text-red-600 text-sm mb-4 bg-red-50 p-2 rounded">{error}</p>}

          <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Número de Control</label>
              <input
                type="text"
                placeholder="Ej. 192T0000"
                value={numeroControl}
                onChange={e => setNumeroControl(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
              <input
                type="text"
                placeholder="Tu nombre completo"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Carrera</label>
                <select
                  value={carrera}
                  onChange={e => setCarrera(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                >
                  {CARRERAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="w-32">
                <label className="block text-sm font-medium text-gray-700 mb-1">Semestre</label>
                <select
                  value={semestre}
                  onChange={e => setSemestre(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                >
                  {SEMESTRES.map(s => <option key={s} value={s}>{s}º Semestre</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo Institucional</label>
              <input
                type="email"
                value={currentUser?.email || ''}
                disabled
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500"
              />
              <p className="text-xs text-gray-400 mt-1">Este es el correo con el que iniciaste sesión.</p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? 'Guardando...' : '✓ Completar Registro'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
