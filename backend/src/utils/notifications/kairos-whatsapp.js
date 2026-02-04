const axios = require('axios');

/**
 * Servicio para enviar notificaciones de Kairos via WhatsApp
 * usando el bot de WhatsApp de MiBodega
 */

const MIBODEGA_BOT_URL = process.env.MIBODEGA_BOT_URL || 'http://localhost:3001';
const MIBODEGA_BOT_API_KEY = process.env.MIBODEGA_BOT_API_KEY || 'kairos-mibodega-2024';

/**
 * Envía una notificación por WhatsApp a través del bot de MiBodega
 * @param {string} numero - Número de teléfono del destinatario (puede incluir o no código de país)
 * @param {string} mensaje - Mensaje de texto a enviar
 * @returns {Promise<Object>} Respuesta del bot
 */
async function sendWhatsAppNotification(numero, mensaje) {
  try {

    const response = await axios.post(
      `${MIBODEGA_BOT_URL}/api/notifications`,
      {
        numero: numero,
        mensaje: mensaje,
        apiKey: MIBODEGA_BOT_API_KEY
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 segundos de timeout
      }
    );
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    
    if (error.response) {
      // El servidor respondió con un código de error
      return {
        success: false,
        error: error.response.data.error || 'Error del servidor',
        statusCode: error.response.status
      };
    } else if (error.request) {
      return {
        success: false,
        error: 'No se pudo conectar con el bot de WhatsApp. Verifica que esté en ejecución.'
      };
    } else {
      // Algo pasó al configurar la petición      
      return {
        success: false,
        error: error.message
      };
    }
  }
}

/**
 * Verifica si el bot de WhatsApp está disponible
 * @returns {Promise<boolean>} true si el bot está conectado
 */
async function checkBotStatus() {
  try {
    const response = await axios.get(
      `${MIBODEGA_BOT_URL}/api/whatsapp/status`,
      { timeout: 5000 }
    );
    
    return response.data.connected === true;
  } catch (error) {
    return false;
  }
}

module.exports = {
  sendWhatsAppNotification,
  checkBotStatus
};
