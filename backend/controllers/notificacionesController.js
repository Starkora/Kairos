const express = require('express');
const router = express.Router();
const sgMail = require('@sendgrid/mail');
const mailer = require('../utils/mailer');
const sms = require('../utils/sms');
const auth = require('../utils/auth');
const db = require('../db');
const cron = require('node-cron');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Middleware de autenticación SOLO para endpoints HTTP
router.use(auth);

// --- Worker global de notificaciones ---
// En lugar de programar un cron por notificación (frágil ante reinicios y cambios),
// ejecutamos una tarea cada minuto que evalúa qué notificaciones están "vencidas" según la configuración.

// Track para evitar reenvíos múltiples en el mismo minuto por notificación
const sentTracker = new Map(); // key: `${id}-${yyyyMMddHHmm}` -> timestamp

// Día de semana en español a valor cron (0=domingo..6=sábado)
const diasSemana = { domingo: 0, lunes: 1, martes: 2, miercoles: 3, miércoles: 3, jueves: 4, viernes: 5, sabado: 6, sábado: 6 };

const two = (n) => (n < 10 ? '0' + n : '' + n);

const buildSlotKey = (date, id) => {
  const y = date.getFullYear();
  const M = two(date.getMonth() + 1);
  const d = two(date.getDate());
  const h = two(date.getHours());
  const m = two(date.getMinutes());
  return `${id}-${y}${M}${d}${h}${m}`;
};

function isDue(notificacion, nowLocal) {
  const { frecuencia, hora_inicio, intervalo_horas, dia } = notificacion;
  if (!hora_inicio) return false;
  const [hh, mm] = hora_inicio.split(':').map((v) => parseInt(v, 10));
  const minuteMatch = nowLocal.getMinutes() === (isNaN(mm) ? 0 : mm);
  if (!minuteMatch) return false;

  if (frecuencia === 'diaria') {
    const interv = Math.max(1, parseInt(intervalo_horas, 10) || 24);
    // Ejecutar en horas que respeten el offset desde hora_inicio
    const nowH = nowLocal.getHours();
    const offset = ((nowH - (isNaN(hh) ? 0 : hh)) % interv + interv) % interv;
    return offset === 0;
  }
  if (frecuencia === 'semanal') {
    const targetDow = diasSemana[(dia || '').toLowerCase()];
    if (typeof targetDow !== 'number') return false;
    const nowDow = nowLocal.getDay();
    return nowDow === targetDow && nowLocal.getHours() === (isNaN(hh) ? 0 : hh);
  }
  return false;
}

async function fetchNotificacionesConEmail() {
  const [rows] = await db.query(
    `SELECT n.*, u.email AS usuario_email, u.numero AS usuario_telefono
     FROM notificaciones n
     JOIN usuarios u ON u.id = n.usuario_id`
  );
  return rows || [];
}

async function workerTick() {
  const now = new Date(); // Asume TZ del servidor
  try {
    const list = await fetchNotificacionesConEmail();
    for (const n of list) {
      if (!n) continue;
      if (!isDue(n, now)) continue;
      const key = buildSlotKey(now, n.id);
      if (sentTracker.has(key)) continue; // ya enviado en este minuto
      try {
        if (n.medio === 'correo') {
          if (!n.usuario_email) { console.error('Notificación sin email:', n.id); continue; }
          await mailer.sendMail({
            to: n.usuario_email,
            subject: 'Recordatorio de Notificación',
            text: 'Hola, recuerda anotar tus ingresos y egresos del día para ser un ahorrador pro.'
          });
          console.log(`[Notificaciones] Enviado correo a ${n.usuario_email} (notif ${n.id})`);
        } else if (n.medio === 'sms') {
          if (!n.usuario_telefono) { console.error('Notificación sin teléfono:', n.id); continue; }
          // Enviar SIEMPRE por SMS cuando el medio configurado es 'sms',
          // ignorando TWILIO_PREFERRED_CHANNEL para respetar la preferencia por notificación.
          await sms.sendSMS(String(n.usuario_telefono), 'Kairos: recuerda registrar tus ingresos y egresos del día.');
          console.log(`[Notificaciones] Enviado SMS a ${n.usuario_telefono} (notif ${n.id})`);
        } else if (n.medio === 'whatsapp') {
          if (!n.usuario_telefono) { console.error('Notificación sin teléfono:', n.id); continue; }
          await sms.sendWhatsApp(String(n.usuario_telefono), 'Kairos: recuerda registrar tus ingresos y egresos del día.');
          console.log(`[Notificaciones] Enviado WhatsApp a ${n.usuario_telefono} (notif ${n.id})`);
        } else {
          // Medio no soportado actualmente
          continue;
        }
        sentTracker.set(key, Date.now());
      } catch (err) {
        console.error('[Notificaciones] Error al enviar:', err && err.response ? err.response.body : err);
      }
    }
    // Limpieza básica del tracker (entradas > 36h)
    const cutoff = Date.now() - 36 * 3600 * 1000;
    for (const [k, ts] of sentTracker.entries()) {
      if (ts < cutoff) sentTracker.delete(k);
    }
  } catch (e) {
    console.error('[Notificaciones] Tick error:', e);
  }
}

// Ejecutar cada minuto
cron.schedule('* * * * *', workerTick);

// Endpoint para guardar configuración de notificaciones y enviar correos
router.post('/notificaciones', async (req, res) => {
  const { frecuencia, medio, horaInicio, intervaloHoras, dia } = req.body;
  const user = req.user; // Obtener el usuario desde el token
  const email = user.email; // Extraer el correo del usuario

  console.log('Usuario autenticado:', req.user); // Depuración
  console.log('Datos recibidos:', { frecuencia, medio, horaInicio, intervaloHoras, dia }); // Depuración

  if (!frecuencia || !medio || !horaInicio || !intervaloHoras || (frecuencia === 'semanal' && !dia)) {
    return res.status(400).json({ error: 'Faltan datos requeridos' });
  }
  const interv = parseInt(intervaloHoras, 10);
  if (!Number.isInteger(interv) || interv < 1 || interv > 24) {
    return res.status(400).json({ error: 'intervaloHoras inválido. Debe ser entero entre 1 y 24.' });
  }

  try {
    const usuarioId = req.user.id; // Obtener el ID del usuario autenticado
    // Limitar a máximo 2 configuraciones por usuario
    const [countRows] = await db.query('SELECT COUNT(*) AS c FROM notificaciones WHERE usuario_id = ?', [usuarioId]);
    const currentCount = Array.isArray(countRows) && countRows[0] ? Number(countRows[0].c) : 0;
    if (currentCount >= 2) {
      return res.status(409).json({ error: 'Límite alcanzado', code: 'LIMIT_REACHED', message: 'Solo puedes tener hasta 2 configuraciones de notificación.' });
    }
    const [usuario] = await db.query('SELECT email FROM usuarios WHERE id = ?', [usuarioId]);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const usuarioEmail = usuario[0]?.email;
    if (!usuarioEmail) {
      console.error('Correo del usuario no encontrado:', usuario);
      return res.status(500).json({ error: 'Correo del usuario no encontrado' });
    }
    console.log('Correo del usuario:', usuarioEmail); // Depuración

    await db.query(
      'INSERT INTO notificaciones (usuario_id, frecuencia, medio, hora_inicio, intervalo_horas, dia) VALUES (?, ?, ?, ?, ?, ?)',
      [usuarioId, frecuencia, medio, horaInicio, interv, dia]
    );

    res.status(201).json({ message: 'Configuración guardada exitosamente' });
  } catch (error) {
    console.error('Error al guardar configuración en la base de datos:', error);
    res.status(500).json({ error: 'Error al guardar configuración' });
  }
});

// Endpoint para obtener las notificaciones configuradas por un usuario
router.get('/notificaciones', async (req, res) => {
  try {
    const usuarioId = req.user.id; // Obtener el ID del usuario autenticado
    console.log('Usuario ID utilizado en la consulta:', usuarioId); // Depuración
    const resultado = await db.query(
      'SELECT * FROM notificaciones WHERE usuario_id = ?',
      [usuarioId]
    );
    const notificaciones = resultado[0]; // Acceder al primer índice del resultado para obtener las filas
    console.log('Notificaciones obtenidas:', notificaciones); // Depuración
    res.json(notificaciones || []); // Asegurar que siempre se devuelva un arreglo
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    res.status(500).json({ error: 'Error al obtener las notificaciones' });
  }
});

// Endpoint para actualizar una notificación existente
router.put('/notificaciones/:id', async (req, res) => {
  const { id } = req.params;
  const { frecuencia, medio, horaInicio, intervaloHoras, dia } = req.body;

  if (!frecuencia || !medio || !horaInicio || !intervaloHoras || (frecuencia === 'semanal' && !dia)) {
    return res.status(400).json({ error: 'Faltan datos requeridos' });
  }
  const interv = parseInt(intervaloHoras, 10);
  if (!Number.isInteger(interv) || interv < 1 || interv > 24) {
    return res.status(400).json({ error: 'intervaloHoras inválido. Debe ser entero entre 1 y 24.' });
  }

  try {
    const usuarioId = req.user.id; // Obtener el ID del usuario autenticado
    const resultado = await db.query(
      'UPDATE notificaciones SET frecuencia = ?, medio = ?, hora_inicio = ?, intervalo_horas = ?, dia = ? WHERE id = ? AND usuario_id = ?',
      [frecuencia, medio, horaInicio, interv, dia, id, usuarioId]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ error: 'Notificación no encontrada o no pertenece al usuario' });
    }

    res.json({ message: 'Notificación actualizada exitosamente' });
  } catch (error) {
    console.error('Error al actualizar la notificación:', error);
    res.status(500).json({ error: 'Error al actualizar la notificación' });
  }
});

// Endpoint para eliminar una notificación existente
router.delete('/notificaciones/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const usuarioId = req.user.id; // Obtener el ID del usuario autenticado
    const resultado = await db.query(
      'DELETE FROM notificaciones WHERE id = ? AND usuario_id = ?',
      [id, usuarioId]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ error: 'Notificación no encontrada o no pertenece al usuario' });
    }

    res.json({ message: 'Notificación eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar la notificación:', error);
    res.status(500).json({ error: 'Error al eliminar la notificación' });
  }
});

module.exports = router;