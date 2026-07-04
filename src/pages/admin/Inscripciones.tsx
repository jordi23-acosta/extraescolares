import { useState, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../firebase'
import { useNavigate } from 'react-router-dom'
import type { Actividad } from '../../types'
import { BookOpen } from 'lucide-react'

export default function AdminInscripciones() {
  const [actividades, setActividades] = useState<Actividad[]>([])
  const navigate = useNavigate()

  useEffect(() => { loadActividades() }, [])

  async function loadActividades() {
    const snap = await getDocs(collection(db, 'actividades'))
    setActividades(snap.docs.map(d => ({ id: d.id, ...d.data() } as Actividad)))
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Inscripciones</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {actividades.map(a => {
          const disponible = a.inscritos < a.cupo
          return (
            <div
              key={a.id}
              onClick={() => navigate(`/admin/inscripciones/${a.id}`)}
              className="bg-white border border-gray-200 rounded-xl p-5 cursor-pointer hover:shadow-md transition-shadow relative"
            >
              <span className={`absolute top-3 right-3 text-xs px-2 py-0.5 rounded-full font-medium ${
                disponible ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {disponible ? 'Disponible' : 'Lleno'}
              </span>
              <div className="flex items-center gap-2 mb-3">
                <div className="bg-blue-100 rounded-lg p-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{a.nombre}</h3>
              <p className="text-xs text-gray-500 flex items-center gap-1 mb-2">
                <span>👤</span> {a.instructorNombre}
              </p>
              <p className="text-xs text-gray-400">Período: {a.periodo}</p>
              <p className="text-xs text-gray-500 mt-1">Cupos: {a.inscritos}/{a.cupo}</p>
            </div>
          )
        })}
        {actividades.length === 0 && (
          <div className="col-span-3 text-center py-12 text-gray-400">
            No hay actividades creadas.
          </div>
        )}
      </div>
    </div>
  )
}
