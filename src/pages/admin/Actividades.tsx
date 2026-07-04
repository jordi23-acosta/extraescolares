import { useState, useEffect } from 'react'
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import type { Actividad, Instructor } from '../../types'
import { Search, Plus, Pencil, Trash2, Copy } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function AdminActividades() {
  const [actividades, setActividades] = useState<Actividad[]>([])
  const [instructores, setInstructores] = useState<Instructor[]>([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<Actividad | null>(null)
  const [loading, setLoading] = useState(false)
  const { userProfile } = useAuth()
  const [form, setForm] = useState({
    nombre: '', instructorId: '', horario: '', periodo: '', cupo: 30,
  })

  useEffect(() => {
    loadActividades()
    loadInstructores()
  }, [])

  async function loadActividades() {
    const snap = await getDocs(collection(db, 'actividades'))
    setActividades(snap.docs.map(d => ({ id: d.id, ...d.data() } as Actividad)))
  }

  async function loadInstructores() {
    const snap = await getDocs(collection(db, 'instructores'))
    setInstructores(snap.docs.map(d => ({ id: d.id, ...d.data() } as Instructor)))
  }

  const filtered = actividades.filter(a =>
    !search || a.nombre?.toLowerCase().includes(search.toLowerCase())
  )

  function openAdd() {
    setEditItem(null)
    setForm({ nombre: '', instructorId: '', horario: '', periodo: '', cupo: 30 })
    setShowModal(true)
  }

  function openEdit(item: Actividad) {
    setEditItem(item)
    setForm({ nombre: item.nombre, instructorId: item.instructorId, horario: item.horario, periodo: item.periodo, cupo: item.cupo })
    setShowModal(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const instructor = instructores.find(i => i.id === form.instructorId)
    try {
      if (editItem) {
        await updateDoc(doc(db, 'actividades', editItem.id), {
          ...form,
          instructorNombre: instructor?.nombre || '',
        })
      } else {
        await addDoc(collection(db, 'actividades'), {
          ...form,
          codigo: generateCode(),
          inscritos: 0,
          instructorNombre: instructor?.nombre || '',
        })
      }
      setShowModal(false)
      await loadActividades()
    } catch {
      alert('Error al guardar.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(item: Actividad) {
    if (!confirm(`¿Eliminar "${item.nombre}"?`)) return
    await addDoc(collection(db, 'papelera'), {
      originalId: item.id,
      tipo: 'Actividad',
      elemento: item.nombre,
      fechaEliminacion: new Date().toISOString(),
      eliminadoPor: userProfile?.email || '',
      datos: item,
    })
    await deleteDoc(doc(db, 'actividades', item.id))
    await loadActividades()
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Actividades</h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva Actividad
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar actividad..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Código</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nombre</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Instructor</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Horario</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Período</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Cupo / Inscritos</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => (
              <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-mono font-bold">{a.codigo}</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(a.codigo)}
                      className="text-gray-400 hover:text-gray-600"
                      title="Copiar código"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 font-medium">{a.nombre}</td>
                <td className="px-4 py-3 text-gray-600">{a.instructorNombre}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{a.horario}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{a.periodo}</td>
                <td className="px-4 py-3 text-gray-600">{a.inscritos} / {a.cupo}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(a)} className="text-blue-500 hover:text-blue-700 p-1"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(a)} className="text-red-500 hover:text-red-700 p-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400 text-sm">No hay actividades.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">{editItem ? 'Editar Actividad' : 'Nueva Actividad'}</h3>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input type="text" required value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instructor</label>
                <select required value={form.instructorId}
                  onChange={e => setForm(f => ({ ...f, instructorId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500">
                  <option value="">Selecciona instructor</option>
                  {instructores.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Horario</label>
                <input type="text" placeholder="Ej. Lun 15:00-16:00, Mié 15:00-16:00" value={form.horario}
                  onChange={e => setForm(f => ({ ...f, horario: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
                <input type="text" placeholder="Ej. febrero-mayo" value={form.periodo}
                  onChange={e => setForm(f => ({ ...f, periodo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cupo máximo</label>
                <input type="number" min={1} value={form.cupo}
                  onChange={e => setForm(f => ({ ...f, cupo: parseInt(e.target.value) || 30 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button type="submit" disabled={loading}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-60">
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
