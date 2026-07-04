export type UserRole = 'admin' | 'instructor' | 'estudiante'

export interface UserProfile {
  uid: string
  email: string
  role: UserRole
  nombre?: string
  numeroControl?: string
  carrera?: string
  semestre?: string
  sexo?: string
  sistema?: string
  telefono?: string
  registroCompleto?: boolean
  createdAt?: string
}

export interface Alumno {
  id: string
  numeroControl: string
  nombre: string
  carrera: string
  semestre: string
  correo: string
  sexo?: string
  sistema?: string
  uid?: string
  deletedAt?: string
  deletedBy?: string
  originalId?: string
}

export interface Instructor {
  id: string
  nombre: string
  correo: string
  telefono?: string
  uid?: string
  deletedAt?: string
  deletedBy?: string
  originalId?: string
}

export interface Actividad {
  id: string
  codigo: string
  nombre: string
  instructorId: string
  instructorNombre: string
  horario: string
  periodo: string
  cupo: number
  inscritos: number
  deletedAt?: string
  deletedBy?: string
  originalId?: string
}

export interface Inscripcion {
  id: string
  alumnoId: string
  alumnoNombre: string
  alumnoNumeroControl: string
  alumnoCarrera: string
  alumnoSemestre: string
  actividadId: string
  actividadNombre: string
  actividadCodigo: string
  instructorNombre: string
  periodo: string
  fechaInscripcion: string
}

export interface Asistencia {
  id: string
  actividadId: string
  alumnoId: string
  alumnoNombre: string
  alumnoNumeroControl: string
  fecha: string
  presente: boolean
  constanciaGenerada?: boolean
}

export interface PapeleraItem {
  id: string
  originalId: string
  tipo: 'Alumno' | 'Instructor' | 'Actividad'
  elemento: string
  fechaEliminacion: string
  eliminadoPor: string
  datos: Record<string, unknown>
}

export const CARRERAS = [
  'Ingeniería en Sistemas Computacionales',
  'Ingeniería Industrial',
  'Ingeniería Mecatrónica',
  'Ingeniería Civil',
  'Ingeniería Química',
  'Ingeniería Electrónica',
  'Licenciatura en Administración',
  'Ingeniería en Gestión Empresarial',
  'Ingeniería en Logística',
  'Ingeniería Ambiental',
]

export const SEMESTRES = [
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
]

export const SEXOS = ['Masculino', 'Femenino', 'Otro']

export const SISTEMAS = ['Escolarizado', 'Semiescolarizado', 'Mixto']
