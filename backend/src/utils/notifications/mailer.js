const brevo = require('@getbrevo/brevo');

// Configurar API de Brevo (ex-Sendinblue)
const apiInstance = new brevo.TransactionalEmailsApi();

// Configurar API Key
const BREVO_API_KEY = process.env.BREVO_API_KEY;
if (BREVO_API_KEY) {
  apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, BREVO_API_KEY);
}

async function sendMail({ to, subject, text, html }) {
  if (typeof to !== 'string' || !to.trim()) {
    throw new Error('El campo `to` debe ser un correo electrónico válido.');
  }

  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@kairos.app';
  const allowDevFallback = process.env.ALLOW_DEV_MAIL_FALLBACK === 'true' || process.env.NODE_ENV !== 'production';
  
  if (!BREVO_API_KEY) {
    if (allowDevFallback) {
      console.log('[Mailer] Modo desarrollo - Email simulado:', { to, subject });
      return { simulated: true };
    }
    throw new Error('Configuración de correo incompleta: falta BREVO_API_KEY');
  }

  // Crear el objeto de email para Brevo
  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.sender = { email: from, name: 'Kairos' };
  sendSmtpEmail.to = [{ email: to.trim() }];
  sendSmtpEmail.subject = subject;
  sendSmtpEmail.textContent = text;
  sendSmtpEmail.htmlContent = html || `<p>${text}</p>`;

  try {
    console.log('[Mailer] Enviando email via Brevo a:', to);
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('[Mailer] Email enviado exitosamente via Brevo. MessageId:', result.messageId);
    return result;
  } catch (error) {
    console.error('[Mailer] Error al enviar email:', error.message);
    if (error.response) {
      console.error('[Mailer] Detalles del error:', error.response.text);
    }
    throw error;
  }
}

module.exports = { sendMail };
