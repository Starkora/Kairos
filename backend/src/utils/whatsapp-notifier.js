const axios = require('axios');

const MIBODEGA_BOT_URL = process.env.MIBODEGA_BOT_URL || 'https://mibodega-whatsapp-bot.onrender.com';
const MIBODEGA_BOT_API_KEY = process.env.MIBODEGA_BOT_API_KEY || 'kairos-mibodega-2024';
const ADMIN_WHATSAPP_NUMBER = process.env.ADMIN_WHATSAPP_NUMBER || '51904065007';

/**
 * Envía notificación de WhatsApp al admin cuando un nuevo usuario se registra
 * @param {Object} usuario - Datos del usuario registrado
 * @param {string} usuario.nombre - Nombre del usuario
 * @param {string} usuario.apellido - Apellido del usuario  
 * @param {string} usuario.email - Email del usuario
 * @param {string} usuario.numero - Número de teléfono del usuario
 * @param {string} usuario.plataforma - Plataforma desde donde se registró (web/mobile)
 */
async function notifyAdminNewUser(usuario) {
  try {
    const nombreCompleto = `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim() || 'Sin nombre';
    
    const mensaje = `*NUEVO USUARIO REGISTRADO EN KAIROS*

*Nombre:* ${nombreCompleto}
*Email:* ${usuario.email}
*Teléfono:* ${usuario.numero || 'No proporcionado'}
*Plataforma:* ${usuario.plataforma || 'web'}
*Fecha:* ${new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' })}

El usuario tiene acceso inmediato al sistema con 30 días de prueba gratuita.`;

    const response = await axios.post(
      `${MIBODEGA_BOT_URL}/api/notifications`,
      {
        numero: ADMIN_WHATSAPP_NUMBER,
        mensaje,
        apiKey: MIBODEGA_BOT_API_KEY
      },
      {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.success) {
      return { success: true };
    } else {
      return { success: false, error: 'Respuesta inválida del bot' };
    }
  } catch (error) {
    
    
    if (error.code === 'ECONNABORTED') {
      
    } else if (error.response) {
      console.error('[Kairos WhatsApp] Respuesta del servidor:', {
        status: error.response.status,
        data: error.response.data
      });
    }
    
    return { success: false, error: error.message };
  }
}

/**
 * Envía código de verificación por WhatsApp a un número de teléfono
 * @param {string} numero - Número de teléfono en formato internacional (+xxx...)
 * @param {string} codigo - Código de 6 dígitos
 * @param {string} tipo - Tipo de código: 'registro' | 'recuperacion'
 */
async function sendVerificationCode(numero, codigo, tipo = 'registro') {
  try {
    // Normalizar número: debe incluir + al inicio
    let numeroNormalizado = numero.trim();
    if (!numeroNormalizado.startsWith('+')) {
      // Si no tiene +, intentar agregarlo
      numeroNormalizado = `+${numeroNormalizado}`;
    }
    
    const tipoTexto = tipo === 'recuperacion' ? 'recuperación de contraseña' : 'confirmación de registro';
    
    const mensaje = `*KAIROS - Código de ${tipo === 'recuperacion' ? 'Recuperación' : 'Confirmación'}*

Tu código de ${tipoTexto} es:

*${codigo}*

Este código expira en 15 minutos.

_Si no solicitaste este código, ignora este mensaje._`;

    const response = await axios.post(
      `${MIBODEGA_BOT_URL}/api/notifications`,
      {
        numero: numeroNormalizado,
        mensaje,
        apiKey: MIBODEGA_BOT_API_KEY
      },
      {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.success) {
      
      return { success: true };
    } else {
      
      return { success: false, error: 'Respuesta inválida del bot' };
    }
  } catch (error) {
    
    
    if (error.code === 'ECONNABORTED') {
      
    } else if (error.response) {
      console.error('[Kairos WhatsApp] Respuesta del servidor:', {
        status: error.response.status,
        data: error.response.data
      });
    }
    
    return { success: false, error: error.message };
  }
}

/**
 * Verifica si el bot de WhatsApp está conectado y disponible
 */
async function checkBotStatus() {
  try {
    const response = await axios.get(`${MIBODEGA_BOT_URL}/health`, {
      timeout: 5000
    });
    
    if (response.data.connected) {
      
      return { connected: true };
    } else {
      
      return { connected: false };
    }
  } catch (error) {
    
    return { connected: false, error: error.message };
  }
}

module.exports = {
  notifyAdminNewUser,
  sendVerificationCode,
  checkBotStatus
};
