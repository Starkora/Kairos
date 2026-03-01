const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const db = require('../../../config/database');

// Permitir múltiples audiencias (client IDs) para validar idToken, separados por comas.
// Incluimos tanto el Web Client ID como el Android Client ID.
const RAW_GOOGLE_IDS = process.env.GOOGLE_CLIENT_IDS || process.env.GOOGLE_CLIENT_ID || '119093532026-ff270uadcukc0i8ljogusm4ucp218q3p.apps.googleusercontent.com,119093532026-3nkfftq76h8nfpcslehfu4vasojuv410.apps.googleusercontent.com';
const GOOGLE_AUDIENCES = String(RAW_GOOGLE_IDS).split(',').map(s => s.trim()).filter(Boolean);
console.log('[GoogleAuth] Audiencias permitidas:', GOOGLE_AUDIENCES);
if (!process.env.GOOGLE_CLIENT_ID && !process.env.GOOGLE_CLIENT_IDS) {
  console.warn('No se han configurado los Client IDs de Google. Configura la variable de entorno en producción.');
}
const client = new OAuth2Client(GOOGLE_AUDIENCES[0]);

// POST /api/usuarios/google
exports.loginGoogle = async (req, res) => {
  if (!req.body) {
    return res.status(400).json({ message: 'Cuerpo de la solicitud requerido' });
  }
  const { credential, plataforma } = req.body || {};
  const plat = String(plataforma || 'web').toLowerCase();
  if (!credential) {
    return res.status(400).json({ message: 'Token de Google requerido' });
  }

  try {
    // Decodificar payload del idToken para inspeccionar 'aud', 'iss', etc. (solo logs, sin validar)
    console.log('[GoogleAuth] Recibido token de plataforma:', plat);
    try {
      const parts = String(credential).split('.');
      if (parts.length === 3) {
        const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const json = Buffer.from(b64, 'base64').toString('utf8');
        const payloadPreview = JSON.parse(json);
        console.log('[GoogleAuth] Token audience (aud):', payloadPreview.aud);
        console.log('[GoogleAuth] Token email:', payloadPreview.email);
        if (payloadPreview && payloadPreview.aud && !GOOGLE_AUDIENCES.includes(payloadPreview.aud)) {
          console.warn(`[GoogleAuth] ⚠️ Token con audiencia NO permitida: ${payloadPreview.aud}`);
          console.warn(`[GoogleAuth] ⚠️ Audiencias permitidas:`, GOOGLE_AUDIENCES);
        }
      } else {
        console.warn('Token de Google con formato inválido');
      }
    } catch (decErr) {
      console.warn('Error al decodificar el token de Google:', decErr);
    }

    // Intentar validar contra cualquiera de las audiencias permitidas
    let payload = null;
    let lastErr = null;
    for (const aud of GOOGLE_AUDIENCES) {
      try {
        console.log('[GoogleAuth] Intentando validar con audiencia:', aud);
        const ticket = await client.verifyIdToken({ idToken: credential, audience: aud });
        payload = ticket.getPayload();
        console.log('[GoogleAuth] ✅ Token validado exitosamente con audiencia:', aud);
        break;
      } catch (e) {
        console.log('[GoogleAuth] ❌ Error validando con audiencia', aud, ':', e.message);
        lastErr = e;
      }
    }
    if (!payload) {
      console.error('[GoogleAuth] ❌ No se pudo validar el token con ninguna audiencia');
      throw lastErr || new Error('Wrong recipient, payload audience not allowed');
    }
    const email = payload.email;
    const nombre = payload.given_name || '';
    const apellido = payload.family_name || '';
    const googleId = payload.sub;

    // Estrategia de unificación de datos:
    // 1. Buscar usuario por email + plataforma (datos separados)
    // 2. Si no existe, buscar solo por email (unificar con otras plataformas)
    let users = await require('../../models/usuario').findByEmailAndPlataforma(email, plat);
    let user = users[0];
    
    // Si no existe en esta plataforma, buscar en todas (unificación automática)
    if (!user) {
      const allUsers = await require('../../models/usuario').findByEmail(email);
      if (allUsers && allUsers.length > 0) {
        console.log(`[GoogleAuth] Usuario encontrado en otra plataforma, unificando datos para: ${email}`);
        user = allUsers[0]; // Usar el usuario existente de cualquier plataforma
      }
    }
    
    if (!user) {
      const result = await require('../../models/usuario').create({
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
    return res.status(401).json({ message: 'Token de Google inválido', details: String(e && (e.message || e)) });
  }
};
