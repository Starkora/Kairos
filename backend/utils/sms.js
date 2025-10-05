
// Envío real de SMS usando Twilio
const twilio = require('twilio');


const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

console.log('[Kairos][Twilio] SID:', accountSid);
console.log('[Kairos][Twilio] TOKEN:', authToken);
console.log('[Kairos][Twilio] FROM:', fromNumber);

let client = null;
if (accountSid && authToken) {
  client = twilio(accountSid, authToken);
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
      to: to.startsWith('+') ? to : '+51' + to // Asume Perú, ajusta si es necesario
    });
    console.log('[Kairos] SMS enviado:', res.sid);
    return res;
  } catch (e) {
    console.error('[Kairos] Error al enviar SMS:', e);
    throw e;
  }
}

module.exports = { sendSMS };
