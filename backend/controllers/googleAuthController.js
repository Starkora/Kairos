const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const db = require('../db');

const GOOGLE_CLIENT_ID = '351324441687-39sdmfov119bqa28d703aqodo181jpih.apps.googleusercontent.com'; // Reemplaza por tu clientId real
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// POST /api/usuarios/google
exports.loginGoogle = async (req, res) => {
  console.log('POST /api/usuarios/google llamado');
  if (!req.body) {
    console.log('No body recibido');
    return res.status(400).json({ message: 'Cuerpo de la solicitud requerido' });
  }
  const { credential } = req.body;
  console.log('Credential recibida:', credential ? (credential.substring(0, 12) + '...') : credential);
  if (!credential) {
    console.log('No se recibió token de Google');
    return res.status(400).json({ message: 'Token de Google requerido' });
  }

  try {
    const ticket = await client.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    console.log('Payload de Google:', { email: payload.email, sub: payload.sub });
    const email = payload.email;
    const nombre = payload.given_name || '';
    const apellido = payload.family_name || '';
    const googleId = payload.sub;

    let users = await require('../models/usuario').findByEmail(email);
    let user = users[0];
    if (!user) {
      console.log('Usuario no existe, creando usuario nuevo');
      const result = await require('../models/usuario').create({
        email,
        numero: googleId,
        password: '',
        verificado: 1,
        nombre,
        apellido
      });
      user = { id: result.insertId, email, numero: googleId, verificado: 1, nombre, apellido };
    } else {
      console.log('Usuario ya existe');
    }

    const nombreToken = user.nombre || nombre || '';
    const apellidoToken = user.apellido || apellido || '';
    const token = jwt.sign({ id: user.id, email: user.email, name: (nombreToken + ' ' + apellidoToken).trim() }, process.env.JWT_SECRET || 'kairos_secret', { expiresIn: '7d' });

    // Opcional: setear cookie de sesión basada en JWT para facilitar credenciales cross-site
    res.cookie && res.cookie('kairos_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 1000 * 60 * 60 * 24 * 7
    });

    return res.json({ token });
  } catch (e) {
    console.log('Error al verificar token de Google:', e);
    return res.status(401).json({ message: 'Token de Google inválido' });
  }
};
