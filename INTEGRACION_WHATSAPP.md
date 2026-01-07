# Integración Kairos → MiBodega WhatsApp Bot

## Descripción
Este documento describe la integración entre el sistema de notificaciones de Kairos y el bot de WhatsApp de MiBodega, permitiendo que las notificaciones programadas de Kairos se envíen automáticamente por WhatsApp.

## Arquitectura

```
┌─────────────────────┐
│   Kairos Backend    │
│  (Notificaciones)   │
└──────────┬──────────┘
           │
           │ HTTP POST
           │ /api/notifications
           │
           ▼
┌─────────────────────┐
│  MiBodega WhatsApp  │
│       Bot (API)     │
└──────────┬──────────┘
           │
           │ Baileys Protocol
           │
           ▼
┌─────────────────────┐
│   WhatsApp API      │
│  (Usuario Final)    │
└─────────────────────┘
```

## Componentes

### 1. Bot de WhatsApp (MiBodega)
**Archivo:** `whatsapp-bot/src/index.ts`

Nuevo endpoint `POST /api/notifications`:
- Recibe peticiones desde Kairos
- Valida API Key para seguridad
- Formatea número de teléfono (agrega +51 si es necesario)
- Envía mensaje por WhatsApp usando Baileys

**Payload esperado:**
```json
{
  "numero": "987654321",
  "mensaje": "Tu mensaje personalizado",
  "apiKey": "kairos-mibodega-2024"
}
```

**Respuestas:**
- `200`: Notificación enviada correctamente
- `400`: Faltan campos requeridos
- `401`: API Key inválida
- `503`: Bot no conectado a WhatsApp

### 2. Servicio de Notificaciones (Kairos)
**Archivo:** `backend/src/utils/notifications/kairos-whatsapp.js`

Funciones principales:
- `sendWhatsAppNotification(numero, mensaje)`: Envía notificación al bot
- `checkBotStatus()`: Verifica si el bot está conectado

Características:
- Timeout de 30 segundos
- Manejo completo de errores
- Logs detallados para debugging
- Reintentos automáticos (opcional)

### 3. Controller de Notificaciones (Kairos)
**Archivo:** `backend/src/controllers/configuracion/notificaciones.controller.js`

Modificado el worker de notificaciones programadas:
- Cuando `medio = 'whatsapp'`, usa el bot de MiBodega
- Mensaje personalizado con formato Markdown de WhatsApp
- Fallback opcional a Twilio si falla el bot

## Configuración

### Variables de Entorno

#### Kairos Backend (`.env`)
```bash
# URL del bot de WhatsApp (producción o local)
MIBODEGA_BOT_URL=https://mibodega-whatsapp-bot.onrender.com
# MIBODEGA_BOT_URL=http://localhost:3001  # Para desarrollo local

# API Key para autenticar las peticiones
MIBODEGA_BOT_API_KEY=kairos-mibodega-2024
```

#### MiBodega WhatsApp Bot (`.env`)
```bash
BOT_PORT=3001

# API Key para validar peticiones de Kairos
API_KEY=kairos-mibodega-2024
```

## Flujo de Ejecución

1. **Cron Job de Kairos** (cada minuto)
   - Busca notificaciones pendientes con `medio = 'whatsapp'`
   - Obtiene número de teléfono del usuario desde BD

2. **Envío de Notificación**
   - Kairos llama a `kairosWhatsapp.sendWhatsAppNotification()`
   - Se hace POST a `MIBODEGA_BOT_URL/api/notifications`
   - Se incluye API Key para autenticación

3. **Procesamiento en el Bot**
   - Bot valida API Key
   - Verifica que esté conectado a WhatsApp
   - Formatea el número (agrega código de país si falta)
   - Envía mensaje usando Baileys

4. **Confirmación**
   - Bot responde con `success: true` o error
   - Kairos registra en logs el resultado

## Formato de Mensajes

### Mensaje de Notificación Estándar
```
💰 *Kairos - Recordatorio*

Hola! 👋

Recuerda registrar tus ingresos y egresos del día para mantener tus finanzas al día y ser un ahorrador pro. 📊

_Mensaje enviado automáticamente por Kairos_
```

## Seguridad

### 1. Autenticación por API Key
- Cada petición debe incluir el campo `apiKey`
- El bot valida contra `process.env.API_KEY`
- Sin API Key válida, retorna `401 Unauthorized`

### 2. Recomendaciones
- **NO** commitear el `.env` al repositorio
- Usar API Keys fuertes en producción
- Cambiar la API Key periódicamente
- Considerar rate limiting en el bot

## Testing

### Probar el Bot Local
```bash
# 1. Iniciar el bot de WhatsApp
cd whatsapp-bot
npm run dev

# 2. Esperar a que genere el QR y escanear con WhatsApp

# 3. Probar endpoint con curl
curl -X POST http://localhost:3001/api/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "numero": "987654321",
    "mensaje": "Hola, esta es una prueba de Kairos",
    "apiKey": "kairos-mibodega-2024"
  }'
```

### Probar desde Kairos
1. Configurar una notificación en Kairos:
   - Medio: WhatsApp
   - Frecuencia: Diaria
   - Hora: (próxima hora para testing)

2. Verificar logs en ambos servicios:
   ```bash
   # Kairos
   cd backend
   npm start
   
   # Observar logs: [Kairos→MiBodega] ...
   ```

## Troubleshooting

### Error: "Bot no conectado"
**Causa:** El bot no ha escaneado el QR o perdió conexión
**Solución:** 
1. Acceder a `https://mibodega-whatsapp-bot.onrender.com/qr`
2. Escanear el código QR con WhatsApp
3. Esperar mensaje "Conectado a WhatsApp"

### Error: "API Key inválida"
**Causa:** La API Key en Kairos no coincide con la del bot
**Solución:** Verificar que `MIBODEGA_BOT_API_KEY` en Kairos sea igual a `API_KEY` en el bot

### Error: "No se pudo conectar con el bot"
**Causa:** El bot no está en ejecución o la URL es incorrecta
**Solución:** 
1. Verificar que `MIBODEGA_BOT_URL` esté correcto
2. Verificar que el bot esté corriendo
3. Probar manualmente: `curl https://mibodega-whatsapp-bot.onrender.com/health`

### Notificaciones no llegan
**Causa:** Número de teléfono mal formateado
**Solución:** 
- Verificar que el campo `numero` en la tabla `usuarios` tenga formato válido
- Para Perú: puede ser `987654321` o `51987654321` (el bot agrega +51 automáticamente)

## Monitoreo

### Logs de Kairos
```bash
[Kairos→MiBodega] Enviando notificación WhatsApp
[Kairos→MiBodega] Destinatario: 51987654321
[Kairos→MiBodega] URL: https://mibodega-whatsapp-bot.onrender.com/api/notifications
[Kairos→MiBodega] ✅ Notificación enviada: { success: true, ... }
```

### Logs del Bot
```bash
🔔 Enviando notificación de Kairos a 51987654321@s.whatsapp.net
📝 Mensaje: 💰 *Kairos - Recordatorio* ...
✅ Notificación enviada exitosamente
```

## Mejoras Futuras

1. **Plantillas de Mensajes**
   - Soportar diferentes tipos de notificaciones
   - Mensajes personalizados con variables

2. **Retry Logic**
   - Reintentos automáticos si falla el envío
   - Cola de mensajes pendientes

3. **Analytics**
   - Registro de mensajes enviados
   - Tasa de éxito/fallo
   - Tiempo de respuesta

4. **Rate Limiting**
   - Limitar peticiones por IP
   - Prevenir abuse del endpoint

5. **Webhooks**
   - Notificar a Kairos cuando se entrega el mensaje
   - Estado de lectura del usuario

## Contacto

Para preguntas o problemas con la integración:
- Revisar logs de ambos servicios
- Verificar variables de entorno
- Probar endpoint manualmente con curl
