# CRM - Sistema de Gestión Interno

Sistema CRM web profesional, elegante y completamente responsive construido con Next.js 14, TypeScript, Tailwind CSS, shadcn/ui y Supabase.

## 🚀 Características

- ✅ Autenticación con Supabase Auth (email/password)
- ✅ Layout responsive con sidebar para desktop y drawer para mobile
- ✅ Rutas protegidas con middleware
- ✅ Control de acceso basado en roles (admin/user)
- ✅ UI moderna con shadcn/ui y Tailwind CSS
- ✅ TypeScript para type safety
- ✅ Validación de formularios con react-hook-form + zod
- ✅ Arquitectura escalable con App Router

## 📋 Prerrequisitos

- Node.js 18+ y npm/yarn/pnpm
- Cuenta de Supabase (gratuita)

## 🛠️ Instalación

1. **Clonar e instalar dependencias:**

```bash
npm install
# o
yarn install
# o
pnpm install
```

2. **Configurar variables de entorno:**

Crea un archivo `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anon_de_supabase
```

Puedes encontrar estas credenciales en tu proyecto de Supabase:
- Dashboard de Supabase → Settings → API

3. **Configurar la base de datos:**

En el SQL Editor de Supabase, ejecuta el script `supabase/schema.sql` para crear:
- Tablas (users, clients, notes)
- Políticas de seguridad (RLS)
- Triggers y funciones
- Índices para optimización

4. **Ejecutar el proyecto:**

```bash
npm run dev
# o
yarn dev
# o
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 📁 Estructura del Proyecto

```
├── app/                    # App Router de Next.js
│   ├── dashboard/         # Rutas protegidas del dashboard
│   ├── login/             # Página de login
│   ├── layout.tsx         # Layout raíz
│   └── page.tsx           # Página principal (redirige)
├── components/            # Componentes reutilizables
│   ├── ui/               # Componentes de shadcn/ui
│   ├── sidebar.tsx       # Sidebar para desktop
│   ├── mobile-nav.tsx    # Navegación móvil
│   └── auth-button.tsx   # Botón de logout
├── lib/                  # Utilidades y configuraciones
│   ├── supabase/         # Clientes de Supabase
│   └── utils.ts          # Utilidades generales
├── types/                # Tipos TypeScript
│   └── database.types.ts # Tipos de la base de datos
├── supabase/             # Scripts SQL
│   └── schema.sql        # Esquema de base de datos
└── middleware.ts         # Middleware de autenticación
```

## 🔐 Autenticación

El sistema utiliza Supabase Auth para la autenticación:

- **Login:** `/login` - Formulario de inicio de sesión
- **Protección de rutas:** El middleware verifica la sesión en cada request
- **Logout:** Disponible en el header del dashboard

### Crear un usuario

Puedes crear usuarios desde:
1. El dashboard de Supabase (Authentication → Users)
2. O implementar un formulario de registro (no incluido inicialmente)

## 🎨 Diseño Responsive

- **Desktop:** Sidebar fijo a la izquierda
- **Tablet/Mobile:** Sidebar colapsable con drawer
- **Breakpoints:** Optimizado para todos los tamaños de pantalla
- **Touch-friendly:** Botones y elementos interactivos adaptados para móvil

## 📊 Base de Datos

### Tablas principales:

- **users:** Perfiles de usuario (extiende auth.users)
- **clients:** Clientes y contactos
- **notes:** Notas e interacciones con clientes

### Seguridad (RLS):

- Row Level Security habilitado en todas las tablas
- Políticas configuradas para control de acceso
- Usuarios solo pueden editar sus propios recursos
- Admins tienen acceso completo

## 🚧 Próximos Pasos

El proyecto incluye la estructura base. Funcionalidades pendientes:

- [ ] CRUD completo de clientes
- [ ] CRUD completo de notas/interacciones
- [ ] Gestión de usuarios
- [ ] Búsqueda y filtros
- [ ] Dashboard con estadísticas reales
- [ ] Modo oscuro
- [ ] Exportación de datos

## 📝 Scripts Disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Construye la aplicación para producción
- `npm run start` - Inicia el servidor de producción
- `npm run lint` - Ejecuta el linter

## 🛡️ Tecnologías

- **Framework:** Next.js 14 (App Router)
- **Lenguaje:** TypeScript
- **Estilos:** Tailwind CSS
- **UI Components:** shadcn/ui
- **Backend:** Supabase (PostgreSQL + Auth)
- **Validación:** react-hook-form + zod
- **Iconos:** lucide-react

## 📄 Licencia

Este proyecto es de uso interno.

