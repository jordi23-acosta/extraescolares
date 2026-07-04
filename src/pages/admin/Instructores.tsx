import { useState, useEffect } from 'react'
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import type { Instructor } from '../../types'
import { Search, Plus, Pencil, Trash2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function AdminInstructores() {
  const [instructores, setInstructores] = useState<Instructor[]>([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<Instructor | null>(null)
  const [loading, setLoading] = useState(false)
  const { userProfile } = useAuth()
  const [form, setForm] = useState({ nombre: '', correo: '', telefono: '' })

  useEffect(() => { loadInstructores() }, [])

  async function loadInstructores() {
    const snap = await getDocs(collection(db, 'instructores'))
    setInstructores(snap.docs.map(d => ({ id: d.id, ...d.data() } as Instructor)))
  }

  const filtered = instructores.filter(i =>
    !search || i.nombre?.toLowerCase().includes(search.toLowerCase())
  )

  function openAdd() {
    setEditItem(null)
    setForm({ nombre: '', correo: '', telefono: '' })
    setShowModal(true)
  }

  function openEdit(item: Instructor) {
    setEditItem(item)
    setForm({ nombre: item.nombre, correo: item.correo, telefono: item.telefono || '' })
    setShowModal(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      if (editItem) {
        await updateDoc(doc(db, 'instructores', editItem.id), { ...form })
      } else {
        await addDoc(collection(db, 'instructores'), { ...form })
      }
      setShowModal(false)
      await loadInstructores()
    } catch {
      alert('Error al guardar.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(item: Instructor) {
    if (!confirm(`¿Eliminar a ${item.nombre}?`)) return
    await addDoc(collection(db, 'papelera'), {
      originalId: item.id,
      tipo: 'Instructor',
      elemento: item.nombre,
      fechaEliminacion: new Date().toISOString(),
      eliminadoPor: userProfile?.email || '',
      datos: item,
    })
    await deleteDoc(doc(db, 'instructores', item.id))
    await loadInstructores()
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Instructores</h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Agregar Instructor
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nombre</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Correo</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Teléfono</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(i => (
              <tr key={i.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{i.nombre}</td>
                <td className="px-4 py-3 text-gray-500">{i.correo}</td>
                <td className="px-4 py-3 text-gray-500">{i.telefono || '-'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(i)} className="text-blue-500 hover:text-blue-700 p-1"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(i)} className="text-red-500 hover:text-red-700 p-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={4} className="text-center py-8 text-gray-400 text-sm">No hay instructores.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">{editItem ? 'Editar Instructor' : 'Nuevo Instructor'}</h3>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input type="text" required value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
                <input type="email" required value={form.correo}
                  onChange={e => setForm(f => ({ ...f, correo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input type="text" value={form.telefono}
                  onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
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
