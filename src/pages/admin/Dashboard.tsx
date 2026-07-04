import { useState, useEffect } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../firebase'
import { Users, BookOpen, ClipboardList, UserCheck, RefreshCw } from 'lucide-react'

export default function AdminDashboard() {
  const [stats, setStats] = useState({ alumnos: 0, actividades: 0, inscripciones: 0, instructores: 0 })
  const [loading, setLoading] = useState(false)

  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    setLoading(true)
    const [alumnos, actividades, inscripciones, instructores] = await Promise.all([
      getDocs(collection(db, 'alumnos')),
      getDocs(collection(db, 'actividades')),
      getDocs(collection(db, 'inscripciones')),
      getDocs(collection(db, 'instructores')),
    ])
    setStats({
      alumnos: alumnos.size,
      actividades: actividades.size,
      inscripciones: inscripciones.size,
      instructores: instructores.size,
    })
    setLoading(false)
  }

  const cards = [
    { label: 'Alumnos Registrados', value: stats.alumnos, icon: Users, color: 'bg-blue-500', border: 'border-blue-500' },
    { label: 'Actividades Activas', value: stats.actividades, icon: BookOpen, color: 'bg-green-500', border: 'border-green-500' },
    { label: 'Inscripciones Totales', value: stats.inscripciones, icon: ClipboardList, color: 'bg-purple-500', border: 'border-purple-500' },
    { label: 'Instructores', value: stats.instructores, icon: UserCheck, color: 'bg-orange-400', border: 'border-orange-400' },
  ]

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Resumen del Sistema de Actividades Extraescolares</p>
        </div>
        <button
          onClick={loadStats}
          disabled={loading}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {cards.map(({ label, value, icon: Icon, color, border }) => (
          <div key={label} className={`bg-white border-b-2 ${border} rounded-xl p-4 shadow-sm`}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-3xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500 mt-1">{label}</p>
              </div>
              <div className={`${color} rounded-xl p-3`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Welcome */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-blue-100 rounded-lg p-2">
            <span className="text-lg">📊</span>
          </div>
          <h3 className="font-semibold text-gray-800">Bienvenido al Sistema</h3>
        </div>
        <p className="text-sm text-gray-500">
          Este es el panel de control del Sistema de Actividades Extraescolares del Tecnológico de Misantla.
          Utilice el menú lateral para gestionar alumnos, instructores, actividades e inscripciones.
        </p>
      </div>
    </div>
  )
}
