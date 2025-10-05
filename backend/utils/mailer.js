const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendMail({ to, subject, text }) {
  if (typeof to !== 'string' || !to.trim()) {
    throw new Error('El campo `to` debe ser un correo electrónico válido.');
  }

  const from = process.env.MAIL_FROM;
  if (typeof from !== 'string' || !from.trim()) {
    throw new Error('El campo `from` debe ser un correo electrónico válido y configurado en las variables de entorno.');
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
