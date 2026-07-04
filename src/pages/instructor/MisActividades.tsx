import { useState, useEffect } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import type { Actividad, Instructor } from '../../types'
import { ClipboardList, Users, Clock, Calendar, ArrowRight } from 'lucide-react'

export default function InstructorMisActividades() {
  const { userProfile } = useAuth()
  const navigate = useNavigate()
  const [actividades, setActividades] = useState<Actividad[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userProfile?.email) loadActividades()
  }, [userProfile])

  async function loadActividades() {
    setLoading(true)
    try {
      // Find instructor record by email
      const instSnap = await getDocs(
        query(collection(db, 'instructores'), where('correo', '==', userProfile?.email))
      )
      if (instSnap.empty) { setLoading(false); return }

      const instructorId = instSnap.docs[0].id

      // Get actividades assigned to this instructor
      const actSnap = await getDocs(
        query(collection(db, 'actividades'), where('instructorId', '==', instructorId))
      )
      setActividades(actSnap.docs.map(d => ({ id: d.id, ...d.data() } as Actividad)))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-3">
          {[1,2].map(i => <div key={i} className="h-28 bg-gray-200 rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mis Actividades</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Gestiona la asistencia y consulta los detalles de tus actividades asignadas.
        </p>
      </div>

      {actividades.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="w-7 h-7 text-gray-400" />
          </div>
          <p className="font-semibold text-gray-700 mb-1">Sin actividades asignadas</p>
          <p className="text-sm text-gray-400 max-w-xs mx-auto">
            No tienes actividades registradas a tu cargo. Contacta al administrador para que se te asignen actividades.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {actividades.map(act => {
            const pct = act.cupo > 0 ? Math.round((act.inscritos / act.cupo) * 100) : 0
            return (
              <div key={act.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 rounded-xl p-2.5">
                      <ClipboardList className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-semibold text-gray-900">{act.nombre}</h2>
                        <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {act.codigo}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {act.horario}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {act.periodo}
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Cupo badge */}
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    pct >= 100
                      ? 'bg-red-100 text-red-700'
                      : pct >= 80
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {act.inscritos}/{act.cupo} alumnos
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Cupo utilizado</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-yellow-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/instructor/asistencia/${act.id}`)}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                  >
                    <ClipboardList className="w-4 h-4" />
                    Pasar Lista
                  </button>
                  <button
                    onClick={() => navigate(`/instructor/inscripciones/${act.id}`)}
                    className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium py-2 rounded-lg transition-colors"
                  >
                    <Users className="w-4 h-4" />
                    Ver Inscritos
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
