import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  collection, getDocs, query, where,
  addDoc, updateDoc, doc, getDoc,
} from 'firebase/firestore'
import { db } from '../../firebase'
import type { Actividad, Inscripcion, Asistencia } from '../../types'
import { ArrowLeft, Save, Calendar, FileSpreadsheet, CheckCircle, XCircle } from 'lucide-react'
import * as XLSX from 'xlsx'

const MESES_ES = ['enero','febrero','marzo','abril','mayo','junio',
                  'julio','agosto','septiembre','octubre','noviembre','diciembre']

function abrevCarrera(carrera: string): string {
  const map: Record<string, string> = {
    'Ingeniería en Sistemas Computacionales': 'ISC',
    'Ingeniería Industrial': 'II',
    'Ingeniería Mecatrónica': 'IM',
    'Ingeniería Civil': 'IC',
    'Ingeniería Química': 'IQ',
    'Ingeniería Electrónica': 'IE',
    'Licenciatura en Administración': 'LA',
    'Ingeniería en Gestión Empresarial': 'IGE',
    'Ingeniería en Logística': 'IL',
    'Ingeniería Ambiental': 'IA',
  }
  return map[carrera] ?? carrera.split(' ').filter(w => w.length > 2 && w[0] === w[0]?.toUpperCase()).map(w => w[0]).join('')
}

export default function InstructorAsistencia() {
  const { actividadId } = useParams<{ actividadId: string }>()
  const navigate = useNavigate()

  const [actividad, setActividad] = useState<Actividad | null>(null)
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([])
  const [asistencias, setAsistencias] = useState<Record<string, boolean>>({})
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (actividadId) loadData()
  }, [actividadId])

  useEffect(() => {
    if (actividadId) loadAsistenciasDia(actividadId, fecha)
    setSaved(false)
  }, [fecha])

  async function loadData() {
    if (!actividadId) return
    const actDoc = await getDoc(doc(db, 'actividades', actividadId))
    if (!actDoc.exists()) return
    const act = { id: actDoc.id, ...actDoc.data() } as Actividad
    setActividad(act)

    const inscSnap = await getDocs(
      query(collection(db, 'inscripciones'), where('actividadId', '==', actividadId))
    )
    const inscs = inscSnap.docs.map(d => ({ id: d.id, ...d.data() } as Inscripcion))
    setInscripciones(inscs)

    await loadAsistenciasDia(actividadId, fecha)
  }

  async function loadAsistenciasDia(actId: string, f: string) {
    const snap = await getDocs(
      query(collection(db, 'asistencias'),
        where('actividadId', '==', actId),
        where('fecha', '==', f))
    )
    const map: Record<string, boolean> = {}
    snap.docs.forEach(d => {
      const a = d.data() as Asistencia
      map[a.alumnoId] = a.presente
    })
    setAsistencias(map)
  }

  function toggleAll(value: boolean) {
    const newMap: Record<string, boolean> = {}
    inscripciones.forEach(i => { newMap[i.alumnoId] = value })
    setAsistencias(newMap)
  }

  function toggle(alumnoId: string) {
    setAsistencias(prev => ({ ...prev, [alumnoId]: !prev[alumnoId] }))
    setSaved(false)
  }

  async function handleSave() {
    if (!actividadId) return
    setSaving(true)
    setSaved(false)
    try {
      for (const insc of inscripciones) {
        const presente = asistencias[insc.alumnoId] ?? false
        const existing = await getDocs(
          query(collection(db, 'asistencias'),
            where('actividadId', '==', actividadId),
            where('alumnoId', '==', insc.alumnoId),
            where('fecha', '==', fecha))
        )
        if (existing.empty) {
          await addDoc(collection(db, 'asistencias'), {
            actividadId,
            alumnoId: insc.alumnoId,
            alumnoNombre: insc.alumnoNombre,
            alumnoNumeroControl: insc.alumnoNumeroControl,
            fecha,
            presente,
          })
        } else {
          await updateDoc(doc(db, 'asistencias', existing.docs[0].id), { presente })
        }
      }
      setSaved(true)
    } catch {
      alert('Error al guardar asistencias.')
    } finally {
      setSaving(false)
    }
  }

  async function exportPeriodo() {
    if (!actividad || !actividadId) return
    setExporting(true)
    try {
      const allSnap = await getDocs(
        query(collection(db, 'asistencias'), where('actividadId', '==', actividadId))
      )
      const all = allSnap.docs.map(d => d.data() as Asistencia)
      const dates = [...new Set(all.map(a => a.fecha))].sort()

      // Group by month
      type MonthGroup = { label: string; days: string[] }
      const monthGroups: MonthGroup[] = []
      for (const d of dates) {
        const dt = new Date(d + 'T12:00:00')
        const label = MESES_ES[dt.getMonth()]!.charAt(0).toUpperCase() + MESES_ES[dt.getMonth()]!.slice(1)
        const last = monthGroups[monthGroups.length - 1]
        if (last && last.label === label) last.days.push(d)
        else monthGroups.push({ label, days: [d] })
      }

      const alumnoIds = inscripciones.map(i => i.alumnoId)
      const ACREDITA_PCT = 85
      const wb = XLSX.utils.book_new()
      const ws: XLSX.WorkSheet = {}
      const merges: XLSX.Range[] = []

      function setCell(r: number, c: number, v: XLSX.CellObject['v'], _opts?: Partial<XLSX.CellObject>) {
        const addr = XLSX.utils.encode_cell({ r, c })
        ws[addr] = { v, t: typeof v === 'number' ? 'n' : 's' }
      }

      const totalCols = 6 + dates.length + 3
      setCell(1, 1, 'INSTITUTO TECNOLOGICO SUPERIOR DE MISANTLA')
      merges.push({ s: { r: 1, c: 1 }, e: { r: 1, c: totalCols } })
      setCell(2, 1, 'LISTA DE ASISTENCIA')
      merges.push({ s: { r: 2, c: 1 }, e: { r: 2, c: totalCols } })
      setCell(3, 1, actividad.nombre.toUpperCase())
      merges.push({ s: { r: 3, c: 1 }, e: { r: 3, c: totalCols } })

      setCell(5, 1, `MTRO. ${actividad.instructorNombre.toUpperCase()}   -   PERIODO: ${actividad.periodo}`)
      merges.push({ s: { r: 5, c: 1 }, e: { r: 5, c: Math.floor(totalCols / 2) } })
      const acredCol = Math.floor(totalCols / 2) + 2
      setCell(5, acredCol, `ACREDITADA: ${ACREDITA_PCT} % DE ASISTENCIA`)
      merges.push({ s: { r: 5, c: acredCol }, e: { r: 5, c: totalCols } })

      const COL_NO = 1, COL_NOMBRE = 2, COL_CONTROL = 4
      const COL_SEXO = 5, COL_CAR = 6, COL_SIST = 7, COL_DATES_START = 8

      setCell(6, COL_NO, 'No.')
      merges.push({ s: { r: 6, c: COL_NO }, e: { r: 7, c: COL_NO } })
      setCell(6, COL_NOMBRE, 'NOMBRE DEL ALUMNO')
      merges.push({ s: { r: 6, c: COL_NOMBRE }, e: { r: 6, c: COL_CONTROL - 1 } })
      setCell(6, COL_CONTROL, 'No. DE\nCONTROL')
      merges.push({ s: { r: 6, c: COL_CONTROL }, e: { r: 7, c: COL_CONTROL } })
      setCell(6, COL_SEXO, 'SEXO')
      merges.push({ s: { r: 6, c: COL_SEXO }, e: { r: 7, c: COL_SEXO } })
      setCell(6, COL_CAR, 'CAR.')
      merges.push({ s: { r: 6, c: COL_CAR }, e: { r: 7, c: COL_CAR } })
      setCell(6, COL_SIST, 'SIST.')
      merges.push({ s: { r: 6, c: COL_SIST }, e: { r: 7, c: COL_SIST } })

      let colCursor = COL_DATES_START
      for (const mg of monthGroups) {
        setCell(6, colCursor, mg.label)
        if (mg.days.length > 1)
          merges.push({ s: { r: 6, c: colCursor }, e: { r: 6, c: colCursor + mg.days.length - 1 } })
        colCursor += mg.days.length
      }

      const COL_TOTAL = colCursor, COL_ACRED = colCursor + 1, COL_NO_COL = colCursor + 2
      setCell(6, COL_TOTAL, 'TOTAL')
      merges.push({ s: { r: 6, c: COL_TOTAL }, e: { r: 7, c: COL_TOTAL } })
      setCell(6, COL_ACRED, 'ACRE\nDITADO')
      merges.push({ s: { r: 6, c: COL_ACRED }, e: { r: 7, c: COL_ACRED } })
      setCell(6, COL_NO_COL, 'NO')
      merges.push({ s: { r: 6, c: COL_NO_COL }, e: { r: 7, c: COL_NO_COL } })

      setCell(7, COL_NOMBRE, 'APELLIDO PATERNO / APELLIDO MATERNO / NOMBRE')
      colCursor = COL_DATES_START
      for (const mg of monthGroups) {
        for (const d of mg.days) {
          setCell(7, colCursor, new Date(d + 'T12:00:00').getDate())
          colCursor++
        }
      }

      let dataRow = 8
      for (let idx = 0; idx < alumnoIds.length; idx++) {
        const aid = alumnoIds[idx]!
        const insc = inscripciones.find(i => i.alumnoId === aid)
        setCell(dataRow, COL_NO, idx + 1)
        setCell(dataRow, COL_NOMBRE, insc?.alumnoNombre ?? '')
        merges.push({ s: { r: dataRow, c: COL_NOMBRE }, e: { r: dataRow, c: COL_CONTROL - 1 } })
        setCell(dataRow, COL_CONTROL, insc?.alumnoNumeroControl ?? '')
        setCell(dataRow, COL_SEXO, '')
        setCell(dataRow, COL_CAR, abrevCarrera(insc?.alumnoCarrera ?? ''))
        setCell(dataRow, COL_SIST, '')

        let presentes = 0
        colCursor = COL_DATES_START
        for (const d of dates) {
          const reg = all.find(a => a.alumnoId === aid && a.fecha === d)
          const val = reg ? (reg.presente ? 'P' : 'F') : ''
          if (reg?.presente) presentes++
          setCell(dataRow, colCursor, val)
          colCursor++
        }

        const pct = dates.length > 0 ? Math.round((presentes / dates.length) * 100) : 0
        setCell(dataRow, COL_TOTAL, presentes)
        setCell(dataRow, COL_ACRED, pct >= ACREDITA_PCT ? 'SÍ' : 'NO')
        setCell(dataRow, COL_NO_COL, dates.length - presentes)
        dataRow++
      }

      const sigRow = dataRow + 4
      const leftSigCol = COL_NOMBRE
      const rightSigCol = COL_DATES_START + Math.floor(dates.length / 2) + 2
      setCell(sigRow, leftSigCol, `MTRO. ${actividad.instructorNombre.toUpperCase()}`)
      setCell(sigRow + 1, leftSigCol, 'INSTRUCTOR')
      merges.push({ s: { r: sigRow, c: leftSigCol }, e: { r: sigRow, c: leftSigCol + 4 } })
      merges.push({ s: { r: sigRow + 1, c: leftSigCol }, e: { r: sigRow + 1, c: leftSigCol + 4 } })
      setCell(sigRow, rightSigCol, 'MTRO. TITO MARTÍNEZ JIMÉNEZ')
      setCell(sigRow + 1, rightSigCol, 'JEFE DE DEPTO. DE ACT. EXTRAESCOLARES')
      merges.push({ s: { r: sigRow, c: rightSigCol }, e: { r: sigRow, c: rightSigCol + 5 } })
      merges.push({ s: { r: sigRow + 1, c: rightSigCol }, e: { r: sigRow + 1, c: rightSigCol + 5 } })

      ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: sigRow + 3, c: COL_NO_COL + 1 } })
      ws['!merges'] = merges
      const colWidths: { wch: number }[] = []
      colWidths[0] = { wch: 2 }
      colWidths[COL_NO] = { wch: 4 }
      colWidths[COL_NOMBRE] = { wch: 35 }
      colWidths[COL_CONTROL - 1] = { wch: 2 }
      colWidths[COL_CONTROL] = { wch: 12 }
      colWidths[COL_SEXO] = { wch: 6 }
      colWidths[COL_CAR] = { wch: 6 }
      colWidths[COL_SIST] = { wch: 6 }
      for (let i = COL_DATES_START; i < COL_DATES_START + dates.length; i++) colWidths[i] = { wch: 4 }
      colWidths[COL_TOTAL] = { wch: 7 }
      colWidths[COL_ACRED] = { wch: 8 }
      colWidths[COL_NO_COL] = { wch: 4 }
      ws['!cols'] = colWidths

      XLSX.utils.book_append_sheet(wb, ws, 'CLUB')
      XLSX.writeFile(wb, `Lista_Asistencia_${actividad.nombre.replace(/\s+/g, '_')}.xlsx`)
    } finally {
      setExporting(false)
    }
  }

  // Stats for today
  const presentes = inscripciones.filter(i => asistencias[i.alumnoId] === true).length
  const ausentes  = inscripciones.filter(i => asistencias[i.alumnoId] === false).length
  const sinRegistro = inscripciones.filter(i => asistencias[i.alumnoId] === undefined).length

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/instructor')}
          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">
            {actividad?.nombre ?? 'Pasando Lista…'}
          </h1>
          <p className="text-xs text-gray-500">
            Instructor: {actividad?.instructorNombre} · {actividad?.periodo}
          </p>
        </div>
      </div>

      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {/* Date picker */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-500">Fecha:</span>
          <input
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            className="text-sm border-none outline-none bg-transparent"
          />
        </div>

        {/* Mark all present / absent */}
        <button
          onClick={() => toggleAll(true)}
          className="flex items-center gap-1.5 text-sm bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors"
        >
          <CheckCircle className="w-4 h-4" /> Todos presentes
        </button>
        <button
          onClick={() => toggleAll(false)}
          className="flex items-center gap-1.5 text-sm bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
        >
          <XCircle className="w-4 h-4" /> Todos ausentes
        </button>

        <div className="flex-1" />

        {/* Export */}
        <button
          onClick={exportPeriodo}
          disabled={exporting}
          className="flex items-center gap-1.5 text-sm border border-gray-200 bg-white hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
        >
          <FileSpreadsheet className="w-4 h-4 text-green-600" />
          {exporting ? 'Generando…' : 'Exportar Período'}
        </button>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg transition-colors disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>

      {/* Summary chips */}
      <div className="flex gap-3 mb-4">
        <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-lg px-3 py-1.5">
          <span className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="text-sm font-medium text-green-700">{presentes} Presentes</span>
        </div>
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5">
          <span className="w-2 h-2 bg-red-500 rounded-full" />
          <span className="text-sm font-medium text-red-700">{ausentes} Ausentes</span>
        </div>
        {sinRegistro > 0 && (
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
            <span className="w-2 h-2 bg-gray-400 rounded-full" />
            <span className="text-sm font-medium text-gray-500">{sinRegistro} Sin marcar</span>
          </div>
        )}
      </div>

      {saved && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-2.5 mb-4 text-sm">
          <CheckCircle className="w-4 h-4" />
          Asistencia guardada correctamente para el {new Date(fecha + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}.
        </div>
      )}

      {/* Lista */}
      {inscripciones.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
          <p className="font-medium mb-1">Sin alumnos inscritos</p>
          <p className="text-sm">Ve a Inscripciones para agregar alumnos a esta actividad.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="grid grid-cols-[auto_1fr_auto_auto] items-center bg-gray-50 border-b border-gray-100 px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <span className="w-8">#</span>
            <span>Alumno</span>
            <span className="w-24 text-center">Asistencia</span>
            <span className="w-8" />
          </div>

          {inscripciones.map((insc, idx) => {
            const estado = asistencias[insc.alumnoId]
            const isPresente  = estado === true
            const isAusente   = estado === false
            const sinMarcar   = estado === undefined

            return (
              <div
                key={insc.id}
                className={`grid grid-cols-[auto_1fr_auto] items-center px-4 py-3 border-b border-gray-50 last:border-0 transition-colors ${
                  isPresente ? 'bg-green-50/40' : isAusente ? 'bg-red-50/40' : ''
                }`}
              >
                {/* Index */}
                <span className="w-8 text-xs text-gray-400 font-mono">{idx + 1}</span>

                {/* Alumno info */}
                <div>
                  <p className="text-sm font-medium text-gray-900">{insc.alumnoNombre}</p>
                  <p className="text-xs text-gray-400">
                    {insc.alumnoNumeroControl} · {insc.alumnoCarrera}
                  </p>
                </div>

                {/* Toggle button */}
                <div className="flex items-center gap-2">
                  {/* Presente */}
                  <button
                    onClick={() => setAsistencias(prev => ({ ...prev, [insc.alumnoId]: true }))}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      isPresente
                        ? 'bg-green-500 border-green-500 text-white shadow-sm'
                        : 'bg-white border-gray-200 text-gray-500 hover:border-green-300 hover:text-green-600'
                    }`}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    P
                  </button>
                  {/* Ausente */}
                  <button
                    onClick={() => setAsistencias(prev => ({ ...prev, [insc.alumnoId]: false }))}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      isAusente
                        ? 'bg-red-500 border-red-500 text-white shadow-sm'
                        : 'bg-white border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-600'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    F
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
