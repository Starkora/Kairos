
// Envío real de SMS usando Twilio
const twilio = require('twilio');


const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const smsFrom = process.env.TWILIO_SMS_FROM || process.env.TWILIO_PHONE_NUMBER; // SMS clásico
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM; // ej: 'whatsapp:+14155238886' (Sandbox)
const preferredChannel = (process.env.TWILIO_PREFERRED_CHANNEL || 'sms').toLowerCase(); // 'sms' | 'whatsapp'
const waFallbackToSMS = String(process.env.TWILIO_WHATSAPP_FALLBACK_TO_SMS || 'false').toLowerCase() === 'true';

console.log('[Kairos][Twilio] SID presente:', !!accountSid);
console.log('[Kairos][Twilio] TOKEN presente:', !!authToken);
console.log('[Kairos][Twilio] FROM (SMS) presente:', !!smsFrom);
console.log('[Kairos][Twilio] FROM (WA) presente:', !!whatsappFrom);

let client = null;
if (accountSid && authToken) {
  client = twilio(accountSid, authToken);
}

function normalizeTo(to) {
  // Normaliza a formato internacional +<pais><numero> (por defecto +51)
  // Acepta entradas con prefijo 'whatsapp:' y las convierte a número plano E.164
  let raw = String(to || '').trim();
  if (!raw) return '';
  if (raw.toLowerCase().startsWith('whatsapp:')) raw = raw.slice('whatsapp:'.length);
  raw = raw.trim();
  if (!raw) return '';
  if (raw.startsWith('+')) return raw;
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  // Si ya viene con código de país (por ejemplo empieza con '51'), no lo duplicamos
  const withCountry = digits.startsWith('51') ? digits : ('51' + digits);
  return '+' + withCountry;
}

async function sendSMS(to, text) {
  if (!client) {
    console.error('[Kairos] Twilio no configurado. Falta TWILIO_ACCOUNT_SID o TWILIO_AUTH_TOKEN');
    return;
  }
  if (!smsFrom) {
    console.error('[Kairos] No hay remitente SMS configurado. Define TWILIO_SMS_FROM o TWILIO_PHONE_NUMBER en el entorno.');
    return;
  }
  try {
    const res = await client.messages.create({
      body: text,
  from: smsFrom,
      to: normalizeTo(to) // Asume Perú por defecto; ajustar según despliegue
    });
    console.log('[Kairos] SMS enviado:', res.sid);
    return res;
  } catch (e) {
    console.error('[Kairos] Error al enviar SMS:', e);
    throw e;
  }
}

async function sendWhatsApp(to, text) {
  if (!client) {
    console.error('[Kairos] Twilio no configurado. Falta TWILIO_ACCOUNT_SID o TWILIO_AUTH_TOKEN');
    return;
  }
  if (!whatsappFrom) {
    console.error('[Kairos] TWILIO_WHATSAPP_FROM no está definido. Usa el número de Sandbox (whatsapp:+14155238886) o tu número habilitado.');
    return;
  }
  try {
    const toWa = String(to || '').startsWith('whatsapp:') ? to : 'whatsapp:' + normalizeTo(to);
    // Normaliza el FROM: si falta prefijo, úsalo directamente con prefijo sin depender de SMS
    const fromWa = whatsappFrom.startsWith('whatsapp:')
      ? whatsappFrom
      : ('whatsapp:' + (whatsappFrom.startsWith('+') ? whatsappFrom : normalizeTo(whatsappFrom)));
    if (!whatsappFrom.startsWith('whatsapp:')) {
      console.warn('[Kairos] Advertencia: TWILIO_WHATSAPP_FROM debe iniciar con "whatsapp:". Se usará normalizado:', fromWa);
    }
    const res = await client.messages.create({
      body: text,
      from: fromWa,
      to: toWa
    });
    console.log('[Kairos] WhatsApp enviado:', res.sid);
    return res;
  } catch (e) {
    if (e && e.code === 21910) {
      console.error('[Kairos] Twilio 21910: From y To deben ser del mismo canal. Asegúrate que:',
        '\n- TWILIO_WHATSAPP_FROM sea algo como whatsapp:+14155238886 (Sandbox)',
        '\n- El destinatario esté en formato whatsapp:+<pais><numero> (el código ya lo aplica) y haya unido el sandbox (join ...)');
    } else {
      console.error('[Kairos] Error al enviar WhatsApp:', e);
    }
    // Fallback opcional a SMS si está habilitado
    if (waFallbackToSMS) {
      console.warn('[Kairos] Fallback habilitado: reintentando por SMS tras error en WhatsApp...');
      try {
        return await sendSMS(to, text);
      } catch (e2) {
        console.error('[Kairos] Error también al enviar SMS (fallback de WA):', e2);
        throw e2;
      }
    }
    throw e;
  }
}

// Envío según TWILIO_PREFERRED_CHANNEL (default sms) sin tocar llamadas existentes
async function send(to, text) {
  if (preferredChannel === 'whatsapp') {
    if (whatsappFrom) {
      try { return await sendWhatsApp(to, text); } catch (e) { throw e; }
    } else {
      console.warn('[Kairos] TWILIO_PREFERRED_CHANNEL=whatsapp pero TWILIO_WHATSAPP_FROM no está configurado. Enviando por SMS como fallback.');
      return sendSMS(to, text);
    }
  }
  return sendSMS(to, text);
}

module.exports = { sendSMS, sendWhatsApp, send };
