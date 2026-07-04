import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, Users, UserCheck, BookOpen,
  ClipboardList, CalendarCheck, BarChart2, Trash2, LogOut
} from 'lucide-react'
import logo from '/logo_TecMisantla-BzNub4Q9.png'

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/alumnos', label: 'Alumnos', icon: Users },
  { to: '/admin/instructores', label: 'Instructores', icon: UserCheck },
  { to: '/admin/actividades', label: 'Actividades', icon: BookOpen },
  { to: '/admin/inscripciones', label: 'Inscripciones', icon: ClipboardList },
  { to: '/admin/asistencia', label: 'Asistencia', icon: CalendarCheck },
  { to: '/admin/reporte', label: 'Reporte', icon: BarChart2 },
  { to: '/admin/papelera', label: 'Papelera', icon: Trash2 },
]

export default function AdminLayout() {
  const { userProfile } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await signOut(auth)
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="flex items-center gap-2 p-4 border-b border-gray-100">
          <img src={logo} alt="Logo" className="w-8 h-8 object-contain" />
          <span className="font-bold text-gray-800 text-sm">Extraescolares</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-gray-100">
          <p className="text-xs text-gray-500">Sesión iniciada como</p>
          <p className="text-xs font-medium text-blue-600 truncate">{userProfile?.email}</p>
          <p className="text-xs text-red-500 capitalize">{userProfile?.role === 'admin' ? 'Administrador' : 'Instructor'}</p>
          <button
            onClick={handleLogout}
            className="mt-3 flex items-center gap-2 text-red-500 hover:text-red-700 text-xs transition-colors"
          >
            <LogOut className="w-3 h-3" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
