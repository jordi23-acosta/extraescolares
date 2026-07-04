import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { collection, getDocs, query, where, addDoc, deleteDoc, doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import type { Actividad, Alumno, Inscripcion } from '../../types'
import { ArrowLeft, Trash2, Search } from 'lucide-react'

export default function AdminInscripcionDetalle() {
  const { actividadId } = useParams<{ actividadId: string }>()
  const navigate = useNavigate()
  const [actividad, setActividad] = useState<Actividad | null>(null)
  const [alumnos, setAlumnos] = useState<Alumno[]>([])
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAlumnoId, setSelectedAlumnoId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (actividadId) {
      loadData()
    }
  }, [actividadId])

  async function loadData() {
    if (!actividadId) return
    const actDoc = await getDoc(doc(db, 'actividades', actividadId))
    if (actDoc.exists()) setActividad({ id: actDoc.id, ...actDoc.data() } as Actividad)

    const alumnosSnap = await getDocs(collection(db, 'alumnos'))
    setAlumnos(alumnosSnap.docs.map(d => ({ id: d.id, ...d.data() } as Alumno)))

    const inscSnap = await getDocs(query(collection(db, 'inscripciones'), where('actividadId', '==', actividadId)))
    setInscripciones(inscSnap.docs.map(d => ({ id: d.id, ...d.data() } as Inscripcion)))
  }

  const inscritosIds = inscripciones.map(i => i.alumnoId)
  const availableAlumnos = alumnos.filter(a =>
    !inscritosIds.includes(a.id) &&
    (!searchQuery || a.nombre?.toLowerCase().includes(searchQuery.toLowerCase()) || a.numeroControl?.includes(searchQuery))
  )

  async function handleInscribir() {
    if (!selectedAlumnoId || !actividad) return
    setLoading(true)
    const alumno = alumnos.find(a => a.id === selectedAlumnoId)
    if (!alumno) return
    try {
      await addDoc(collection(db, 'inscripciones'), {
        alumnoId: alumno.id,
        alumnoNombre: alumno.nombre,
        alumnoNumeroControl: alumno.numeroControl,
        alumnoCarrera: alumno.carrera,
        alumnoSemestre: alumno.semestre,
        actividadId: actividad.id,
        actividadNombre: actividad.nombre,
        actividadCodigo: actividad.codigo,
        instructorNombre: actividad.instructorNombre,
        periodo: actividad.periodo,
        fechaInscripcion: new Date().toISOString(),
      })
      await updateDoc(doc(db, 'actividades', actividad.id), {
        inscritos: actividad.inscritos + 1,
      })
      setSelectedAlumnoId(null)
      setSearchQuery('')
      await loadData()
    } catch {
      alert('Error al inscribir.')
    } finally {
      setLoading(false)
    }
  }

  async function handleRemove(insc: Inscripcion) {
    if (!confirm(`¿Quitar a ${insc.alumnoNombre}?`)) return
    await deleteDoc(doc(db, 'inscripciones', insc.id))
    if (actividad) {
      await updateDoc(doc(db, 'actividades', actividad.id), {
        inscritos: Math.max(0, actividad.inscritos - 1),
      })
    }
    await loadData()
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => navigate('/admin/inscripciones')} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{actividad?.nombre}</h1>
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <span>👤</span> {actividad?.instructorNombre}
          </p>
        </div>
      </div>

      {/* Buscar alumno */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Buscar Alumno para Inscribir</h3>
        <input
          type="text"
          placeholder="Escribe nombre o no. control..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 mb-3"
        />
        <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
          {availableAlumnos.map(a => (
            <label key={a.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
              <input
                type="radio"
                name="alumno"
                value={a.id}
                checked={selectedAlumnoId === a.id}
                onChange={() => setSelectedAlumnoId(a.id)}
                className="accent-blue-600"
              />
              <div>
                <p className="text-sm font-medium text-gray-800">{a.nombre}</p>
                <p className="text-xs text-gray-500">{a.numeroControl} · {a.carrera}</p>
              </div>
            </label>
          ))}
          {availableAlumnos.length === 0 && searchQuery && (
            <p className="text-xs text-gray-400 text-center py-2">No se encontraron alumnos.</p>
          )}
        </div>
        <button
          onClick={handleInscribir}
          disabled={!selectedAlumnoId || loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {loading ? 'Inscribiendo...' : 'Inscribir Alumno'}
        </button>
      </div>

      {/* Alumnos inscritos */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">
          Alumnos Inscritos ({inscripciones.length})
        </h3>
        <div className="space-y-2">
          {inscripciones.map(insc => (
            <div key={insc.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3">
              <div>
                <p className="text-sm font-medium text-gray-800">{insc.alumnoNombre}</p>
                <p className="text-xs text-gray-500">{insc.alumnoNumeroControl} · {insc.alumnoCarrera}</p>
              </div>
              <button onClick={() => handleRemove(insc)} className="text-red-500 hover:text-red-700 p-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {inscripciones.length === 0 && (
            <p className="text-center py-6 text-gray-400 text-sm">No hay alumnos inscritos.</p>
          )}
        </div>
      </div>
    </div>
  )
}
