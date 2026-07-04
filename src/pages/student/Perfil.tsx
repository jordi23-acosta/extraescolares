import { useState, useEffect } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../context/AuthContext'
import { CARRERAS, SEMESTRES, SEXOS, SISTEMAS } from '../../types'
import { Save } from 'lucide-react'

export default function StudentPerfil() {
  const { currentUser, userProfile, refreshProfile } = useAuth()
  const [nombre, setNombre] = useState('')
  const [carrera, setCarrera] = useState('')
  const [semestre, setSemestre] = useState('')
  const [sexo, setSexo] = useState('')
  const [sistema, setSistema] = useState('')
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (userProfile) {
      setNombre(userProfile.nombre || '')
      setCarrera(userProfile.carrera || '')
      setSemestre(userProfile.semestre || '')
      setSexo(userProfile.sexo || '')
      setSistema(userProfile.sistema || '')
    }
  }, [userProfile])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!currentUser) return
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      await updateDoc(doc(db, 'usuarios', currentUser.uid), {
        nombre, carrera, semestre, sexo, sistema,
      })
      await refreshProfile()
      setSuccess('Perfil actualizado correctamente.')
    } catch {
      setError('Error al guardar cambios.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="bg-blue-600 text-white rounded-xl p-5 mb-6 flex items-center gap-3">
        <div className="bg-white/20 rounded-full p-2">
          <span className="text-2xl">👤</span>
        </div>
        <div>
          <h2 className="font-bold text-lg">Mi Cuenta</h2>
          <p className="text-blue-100 text-sm">Administra tu información personal</p>
        </div>
      </div>

      {error && <p className="text-red-600 text-sm mb-4 bg-red-50 p-2 rounded">{error}</p>}
      {success && <p className="text-green-600 text-sm mb-4 bg-green-50 p-2 rounded">{success}</p>}

      <form onSubmit={handleSave} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <span>🪪</span> Número de Control
            </label>
            <input
              type="text"
              value={userProfile?.numeroControl || ''}
              disabled
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500"
            />
            <p className="text-xs text-gray-400 mt-0.5">No editable</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <span>✉️</span> Correo Institucional
            </label>
            <input
              type="email"
              value={currentUser?.email || ''}
              disabled
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500"
            />
            <p className="text-xs text-gray-400 mt-0.5">No editable</p>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
          <input
            type="text"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
            <span>🎓</span> Carrera
          </label>
          <select
            value={carrera}
            onChange={e => setCarrera(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">Selecciona</option>
            {CARRERAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <span>📅</span> Semestre
            </label>
            <select
              value={semestre}
              onChange={e => setSemestre(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">Selecciona</option>
              {SEMESTRES.map(s => <option key={s} value={s}>{s}º</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sexo</label>
            <select
              value={sexo}
              onChange={e => setSexo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">Selecciona</option>
              {SEXOS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sistema</label>
            <select
              value={sistema}
              onChange={e => setSistema(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">Selecciona</option>
              {SISTEMAS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          {loading ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </form>
    </div>
  )
}
