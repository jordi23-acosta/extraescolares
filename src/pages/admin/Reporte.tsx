import { useState, useEffect } from 'react'
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import type { Actividad, Inscripcion, Alumno } from '../../types'
import {
  Users, BookOpen, ClipboardList,
  ChevronDown, Download, Wrench, FileSpreadsheet, CheckCircle,
} from 'lucide-react'
import { downloadExcel, fmtDate } from '../../utils/exportExcel'

export default function AdminReporte() {
  const [actividades, setActividades] = useState<Actividad[]>([])
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([])
  const [alumnos, setAlumnos] = useState<Alumno[]>([])
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('')
  const [periodos, setPeriodos] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [reparando, setReparando] = useState(false)
  const [reparadoMsg, setReparadoMsg] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [actSnap, inscSnap, alumSnap] = await Promise.all([
      getDocs(collection(db, 'actividades')),
      getDocs(collection(db, 'inscripciones')),
      getDocs(collection(db, 'alumnos')),
    ])
    const acts = actSnap.docs.map(d => ({ id: d.id, ...d.data() } as Actividad))
    const inscs = inscSnap.docs.map(d => ({ id: d.id, ...d.data() } as Inscripcion))
    const alums = alumSnap.docs.map(d => ({ id: d.id, ...d.data() } as Alumno))
    setActividades(acts)
    setInscripciones(inscs)
    setAlumnos(alums)

    const ps = [...new Set(acts.map(a => a.periodo).filter(Boolean))]
    setPeriodos(ps)
    setPeriodoSeleccionado(prev => (prev && ps.includes(prev) ? prev : (ps[0] ?? '')))
  }

  /** Recalculate `inscritos` counter on every actividad from actual inscripciones docs */
  async function repararDatos() {
    setReparando(true)
    setReparadoMsg('')
    try {
      const [actSnap, inscSnap] = await Promise.all([
        getDocs(collection(db, 'actividades')),
        getDocs(collection(db, 'inscripciones')),
      ])
      const allInscs = inscSnap.docs.map(d => d.data() as Inscripcion)
      let fixed = 0
      for (const actDoc of actSnap.docs) {
        const real = allInscs.filter(i => i.actividadId === actDoc.id).length
        const stored = (actDoc.data().inscritos ?? 0) as number
        if (real !== stored) {
          await updateDoc(doc(db, 'actividades', actDoc.id), { inscritos: real })
          fixed++
        }
      }
      setReparadoMsg(`✓ Datos reparados: ${fixed} actividad(es) corregida(s).`)
      await loadData()
    } catch {
      setReparadoMsg('Error al reparar datos.')
    } finally {
      setReparando(false)
    }
  }

  // ─── Derived data ──────────────────────────────────────────────────────────

  const filteredActs = periodoSeleccionado
    ? actividades.filter(a => a.periodo === periodoSeleccionado)
    : actividades

  const filteredInscs = periodoSeleccionado
    ? inscripciones.filter(i => i.periodo === periodoSeleccionado)
    : inscripciones

  const alumnosUnicos = new Set(filteredInscs.map(i => i.alumnoId)).size
  const totalInscrips = filteredInscs.length
  const totalActividades = filteredActs.length

  // Sex lookup from alumnos collection
  const alumnoMap = Object.fromEntries(alumnos.map(a => [a.id, a]))

  const byActividad = filteredActs.map(a => {
    const inscs = filteredInscs.filter(i => i.actividadId === a.id)
    const hombres = inscs.filter(i => alumnoMap[i.alumnoId]?.sexo === 'Masculino').length
    const mujeres = inscs.filter(i => alumnoMap[i.alumnoId]?.sexo === 'Femenino').length
    return { id: a.id, nombre: a.nombre, instructor: a.instructorNombre, inscritos: inscs.length, hombres, mujeres }
  })

  const byCarrera: Record<string, number> = {}
  filteredInscs.forEach(i => {
    const c = i.alumnoCarrera || 'Sin carrera'
    byCarrera[c] = (byCarrera[c] || 0) + 1
  })

  const bySemestre: Record<string, number> = {}
  filteredInscs.forEach(i => {
    const s = i.alumnoSemestre ? `${i.alumnoSemestre}º` : 'Sin semestre'
    bySemestre[s] = (bySemestre[s] || 0) + 1
  })

  const filteredDetalles = filteredInscs.filter(i =>
    !search ||
    i.alumnoNombre?.toLowerCase().includes(search.toLowerCase()) ||
    i.alumnoNumeroControl?.includes(search)
  )

  // ─── Export functions ───────────────────────────────────────────────────────

  const periodo = periodoSeleccionado || 'general'

  /** Export full report: 4 sheets */
  function exportReporteCompleto() {
    downloadExcel(`Reporte_Extraescolares_${periodo}`, [
      {
        name: 'Resumen',
        headers: ['Indicador', 'Valor'],
        rows: [
          ['Período', periodo],
          ['Alumnos únicos atendidos', alumnosUnicos],
          ['Total inscripciones', totalInscrips],
          ['Actividades ofertadas', totalActividades],
          ['Fecha de generación', fmtDate(new Date())],
        ],
      },
      {
        name: 'Por Actividad',
        headers: ['Actividad', 'Instructor', 'Inscritos', 'Hombres', 'Mujeres'],
        rows: byActividad.map(r => [r.nombre, r.instructor, r.inscritos, r.hombres, r.mujeres]),
      },
      {
        name: 'Por Carrera',
        headers: ['Carrera', 'Cantidad de Inscripciones'],
        rows: Object.entries(byCarrera).sort((a, b) => b[1] - a[1]).map(([c, n]) => [c, n]),
      },
      {
        name: 'Por Semestre',
        headers: ['Semestre', 'Cantidad de Inscripciones'],
        rows: Object.entries(bySemestre)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([s, n]) => [s, n]),
      },
    ])
  }

  /** Export H/M breakdown */
  function exportReporteHM() {
    downloadExcel(`Reporte_HM_${periodo}`, [
      {
        name: 'Hombres y Mujeres',
        headers: ['Actividad', 'Instructor', 'Total Inscritos', 'Hombres', 'Mujeres', '% Hombres', '% Mujeres'],
        rows: byActividad.map(r => [
          r.nombre,
          r.instructor,
          r.inscritos,
          r.hombres,
          r.mujeres,
          r.inscritos > 0 ? `${Math.round((r.hombres / r.inscritos) * 100)}%` : '0%',
          r.inscritos > 0 ? `${Math.round((r.mujeres / r.inscritos) * 100)}%` : '0%',
        ]),
      },
    ])
  }

  /** Export by carrera */
  function exportReporteCarreras() {
    downloadExcel(`Reporte_Carreras_${periodo}`, [
      {
        name: 'Por Carrera',
        headers: ['Carrera', 'Inscripciones'],
        rows: Object.entries(byCarrera).sort((a, b) => b[1] - a[1]).map(([c, n]) => [c, n]),
      },
    ])
  }

  /** Export full detail list */
  function exportDetalle() {
    downloadExcel(`Detalle_Inscripciones_${periodo}`, [
      {
        name: 'Detalle',
        headers: [
          'No. Control', 'Nombre', 'Carrera', 'Semestre', 'Sexo',
          'Actividad', 'Instructor', 'Período', 'Fecha Inscripción',
        ],
        rows: filteredDetalles.map(i => [
          i.alumnoNumeroControl,
          i.alumnoNombre,
          i.alumnoCarrera,
          i.alumnoSemestre,
          alumnoMap[i.alumnoId]?.sexo ?? '',
          i.actividadNombre,
          i.instructorNombre,
          i.periodo,
          fmtDate(i.fechaInscripcion),
        ]),
      },
    ])
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes y Estadísticas</h1>
          <p className="text-sm text-gray-500">Generación de indicadores por periodo escolar</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={repararDatos}
            disabled={reparando}
            className="flex items-center gap-1.5 text-sm bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
          >
            <Wrench className={`w-3.5 h-3.5 ${reparando ? 'animate-spin' : ''}`} />
            {reparando ? 'Reparando…' : 'Reparar Datos'}
          </button>

          {/* Period selector */}
          <div className="relative">
            <select
              value={periodoSeleccionado}
              onChange={e => setPeriodoSeleccionado(e.target.value)}
              className="appearance-none text-sm border border-gray-200 rounded-lg px-3 py-1.5 pr-7 focus:outline-none focus:border-blue-500"
            >
              <option value="">Todos los períodos</option>
              {periodos.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>

          {/* Master export button */}
          <button
            onClick={exportReporteCompleto}
            className="flex items-center gap-1.5 text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Exportar Reporte Completo
          </button>
        </div>
      </div>

      {reparadoMsg && (
        <div className={`flex items-center gap-2 text-sm mb-4 px-4 py-2.5 rounded-lg border ${
          reparadoMsg.startsWith('✓')
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          <CheckCircle className="w-4 h-4" />
          {reparadoMsg}
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-600 text-white rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm">Alumnos Únicos</span>
            <Users className="w-5 h-5 opacity-80" />
          </div>
          <p className="text-3xl font-bold">{alumnosUnicos}</p>
          <p className="text-xs opacity-80">Total de alumnos atendidos</p>
        </div>
        <div className="bg-indigo-600 text-white rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm">Inscripciones</span>
            <ClipboardList className="w-5 h-5 opacity-80" />
          </div>
          <p className="text-3xl font-bold">{totalInscrips}</p>
          <p className="text-xs opacity-80">Total de registros en actividades</p>
        </div>
        <div className="bg-green-600 text-white rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm">Actividades</span>
            <BookOpen className="w-5 h-5 opacity-80" />
          </div>
          <p className="text-3xl font-bold">{totalActividades}</p>
          <p className="text-xs opacity-80">Ofertadas en el periodo</p>
        </div>
      </div>

      {/* Reporte por actividad */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-800">Reporte por Actividad</h3>
            <p className="text-xs text-gray-500">Desglose de alumnos Hombres y Mujeres</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportReporteHM}
              className="flex items-center gap-1 text-xs border border-gray-200 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download className="w-3 h-3 text-green-600" />
              Reporte H/M
            </button>
            <button
              onClick={exportReporteCarreras}
              className="flex items-center gap-1 text-xs border border-gray-200 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download className="w-3 h-3 text-green-600" />
              Reporte Carreras
            </button>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100">
            <tr>
              <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Actividad</th>
              <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Instructor</th>
              <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Inscritos</th>
              <th className="text-left py-2 text-xs font-semibold text-blue-500 uppercase">Hombres</th>
              <th className="text-left py-2 text-xs font-semibold text-red-500 uppercase">Mujeres</th>
            </tr>
          </thead>
          <tbody>
            {byActividad.map(r => (
              <tr key={r.id} className="border-b border-gray-50">
                <td className="py-2 text-gray-800">{r.nombre}</td>
                <td className="py-2 text-gray-500 text-xs">{r.instructor}</td>
                <td className="py-2">{r.inscritos}</td>
                <td className="py-2 text-blue-600">{r.hombres}</td>
                <td className="py-2 text-red-500">{r.mujeres}</td>
              </tr>
            ))}
            {byActividad.length === 0 && (
              <tr><td colSpan={5} className="text-center py-4 text-gray-400 text-xs">Sin datos</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* By carrera / semestre */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">Inscripciones por Carrera</h3>
            <button
              onClick={exportReporteCarreras}
              className="text-gray-400 hover:text-green-600 transition-colors"
              title="Exportar a Excel"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr>
                <th className="text-left py-1.5 text-xs font-semibold text-gray-500 uppercase">Carrera</th>
                <th className="text-right py-1.5 text-xs font-semibold text-gray-500 uppercase">Cantidad</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(byCarrera).sort((a, b) => b[1] - a[1]).map(([c, n]) => (
                <tr key={c} className="border-b border-gray-50">
                  <td className="py-1.5 text-xs text-gray-700 pr-2">{c}</td>
                  <td className="py-1.5 text-xs text-right font-medium">{n}</td>
                </tr>
              ))}
              {Object.keys(byCarrera).length === 0 && (
                <tr><td colSpan={2} className="text-center py-4 text-gray-400 text-xs">Sin datos</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-800 mb-3">Inscripciones por Semestre</h3>
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr>
                <th className="text-left py-1.5 text-xs font-semibold text-gray-500 uppercase">Semestre</th>
                <th className="text-right py-1.5 text-xs font-semibold text-gray-500 uppercase">Cantidad</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(bySemestre)
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([s, n]) => (
                  <tr key={s} className="border-b border-gray-50">
                    <td className="py-1.5 text-xs text-gray-700">{s}</td>
                    <td className="py-1.5 text-xs text-right font-medium">{n}</td>
                  </tr>
                ))}
              {Object.keys(bySemestre).length === 0 && (
                <tr><td colSpan={2} className="text-center py-4 text-gray-400 text-xs">Sin datos</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detalle inscripciones */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Detalle de Inscripciones</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-3 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 w-40"
              />
            </div>
            <button
              onClick={exportDetalle}
              className="flex items-center gap-1.5 text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Exportar Excel
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr>
                <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">No. Control</th>
                <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Nombre</th>
                <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Carrera</th>
                <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Semestre</th>
                <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Actividad</th>
                <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Instructor</th>
              </tr>
            </thead>
            <tbody>
              {filteredDetalles.map(i => (
                <tr key={i.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 font-mono text-xs">{i.alumnoNumeroControl}</td>
                  <td className="py-2 text-sm">{i.alumnoNombre}</td>
                  <td className="py-2 text-xs text-gray-600 max-w-[200px] truncate">{i.alumnoCarrera}</td>
                  <td className="py-2 text-xs text-center">{i.alumnoSemestre}</td>
                  <td className="py-2 text-xs">{i.actividadNombre}</td>
                  <td className="py-2 text-xs text-gray-500">{i.instructorNombre}</td>
                </tr>
              ))}
              {filteredDetalles.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-gray-400 text-xs">
                    No hay registros para mostrar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-right">
          Mostrando {filteredDetalles.length} de {filteredInscs.length} registros
        </p>
      </div>
    </div>
  )
}
