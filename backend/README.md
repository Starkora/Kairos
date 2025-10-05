# Kairos Backend

Backend de la app de finanzas personales Kairos (Node.js + Express + MySQL).

## Scripts básicos
- Instalación: `npm install`
- Desarrollo: `npm run dev`

## Variables de entorno
Copia `.env.example` a `.env` y ajusta:
- DB_HOST, DB_USER, DB_PASS, DB_NAME
- PORT (por defecto 3002)
- JWT_SECRET
- Orígenes CORS opcionales: WEB_ORIGIN, NGROK_ORIGIN, DEVTUNNELS_ORIGIN
- SendGrid: SENDGRID_API_KEY, MAIL_FROM
- Twilio: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
- Expiración registro pendiente:
	- PENDING_EXPIRES_MINUTES_SMS (default 5)
	- PENDING_EXPIRES_MINUTES_EMAIL (default 15)

## Limpieza de usuarios pendientes
Se incluye una migración `migrations/create_event_cleanup_usuarios_pendientes.sql` que crea el evento MySQL `ev_cleanup_usuarios_pendientes` para borrar registros caducados cada minuto.

Requisitos:
- Habilitar el Event Scheduler si está desactivado:
	- `SET GLOBAL event_scheduler = ON;` (requiere permisos)

Fallback:
- Si el evento no existe o no puede verificarse, el backend ejecuta una tarea cada 60s que realiza el mismo borrado.

## Endpoint de salud (protegido)
`GET /api/admin/health`
- Protegido mediante cabecera `X-Admin-Key` que debe coincidir con `ADMIN_HEALTH_KEY` del entorno.
- Respuesta incluye:
	- `cleanupStrategy`: `mysql-event` o `node-fallback`.
	- `eventScheduler`: valor de `@@event_scheduler`.
	- `mysqlEvent`: `present` y `info` (estado, última ejecución, schedule).

Seguridad adicional:
- Allowlist de IPs (opcional): `ADMIN_HEALTH_IPS` (lista separada por comas). Si se define, solo esas IPs podrán acceder.
- Rate limiting por IP (valores por defecto):
	- `ADMIN_HEALTH_RATE_LIMIT_WINDOW_SECONDS=60`
	- `ADMIN_HEALTH_RATE_LIMIT_MAX=30`

## Guía de despliegue (capas free sugeridas)

Sugerencia de stack 100% gratis (con límites):

- Web (React): Vercel o Netlify (free)
- Backend (Node.js): Render Free Web Service
- Base de datos MySQL: PlanetScale Free (sin triggers/event scheduler; usa nuestro cleanup de Node)
- Sesiones/Rate limit compartido: Upstash Redis Free (o variable `REDIS_URL`)

Variables de entorno principales para backend en Render:

- Puerto: Render usa su propio PORT; no tocar.
- JWT_SECRET: establece un secreto fuerte.
- CORS: define `WEB_ORIGIN` (ej. `https://tuapp.vercel.app`).
- MySQL: usa `DATABASE_URL` (mysql://user:pass@host/db?sslaccept=strict) y `DB_SSL=true` si aplica.
- Redis: `REDIS_URL` (o `UPSTASH_REDIS_URL`) para sesiones.
- Correo (SendGrid): `SENDGRID_API_KEY`, `MAIL_FROM` (debe ser verificado).
- SMS (opcional Twilio): `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`.
- CAPTCHA (opcional): `CAPTCHA_ENABLED`, `CAPTCHA_PROVIDER=recaptcha`, `CAPTCHA_SECRET`.
- Limpieza de pendientes: Render no soporta eventos MySQL; el fallback de Node queda activo automáticamente.

Pasos rápidos:
1) Crea DB en PlanetScale y copia la `DATABASE_URL` (habilita SSL). Crea la DB `kairos` y ejecuta migraciones.
2) Crea Redis en Upstash y copia el `REDIS_URL`.
3) Sube el backend a Render (conectando tu repo) como Web Service; configura variables anteriores.
4) Sube la web a Vercel/Netlify con `REACT_APP_API_BASE=https://<tu-backend>.onrender.com` y ajusta `REACT_APP_CAPTCHA_*` si usas CAPTCHA.
5) Verifica CORS y prueba `/api/admin/health` con `X-Admin-Key` si configuraste la clave.