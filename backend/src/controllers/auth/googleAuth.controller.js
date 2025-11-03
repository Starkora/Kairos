const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const db = require('../db');

// Permitir múltiples audiencias (client IDs) para validar idToken, separados por comas.
// Preferimos el Client ID de tipo Web como fallback seguro.
const RAW_GOOGLE_IDS = process.env.GOOGLE_CLIENT_IDS || process.env.GOOGLE_CLIENT_ID || '351324441687-39sdmfov119bqa28d703aqodo181jpih.apps.googleusercontent.com';
const GOOGLE_AUDIENCES = String(RAW_GOOGLE_IDS).split(',').map(s => s.trim()).filter(Boolean);
if (!process.env.GOOGLE_CLIENT_ID && !process.env.GOOGLE_CLIENT_IDS) {
  console.warn('[googleAuth] GOOGLE_CLIENT_ID/GOOGLE_CLIENT_IDS no está definido; usando fallback hardcodeado (Web Client ID). Configura la variable de entorno en producción.');
}
const client = new OAuth2Client(GOOGLE_AUDIENCES[0]);
console.log('[googleAuth] GOOGLE_AUDIENCES en uso:', GOOGLE_AUDIENCES);

// POST /api/usuarios/google
exports.loginGoogle = async (req, res) => {
  console.log('POST /api/usuarios/google llamado');
  if (!req.body) {
    console.log('No body recibido');
    return res.status(400).json({ message: 'Cuerpo de la solicitud requerido' });
  }
  const { credential, plataforma } = req.body || {};
  const plat = String(plataforma || 'web').toLowerCase();
  console.log('Credential recibida:', credential ? (credential.substring(0, 12) + '...') : credential);
  if (!credential) {
    console.log('No se recibió token de Google');
    return res.status(400).json({ message: 'Token de Google requerido' });
  }

  try {
  console.log('[googleAuth] requiredAudiences (GOOGLE_AUDIENCES) en request:', GOOGLE_AUDIENCES);
    // Decodificar payload del idToken para inspeccionar 'aud', 'iss', etc. (solo logs, sin validar)
    try {
      const parts = String(credential).split('.');
      if (parts.length === 3) {
        const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const json = Buffer.from(b64, 'base64').toString('utf8');
        const payloadPreview = JSON.parse(json);
        console.log('[googleAuth] idToken payload:', {
          aud: payloadPreview.aud,
          azp: payloadPreview.azp,
          iss: payloadPreview.iss,
          email: payloadPreview.email,
          sub: payloadPreview.sub,
        });
        if (payloadPreview && payloadPreview.aud && !GOOGLE_AUDIENCES.includes(payloadPreview.aud)) {
          console.warn('[googleAuth] WARNING: aud del token no está en GOOGLE_AUDIENCES permitidos');
        }
      } else {
        console.warn('[googleAuth] idToken no tiene 3 partes');
      }
    } catch (decErr) {
      console.warn('[googleAuth] No se pudo decodificar idToken localmente:', decErr && decErr.message);
    }

    // Intentar validar contra cualquiera de las audiencias permitidas
    let payload = null;
    let lastErr = null;
    for (const aud of GOOGLE_AUDIENCES) {
      try {
        const ticket = await client.verifyIdToken({ idToken: credential, audience: aud });
        payload = ticket.getPayload();
        break;
      } catch (e) {
        lastErr = e;
      }
    }
    if (!payload) throw lastErr || new Error('Wrong recipient, payload audience not allowed');
    console.log('Payload de Google:', { email: payload.email, sub: payload.sub });
    const email = payload.email;
    const nombre = payload.given_name || '';
    const apellido = payload.family_name || '';
    const googleId = payload.sub;

    let users = await require('../models/usuario').findByEmailAndPlataforma(email, plat);
    let user = users[0];
    if (!user) {
      console.log('Usuario no existe, creando usuario nuevo');
      const result = await require('../models/usuario').create({
        email,
        numero: googleId,
        password: '',
        verificado: 1,
        plataforma: plat,
        nombre,
        apellido,
        rol: 'user',
        aprobado: 0,
      });
      user = { id: result.insertId, email, numero: googleId, verificado: 1, nombre, apellido, rol: 'user', aprobado: 0 };
    } else {
      console.log('Usuario ya existe');
    }

    const nombreToken = user.nombre || nombre || '';
    const apellidoToken = user.apellido || apellido || '';
    if (user.aprobado === 0) {
      return res.status(403).json({ code: 'ACCOUNT_NOT_APPROVED', message: 'Tu cuenta aún no ha sido aprobada por un administrador.' });
    }
    const token = jwt.sign({ id: user.id, email: user.email, name: (nombreToken + ' ' + apellidoToken).trim(), rol: user.rol || 'user', aprobado: user.aprobado }, process.env.JWT_SECRET || 'kairos_secret', { expiresIn: '7d' });

    // Opcional: setear cookie de sesión basada en JWT para facilitar credenciales cross-site
    res.cookie && res.cookie('kairos_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 1000 * 60 * 60 * 24 * 7
    });

  return res.json({ token, user: { id: user.id, email: user.email, nombre: nombreToken, apellido: apellidoToken, rol: user.rol || 'user', aprobado: user.aprobado } });
  } catch (e) {
    console.log('Error al verificar token de Google:', e && (e.stack || e.message || e));
    return res.status(401).json({ message: 'Token de Google inválido', details: String(e && (e.message || e)) });
  }
};
