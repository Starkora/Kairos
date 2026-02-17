// --- Recuperación de contraseña ---
const codigosRecuperacion = {};

exports.enviarCodigoRecuperacion = async (req, res) => {
  const { metodo, correo, numero } = req.body;
  if (!metodo || (metodo === 'correo' && !correo) || (metodo === 'telefono' && !numero)) {
    return res.status(400).json({ error: 'Faltan datos para recuperación' });
  }
  try {
    let user = null;
    if (metodo === 'correo') {
      const users = await Usuario.findByEmail(correo.trim().toLowerCase());
      if (!users || users.length === 0) return res.status(400).json({ error: 'Correo no encontrado' });
      user = users[0];
    } else {
      const users = await Usuario.findByNumero(numero.trim());
      if (!users || users.length === 0) return res.status(400).json({ error: 'Número no encontrado' });
      user = users[0];
    }
    await enviarCodigo(user.email, user.numero, metodo, res);
  } catch (err) {
    return res.status(500).json({ error: 'Error al procesar la recuperación' });
  }
};

async function enviarCodigo(email, numero, metodo, res) {
  const codigo = Math.floor(100000 + Math.random() * 900000).toString();
  const key = metodo === 'correo' ? email : numero;
  codigosRecuperacion[key] = { codigo, email, numero, metodo, expires: Date.now() + 15 * 60 * 1000 };
  try {
    if (metodo === 'correo') {
      await sendMail(email, 'Código de recuperación Kairos', `Tu código de recuperación es: ${codigo}`);
    } else {
      // Enviar código por WhatsApp usando el bot de MiBodega
      const { sendVerificationCode } = require('../../utils/whatsapp-notifier');
      const whatsappResult = await sendVerificationCode(numero, codigo, 'recuperacion');
      if (!whatsappResult.success) {
        throw new Error('No se pudo enviar el código por WhatsApp');
      }
    }
    res.json({ success: true });
  } catch (e) {
    delete codigosRecuperacion[key];
    res.status(500).json({ error: 'No se pudo enviar el código' });
  }
}

exports.confirmarRecuperacion = async (req, res) => {
  const { metodo, correo, numero, codigo, nuevaPassword } = req.body;
  if (!metodo || !codigo || !nuevaPassword || (metodo === 'correo' && !correo) || (metodo === 'telefono' && !numero)) {
    return res.status(400).json({ error: 'Faltan datos para recuperación' });
  }
  const key = metodo === 'correo' ? correo.trim().toLowerCase() : numero.trim();
  const entry = codigosRecuperacion[key];
  if (!entry) return res.status(400).json({ error: 'No se solicitó recuperación o el código expiró' });
  if (entry.expires < Date.now()) {
    delete codigosRecuperacion[key];
    return res.status(400).json({ error: 'El código ha expirado' });
  }
  if (codigo !== entry.codigo) return res.status(400).json({ error: 'Código incorrecto' });
  const hash = bcrypt.hashSync(nuevaPassword, 10);
  try {
    const users = await Usuario.findByEmail(entry.email);
    if (!users || users.length === 0) return res.status(400).json({ error: 'Usuario no encontrado' });
    await Usuario.updatePassword(entry.email, hash);
    delete codigosRecuperacion[key];
    res.json({ success: true });
  } catch (err) {
    delete codigosRecuperacion[key];
    return res.status(500).json({ error: 'No se pudo actualizar la contraseña' });
  }
};

const Usuario = require('../../models/usuario');
const UsuarioPendiente = require('../../models/usuarioPendiente');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendMail } = require('../../utils/notifications/mailer');
const { send } = require('../../utils/notifications/sms');
const JWT_SECRET = process.env.JWT_SECRET || 'kairos_secret';



exports.register = async (req, res) => {
  let { email, numero, password, nombre, confirmMethod, plataforma } = req.body;
  if (!email || !numero || !password || !nombre || !confirmMethod) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  }
  
  email = email.trim().toLowerCase();
  
  // Normalizar número de teléfono internacional
  let numeroNormalizado = (numero || '').trim();
  if (!numeroNormalizado.startsWith('+')) {
    return res.status(400).json({ error: 'El número debe incluir el código de país (ej: +51987654321)' });
  }
  
  // Validar que el número tenga entre 8 y 18 caracteres (+xxx...)
  if (numeroNormalizado.length < 8 || numeroNormalizado.length > 18) {
    return res.status(400).json({ error: 'Número de teléfono inválido' });
  }
  
  // Validar que después del + solo haya dígitos
  const soloDigitos = numeroNormalizado.slice(1).replace(/\D/g, '');
  if (soloDigitos.length < 7 || soloDigitos.length > 15) {
    return res.status(400).json({ error: 'El número debe tener entre 7 y 15 dígitos' });
  }
  
  try {
    const users = await Usuario.findByEmail(email);
    if (users && users.length > 0) return res.status(400).json({ error: 'El correo ya está registrado' });
    const users2 = await Usuario.findByNumero(numeroNormalizado);
    if (users2 && users2.length > 0) return res.status(400).json({ error: 'El número ya está registrado' });
    const pendientes = await UsuarioPendiente.findByEmail(email);
    if (pendientes && pendientes.length > 0) return res.status(400).json({ error: 'Ya hay un registro pendiente para este correo' });
    const hash = bcrypt.hashSync(password, 10);
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 15 * 60 * 1000;
    await UsuarioPendiente.create({
      email,
      numero: numeroNormalizado,
      nombre,
      password: hash,
      codigo,
      metodo: confirmMethod,
      expires,
      plataforma: plataforma || 'web'
    });
      if (confirmMethod === 'correo') {
        const sendRes = await sendMail(email, 'Código de confirmación Kairos', `Tu código de confirmación es: ${codigo}`);
      } else {
        // Enviar código por WhatsApp usando el bot de MiBodega
        const { sendVerificationCode } = require('../../utils/whatsapp-notifier');
        const whatsappResult = await sendVerificationCode(numero, codigo, 'registro');
        if (!whatsappResult.success) {
          throw new Error('No se pudo enviar el código por WhatsApp');
        }
      }
      res.status(201).json({ email, numero, verificado: 0, mensaje: 'Código enviado. Falta confirmar.' });
    } catch (e) {
      
      UsuarioPendiente.deleteByEmail(email, () => {});
      return res.status(500).json({ error: 'No se pudo enviar el código de confirmación' });
    }
};

exports.verify = async (req, res) => {
  try {
    let { email, codigo } = req.body;
    if (!email || !codigo) {
      return res.status(400).json({ error: 'Email y código son requeridos' });
    }
    email = email.trim().toLowerCase();
    const pendientes = await UsuarioPendiente.findByEmail(email);
    if (!pendientes || pendientes.length === 0) {
      return res.status(400).json({ error: 'No se encontró usuario pendiente para este correo' });
    }
    const entry = pendientes[0];
    if (entry.expires < Date.now()) {
      await UsuarioPendiente.deleteByEmail(email);
      return res.status(400).json({ error: 'El código ha expirado' });
    }
    if (codigo !== entry.codigo) return res.status(400).json({ error: 'Código incorrecto' });
    
    // REGISTRO LIBRE: Usuario aprobado automáticamente con 30 días de prueba
    const result = await Usuario.create({
      email: entry.email,
      numero: entry.numero,
      password: entry.password,
      verificado: 1,
      aprobado: 1, // ✓ Acceso inmediato sin aprobación del admin
      nombre: entry.nombre || '',
      apellido: entry.apellido || '',
      plataforma: entry.plataforma || req.body.plataforma || 'web'
    });
    
    await UsuarioPendiente.deleteByEmail(email);
    
    // Notificar al admin por WhatsApp sobre el nuevo usuario
    const { notifyAdminNewUser } = require('../../utils/whatsapp-notifier');
    notifyAdminNewUser({
      nombre: entry.nombre,
      apellido: entry.apellido,
      email: entry.email,
      numero: entry.numero,
      plataforma: entry.plataforma || 'web'
    }).catch(err => {
      
      // No bloquear el registro si falla la notificación
    });
    
    res.json({ 
      success: true, 
      id: result.insertId || result.id, 
      email: entry.email,
      isNewUser: true // Flag para mostrar modal de bienvenida en frontend
    });
  } catch (err) {
    
    res.status(500).json({ error: 'Error al crear usuario' });
  }
};

exports.login = async (req, res) => {
  const { email, password, plataforma } = req.body;
  if (!email || !password || !plataforma) return res.status(400).json({ error: 'Campos requeridos (incluye plataforma)' });
  try {
    const users = await Usuario.findByEmailAndPlataforma(email, plataforma);
    if (!users || users.length === 0) return res.status(400).json({ error: 'Usuario no encontrado para esta plataforma' });
    const user = users[0];
    if (!user.verificado) return res.status(403).json({ error: 'Usuario no verificado' });
    if (!bcrypt.compareSync(password, user.password)) return res.status(400).json({ error: 'Contraseña incorrecta' });
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, id: user.id, email: user.email, numero: user.numero });
  } catch (err) {
    res.status(500).json({ error: 'Error en login' });
  }
};

exports.getProfile = (req, res) => {
  const user = req.user;
  res.json({ id: user.id, email: user.email });
};
