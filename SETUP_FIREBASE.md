# Configuración de Firebase

## Paso 1: Crear proyecto en Firebase

1. Ve a https://console.firebase.google.com/
2. Crea un nuevo proyecto o usa uno existente
3. Copia las credenciales y actualiza `src/firebase.ts`

## Paso 2: Activar servicios

### Authentication
1. Ve a **Authentication** > **Sign-in method**
2. Activa **Correo electrónico/Contraseña**

### Firestore Database
1. Ve a **Firestore Database**
2. Crea la base de datos en **modo producción**
3. Selecciona una ubicación (ej: `us-central1`)

## Paso 3: Configurar reglas de seguridad

1. Ve a **Firestore Database** > **Reglas**
2. Copia y pega el contenido de `firestore.rules`
3. Haz clic en **Publicar**

## Paso 4: Crear colecciones

Crea las siguientes colecciones (vacías por ahora):

- `usuarios`
- `alumnos`
- `instructores`
- `actividades`
- `inscripciones`
- `asistencias`
- `papelera`

## Paso 5: Crear usuario administrador

### 5.1 En Authentication
1. Ve a **Authentication** > **Users**
2. Agrega un usuario:
   - Email: `admin@itsm.edu.mx`
   - Contraseña: (tu contraseña segura)
3. **Copia el UID** que aparece

### 5.2 En Firestore
1. Ve a **Firestore Database** > Colección `usuarios`
2. Agrega un documento con ID = **UID copiado**
3. Campos:
```json
{
  "email": "admin@itsm.edu.mx",
  "role": "admin",
  "nombre": "Administrador del Sistema",
  "registroCompleto": true,
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```

## Paso 6: Datos de prueba (opcional)

### Crear un alumno de prueba

Colección `alumnos`, documento auto-generado:
```json
{
  "numeroControl": "22210227",
  "nombre": "Jordan Axel Acosta Romero",
  "carrera": "Ingeniería en Sistemas Computacionales",
  "semestre": "8",
  "correo": "22210227@itsm.edu.mx",
  "sexo": "Masculino",
  "sistema": "Escolarizado"
}
```

### Crear un instructor de prueba

Colección `instructores`, documento auto-generado:
```json
{
  "nombre": "Isidro Díaz Pañán",
  "correo": "idiaz@itsm.edu.mx",
  "telefono": "2252100949"
}
```

### Crear una actividad de prueba

1. Copia el **ID del instructor** que creaste arriba
2. Colección `actividades`, documento auto-generado:
```json
{
  "codigo": "ABC123",
  "nombre": "Futbol",
  "instructorId": "[ID_DEL_INSTRUCTOR]",
  "instructorNombre": "Isidro Díaz Pañán",
  "horario": "Lun 15:00-17:00",
  "periodo": "enero 2025-marzo 2025",
  "cupo": 30,
  "inscritos": 0
}
```

## Paso 7: Verificar instalación

1. Inicia la aplicación:
```bash
npm run dev
```

2. Ve a http://localhost:5173

3. Prueba iniciar sesión con:
   - Email: `admin@itsm.edu.mx`
   - Contraseña: (la que configuraste)

4. Deberías ver el dashboard de administrador

## Troubleshooting

### Error: "FirebaseError: Missing or insufficient permissions"

**Solución**: Verifica que las reglas de Firestore estén publicadas correctamente.

### Error: "FirebaseError: PERMISSION_DENIED"

**Solución**: 
1. Verifica que el usuario exista en la colección `usuarios`
2. Verifica que el campo `role` tenga el valor correcto (`admin`, `instructor` o `estudiante`)

### No aparece el logo

**Solución**: 
1. Coloca el archivo `logo_TecMisantla-BzNub4Q9.png` en la carpeta `public/`
2. O actualiza las rutas en los componentes:
   - `src/layouts/AdminLayout.tsx`
   - `src/layouts/StudentLayout.tsx`
   - `src/pages/auth/LoginPage.tsx`

### Firebase CLI

Para desplegar a Firebase Hosting:

```bash
# Instalar
npm install -g firebase-tools

# Iniciar sesión
firebase login

# Inicializar (selecciona Hosting)
firebase init

# Build
npm run build

# Desplegar
firebase deploy
```

## Reglas de Firestore recomendadas para producción

Las reglas en `firestore.rules` están configuradas con seguridad básica:

- Los usuarios autenticados pueden leer su propia información
- Solo admin/instructor pueden modificar datos de alumnos, actividades, etc.
- Los estudiantes pueden inscribirse a actividades

Para mayor seguridad, revisa y ajusta las reglas según tus necesidades.

## Estructura de roles

- **admin**: Acceso completo al sistema
- **instructor**: Gestión de actividades y asistencias
- **estudiante**: Inscripción y consulta de actividades

## Emails institucionales

El sistema valida que los correos de estudiantes terminen en `@itsm.edu.mx`. Si necesitas cambiar el dominio, edita:

`src/pages/auth/LoginPage.tsx` línea ~76:
```typescript
if (!email.endsWith('@itsm.edu.mx')) {
```

Cambia a tu dominio:
```typescript
if (!email.endsWith('@tudominio.edu.mx')) {
```
