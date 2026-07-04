import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  collection, getDocs, query, where,
  addDoc, deleteDoc, doc, getDoc, updateDoc,
} from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../context/AuthContext'
import type { Actividad, Alumno, Inscripcion } from '../../types'
import { ArrowLeft, Search, Trash2, UserPlus, Users, ClipboardList } from 'lucide-react'

export default function InstructorInscripciones() {
  const { actividadId } = useParams<{ actividadId: string }>()
  const { userProfile } = useAuth()
  const navigate = useNavigate()

  // List-of-activities mode (no actividadId param)
  const [actividades, setActividades] = useState<Actividad[]>([])

  // Detail mode (actividadId param)
  const [actividad, setActividad] = useState<Actividad | null>(null)
  const [alumnos, setAlumnos] = useState<Alumno[]>([])
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAlumnoId, setSelectedAlumnoId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (actividadId) {
      loadDetail(actividadId)
    } else {
      loadActividades()
    }
  }, [actividadId, userProfile?.email])

  // ── List mode ──────────────────────────────────────────────────────────────
  async function loadActividades() {
    if (!userProfile?.email) return
    const instSnap = await getDocs(
      query(collection(db, 'instructores'), where('correo', '==', userProfile.email))
    )
    if (instSnap.empty) return
    const instructorId = instSnap.docs[0].id
    const actSnap = await getDocs(
      query(collection(db, 'actividades'), where('instructorId', '==', instructorId))
    )
    setActividades(actSnap.docs.map(d => ({ id: d.id, ...d.data() } as Actividad)))
  }

  // ── Detail mode ────────────────────────────────────────────────────────────
  async function loadDetail(actId: string) {
    const actDoc = await getDoc(doc(db, 'actividades', actId))
    if (!actDoc.exists()) return
    setActividad({ id: actDoc.id, ...actDoc.data() } as Actividad)

    const [alumnosSnap, inscSnap] = await Promise.all([
      getDocs(collection(db, 'alumnos')),
      getDocs(query(collection(db, 'inscripciones'), where('actividadId', '==', actId))),
    ])
    setAlumnos(alumnosSnap.docs.map(d => ({ id: d.id, ...d.data() } as Alumno)))
    setInscripciones(inscSnap.docs.map(d => ({ id: d.id, ...d.data() } as Inscripcion)))
  }

  const inscritosIds = inscripciones.map(i => i.alumnoId)

  const availableAlumnos = alumnos.filter(a =>
    !inscritosIds.includes(a.id) &&
    (!searchQuery ||
      a.nombre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.numeroControl?.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  async function handleInscribir() {
    if (!selectedAlumnoId || !actividad) return
    setLoading(true)
    const alumno = alumnos.find(a => a.id === selectedAlumnoId)
    if (!alumno) { setLoading(false); return }
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
      await loadDetail(actividad.id)
    } catch {
      alert('Error al inscribir alumno.')
    } finally {
      setLoading(false)
    }
  }

  async function handleRemove(insc: Inscripcion) {
    if (!confirm(`¿Quitar a ${insc.alumnoNombre} de la actividad?`)) return
    await deleteDoc(doc(db, 'inscripciones', insc.id))
    if (actividad) {
      await updateDoc(doc(db, 'actividades', actividad.id), {
        inscritos: Math.max(0, actividad.inscritos - 1),
      })
      await loadDetail(actividad.id)
    }
  }

  // ── List mode render ───────────────────────────────────────────────────────
  if (!actividadId) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Inscripciones</h1>
        <p className="text-sm text-gray-500 mb-6">
          Selecciona una actividad para gestionar sus alumnos inscritos.
        </p>
        <div className="grid gap-4">
          {actividades.map(act => (
            <button
              key={act.id}
              onClick={() => navigate(`/instructor/inscripciones/${act.id}`)}
              className="bg-white border border-gray-200 rounded-xl p-5 text-left hover:shadow-md transition-shadow flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 rounded-xl p-2.5">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{act.nombre}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Período: {act.periodo} · Código: {act.codigo}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-700">{act.inscritos}</p>
                <p className="text-xs text-gray-400">de {act.cupo} cupos</p>
              </div>
            </button>
          ))}
          {actividades.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-16 text-center text-gray-400">
              <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Sin actividades asignadas</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Detail mode render ─────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/instructor/inscripciones')}
          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{actividad?.nombre}</h1>
          <p className="text-xs text-gray-500">
            {actividad?.instructorNombre} · {actividad?.periodo} · Código: {actividad?.codigo}
          </p>
        </div>
      </div>

      {/* Search & inscribir */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-blue-600" />
          Inscribir Alumno
        </h3>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o no. control…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Results list */}
        {searchQuery.length > 0 && (
          <div className="mb-3 max-h-44 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
            {availableAlumnos.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">
                Sin resultados o ya inscrito.
              </p>
            ) : (
              availableAlumnos.map(a => (
                <label
                  key={a.id}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors"
                >
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
                    <p className="text-xs text-gray-400">{a.numeroControl} · {a.carrera}</p>
                  </div>
                </label>
              ))
            )}
          </div>
        )}

        <button
          onClick={handleInscribir}
          disabled={!selectedAlumnoId || loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          {loading ? 'Inscribiendo…' : 'Inscribir Alumno'}
        </button>
      </div>

      {/* Inscritos */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-500" />
          Alumnos Inscritos
          <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
            {inscripciones.length}
          </span>
        </h3>

        {inscripciones.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400">
            <p className="text-sm">No hay alumnos inscritos aún.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {inscripciones.map((insc, idx) => (
              <div
                key={insc.id}
                className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-blue-100 text-blue-700 text-xs font-bold rounded-full flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{insc.alumnoNombre}</p>
                    <p className="text-xs text-gray-400">
                      {insc.alumnoNumeroControl} · {insc.alumnoCarrera} · Sem. {insc.alumnoSemestre}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(insc)}
                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Quitar alumno"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
