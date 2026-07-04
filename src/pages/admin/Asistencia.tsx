import { useState, useEffect } from 'react'
import { collection, getDocs, query, where, addDoc, updateDoc, doc } from 'firebase/firestore'
import { db } from '../../firebase'
import type { Actividad, Inscripcion, Asistencia } from '../../types'
import { ArrowLeft, Save, Calendar, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'

/** Abbreviate a carrera name to its initials, e.g. "Ingeniería en Sistemas Computacionales" → "ISC" */
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
  return map[carrera] ?? carrera.split(' ').filter(w => w[0] === w[0]?.toUpperCase() && w.length > 2).map(w => w[0]).join('')
}

export default function AdminAsistencia() {
  const [actividades, setActividades] = useState<Actividad[]>([])
  const [selectedActividad, setSelectedActividad] = useState<Actividad | null>(null)
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([])
  const [asistencias, setAsistencias] = useState<Record<string, boolean>>({})
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { loadActividades() }, [])

  async function loadActividades() {
    const snap = await getDocs(collection(db, 'actividades'))
    setActividades(snap.docs.map(d => ({ id: d.id, ...d.data() } as Actividad)))
  }

  async function selectActividad(act: Actividad) {
    setSelectedActividad(act)
    setSaved(false)

    // Load inscripciones
    const inscSnap = await getDocs(query(collection(db, 'inscripciones'), where('actividadId', '==', act.id)))
    const inscs = inscSnap.docs.map(d => ({ id: d.id, ...d.data() } as Inscripcion))
    setInscripciones(inscs)

    // Load existing asistencia for this date
    const asistSnap = await getDocs(query(
      collection(db, 'asistencias'),
      where('actividadId', '==', act.id),
      where('fecha', '==', fecha)
    ))
    const existing: Record<string, boolean> = {}
    asistSnap.docs.forEach(d => {
      const a = d.data() as Asistencia
      existing[a.alumnoId] = a.presente
    })
    setAsistencias(existing)
  }

  async function loadAsistencias(actividadId: string, f: string) {
    const asistSnap = await getDocs(query(
      collection(db, 'asistencias'),
      where('actividadId', '==', actividadId),
      where('fecha', '==', f)
    ))
    const existing: Record<string, boolean> = {}
    asistSnap.docs.forEach(d => {
      const a = d.data() as Asistencia
      existing[a.alumnoId] = a.presente
    })
    setAsistencias(existing)
  }

  async function handleDateChange(newFecha: string) {
    setFecha(newFecha)
    setSaved(false)
    if (selectedActividad) {
      await loadAsistencias(selectedActividad.id, newFecha)
    }
  }

  function toggleAsistencia(alumnoId: string) {
    setAsistencias(prev => ({ ...prev, [alumnoId]: !prev[alumnoId] }))
  }

  async function exportPeriodo() {
    if (!selectedActividad) return

    // ── 1. Load all asistencias for this actividad ──────────────────────────
    const allSnap = await getDocs(query(
      collection(db, 'asistencias'),
      where('actividadId', '==', selectedActividad.id)
    ))
    const all = allSnap.docs.map(d => d.data() as Asistencia)

    // ── 2. Sorted unique dates ───────────────────────────────────────────────
    const dates = [...new Set(all.map(a => a.fecha))].sort()

    // ── 3. Lookup maps from inscriptions ────────────────────────────────────
    type AlumnoInfo = { nombre: string; control: string; carrera: string; sexo: string; sistema: string }
    const alumnoInfo: Record<string, AlumnoInfo> = {}
    inscripciones.forEach(i => {
      alumnoInfo[i.alumnoId] = {
        nombre: i.alumnoNombre,
        control: i.alumnoNumeroControl,
        carrera: abrevCarrera(i.alumnoCarrera),
        sexo: '',        // pulled from alumnos collection if needed
        sistema: '',
      }
    })

    // ── 4. Group dates by month ──────────────────────────────────────────────
    // months: { label: 'Enero', days: ['2025-01-10', ...] }[]
    const MESES_ES = ['enero','febrero','marzo','abril','mayo','junio',
                      'julio','agosto','septiembre','octubre','noviembre','diciembre']
    type MonthGroup = { label: string; days: string[] }
    const monthGroups: MonthGroup[] = []
    for (const d of dates) {
      const dt = new Date(d + 'T12:00:00')
      const label = MESES_ES[dt.getMonth()]!
        .charAt(0).toUpperCase() + MESES_ES[dt.getMonth()]!.slice(1)
      const last = monthGroups[monthGroups.length - 1]
      if (last && last.label === label) {
        last.days.push(d)
      } else {
        monthGroups.push({ label, days: [d] })
      }
    }

    // ── 5. Calculate stats per alumno ────────────────────────────────────────
    const alumnoIds = inscripciones.map(i => i.alumnoId)
    const ACREDITA_PCT = 85

    // ── 6. Build worksheet using xlsx ───────────────────────────────────────
    const wb = XLSX.utils.book_new()
    const ws: XLSX.WorkSheet = {}
    const merges: XLSX.Range[] = []

    // Helper: set a cell
    function setCell(r: number, c: number, v: XLSX.CellObject['v'], opts?: Partial<XLSX.CellObject>) {
      const addr = XLSX.utils.encode_cell({ r, c })
      ws[addr] = { v, t: typeof v === 'number' ? 'n' : 's', ...opts }
    }

    // ── Row 0: empty ─────────────────────────────────────────────────────────
    // ── Row 1: INSTITUTO TECNOLOGICO SUPERIOR DE MISANTLA ───────────────────
    const totalCols = 6 + dates.length + 3 // No + Nombre + Control + Sexo + Carrera + Sist + dates + Total + Acred + No
    setCell(1, 1, 'INSTITUTO TECNOLOGICO SUPERIOR DE MISANTLA')
    merges.push({ s: { r: 1, c: 1 }, e: { r: 1, c: totalCols } })

    // ── Row 2: LISTA DE ASISTENCIA ───────────────────────────────────────────
    setCell(2, 1, 'LISTA DE ASISTENCIA')
    merges.push({ s: { r: 2, c: 1 }, e: { r: 2, c: totalCols } })

    // ── Row 3: nombre de la actividad ────────────────────────────────────────
    setCell(3, 1, selectedActividad.nombre.toUpperCase())
    merges.push({ s: { r: 3, c: 1 }, e: { r: 3, c: totalCols } })

    // ── Row 4: empty ─────────────────────────────────────────────────────────

    // ── Row 5: instructor + periodo (left) | ACREDITADA: 85% (right) ────────
    setCell(5, 1, `MTRO. ${selectedActividad.instructorNombre.toUpperCase()}   -   PERIODO: ${selectedActividad.periodo}`)
    merges.push({ s: { r: 5, c: 1 }, e: { r: 5, c: Math.floor(totalCols / 2) } })

    const acredCol = Math.floor(totalCols / 2) + 2
    setCell(5, acredCol, `ACREDITADA: ${ACREDITA_PCT} % DE ASISTENCIA`)
    merges.push({ s: { r: 5, c: acredCol }, e: { r: 5, c: totalCols } })

    // ── Row 6: fixed headers + month group headers ───────────────────────────
    // Fixed cols: B=No., C=NOMBRE DEL ALUMNO (merged 6+7), then Control, Sexo, Carrera, Sist
    // Col indices (0-based, col A = 0, col B = 1):
    const COL_NO      = 1   // B
    const COL_NOMBRE  = 2   // C  (merged C+D in row 6/7)
    const COL_CONTROL = 4   // E
    const COL_SEXO    = 5   // F
    const COL_CAR     = 6   // G
    const COL_SIST    = 7   // H
    const COL_DATES_START = 8 // I onwards

    // Row 6 — fixed labels with merge over 2 rows
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

    // Month group headers spanning their day columns
    let colCursor = COL_DATES_START
    for (const mg of monthGroups) {
      setCell(6, colCursor, mg.label)
      if (mg.days.length > 1) {
        merges.push({ s: { r: 6, c: colCursor }, e: { r: 6, c: colCursor + mg.days.length - 1 } })
      }
      colCursor += mg.days.length
    }

    // Tail columns: TOTAL, ACREDITADO, NO
    const COL_TOTAL  = colCursor
    const COL_ACRED  = colCursor + 1
    const COL_NO_COL = colCursor + 2

    setCell(6, COL_TOTAL,  'TOTAL')
    merges.push({ s: { r: 6, c: COL_TOTAL }, e: { r: 7, c: COL_TOTAL } })
    setCell(6, COL_ACRED,  'ACRE\nDITADO')
    merges.push({ s: { r: 6, c: COL_ACRED }, e: { r: 7, c: COL_ACRED } })
    setCell(6, COL_NO_COL, 'NO')
    merges.push({ s: { r: 6, c: COL_NO_COL }, e: { r: 7, c: COL_NO_COL } })

    // ── Row 7: sub-headers (day numbers per month + nombre sub-label) ────────
    setCell(7, COL_NOMBRE, 'APELLIDO PATERNO / APELLIDO MATERNO / NOMBRE')

    colCursor = COL_DATES_START
    for (const mg of monthGroups) {
      for (const d of mg.days) {
        const day = new Date(d + 'T12:00:00').getDate()
        setCell(7, colCursor, day)
        colCursor++
      }
    }

    // ── Rows 8+: alumno data ─────────────────────────────────────────────────
    let dataRow = 8
    for (let idx = 0; idx < alumnoIds.length; idx++) {
      const aid = alumnoIds[idx]!
      const info = alumnoInfo[aid] ?? { nombre: '', control: '', carrera: '', sexo: '', sistema: '' }

      setCell(dataRow, COL_NO,      idx + 1)
      setCell(dataRow, COL_NOMBRE,  info.nombre)
      merges.push({ s: { r: dataRow, c: COL_NOMBRE }, e: { r: dataRow, c: COL_CONTROL - 1 } })
      setCell(dataRow, COL_CONTROL, info.control)
      setCell(dataRow, COL_SEXO,    info.sexo)
      setCell(dataRow, COL_CAR,     info.carrera)
      setCell(dataRow, COL_SIST,    info.sistema)

      let presentes = 0
      let totalClases = dates.length

      colCursor = COL_DATES_START
      for (const d of dates) {
        const reg = all.find(a => a.alumnoId === aid && a.fecha === d)
        let val: string | number = ''
        if (reg) {
          val = reg.presente ? 'P' : 'F'
          if (reg.presente) presentes++
        }
        setCell(dataRow, colCursor, val)
        colCursor++
      }

      const pct = totalClases > 0 ? Math.round((presentes / totalClases) * 100) : 0
      const acreditado = pct >= ACREDITA_PCT ? 'SÍ' : 'NO'

      setCell(dataRow, COL_TOTAL,  presentes)
      setCell(dataRow, COL_ACRED,  acreditado)
      setCell(dataRow, COL_NO_COL, totalClases - presentes)

      dataRow++
    }

    // ── Blank rows before signatures ─────────────────────────────────────────
    const sigRow = dataRow + 4

    // ── Signatures ───────────────────────────────────────────────────────────
    const leftSigCol  = COL_NOMBRE
    const rightSigCol = COL_DATES_START + Math.floor(dates.length / 2) + 2

    setCell(sigRow,     leftSigCol,  `MTRO. ${selectedActividad.instructorNombre.toUpperCase()}`)
    setCell(sigRow + 1, leftSigCol,  'INSTRUCTOR')
    merges.push({ s: { r: sigRow, c: leftSigCol }, e: { r: sigRow, c: leftSigCol + 4 } })
    merges.push({ s: { r: sigRow + 1, c: leftSigCol }, e: { r: sigRow + 1, c: leftSigCol + 4 } })

    setCell(sigRow,     rightSigCol, 'MTRO. TITO MARTÍNEZ JIMÉNEZ')
    setCell(sigRow + 1, rightSigCol, 'JEFE DE DEPTO. DE ACT. EXTRAESCOLARES')
    merges.push({ s: { r: sigRow, c: rightSigCol }, e: { r: sigRow, c: rightSigCol + 5 } })
    merges.push({ s: { r: sigRow + 1, c: rightSigCol }, e: { r: sigRow + 1, c: rightSigCol + 5 } })

    // ── Set worksheet range & merges ─────────────────────────────────────────
    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: sigRow + 3, c: COL_NO_COL + 1 } })
    ws['!merges'] = merges

    // ── Column widths ────────────────────────────────────────────────────────
    const colWidths: { wch: number }[] = []
    colWidths[0] = { wch: 2 }          // A (empty)
    colWidths[COL_NO] = { wch: 4 }     // No.
    colWidths[COL_NOMBRE] = { wch: 35 } // Nombre (wide)
    colWidths[COL_CONTROL - 1] = { wch: 2 } // name overflow col
    colWidths[COL_CONTROL] = { wch: 12 }
    colWidths[COL_SEXO]    = { wch: 6 }
    colWidths[COL_CAR]     = { wch: 6 }
    colWidths[COL_SIST]    = { wch: 6 }
    for (let i = COL_DATES_START; i < COL_DATES_START + dates.length; i++) {
      colWidths[i] = { wch: 4 }
    }
    colWidths[COL_TOTAL]  = { wch: 7 }
    colWidths[COL_ACRED]  = { wch: 8 }
    colWidths[COL_NO_COL] = { wch: 4 }
    ws['!cols'] = colWidths

    // ── Row heights ───────────────────────────────────────────────────────────
    ws['!rows'] = [
      {}, {},          // 0-1
      { hpt: 18 },     // 2 LISTA DE ASISTENCIA
      { hpt: 18 },     // 3 Actividad
      {},              // 4
      { hpt: 18 },     // 5 instructor+periodo
      { hpt: 30 },     // 6 headers
      { hpt: 30 },     // 7 sub-headers
    ]

    XLSX.utils.book_append_sheet(wb, ws, 'CLUB')
    XLSX.writeFile(wb, `Lista_Asistencia_${selectedActividad.nombre.replace(/\s+/g, '_')}.xlsx`)
  }

  async function handleSave() {
    if (!selectedActividad) return
    setLoading(true)
    try {
      for (const insc of inscripciones) {
        const presente = asistencias[insc.alumnoId] ?? false
        // Check if record exists
        const existing = await getDocs(query(
          collection(db, 'asistencias'),
          where('actividadId', '==', selectedActividad.id),
          where('alumnoId', '==', insc.alumnoId),
          where('fecha', '==', fecha)
        ))
        if (existing.empty) {
          await addDoc(collection(db, 'asistencias'), {
            actividadId: selectedActividad.id,
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
      setLoading(false)
    }
  }

  if (!selectedActividad) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Asistencia</h1>
        <p className="text-sm text-gray-500 mb-4">Selecciona una actividad para registrar asistencia:</p>
        <div className="grid gap-3">
          {actividades.map(a => (
            <button
              key={a.id}
              onClick={() => selectActividad(a)}
              className="bg-white border border-gray-200 rounded-xl p-4 text-left hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{a.nombre}</p>
                  <p className="text-sm text-gray-500">Instructor: {a.instructorNombre} · {a.horario}</p>
                </div>
                <span className="text-xs text-gray-400">{a.inscritos} inscritos</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <button onClick={() => setSelectedActividad(null)} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{selectedActividad.nombre}</h1>
            <p className="text-xs text-gray-500">👤 {selectedActividad.instructorNombre}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-1.5">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-xs text-gray-600">Fecha de Asistencia:</span>
            <input
              type="date"
              value={fecha}
              onChange={e => handleDateChange(e.target.value)}
              className="text-xs border-none outline-none bg-transparent"
            />
          </div>
          <button
            onClick={exportPeriodo}
            className="flex items-center gap-1.5 text-sm border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-green-600" />
            Exportar Período
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
          <button className="flex items-center gap-1 text-sm border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50">
            ↓ Importar
          </button>
        </div>
      </div>

      {saved && <p className="text-green-600 text-sm mb-4 bg-green-50 p-2 rounded">✓ Asistencia guardada correctamente.</p>}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-100 px-4 py-3">
          <p className="text-sm font-semibold text-gray-700">Listado de Alumnos</p>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Alumno</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Asistencia</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Constancia</th>
            </tr>
          </thead>
          <tbody>
            {inscripciones.map(insc => (
              <tr key={insc.id} className="border-b border-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-800">{insc.alumnoNombre}</p>
                  <p className="text-xs text-gray-400">{insc.alumnoNumeroControl}</p>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleAsistencia(insc.alumnoId)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                      asistencias[insc.alumnoId]
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300 bg-gray-100'
                    }`}
                  >
                    {asistencias[insc.alumnoId] && <span className="text-xs">✓</span>}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button className="text-gray-400 hover:text-gray-600 p-1" title="Ver constancia">
                    📄
                  </button>
                </td>
              </tr>
            ))}
            {inscripciones.length === 0 && (
              <tr><td colSpan={3} className="text-center py-8 text-gray-400 text-sm">No hay alumnos inscritos en esta actividad.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
