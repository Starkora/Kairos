
// Envío real de SMS usando Twilio
const twilio = require('twilio');


const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const smsFrom = process.env.TWILIO_SMS_FROM || process.env.TWILIO_PHONE_NUMBER; // SMS clásico
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM; // ej: 'whatsapp:+14155238886' (Sandbox)
const preferredChannel = (process.env.TWILIO_PREFERRED_CHANNEL || 'sms').toLowerCase(); // 'sms' | 'whatsapp'
const waFallbackToSMS = String(process.env.TWILIO_WHATSAPP_FALLBACK_TO_SMS || 'false').toLowerCase() === 'true';

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
    return;
  }
  if (!smsFrom) {
    return;
  }
  try {
    const res = await client.messages.create({
      body: text,
  from: smsFrom,
      to: normalizeTo(to) // Asume Perú por defecto; ajustar según despliegue
    });
    return res;
  } catch (e) {
    throw e;
  }
}

async function sendWhatsApp(to, text) {
  if (!client) {
    return;
  }
  if (!whatsappFrom) {
    return;
  }
  try {
    const toWa = String(to || '').startsWith('whatsapp:') ? to : 'whatsapp:' + normalizeTo(to);
    // Normaliza el FROM: si falta prefijo, úsalo directamente con prefijo sin depender de SMS
    const fromWa = whatsappFrom.startsWith('whatsapp:')
      ? whatsappFrom
      : ('whatsapp:' + (whatsappFrom.startsWith('+') ? whatsappFrom : normalizeTo(whatsappFrom)));
    if (!whatsappFrom.startsWith('whatsapp:')) {
    }
    const res = await client.messages.create({
      body: text,
      from: fromWa,
      to: toWa
    });
    return res;
  } catch (e) {
    if (e && e.code === 21910) {
    } else {
    }
    // Fallback opcional a SMS si está habilitado
    if (waFallbackToSMS) {
      try {
        return await sendSMS(to, text);
      } catch (e2) {
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
      return sendSMS(to, text);
    }
  }
  return sendSMS(to, text);
}

module.exports = { sendSMS, sendWhatsApp, send };
