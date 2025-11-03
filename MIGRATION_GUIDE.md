# 📁 Nueva Estructura del Proyecto Kairos

## 🎯 Resumen de Cambios

La reestructuración ha organizado el código en una arquitectura más escalable y mantenible, separando responsabilidades y agrupando archivos por feature/dominio.

---

## 🔧 Backend - Nueva Estructura

```
backend/
├── index.js                          # Punto de entrada
├── config/                           # Configuraciones
│   ├── database.js                   # (antes: db.js)
│   └── sequelize.js
├── src/
│   ├── controllers/                  # Controllers organizados por feature
│   │   ├── auth/
│   │   │   ├── googleAuth.controller.js
│   │   │   ├── usuarios.controller.js
│   │   │   └── usuario.controller.js
│   │   ├── finanzas/
│   │   │   ├── transaccion.controller.js
│   │   │   ├── cuenta.controller.js
│   │   │   ├── presupuesto.controller.js
│   │   │   ├── deuda.controller.js
│   │   │   └── meta.controller.js
│   │   ├── configuracion/
│   │   │   ├── categoria.controller.js
│   │   │   ├── categoriaCuenta.controller.js
│   │   │   ├── notificaciones.controller.js
│   │   │   ├── preferencias.controller.js
│   │   │   └── movimientoRecurrente.controller.js
│   │   └── insights.controller.js
│   ├── models/                       # Modelos de Sequelize
│   ├── routes/                       # Rutas de Express
│   ├── middlewares/                  # Middlewares
│   │   └── admin.middleware.js       # (antes: utils/admin.js)
│   ├── services/                     # Lógica de negocio (nuevo)
│   └── utils/                        # Utilidades organizadas
│       ├── auth/
│       │   └── jwt.js                # (antes: utils/auth.js)
│       ├── notifications/
│       │   ├── mailer.js
│       │   └── sms.js
│       └── security/
│           ├── captcha.js
│           └── rateLimiter.js
└── database/
    └── migrations/                   # Migraciones SQL

```

### 📝 Cambios de Imports en Backend

**Antes:**
```javascript
const db = require('./db');
const sequelize = require('./sequelize');
const { verifyToken } = require('./utils/auth');
const isAdmin = require('./utils/admin');
```

**Después:**
```javascript
const db = require('./config/database');
const sequelize = require('./config/sequelize');
const { verifyToken } = require('./src/utils/auth/jwt');
const isAdmin = require('./src/middlewares/admin.middleware');
```

---

## 🎨 Frontend - Nueva Estructura

```
web/src/
├── App.tsx
├── styles/                           # Estilos globales
│   ├── index.css                     # (antes: src/index.css)
│   └── App.css                       # (antes: src/App.css)
├── components/
│   ├── ui/                           # Componentes UI reutilizables
│   │   ├── Badge.tsx                 # (antes: shared/)
│   │   ├── DataTable.tsx
│   │   ├── FormComponents.tsx
│   │   ├── Modal.tsx
│   │   ├── StatsCard.tsx
│   │   └── index.ts
│   ├── layout/                       # Componentes de layout
│   │   ├── Sidebar.tsx               # (antes: components/)
│   │   └── Sidebar.css
│   └── features/                     # Componentes específicos
│       ├── auth/
│       │   ├── GoogleAuthButton.tsx
│       │   └── LogoutButton.tsx
│       └── admin/
│           └── ApiEndpointBadge.tsx
├── pages/                            # Páginas (rutas)
│   ├── Auth/
│   │   ├── Login.tsx                 # (antes: components/)
│   │   ├── RecuperarPassword.tsx
│   │   └── RecuperarPasswordPage.tsx
│   ├── Dashboard/
│   │   └── Dashboard.tsx             # (antes: components/)
│   ├── Transacciones/
│   │   ├── Registro.tsx
│   │   └── Calendario.tsx
│   ├── Finanzas/
│   │   ├── Cuentas.tsx
│   │   ├── DeudasMetas.tsx
│   │   └── Presupuestos.tsx
│   ├── Configuracion/
│   │   ├── Categorias.tsx
│   │   ├── CategoriasCuenta.tsx
│   │   ├── Notificaciones.tsx
│   │   ├── MiCuenta.tsx
│   │   └── MovimientosRecurrentes.tsx
│   ├── Asesor/
│   │   └── Asesor.tsx
│   ├── AcercaDe/
│   │   ├── AcercaContent.tsx
│   │   ├── AcercaDe.tsx
│   │   └── AcercaPublic.tsx
│   └── Admin/
│       └── UsuariosPendientes.tsx
├── services/                         # Servicios API (nuevo)
│   └── api/
├── hooks/                            # Custom hooks (nuevo)
├── constants/                        # Constantes (nuevo)
├── utils/                            # Utilidades
└── types/                            # TypeScript types

```

### 📝 Cambios de Imports en Frontend

**Antes:**
```typescript
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import { Badge } from './components/shared';
import './App.css';
```

**Después:**
```typescript
import Sidebar from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard/Dashboard';
import Login from './pages/Auth/Login';
import { Badge } from './components/ui';
import './styles/App.css';
```

---

## 🚀 Próximos Pasos

### 1. Actualizar imports en archivos principales

#### Backend: `index.js`
- Cambiar rutas de `require()` para controllers, models, routes
- Actualizar referencias a `db.js` → `config/database.js`
- Actualizar referencias a `sequelize.js` → `config/sequelize.js`

#### Frontend: `App.tsx`
- Actualizar imports de componentes movidos
- Cambiar `./components/` → rutas específicas por feature
- Actualizar imports de estilos

### 2. Crear archivos de índice (`index.ts`)

Facilitar importaciones:
```typescript
// components/ui/index.ts
export * from './Badge';
export * from './DataTable';
export * from './FormComponents';
// ...

// pages/Auth/index.ts
export { default as Login } from './Login';
export { default as RecuperarPassword } from './RecuperarPassword';
```

### 3. Verificar funcionamiento

```bash
# Frontend
cd web
npm install
npm start

# Backend
cd backend
npm install
node index.js
```

### 4. Buscar y reemplazar imports globalmente

Usa tu IDE para hacer búsqueda global:
- `components/shared` → `components/ui`
- `components/Dashboard` → `pages/Dashboard/Dashboard`
- `components/Login` → `pages/Auth/Login`
- etc.

---

## 📊 Beneficios de la Nueva Estructura

✅ **Mejor organización**: Archivos agrupados por funcionalidad
✅ **Escalabilidad**: Fácil agregar nuevos features
✅ **Mantenibilidad**: Más fácil encontrar y modificar código
✅ **Separación de responsabilidades**: UI, lógica, páginas separados
✅ **Imports más claros**: Rutas semánticas y descriptivas

---

## ⚠️ Notas Importantes

1. **No elimines las carpetas antiguas** hasta verificar que todo funciona
2. **Prueba feature por feature** después de actualizar imports
3. **Usa control de versiones** (Git) para revertir si es necesario
4. **Actualiza tests** si tienes pruebas unitarias

---

## 🆘 Troubleshooting

### Error: Cannot find module
→ Revisa el nuevo path del import

### Error: Module not found './components/...'
→ Actualiza a la nueva ruta (pages/, components/ui/, etc.)

### Estilos no se cargan
→ Verifica imports de CSS desde `styles/`

---

Generado: 3 de noviembre de 2025
