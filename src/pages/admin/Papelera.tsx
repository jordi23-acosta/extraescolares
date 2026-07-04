import { useState, useEffect } from 'react'
import { collection, getDocs, deleteDoc, doc, addDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import type { PapeleraItem } from '../../types'
import { Search, RotateCcw, Trash2 } from 'lucide-react'

export default function AdminPapelera() {
  const [items, setItems] = useState<PapeleraItem[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => { loadItems() }, [])

  async function loadItems() {
    const snap = await getDocs(collection(db, 'papelera'))
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as PapeleraItem))
    // Sort by date desc
    data.sort((a, b) => new Date(b.fechaEliminacion).getTime() - new Date(a.fechaEliminacion).getTime())
    setItems(data)
  }

  const filtered = items.filter(i =>
    !search || i.elemento?.toLowerCase().includes(search.toLowerCase())
  )

  async function handleRestore(item: PapeleraItem) {
    if (!confirm(`¿Restaurar "${item.elemento}"?`)) return
    const colName = item.tipo === 'Alumno' ? 'alumnos' : item.tipo === 'Instructor' ? 'instructores' : 'actividades'
    try {
      // Restore with original data
      const { id: _id, ...data } = item.datos as Record<string, unknown>
      await addDoc(collection(db, colName), data)
      await deleteDoc(doc(db, 'papelera', item.id))
      await loadItems()
    } catch {
      alert('Error al restaurar.')
    }
  }

  async function handlePermanentDelete(item: PapeleraItem) {
    if (!confirm(`¿Eliminar permanentemente "${item.elemento}"? Esta acción no se puede deshacer.`)) return
    await deleteDoc(doc(db, 'papelera', item.id))
    await loadItems()
  }

  function formatDate(dateStr: string) {
    try {
      return new Date(dateStr).toLocaleString('es-MX', {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    } catch {
      return dateStr
    }
  }

  const typeBadge = (tipo: string) => {
    const colors: Record<string, string> = {
      Alumno: 'bg-blue-100 text-blue-700',
      Instructor: 'bg-purple-100 text-purple-700',
      Actividad: 'bg-green-100 text-green-700',
    }
    return colors[tipo] || 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-red-500" />
          <h1 className="text-2xl font-bold text-gray-900">Papelera de Reciclaje</h1>
        </div>
        <p className="text-sm text-gray-500">Recupera datos eliminados accidentalmente</p>
      </div>

      <div className="relative mb-4 mt-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar elementos eliminados..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Elemento</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tipo</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Fecha Eliminación</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-800">{item.elemento}</p>
                  <p className="text-xs text-gray-400">ID Original: {item.originalId}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeBadge(item.tipo)}`}>
                    {item.tipo}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{formatDate(item.fechaEliminacion)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleRestore(item)}
                      className="text-green-500 hover:text-green-700 p-1"
                      title="Restaurar"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handlePermanentDelete(item)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Eliminar permanentemente"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={4} className="text-center py-8 text-gray-400 text-sm">La papelera está vacía.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
