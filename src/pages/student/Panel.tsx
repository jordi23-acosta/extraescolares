import { useState, useEffect } from 'react'
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../context/AuthContext'
import { BookOpen, CheckCircle, XCircle, Hash } from 'lucide-react'
import type { Inscripcion, Actividad, Asistencia } from '../../types'
import { addDoc } from 'firebase/firestore'

// ── Horario parser ────────────────────────────────────────────────────────────
// Parses strings like "Lun 15:00-16:00, Mié 15:00-16:30" or "Lun 10:00-12:00"
const DAY_ALIASES: Record<string, string[]> = {
  Lun: ['lun', 'lu', 'lunes'],
  Mar: ['mar', 'ma', 'martes'],
  Mié: ['mié', 'mie', 'mi', 'miércoles', 'miercoles'],
  Jue: ['jue', 'ju', 'jueves'],
  Vie: ['vie', 'vi', 'viernes'],
  Sáb: ['sáb', 'sab', 'sa', 'sábado', 'sabado'],
}

function parseHorario(horario: string): { day: string; time: string }[] {
  if (!horario) return []
  const results: { day: string; time: string }[] = []
  // split by comma or semicolon
  const parts = horario.split(/[,;]/).map(p => p.trim()).filter(Boolean)
  for (const part of parts) {
    // match "Lun 15:00-16:00" or "Lun15:00-16:00"
    const match = part.match(/^([A-Za-záéíóúüñÁÉÍÓÚÜÑ]+)\s*(\d{1,2}:\d{2}(?:\s*[-–]\s*\d{1,2}:\d{2})?)$/i)
    if (!match) continue
    const rawDay = match[1]!.toLowerCase()
    const time   = match[2]!
    const canonical = Object.keys(DAY_ALIASES).find(k =>
      DAY_ALIASES[k]!.some(alias => rawDay.startsWith(alias))
    )
    if (canonical) results.push({ day: canonical, time })
  }
  return results
}

const WEEK_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export default function StudentPanel() {
  const { userProfile } = useAuth()
  const [inscripciones, setInscripciones]  = useState<Inscripcion[]>([])
  const [actividadesMap, setActividadesMap] = useState<Record<string, Actividad>>({})
  const [codigo, setCodigo]     = useState('')
  const [joinError, setJoinError]   = useState('')
  const [joinSuccess, setJoinSuccess] = useState('')
  const [loading, setLoading]   = useState(false)
  const [stats, setStats]       = useState({ inscritas: 0, asistencias: 0, faltas: 0 })

  useEffect(() => {
    if (userProfile?.email) loadData()
  }, [userProfile])

  async function loadData() {
    if (!userProfile?.email) return

    // 1. Find alumno by email
    const alumnosSnap = await getDocs(query(collection(db, 'alumnos'), where('correo', '==', userProfile.email)))
    if (alumnosSnap.empty) return
    const alumnoId = alumnosSnap.docs[0].id

    // 2. Load inscripciones
    const inscSnap = await getDocs(query(collection(db, 'inscripciones'), where('alumnoId', '==', alumnoId)))
    const inscs = inscSnap.docs.map(d => ({ id: d.id, ...d.data() } as Inscripcion))
    setInscripciones(inscs)

    // 3. Load actividades for schedule
    const actIds = [...new Set(inscs.map(i => i.actividadId))]
    const actMap: Record<string, Actividad> = {}
    for (const actId of actIds) {
      const actSnap = await getDocs(query(collection(db, 'actividades'), where('__name__', '==', actId)))
      actSnap.docs.forEach(d => { actMap[d.id] = { id: d.id, ...d.data() } as Actividad })
    }
    setActividadesMap(actMap)

    // 4. Stats
    let asistencias = 0
    let faltas = 0
    for (const insc of inscs) {
      const asistSnap = await getDocs(query(
        collection(db, 'asistencias'),
        where('alumnoId', '==', alumnoId),
        where('actividadId', '==', insc.actividadId)
      ))
      asistSnap.docs.forEach(d => {
        const a = d.data() as Asistencia
        if (a.presente) asistencias++
        else faltas++
      })
    }
    setStats({ inscritas: inscs.length, asistencias, faltas })
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setJoinError('')
    setJoinSuccess('')
    const codigoClean = codigo.trim().toUpperCase()
    if (codigoClean.length !== 6) {
      setJoinError('El código debe tener 6 caracteres.')
      return
    }
    setLoading(true)
    try {
      const actSnap = await getDocs(query(collection(db, 'actividades'), where('codigo', '==', codigoClean)))
      if (actSnap.empty) { setJoinError('Código no encontrado.'); return }
      const actDoc = actSnap.docs[0]
      const actividad = { id: actDoc.id, ...actDoc.data() } as Actividad

      const alumnosSnap = await getDocs(query(collection(db, 'alumnos'), where('correo', '==', userProfile?.email)))
      if (alumnosSnap.empty) { setJoinError('No se encontró tu registro de alumno.'); return }
      const alumnoDoc = alumnosSnap.docs[0]
      const alumno = alumnoDoc.data()

      const existingSnap = await getDocs(query(
        collection(db, 'inscripciones'),
        where('alumnoId', '==', alumnoDoc.id),
        where('actividadId', '==', actividad.id)
      ))
      if (!existingSnap.empty) { setJoinError('Ya estás inscrito en esta actividad.'); return }
      if (actividad.inscritos >= actividad.cupo) { setJoinError('Esta actividad ya no tiene cupo disponible.'); return }

      await addDoc(collection(db, 'inscripciones'), {
        alumnoId: alumnoDoc.id,
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

      setJoinSuccess(`¡Te inscribiste en "${actividad.nombre}" exitosamente!`)
      setCodigo('')
      await loadData()
    } catch {
      setJoinError('Error al unirse. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // ── Weekly schedule: map day → actividades ─────────────────────────────────
  const schedule: Record<string, { nombre: string; time: string; codigo: string }[]> = {}
  for (const day of WEEK_DAYS) schedule[day] = []

  for (const insc of inscripciones) {
    const act = actividadesMap[insc.actividadId]
    if (!act?.horario) continue
    const slots = parseHorario(act.horario)
    for (const slot of slots) {
      schedule[slot.day]?.push({ nombre: act.nombre, time: slot.time, codigo: act.codigo })
    }
  }

  const hasSchedule = WEEK_DAYS.some(d => (schedule[d]?.length ?? 0) > 0)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Welcome banner */}
      <div className="bg-blue-600 text-white rounded-xl p-6 mb-6">
        <h2 className="text-xl font-bold mb-1">
          {userProfile?.nombre ? `¡Hola, ${userProfile.nombre}!` : '¡Bienvenido!'}
        </h2>
        <p className="text-blue-100 text-sm mb-3">Bienvenido a tu panel de actividades extraescolares</p>
        <div className="flex gap-3 flex-wrap">
          {userProfile?.carrera && (
            <span className="bg-blue-500 text-white text-xs px-2.5 py-1 rounded-full">🎓 {userProfile.carrera}</span>
          )}
          {userProfile?.semestre && (
            <span className="bg-blue-500 text-white text-xs px-2.5 py-1 rounded-full">📅 Semestre {userProfile.semestre}</span>
          )}
          {userProfile?.numeroControl && (
            <span className="bg-blue-500 text-white text-xs px-2.5 py-1 rounded-full">🪪 No. Control {userProfile.numeroControl}</span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Actividades Inscritas', value: stats.inscritas,  icon: BookOpen,      bg: 'bg-blue-100',  ic: 'text-blue-600'  },
          { label: 'Asistencias',           value: stats.asistencias, icon: CheckCircle, bg: 'bg-green-100', ic: 'text-green-600' },
          { label: 'Faltas',                value: stats.faltas,      icon: XCircle,     bg: 'bg-red-100',   ic: 'text-red-500'   },
        ].map(({ label, value, icon: Icon, bg, ic }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
            <div className={`${bg} rounded-lg p-2`}><Icon className={`w-5 h-5 ${ic}`} /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Join activity */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Hash className="w-5 h-5 text-indigo-500" />
          <h3 className="font-semibold text-gray-800">Unirse a una Actividad</h3>
        </div>
        <p className="text-sm text-gray-500 mb-3">Ingresa el código de 6 caracteres que te proporcionó tu instructor</p>
        {joinError   && <p className="text-red-600 text-sm mb-2 bg-red-50 p-2 rounded">{joinError}</p>}
        {joinSuccess && <p className="text-green-600 text-sm mb-2 bg-green-50 p-2 rounded">{joinSuccess}</p>}
        <form onSubmit={handleJoin} className="flex gap-2">
          <input type="text" placeholder="ABC123" value={codigo}
            onChange={e => setCodigo(e.target.value.toUpperCase())} maxLength={6}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono uppercase focus:outline-none focus:border-blue-500" />
          <button type="submit" disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60">
            → Unirse
          </button>
        </form>
      </div>

      {/* Mis Actividades */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span>📅</span>
          <h3 className="font-semibold text-gray-800">Mis Actividades</h3>
        </div>
        <p className="text-xs text-gray-400 mb-4">Tus actividades extraescolares e horarios</p>
        {inscripciones.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">Sin actividades inscritas</p>
            <p className="text-xs">Aún no estás inscrito en ninguna actividad extraescolar.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {inscripciones.map(insc => (
              <div key={insc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-800">{insc.actividadNombre}</p>
                  <p className="text-xs text-gray-500">
                    {insc.instructorNombre} · {insc.periodo}
                    {actividadesMap[insc.actividadId]?.horario && (
                      <> · <span className="text-indigo-600">{actividadesMap[insc.actividadId]!.horario}</span></>
                    )}
                  </p>
                </div>
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-mono">
                  {insc.actividadCodigo}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Horario Semanal */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <span>⏰</span>
          <h3 className="font-semibold text-gray-800">Mi Horario Semanal</h3>
        </div>
        {!hasSchedule ? (
          <p className="text-sm text-gray-400 text-center py-4">No tienes actividades programadas.</p>
        ) : (
          <div className="grid grid-cols-6 gap-2">
            {WEEK_DAYS.map(day => (
              <div key={day}>
                <p className="text-xs font-semibold text-gray-500 text-center mb-2 pb-1 border-b border-gray-100">
                  {day}
                </p>
                <div className="space-y-1.5 min-h-[40px]">
                  {(schedule[day] ?? []).map((slot, i) => (
                    <div key={i} className="bg-blue-100 text-blue-800 rounded-lg p-1.5 text-center">
                      <p className="text-xs font-medium leading-tight truncate">{slot.nombre}</p>
                      <p className="text-[10px] text-blue-600 mt-0.5">{slot.time}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
