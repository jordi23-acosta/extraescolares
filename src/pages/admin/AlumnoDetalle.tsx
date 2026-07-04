import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { collection, getDocs, query, where, deleteDoc, doc, addDoc, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import type { Alumno } from '../../types'
import { CARRERAS } from '../../types'
import { ArrowLeft, Search, Plus, FileSpreadsheet } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { downloadExcel } from '../../utils/exportExcel'
import { AlumnosTable, AlumnoModal } from './Alumnos'

type AlumnoForm = Omit<Alumno, 'id'>

const EMPTY_FORM: AlumnoForm = {
  numeroControl: '', nombre: '', carrera: CARRERAS[0]!,
  semestre: '1', correo: '', sexo: '', sistema: '',
}

export default function AdminAlumnoDetalle() {
  const { carrera } = useParams<{ carrera: string }>()
  const navigate = useNavigate()
  const { userProfile } = useAuth()
  const [alumnos, setAlumnos]     = useState<Alumno[]>([])
  const [search, setSearch]       = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem]   = useState<Alumno | null>(null)
  const [loading, setLoading]     = useState(false)
  const [form, setForm]           = useState<AlumnoForm>(EMPTY_FORM)

  useEffect(() => { loadAlumnos() }, [carrera])

  async function loadAlumnos() {
    const snap = await getDocs(query(
      collection(db, 'alumnos'),
      where('carrera', '==', decodeURIComponent(carrera ?? ''))
    ))
    setAlumnos(snap.docs.map(d => ({ id: d.id, ...d.data() } as Alumno)))
  }

  const filtered = alumnos.filter(a =>
    !search ||
    a.nombre?.toLowerCase().includes(search.toLowerCase()) ||
    a.numeroControl?.toLowerCase().includes(search.toLowerCase())
  )

  function openAdd() {
    setEditItem(null)
    setForm({ ...EMPTY_FORM, carrera: decodeURIComponent(carrera ?? CARRERAS[0]!) })
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

  function closeModal() { setShowModal(false); setEditItem(null); setForm(EMPTY_FORM) }

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
    if (!confirm(`¿Eliminar a ${alumno.nombre}?`)) return
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

  function exportCarrera() {
    const carreraName = decodeURIComponent(carrera ?? 'Alumnos')
    downloadExcel(`Lista_${carreraName.replace(/\s+/g, '_')}`, [{
      name: 'Alumnos',
      headers: ['No. Control', 'Nombre', 'Carrera', 'Semestre', 'Correo', 'Sexo', 'Sistema'],
      rows: alumnos.map(a => [
        a.numeroControl, a.nombre, a.carrera, a.semestre,
        a.correo, a.sexo ?? '', a.sistema ?? '',
      ]),
    }])
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/admin/alumnos')}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{decodeURIComponent(carrera ?? '')}</h1>
            <p className="text-xs text-gray-500">{alumnos.length} alumnos registrados</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCarrera}
            className="flex items-center gap-1.5 text-sm border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
            <FileSpreadsheet className="w-4 h-4 text-green-600" /> Exportar Lista
          </button>
          <button onClick={openAdd}
            className="flex items-center gap-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Agregar Alumno
          </button>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="Buscar por nombre o número de control..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
      </div>

      <AlumnosTable alumnos={filtered} onEdit={openEdit} onDelete={handleDelete} />

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
