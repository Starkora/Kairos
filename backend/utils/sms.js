
// Envío real de SMS usando Twilio
const twilio = require('twilio');


const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER; // SMS clásico
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM; // ej: 'whatsapp:+14155238886' (Sandbox)
const preferredChannel = (process.env.TWILIO_PREFERRED_CHANNEL || 'sms').toLowerCase(); // 'sms' | 'whatsapp'

console.log('[Kairos][Twilio] SID:', accountSid);
console.log('[Kairos][Twilio] TOKEN:', authToken);
console.log('[Kairos][Twilio] FROM:', fromNumber);

let client = null;
if (accountSid && authToken) {
  client = twilio(accountSid, authToken);
}

function normalizeTo(to) {
  // Normaliza a formato internacional +<pais><numero> (por defecto +51)
  const digits = String(to || '').replace(/\D/g, '');
  if (!digits) return '';
  return to.startsWith('+') ? to : '+51' + digits;
}

async function sendSMS(to, text) {
  if (!client) {
    console.error('[Kairos] Twilio no configurado. Falta TWILIO_ACCOUNT_SID o TWILIO_AUTH_TOKEN');
    return;
  }
  try {
    const res = await client.messages.create({
      body: text,
      from: fromNumber,
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
    const toWa = 'whatsapp:' + normalizeTo(to);
    const res = await client.messages.create({
      body: text,
      from: whatsappFrom,
      to: toWa
    });
    console.log('[Kairos] WhatsApp enviado:', res.sid);
    return res;
  } catch (e) {
    console.error('[Kairos] Error al enviar WhatsApp:', e);
    throw e;
  }
}

// Envío según TWILIO_PREFERRED_CHANNEL (default sms) sin tocar llamadas existentes
async function send(to, text) {
  if (preferredChannel === 'whatsapp') return sendWhatsApp(to, text);
  return sendSMS(to, text);
}

module.exports = { sendSMS, sendWhatsApp, send };
