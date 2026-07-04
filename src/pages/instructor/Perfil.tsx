import { useState, useEffect } from 'react'
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../context/AuthContext'
import { Save } from 'lucide-react'

export default function InstructorPerfil() {
  const { currentUser, userProfile, refreshProfile } = useAuth()
  const [nombre, setNombre]       = useState('')
  const [telefono, setTelefono]   = useState('')
  const [instructorId, setInstructorId] = useState<string | null>(null)
  const [success, setSuccess]     = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)

  useEffect(() => {
    if (userProfile?.email) loadInstructor()
  }, [userProfile])

  async function loadInstructor() {
    const snap = await getDocs(
      query(collection(db, 'instructores'), where('correo', '==', userProfile?.email))
    )
    if (!snap.empty) {
      const data = snap.docs[0].data()
      setInstructorId(snap.docs[0].id)
      setNombre(data.nombre ?? '')
      setTelefono(data.telefono ?? '')
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!instructorId) return
    setLoading(true); setError(''); setSuccess('')
    try {
      await updateDoc(doc(db, 'instructores', instructorId), { nombre, telefono })
      await refreshProfile()
      setSuccess('Perfil actualizado correctamente.')
    } catch {
      setError('Error al guardar cambios.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-xl">
      <div className="bg-blue-600 text-white rounded-xl p-5 mb-6 flex items-center gap-3">
        <div className="bg-white/20 rounded-full p-3 text-2xl">👤</div>
        <div>
          <h2 className="font-bold text-lg">Mi Perfil</h2>
          <p className="text-blue-100 text-sm">Administra tu información personal</p>
        </div>
      </div>

      {error   && <p className="text-red-600 text-sm mb-4 bg-red-50 p-2 rounded">{error}</p>}
      {success && <p className="text-green-600 text-sm mb-4 bg-green-50 p-2 rounded">{success}</p>}

      <form onSubmit={handleSave} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Correo Institucional</label>
          <input
            type="email" disabled value={currentUser?.email ?? ''}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500"
          />
          <p className="text-xs text-gray-400 mt-0.5">No editable</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
          <input
            type="text" value={nombre} onChange={e => setNombre(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
          <input
            type="tel" value={telefono} onChange={e => setTelefono(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <button
          type="submit" disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          {loading ? 'Guardando…' : 'Guardar Cambios'}
        </button>
      </form>
    </div>
  )
}
