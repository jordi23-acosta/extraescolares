import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

// Auth
import LoginPage from './pages/auth/LoginPage'

// Admin
import AdminLayout from './layouts/AdminLayout'
import AdminDashboard from './pages/admin/Dashboard'
import AdminAlumnos from './pages/admin/Alumnos'
import AdminAlumnoDetalle from './pages/admin/AlumnoDetalle'
import AdminInstructores from './pages/admin/Instructores'
import AdminActividades from './pages/admin/Actividades'
import AdminInscripciones from './pages/admin/Inscripciones'
import AdminInscripcionDetalle from './pages/admin/InscripcionDetalle'
import AdminAsistencia from './pages/admin/Asistencia'
import AdminReporte from './pages/admin/Reporte'
import AdminPapelera from './pages/admin/Papelera'

// Instructor
import InstructorLayout from './layouts/InstructorLayout'
import InstructorMisActividades from './pages/instructor/MisActividades'
import InstructorInscripciones from './pages/instructor/Inscripciones'
import InstructorAsistencia from './pages/instructor/Asistencia'
import InstructorPerfil from './pages/instructor/Perfil'

// Student
import StudentLayout from './layouts/StudentLayout'
import StudentPanel from './pages/student/Panel'
import StudentActividades from './pages/student/Actividades'
import StudentPerfil from './pages/student/Perfil'
import CompleteProfile from './pages/student/CompleteProfile'

// ── Guards ───────────────────────────────────────────────────────────────────

function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: JSX.Element
  allowedRoles: string[]
}) {
  const { currentUser, userProfile, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!currentUser) return <Navigate to="/login" replace />
  if (!userProfile) return <Navigate to="/completar-registro" replace />
  if (!allowedRoles.includes(userProfile.role)) return <Navigate to="/" replace />
  return children
}

function RootRedirect() {
  const { currentUser, userProfile, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!currentUser) return <Navigate to="/login" replace />

  // User authenticated but no Firestore profile yet → new student
  if (!userProfile) return <Navigate to="/completar-registro" replace />

  if (userProfile.role === 'admin')       return <Navigate to="/admin"      replace />
  if (userProfile.role === 'instructor')  return <Navigate to="/instructor" replace />
  if (userProfile.role === 'estudiante') {
    if (!userProfile.registroCompleto)    return <Navigate to="/completar-registro" replace />
    return <Navigate to="/panel" replace />
  }
  return <Navigate to="/login" replace />
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">Cargando...</p>
      </div>
    </div>
  )
}

// ── Routes ───────────────────────────────────────────────────────────────────

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/completar-registro" element={<CompleteProfile />} />

      {/* ── Admin ── */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="alumnos" element={<AdminAlumnos />} />
        <Route path="alumnos/:carrera" element={<AdminAlumnoDetalle />} />
        <Route path="instructores" element={<AdminInstructores />} />
        <Route path="actividades" element={<AdminActividades />} />
        <Route path="inscripciones" element={<AdminInscripciones />} />
        <Route path="inscripciones/:actividadId" element={<AdminInscripcionDetalle />} />
        <Route path="asistencia" element={<AdminAsistencia />} />
        <Route path="reporte" element={<AdminReporte />} />
        <Route path="papelera" element={<AdminPapelera />} />
      </Route>

      {/* ── Instructor ── */}
      <Route
        path="/instructor"
        element={
          <ProtectedRoute allowedRoles={['instructor']}>
            <InstructorLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<InstructorMisActividades />} />
        <Route path="inscripciones" element={<InstructorInscripciones />} />
        <Route path="inscripciones/:actividadId" element={<InstructorInscripciones />} />
        <Route path="asistencia/:actividadId" element={<InstructorAsistencia />} />
        <Route path="perfil" element={<InstructorPerfil />} />
      </Route>

      {/* ── Student ── */}
      <Route
        path="/panel"
        element={
          <ProtectedRoute allowedRoles={['estudiante']}>
            <StudentLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<StudentPanel />} />
        <Route path="actividades" element={<StudentActividades />} />
        <Route path="perfil" element={<StudentPerfil />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
