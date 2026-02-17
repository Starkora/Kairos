const nodemailer = require('nodemailer');

// Configuración del transporter con SMTP (compatible con Gmail, Outlook, etc.)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp-mail.outlook.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true', // true para puerto 465, false para otros puertos
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
  tls: {
    ciphers: 'SSLv3',
    rejectUnauthorized: false
  },
  // Timeouts para evitar esperas indefinidas
  connectionTimeout: 10000, // 10 segundos para conectar
  greetingTimeout: 10000, // 10 segundos para el greeting
  socketTimeout: 30000 // 30 segundos para operaciones
});

async function sendMail({ to, subject, text, html }) {
  if (typeof to !== 'string' || !to.trim()) {
    throw new Error('El campo `to` debe ser un correo electrónico válido.');
  }

  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  const allowDevFallback = process.env.ALLOW_DEV_MAIL_FALLBACK === 'true' || process.env.NODE_ENV !== 'production';
  
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    if (allowDevFallback) {
      console.log('[Mailer] Modo desarrollo - Email simulado:', { to, subject });
      return { simulated: true };
    }
    throw new Error('Configuración de correo incompleta: falta EMAIL_USER o EMAIL_PASSWORD');
  }

  const mailOptions = {
    from: `Kairos <${from}>`,
    to: to.trim(),
    subject,
    text,
    html: html || text // Si no hay HTML, usar el texto plano
  };

  try {
    console.log('[Mailer] Enviando email a:', to);
    const result = await transporter.sendMail(mailOptions);
    console.log('[Mailer] Email enviado exitosamente:', result.messageId);
    return result;
  } catch (error) {
    console.error('[Mailer] Error al enviar email:', error.message);
    throw error;
  }
}

module.exports = { sendMail };
