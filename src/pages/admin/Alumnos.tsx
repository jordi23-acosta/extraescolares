import { useState, useEffect } from 'react'
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { useNavigate } from 'react-router-dom'
import type { Alumno } from '../../types'
import { CARRERAS, SEMESTRES, SEXOS, SISTEMAS } from '../../types'
import { Search, Plus, Pencil, Trash2, ChevronRight, Users, FileSpreadsheet, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { downloadExcel } from '../../utils/exportExcel'

type AlumnoForm = Omit<Alumno, 'id'>

const EMPTY_FORM: AlumnoForm = {
  numeroControl: '', nombre: '', carrera: CARRERAS[0]!,
  semestre: '1', correo: '', sexo: '', sistema: '',
}

export default function AdminAlumnos() {
  const [alumnos, setAlumnos]     = useState<Alumno[]>([])
  const [search, setSearch]       = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem]   = useState<Alumno | null>(null)
  const [loading, setLoading]     = useState(false)
  const [form, setForm]           = useState<AlumnoForm>(EMPTY_FORM)
  const navigate = useNavigate()
  const { userProfile } = useAuth()

  useEffect(() => { loadAlumnos() }, [])

  async function loadAlumnos() {
    const snap = await getDocs(collection(db, 'alumnos'))
    setAlumnos(snap.docs.map(d => ({ id: d.id, ...d.data() } as Alumno)))
  }

  // ── Grouping ────────────────────────────────────────────────────────────────
  const grouped = alumnos.reduce<Record<string, Alumno[]>>((acc, a) => {
    const key = a.carrera || 'Sin carrera'
    if (!acc[key]) acc[key] = []
    acc[key].push(a)
    return acc
  }, {})

  const filtered = search.trim()
    ? alumnos.filter(a =>
        a.nombre?.toLowerCase().includes(search.toLowerCase()) ||
        a.numeroControl?.toLowerCase().includes(search.toLowerCase())
      )
    : null

  // ── Modal helpers ──────────────────────────────────────────────────────────
  function openAdd() {
    setEditItem(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  function openEdit(a: Alumno) {
    setEditItem(a)
    setForm({
      numeroControl: a.numeroControl,
      nombre: a.nombre,
      carrera: a.carrera,
      semestre: a.semestre,
      correo: a.correo,
      sexo: a.sexo ?? '',
      sistema: a.sistema ?? '',
    })
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditItem(null)
    setForm(EMPTY_FORM)
  }

  // ── CRUD ────────────────────────────────────────────────────────────────────
  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      if (editItem) {
        await updateDoc(doc(db, 'alumnos', editItem.id), { ...form })
      } else {
        await addDoc(collection(db, 'alumnos'), { ...form })
      }
      closeModal()
      await loadAlumnos()
    } catch {
      alert('Error al guardar alumno.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(alumno: Alumno) {
    if (!confirm(`¿Eliminar a ${alumno.nombre}? Se moverá a la papelera.`)) return
    await addDoc(collection(db, 'papelera'), {
      originalId: alumno.id,
      tipo: 'Alumno',
      elemento: alumno.nombre,
      fechaEliminacion: new Date().toISOString(),
      eliminadoPor: userProfile?.email ?? '',
      datos: alumno,
    })
    await deleteDoc(doc(db, 'alumnos', alumno.id))
    await loadAlumnos()
  }

  function exportAlumnos() {
    downloadExcel('Lista_Alumnos', [{
      name: 'Alumnos',
      headers: ['No. Control', 'Nombre', 'Carrera', 'Semestre', 'Correo', 'Sexo', 'Sistema'],
      rows: alumnos.map(a => [
        a.numeroControl, a.nombre, a.carrera, a.semestre,
        a.correo, a.sexo ?? '', a.sistema ?? '',
      ]),
    }])
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Alumnos</h1>
        <div className="flex gap-2">
          <button onClick={exportAlumnos}
            className="flex items-center gap-1.5 text-sm border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
            <FileSpreadsheet className="w-4 h-4 text-green-600" /> Exportar Lista
          </button>
          <button onClick={openAdd}
            className="flex items-center gap-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Agregar Alumno
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="Buscar por nombre o número de control..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
      </div>

      {/* Content */}
      {filtered ? (
        <AlumnosTable alumnos={filtered} onEdit={openEdit} onDelete={handleDelete} />
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(grouped).map(([carrera, lista]) => (
            <div key={carrera}
              className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/admin/alumnos/${encodeURIComponent(carrera)}`)}>
              <div className="flex items-center justify-between mb-2">
                <div className="bg-blue-100 rounded-lg p-2">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-lg font-bold text-gray-700">{lista.length}</span>
              </div>
              <p className="text-sm font-medium text-blue-600">{carrera}</p>
              <p className="text-xs text-gray-500 flex items-center gap-0.5 mt-1">
                Ver listado <ChevronRight className="w-3 h-3" />
              </p>
            </div>
          ))}
          {Object.keys(grouped).length === 0 && (
            <p className="col-span-3 text-center py-12 text-gray-400 text-sm">No hay alumnos registrados.</p>
          )}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <AlumnoModal
          form={form}
          isEdit={!!editItem}
          loading={loading}
          onChange={patch => setForm(f => ({ ...f, ...patch }))}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
    </div>
  )
}

// ── Shared sub-components ─────────────────────────────────────────────────────

export function AlumnosTable({
  alumnos,
  onEdit,
  onDelete,
}: {
  alumnos: Alumno[]
  onEdit: (a: Alumno) => void
  onDelete: (a: Alumno) => void
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">No. Control</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nombre</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Semestre</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Correo</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {alumnos.map(a => (
            <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
              <td className="px-4 py-3 font-mono text-xs">{a.numeroControl}</td>
              <td className="px-4 py-3 font-medium">{a.nombre}</td>
              <td className="px-4 py-3">{a.semestre}</td>
              <td className="px-4 py-3 text-gray-500">{a.correo}</td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  <button onClick={() => onEdit(a)}
                    className="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-50 transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => onDelete(a)}
                    className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {alumnos.length === 0 && (
            <tr><td colSpan={5} className="text-center py-8 text-gray-400 text-sm">No hay alumnos.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export function AlumnoModal({
  form,
  isEdit,
  loading,
  onChange,
  onSave,
  onClose,
}: {
  form: AlumnoForm
  isEdit: boolean
  loading: boolean
  onChange: (patch: Partial<AlumnoForm>) => void
  onSave: (e: React.FormEvent) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">{isEdit ? 'Editar Alumno' : 'Nuevo Alumno'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSave} className="px-6 py-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Número de Control</label>
            <input type="text" required value={form.numeroControl}
              onChange={e => onChange({ numeroControl: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
            <input type="text" required value={form.nombre}
              onChange={e => onChange({ nombre: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Carrera</label>
            <select value={form.carrera} onChange={e => onChange({ carrera: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500">
              {CARRERAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Semestre</label>
              <select value={form.semestre} onChange={e => onChange({ semestre: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500">
                {SEMESTRES.map(s => <option key={s} value={s}>{s}°</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
              <input type="email" value={form.correo}
                onChange={e => onChange({ correo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sexo</label>
              <select value={form.sexo} onChange={e => onChange({ sexo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500">
                <option value="">Selecciona</option>
                {SEXOS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sistema</label>
              <select value={form.sistema} onChange={e => onChange({ sistema: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500">
                <option value="">Selecciona</option>
                {SISTEMAS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-60">
              {loading ? 'Guardando…' : isEdit ? 'Guardar Cambios' : 'Registrar Alumno'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
