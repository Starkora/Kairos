# Kairos Web

Frontend web de la app de finanzas personales Kairos (React.js).

## Scripts básicos
- Instalación: `npm install`
- Desarrollo: `npm start`

Estructura inicial lista para desarrollo.

## Configuración de API (local, Dev Tunnels y overrides)

La web resuelve la URL base del backend dinámicamente en `src/utils/apiBase.js` con esta prioridad:

1. Dev Tunnels: si la web corre en `https://<hash>-3000....devtunnels.ms`, el backend se deriva automáticamente a `https://<hash>-<PUERTO>....devtunnels.ms` (por defecto puerto 3002) y se usa HTTPS.
2. REACT_APP_API_BASE (tiempo de build) en `.env.local`.
3. Localhost: `http://localhost:<PUERTO>` (por defecto 3002).
4. Genérico: `protocol//host:<PUERTO>`.

Variables en `.env.local`:

```
REACT_APP_API_BASE=http://localhost:3002  # Opcional: fija una URL completa
REACT_APP_API_PORT=3002                   # Puerto del backend (para Dev Tunnels y genérico)
REACT_APP_SHOW_API_BADGE=false            # Muestra el badge de endpoint si 'true'
```

Overrides en tiempo de ejecución (sin rebuild) desde la UI:
- Badge de endpoint (activar con `REACT_APP_SHOW_API_BADGE=true`) en la esquina inferior derecha:
	- URL override: establece `API_BASE_OVERRIDE` en localStorage (URL completa) y recarga.
	- Puerto override: establece `API_PORT_OVERRIDE` en localStorage y recarga.
	- Botones Aplicar/Limpiar disponibles.

Alternativamente, puedes establecerlos manualmente en la consola del navegador:

```js
localStorage.setItem('API_BASE_OVERRIDE', 'https://mi-backend.example.com');
// o solo cambiar puerto
localStorage.setItem('API_PORT_OVERRIDE', '3002');
// limpiar overrides
localStorage.removeItem('API_BASE_OVERRIDE');
localStorage.removeItem('API_PORT_OVERRIDE');
location.reload();
```

### Consejos para compartir por Dev Tunnels
- Reenvía los puertos 3000 (web) y 3002 (backend) y comparte el link de 3000.
- La app derivará automáticamente el backend a 3002 en el mismo dominio del túnel.
- Si usas un puerto distinto, define `REACT_APP_API_PORT` o usa el override del badge.

## reCAPTCHA (v3) en Login/Registro

El backend ya admite CAPTCHA opcional. En el frontend (esta app) puedes habilitar reCAPTCHA v3 para enviar el `captchaToken` en los formularios de Login y Registro.

Variables en `.env.local` (requiere rebuild):

```
REACT_APP_CAPTCHA_ENABLED=true
REACT_APP_CAPTCHA_PROVIDER=recaptcha   # Actualmente soportado en el frontend
REACT_APP_RECAPTCHA_SITE_KEY=TU_SITE_KEY_PUBLICA
```

Notas:
- Debes crear las claves en Google reCAPTCHA (v3) y permitir el dominio donde corre tu web (localhost o tu dominio público).
- Si `REACT_APP_CAPTCHA_ENABLED` es `true`, el frontend cargará el script de reCAPTCHA v3 y mandará `captchaToken` al backend en `/api/usuarios/login` y `/api/usuarios/register`.
- El backend debe tener configurado el secreto correspondiente y haber activado el middleware de CAPTCHA.

## Deploy gratis recomendado

Frontend en Vercel (o Netlify) y Backend en Render.

Variables comunes para Vercel/Netlify:

```
REACT_APP_API_BASE=https://<tu-backend>.onrender.com
# Opcional si usas CAPTCHA
REACT_APP_CAPTCHA_ENABLED=true
REACT_APP_CAPTCHA_PROVIDER=recaptcha
REACT_APP_RECAPTCHA_SITE_KEY=xxxx
```

Pasos:
1) Conecta el repo a Vercel/Netlify, configura las variables y despliega.
2) Verifica CORS en el backend: define `WEB_ORIGIN` con la URL pública de tu web.
3) Abre la app publicada y valida login/registro.