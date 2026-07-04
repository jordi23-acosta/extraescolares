# Sistema de Actividades Extraescolares - Tecnológico de Misantla

Sistema web para la gestión integral de actividades extraescolares del Instituto Tecnológico de Misantla.

## 🚀 Stack Tecnológico

- **Frontend**: React 19 + TypeScript + Vite
- **Estilos**: Tailwind CSS
- **Backend**: Firebase (Authentication + Firestore)
- **Routing**: React Router v6
- **Iconos**: Lucide React

## 📋 Requisitos Previos

- Node.js 18+ y npm
- Cuenta de Firebase
- Git (opcional)

## 🔧 Configuración

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea un nuevo proyecto (o usa uno existente)
3. Activa **Authentication** (Email/Password)
4. Activa **Firestore Database** (en modo producción)
5. Copia las credenciales de tu proyecto

### 3. Actualizar credenciales de Firebase

Edita `src/firebase.ts` y reemplaza:

```typescript
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_STORAGE_BUCKET",
  messagingSenderId: "TU_MESSAGING_SENDER_ID",
  appId: "TU_APP_ID"
}
```

### 4. Crear colecciones en Firestore

Crea las siguientes colecciones vacías:

- `usuarios`
- `alumnos`
- `instructores`
- `actividades`
- `inscripciones`
- `asistencias`
- `papelera`

### 5. Crear usuario administrador

En Firebase Console > Authentication > Users:
1. Agrega un usuario manualmente con email/contraseña
2. Copia el **UID** del usuario creado
3. Ve a Firestore > `usuarios` > Agregar documento:

```
ID del documento: [UID del usuario]
{
  "email": "admin@itsm.edu.mx",
  "role": "admin",
  "nombre": "Administrador",
  "registroCompleto": true,
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```

## 🏃‍♂️ Ejecución

### Modo desarrollo

```bash
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173)

### Build para producción

```bash
npm run build
```

### Vista previa del build

```bash
npm run preview
```

## 📱 Roles y Acceso

### Administrador / Instructor
- **Email**: admin@itsm.edu.mx (o el que hayas configurado)
- **Acceso**: `/admin`
- **Funciones**:
  - Gestión de alumnos, instructores y actividades
  - Control de inscripciones y asistencias
  - Generación de reportes estadísticos
  - Papelera de reciclaje

### Estudiante
- **Email**: cualquier correo con dominio `@itsm.edu.mx`
- **Registro**: Desde `/login` > Registrarse
- **Acceso**: `/panel`
- **Funciones**:
  - Completar perfil de alumno
  - Unirse a actividades con código
  - Ver actividades inscritas
  - Consultar asistencias

## 🗂️ Estructura del Proyecto

```
src/
├── components/           # Componentes reutilizables
├── context/              # Context API (AuthContext)
├── layouts/              # Layouts (Admin, Student)
├── pages/
│   ├── admin/            # Páginas de administración
│   ├── auth/             # Login/Registro
│   └── student/          # Páginas de estudiante
├── types/                # Tipos TypeScript
├── firebase.ts           # Configuración Firebase
├── App.tsx               # Router principal
├── main.tsx              # Entry point
└── index.css             # Estilos globales
```

## 🚢 Despliegue en Firebase Hosting

1. Instala Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Inicia sesión:
```bash
firebase login
```

3. Inicializa Firebase Hosting:
```bash
firebase init hosting
```

4. Build y deploy:
```bash
npm run build
firebase deploy
```

## 🐛 Solución de Problemas

### Error: Cannot find module 'firebase'
```bash
npm install firebase
```

### Error: Firestore permissions denied
- Verifica que las reglas de Firestore permitan lectura/escritura
- Reglas básicas para desarrollo:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### No aparece el logo
- Asegúrate de que el archivo `logo_TecMisantla-BzNub4Q9.png` esté en la carpeta `public/`

## 📄 Licencia

Sistema desarrollado para el Tecnológico de Misantla.

## 🤝 Soporte

Para soporte técnico, contacta a sistemas@itsm.edu.mx
