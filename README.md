# Sistema de Inspección Vehicular - Segovia Aseo S.A.E.S.P.

Sistema completo para gestión de inspecciones vehiculares con soporte multi-usuario y almacenamiento en la nube.

## Arquitectura

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Base de datos**: PostgreSQL (Supabase)
- **Autenticación**: Sesiones Express con hash de contraseñas

## Configuración Inicial

### 1. Clonar el repositorio

```bash
git clone <tu-repo-url>
cd vehicle-inspection-app
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
# Supabase (obligatorio)
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key

# Base de datos (obligatorio para el servidor)
DATABASE_URL=postgresql://postgres.xxx:[password]@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true

# Session secret
SESSION_SECRET=un-secreto-muy-largo-y-seguro
```

Para obtener las credenciales de Supabase:
1. Ve a [supabase.com](https://supabase.com) y crea un proyecto
2. Settings > API: copia `URL` y `anon/public key`
3. Settings > Database > Connection string: copia la URL de conexión

### 3. Configurar la base de datos

La migración se ejecuta automáticamente. Las tablas incluyen:
- `users` - Usuarios del sistema
- `vehicles` - Flota vehicular
- `inspections` - Inspecciones realizadas
- `inspection_items` - Items de cada inspección

### 4. Iniciar la aplicación

```bash
# Desarrollo
npm run dev

# Producción
npm run build
npm start
```

## Usuarios por Defecto

El sistema crea automáticamente un usuario administrador:

- **Usuario**: `admin`
- **Contraseña**: `segovia2024`

⚠️ **Importante**: Cambia esta contraseña inmediatamente después del primer login.

## Despliegue

### Opción 1: Render.com (Recomendado)

1. Conecta tu repositorio de GitHub a Render
2. Crea un Web Service
3. Configura:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Añade las variables de entorno

### Opción 2: Railway.app

1. Conecta tu repositorio
2. Railway detectará Node.js automáticamente
3. Añade las variables de entorno

### Opción 3: VPS / Servidor propio

```bash
# 1. Instalar Node.js 20+
# 2. Clonar repo
git clone <tu-repo>
cd vehicle-inspection-app
npm install --production
npm run build

# 3. Usar PM2 para proceso daemon
npm install -g pm2
pm2 start dist/index.js --name inspection-app
```

## Funcionalidades

- CRUD de vehículos con tracking de documentos (SOAT, RTM)
- Inspecciones con checklist de 30+ items
- Firmas digitales
- Exportación a PDF
- Alertas de documentos vencidos/por vencer
- Multi-usuario con roles (admin/inspector)

## Seguridad

- Row Level Security (RLS) habilitado en todas las tablas
- Contraseñas hasheadas con scrypt
- Sesiones seguras con httpOnly cookies
- Validación de datos con Zod

## Desarrollo

```bash
# Instalar dependencias
npm install

# Desarrollo con hot reload
npm run dev

# Build de producción
npm run build

# Type checking
npm run check
```

## Estructura del Proyecto

```
├── client/              # Frontend React
│   ├── src/
│   │   ├── components/  # Componentes UI
│   │   ├── pages/        # Páginas de la app
│   │   ├── hooks/        # Custom hooks
│   │   └── lib/          # Utilidades
├── server/              # Backend Express
│   ├── index.ts         # Entry point
│   ├── routes.ts       # API routes
│   ├── storage.ts      # DB operations
│   └── auth.ts         # Autenticación
├── shared/              # Código compartido
│   └── schema.ts       # DB schema y tipos
└── supabase/           # Configuración Supabase
    └── functions/      # Edge Functions (si aplica)
```

## Soporte

Para problemas o sugerencias, crea un issue en el repositorio.

---

Desarrollado para **Segovia Aseo S.A.E.S.P.**
