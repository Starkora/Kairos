const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

async function sendMail({ to, subject, text }) {
  if (typeof to !== 'string' || !to.trim()) {
    throw new Error('El campo `to` debe ser un correo electrónico válido.');
  }

  const from = process.env.MAIL_FROM;
  const apiKey = process.env.SENDGRID_API_KEY;
  const allowDevFallback = process.env.ALLOW_DEV_MAIL_FALLBACK === 'true' || process.env.NODE_ENV !== 'production';
  if ((typeof from !== 'string' || !from.trim()) || !apiKey) {
    if (allowDevFallback) {
      console.warn('[mailer] Falta configuración de SendGrid/Mail From. Simulando envío (DEV).');
      console.log(`[mailer][SIMULATED] To: ${to} | Subject: ${subject} | Text: ${text}`);
      return { simulated: true };
    }
    throw new Error('Configuración de correo incompleta: falta MAIL_FROM o SENDGRID_API_KEY');
  }

  console.log(`Intentando enviar correo a ${to} con asunto: ${subject}`); // Log para depuración

  return sgMail.send({
    to: to.trim(),
    from: from.trim(), // Asegurarse de que el correo remitente esté limpio
    subject,
    text
  });
}

module.exports = { sendMail };
