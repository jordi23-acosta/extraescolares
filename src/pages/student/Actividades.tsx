import { useState, useEffect } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../context/AuthContext'
import type { Inscripcion } from '../../types'
import { BookOpen } from 'lucide-react'

export default function StudentActividades() {
  const { userProfile } = useAuth()
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userProfile?.email) loadData()
  }, [userProfile])

  async function loadData() {
    if (!userProfile?.email) return
    setLoading(true)
    const alumnosSnap = await getDocs(query(collection(db, 'alumnos'), where('correo', '==', userProfile.email)))
    if (!alumnosSnap.empty) {
      const alumnoId = alumnosSnap.docs[0].id
      const inscSnap = await getDocs(query(collection(db, 'inscripciones'), where('alumnoId', '==', alumnoId)))
      setInscripciones(inscSnap.docs.map(d => ({ id: d.id, ...d.data() } as Inscripcion)))
    }
    setLoading(false)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Mis Actividades</h2>
      <p className="text-sm text-gray-500 mb-6">Actividades extraescolares en las que estás inscrito</p>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : inscripciones.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Sin actividades</p>
          <p className="text-sm">Ve a Mi Panel y únete usando un código de actividad.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {inscripciones.map(insc => (
            <div key={insc.id} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">{insc.actividadCodigo}</span>
                    <h3 className="font-semibold text-gray-900">{insc.actividadNombre}</h3>
                  </div>
                  <p className="text-sm text-gray-500">Instructor: {insc.instructorNombre}</p>
                  <p className="text-sm text-gray-500">Período: {insc.periodo}</p>
                </div>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Inscrito</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
