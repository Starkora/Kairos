const db = require('../../../config/database'); // Importar el módulo de base de datos
const crypto = require('crypto');
const mailer = require('../../utils/notifications/mailer');
const sms = require('../../utils/notifications/sms');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'kairos_secret';
const UsuarioPendiente = require('../../models/usuarioPendiente');

// Método para obtener información del usuario
const getUserInfo = async (req, res) => {
  try {
    const usuarioId = req.user.id; // Obtener el ID del usuario autenticado
    const [rows] = await db.query('SELECT email, numero AS telefono, nombre, apellido, rol, aprobado FROM usuarios WHERE id = ?', [usuarioId]);

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error al obtener información del usuario:', error);
    res.status(500).json({ error: 'Error al obtener información del usuario' });
  }
};

// Método para enviar código de verificación
const enviarCodigoVerificacion = async (req, res) => {
  try {
    const usuarioId = req.user.id; // Obtener el ID del usuario autenticado
    const { metodo = 'correo' } = req.body || {}; // 'correo' | 'telefono'
    const resultado = await db.query('SELECT email, nombre, apellido, numero AS telefono FROM usuarios WHERE id = ?', [usuarioId]);

    if (!resultado || resultado.length === 0 || resultado[0].length === 0) {
      console.error('Usuario no encontrado en la base de datos:', resultado);
      return res.status(404).json({ error: 'Usuario no encontrado en la base de datos' });
    }

    const usuario = resultado[0][0]; // Acceder al primer objeto del arreglo anidado

    const email = (usuario.email || '').trim();
    const telefono = String(usuario.telefono || '').trim();
    
    if (metodo === 'telefono') {
      // Validar número internacional (debe empezar con + y tener entre 8-18 caracteres)
      if (!telefono.startsWith('+') || telefono.length < 8 || telefono.length > 18) {
        console.error('Teléfono del usuario no válido:', usuario);
        return res.status(400).json({ error: 'Teléfono del usuario inválido o no configurado' });
      }
    } else {
      if (!email) {
        console.error('Correo del usuario no encontrado o inválido:', usuario);
        return res.status(404).json({ error: 'Correo del usuario no encontrado o inválido' });
      }
    }

    const codigo = crypto.randomInt(100000, 999999).toString();
    req.session.codigoVerificacion = codigo;
    // Guardar la sesión explícitamente para garantizar persistencia
    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          console.error('Error al guardar la sesión con el código:', err);
          return reject(err);
        }
        resolve();
      });
    });

    // Enviar el código por el medio seleccionado
    if (metodo === 'telefono') {
      try {
        // Enviar código por WhatsApp usando el bot de MiBodega
        const { sendVerificationCode } = require('../../utils/whatsapp-notifier');
        const whatsappResult = await sendVerificationCode(telefono, codigo, 'registro');
        if (!whatsappResult.success) {
          throw new Error('No se pudo enviar el código por WhatsApp');
        }
      } catch (e) {
        console.error('Error al enviar código por WhatsApp:', e);
        return res.status(500).json({ error: 'No se pudo enviar el código por WhatsApp' });
      }
    } else {
      await mailer.sendMail({
        to: email,
        subject: 'Código de verificación',
        text: `Tu código de verificación es: ${codigo}`
      });
    }

    res.status(200).json({ message: `Código enviado exitosamente por ${metodo === 'telefono' ? 'WhatsApp' : 'correo'}.` });
  } catch (error) {
    console.error('Error al enviar código de verificación:', error);
    res.status(500).json({ error: 'Error al enviar código de verificación' });
  }
};

// Método para verificar el código y guardar cambios
const verificarCodigoYGuardar = async (req, res) => {
  try {
  const { codigo, userInfo } = req.body;

    if (!req.session || !req.session.codigoVerificacion) {
      return res.status(400).json({ error: 'No hay código de verificación en la sesión' });
    }
    if (req.session.codigoVerificacion !== codigo) {
      return res.status(400).json({ error: 'Código de verificación incorrecto' });
    }

    // Validaciones de unicidad antes de actualizar
    const userId = req.user.id;
    const email = (userInfo.email || '').trim();
    const numero = (userInfo.telefono || '').trim();

    // Obtener valores actuales del usuario para comparar y evitar falsos positivos
    const [currentRows] = await db.query('SELECT email, numero FROM usuarios WHERE id = ?', [userId]);
    const current = Array.isArray(currentRows) && currentRows[0] ? currentRows[0] : null;
    const currentEmail = current ? String(current.email || '').trim() : '';
    const currentNumero = current ? String(current.numero || '').trim() : '';

    // Si el email enviado es distinto del actual, verificar unicidad; si es igual, omitir la comprobación
    if (email && email !== currentEmail) {
      const [emailRows] = await db.query('SELECT id FROM usuarios WHERE email = ? AND id <> ?', [email, userId]);
      if (Array.isArray(emailRows) && emailRows.length > 0) {
        return res.status(409).json({ error: 'El correo ya está en uso por otro usuario.' });
      }
    }

    // Lo mismo para el número: sólo verificar si cambió
    if (numero && numero !== currentNumero) {
      const [numeroRows] = await db.query('SELECT id FROM usuarios WHERE numero = ? AND id <> ?', [numero, userId]);
      if (Array.isArray(numeroRows) && numeroRows.length > 0) {
        return res.status(409).json({ error: 'El número de teléfono ya está en uso por otro usuario.' });
      }
    }

    // Guardar los cambios en la base de datos
    await db.query(
      'UPDATE usuarios SET email = ?, numero = ?, nombre = ?, apellido = ? WHERE id = ?',
      [email, numero, (userInfo.nombre || '').trim(), (userInfo.apellido || '').trim(), userId]
    );

    // Limpiar el código de la sesión tras uso y guardar cambios
    delete req.session.codigoVerificacion;
    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          console.error('Error al limpiar el código de la sesión:', err);
          // No bloquea la respuesta si falla la limpieza
        }
        resolve();
      });
    });
    res.status(200).json({ message: 'Datos actualizados correctamente' });
  } catch (error) {
    console.error('Error al guardar cambios:', error);
    if (error && error.code === 'ER_DUP_ENTRY') {
      const msg = (error.sqlMessage || '').toLowerCase();
      if (msg.includes('email')) {
        return res.status(409).json({ error: 'El correo ya está en uso por otro usuario.' });
      }
      if (msg.includes('numero')) {
        return res.status(409).json({ error: 'El número de teléfono ya está en uso por otro usuario.' });
      }
      return res.status(409).json({ error: 'Valores duplicados para un campo único.' });
    }
    res.status(500).json({ error: 'Error al guardar cambios' });
  }
};

// Método para registrar un nuevo usuario (envía código de confirmación)
const register = async (req, res) => {
  try {
  const { email, password, nombre, apellido, telefono, numero, plataforma, confirmMethod = 'correo' } = req.body || {};
  const plat = (plataforma || 'web').toLowerCase();

    // Validar datos requeridos
    const emailTrimmed = (email || '').trim();
    const nombreTrimmed = (nombre || '').trim();
    const apellidoTrimmed = (apellido || '').trim();
    // Validar nombre y apellido: solo letras (incluye acentos y ñ) y espacios
  const nameRegex = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ '\- ]+$/;
    if (!nombreTrimmed || !nameRegex.test(nombreTrimmed)) {
      return res.status(400).json({ code: 'INVALID_NAME', message: 'El nombre solo puede contener letras y espacios' });
    }
    if (nombreTrimmed.length > 50) {
      return res.status(400).json({ code: 'INVALID_NAME_LENGTH', message: 'El nombre no puede exceder 50 caracteres' });
    }
    if (apellidoTrimmed && !nameRegex.test(apellidoTrimmed)) {
      return res.status(400).json({ code: 'INVALID_SURNAME', message: 'El apellido solo puede contener letras y espacios' });
    }
    if (apellidoTrimmed && apellidoTrimmed.length > 50) {
      return res.status(400).json({ code: 'INVALID_SURNAME_LENGTH', message: 'El apellido no puede exceder 50 caracteres' });
    }
  const phoneInput = (numero || telefono || '').trim();

    if (!emailTrimmed || !password || !nombreTrimmed || !phoneInput) {
      return res.status(400).json({ message: 'Faltan campos requeridos (email, password, nombre, telefono/numero)' });
    }
    
    // Validar teléfono internacional: debe empezar con + y tener entre 8-18 caracteres totales
    if (!phoneInput.startsWith('+')) {
      return res.status(400).json({ code: 'INVALID_PHONE_FORMAT', message: 'El teléfono debe incluir el código de país (ej: +51 999888777)' });
    }
    
    // Extraer solo dígitos después del +
    const telefonoDigits = phoneInput.slice(1).replace(/\D/g, '');
    
    // Validar que tenga entre 7 y 15 dígitos (estándar internacional)
    if (telefonoDigits.length < 7 || telefonoDigits.length > 15) {
      return res.status(400).json({ code: 'INVALID_PHONE_LENGTH', message: 'El teléfono debe tener entre 7 y 15 dígitos después del código de país' });
    }
    
    // Guardar con el formato completo: +codigopais+numero
    const telefonoNormalizado = '+' + telefonoDigits;

    // Verificar si el usuario ya existe (mensajes diferenciados)
    const [emailRows] = await db.query('SELECT id FROM usuarios WHERE email = ? AND plataforma = ?', [emailTrimmed, plat]);
    const [phoneRows] = await db.query('SELECT id FROM usuarios WHERE numero = ? AND plataforma = ?', [telefonoNormalizado, plat]);
    if (Array.isArray(emailRows) && emailRows.length > 0 && Array.isArray(phoneRows) && phoneRows.length > 0) {
      return res.status(409).json({ code: 'EMAIL_AND_PHONE_IN_USE', message: 'El correo y el número de teléfono ya están en uso' });
    }
    if (Array.isArray(emailRows) && emailRows.length > 0) {
      return res.status(409).json({ code: 'EMAIL_IN_USE', message: 'El correo ya está en uso' });
    }
    if (Array.isArray(phoneRows) && phoneRows.length > 0) {
      return res.status(409).json({ code: 'PHONE_IN_USE', message: 'El número de teléfono ya está en uso' });
    }

    // Generar código y expiración parametrizable por método
  const codigo = crypto.randomInt(100000, 999999).toString();
  const smsMins = Number(process.env.PENDING_EXPIRES_MINUTES_SMS || 5);
  const mailMins = Number(process.env.PENDING_EXPIRES_MINUTES_EMAIL || 15);
  const mins = (confirmMethod === 'telefono') ? smsMins : mailMins;
  const expires = Date.now() + mins * 60 * 1000; // BIGINT (ms)

    // Validación de contraseña fuerte (mín. 8, un número y un símbolo)
    const pwd = String(password || '');
    const hasMin = pwd.length >= 8;
    const hasNum = /[0-9]/.test(pwd);
    const hasSym = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwd);
    if (!hasMin || !hasNum || !hasSym) {
      return res.status(400).json({ code: 'WEAK_PASSWORD', message: 'La contraseña debe tener al menos 8 caracteres, un número y un símbolo.' });
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Limpiar pendientes previos del mismo email para evitar múltiples entradas
  try { await UsuarioPendiente.deleteByEmail(emailTrimmed, plat); } catch (_) {}

    // Hash del código (evitar guardar OTP en claro)
    const codigoHash = await bcrypt.hash(codigo, 10);

    await UsuarioPendiente.create({
      email: emailTrimmed,
      numero: telefonoNormalizado,
      nombre: nombreTrimmed,
      apellido: apellidoTrimmed,
      password: hashedPassword,
      codigo: codigoHash,
      metodo: confirmMethod === 'telefono' ? 'sms' : 'correo',
      expires,
      plataforma: plat
    });

    // Enviar código por el método elegido
    if (confirmMethod === 'telefono') {
      // Usar WhatsApp notifier en lugar de SMS
      const { sendVerificationCode } = require('../../utils/whatsapp-notifier');
      await sendVerificationCode(telefonoNormalizado, codigo, 'registro');
    } else {
      await mailer.sendMail({
        to: emailTrimmed,
        subject: 'Kairos - Código de verificación',
        text: `Tu código de verificación es: ${codigo}`
      });
    }

    return res.status(200).json({ success: true, message: 'Código enviado. Revisa tu ' + (confirmMethod === 'telefono' ? 'teléfono' : 'correo') + '.', email: emailTrimmed });
  } catch (error) {
    console.error('Error en el registro de usuario:', error);
    res.status(500).json({ message: 'Error interno en el registro de usuario' });
  }
};

// Verificar código de registro y crear usuario definitivo
const verify = async (req, res) => {
  try {
    const { email, codigo, plataforma } = req.body || {};
    const plat = (plataforma || 'web').toLowerCase();
    if (!email || !codigo) {
      return res.status(400).json({ message: 'Email y código son requeridos' });
    }

    const pendings = await UsuarioPendiente.findByEmailForVerify((email || '').trim());
    if (!Array.isArray(pendings) || pendings.length === 0) {
      return res.status(404).json({ code: 'NO_PENDING', message: 'No hay registro pendiente para este correo' });
    }
    // Preferir el pendiente de la plataforma indicada
    let p = pendings.find((row) => String((row.plataforma || 'web')).toLowerCase() === plat) || pendings[0];
    const provided = String(codigo).trim();
    const seemsHashed = typeof p.codigo === 'string' && /^\$2[aby]?\$\d{2}\$/.test(p.codigo);
    let match = false;
    if (seemsHashed) {
      try { match = await bcrypt.compare(provided, p.codigo || ''); } catch (_) { match = false; }
    } else {
      match = String(p.codigo || '').trim() === provided;
    }
    if (!match) {
      return res.status(400).json({ code: 'INVALID_CODE', message: 'Código incorrecto' });
    }
    if (p.expires && Number(p.expires) < Date.now()) {
  await UsuarioPendiente.deleteByEmail(p.email, p.plataforma || 'web');
      return res.status(400).json({ code: 'CODE_EXPIRED', message: 'El código ha expirado, vuelve a registrarte' });
    }

    // Insertar en usuarios definitivo con acceso inmediato (aprobado = 1)
    const [ins] = await db.query(
      'INSERT INTO usuarios (email, password, nombre, apellido, numero, verificado, plataforma, rol, aprobado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [p.email, p.password, p.nombre || '', p.apellido || '', p.numero || '', 1, (p.plataforma || 'web'), 'user', 1]
    );
    
    // Notificar al administrador sobre el nuevo usuario
    try {
      const { notifyAdminNewUser } = require('../../utils/whatsapp-notifier');
      await notifyAdminNewUser(p.nombre, p.email, p.numero);
    } catch (notifyError) {
      console.log('No se pudo notificar al admin:', notifyError.message);
    }

    await UsuarioPendiente.deleteByEmail(p.email);
    return res.status(200).json({ success: true, isNewUser: true, id: ins && ins.insertId, message: 'Registro confirmado' });
  } catch (err) {
    console.error('Error en verify:', err);
    return res.status(500).json({ message: 'Error interno en verificación' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password, plataforma = 'web' } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Email y contraseña son requeridos' });
    }

    // Buscar usuario por email y plataforma (si existe), de lo contrario por email
    const [rowsByPlat] = await db.query('SELECT * FROM usuarios WHERE email = ? AND plataforma = ?', [email, plataforma]);
    const user = (Array.isArray(rowsByPlat) && rowsByPlat[0]) ? rowsByPlat[0] : (await db.query('SELECT * FROM usuarios WHERE email = ?', [email]))[0][0];

    if (!user) {
      return res.status(401).json({ code: 'EMAIL_NOT_FOUND', message: 'Correo no registrado' });
    }

    // Verificación de contraseña: soporta bcrypt y texto plano (fallback)
    const stored = user.password || '';
    const seemsHashed = /^\$2[aby]?\$\d{2}\$/.test(stored);
    let validPassword = false;
    if (seemsHashed) {
      try {
        validPassword = await bcrypt.compare(password, stored);
      } catch (_) {
        validPassword = false;
      }
    } else {
      // Fallback inseguro, pero útil si la DB tiene contraseñas en texto plano en un entorno dev
      validPassword = stored === password;
    }

    if (!validPassword) {
      return res.status(401).json({ code: 'INVALID_PASSWORD', message: 'Contraseña incorrecta' });
    }

    // Si manejas verificación de cuenta
    if (user.verificado !== undefined && user.verificado === 0) {
      return res.status(403).json({ code: 'ACCOUNT_UNVERIFIED', message: 'Cuenta no verificada. Revisa tu correo para confirmar el registro.' });
    }

    // Bloquear acceso si requiere aprobación y aún no está aprobado
    if (user.aprobado === 0) {
      return res.status(403).json({ code: 'ACCOUNT_NOT_APPROVED', message: 'Tu cuenta aún no ha sido aprobada por un administrador.' });
    }

    const nombreToken = (user.nombre || '').trim();
    const apellidoToken = (user.apellido || '').trim();
    const payload = {
      id: user.id,
      email: user.email,
      name: (nombreToken + ' ' + apellidoToken).trim(),
      rol: user.rol || 'user',
      aprobado: user.aprobado !== undefined ? user.aprobado : 1,
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      success: true,
      token,
      id: user.id,
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        apellido: user.apellido,
        rol: user.rol || 'user',
        aprobado: user.aprobado !== undefined ? user.aprobado : 1,
      },
    });
  } catch (err) {
    console.error('Error en login:', err);
    return res.status(500).json({ message: 'Error interno en login' });
  }
};

const getProfile = (req, res) => {
  res.status(501).json({ message: 'Función getProfile no implementada' });
};

// Iniciar recuperación de contraseña (no requiere auth). Usa sesión para guardar el código temporalmente.
const enviarCodigoRecuperacion = async (req, res) => {
  try {
    const { metodo = 'correo', correo, numero } = req.body || {};
    const method = (metodo || 'correo').toLowerCase();
    let userRow = null;

    if (method === 'telefono') {
      const telDigits = String(numero || '').replace(/\D/g, '');
      if (!telDigits || telDigits.length !== 9) {
        return res.status(400).json({ code: 'INVALID_PHONE', error: 'Teléfono inválido. Debe tener 9 dígitos.' });
      }
      const [rows] = await db.query('SELECT id, email, numero FROM usuarios WHERE numero = ?', [telDigits]);
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(404).json({ code: 'USER_NOT_FOUND', error: 'No existe un usuario con ese teléfono.' });
      }
      userRow = rows[0];
    } else {
      const email = String(correo || '').trim();
      if (!email) {
        return res.status(400).json({ code: 'INVALID_EMAIL', error: 'Correo requerido.' });
      }
      const [rows] = await db.query('SELECT id, email, numero FROM usuarios WHERE email = ?', [email]);
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(404).json({ code: 'USER_NOT_FOUND', error: 'No existe un usuario con ese correo.' });
      }
      userRow = rows[0];
    }

    // Generar código y configurar expiración
    const code = crypto.randomInt(100000, 999999).toString();
    const smsMins = Number(process.env.RECOVERY_EXPIRES_MINUTES_SMS || 5);
    const mailMins = Number(process.env.RECOVERY_EXPIRES_MINUTES_EMAIL || 15);
    const mins = method === 'telefono' ? smsMins : mailMins;
    const expires = Date.now() + mins * 60 * 1000;

    // Guardar en sesión
    req.session.pwdRecovery = {
      email: userRow.email,
      numero: userRow.numero,
      metodo: method,
      code,
      expires,
    };
    await new Promise((resolve, reject) => {
      req.session.save((err) => (err ? reject(err) : resolve()));
    });

    // Enviar por el canal seleccionado
    if (method === 'telefono') {
  await sms.send(userRow.numero, `Tu código para recuperar contraseña de Kairos es: ${code}`);
    } else {
      await mailer.sendMail({
        to: userRow.email,
        subject: 'Kairos - Recuperación de contraseña',
        text: `Tu código de recuperación es: ${code}`,
      });
    }

    return res.status(200).json({ success: true, message: 'Código enviado' });
  } catch (err) {
    console.error('Error en enviarCodigoRecuperacion:', err);
    return res.status(500).json({ error: 'Error al iniciar la recuperación' });
  }
};

// Confirmar código y actualizar contraseña (no requiere auth). Usa la sesión para validar OTP.
const confirmarRecuperacion = async (req, res) => {
  try {
    const { metodo = 'correo', correo, numero, codigo, nuevaPassword } = req.body || {};
    const method = (metodo || 'correo').toLowerCase();

    if (!req.session || !req.session.pwdRecovery) {
      return res.status(400).json({ code: 'NO_RECOVERY_SESSION', error: 'No hay una solicitud de recuperación activa.' });
    }

    const rec = req.session.pwdRecovery;
    if (!rec || !rec.code || !rec.expires) {
      return res.status(400).json({ code: 'INVALID_STATE', error: 'Estado de recuperación inválido.' });
    }
    if (Date.now() > Number(rec.expires)) {
      delete req.session.pwdRecovery;
      try { await new Promise((resolve) => req.session.save(() => resolve())); } catch (_) {}
      return res.status(400).json({ code: 'CODE_EXPIRED', error: 'El código ha expirado.' });
    }
    if (rec.metodo !== method) {
      return res.status(400).json({ code: 'METHOD_MISMATCH', error: 'El método no coincide con la solicitud.' });
    }
    // Validar contacto coincide para evitar uso cruzado
    if (method === 'telefono') {
      const telDigits = String(numero || '').replace(/\D/g, '');
      if (!telDigits || telDigits.length !== 9 || telDigits !== String(rec.numero || '')) {
        return res.status(400).json({ code: 'CONTACT_MISMATCH', error: 'El teléfono no coincide.' });
      }
    } else {
      const email = String(correo || '').trim();
      if (!email || email.toLowerCase() !== String(rec.email || '').toLowerCase()) {
        return res.status(400).json({ code: 'CONTACT_MISMATCH', error: 'El correo no coincide.' });
      }
    }

    // Validar código
    if (!codigo || String(codigo).trim() !== String(rec.code).trim()) {
      return res.status(400).json({ code: 'INVALID_CODE', error: 'Código incorrecto.' });
    }

    // Validación de contraseña fuerte
    const pwd = String(nuevaPassword || '');
    const hasMin = pwd.length >= 8;
    const hasNum = /[0-9]/.test(pwd);
    const hasSym = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?]/.test(pwd);
    if (!hasMin || !hasNum || !hasSym) {
      return res.status(400).json({ code: 'WEAK_PASSWORD', error: 'La contraseña debe tener al menos 8 caracteres, un número y un símbolo.' });
    }

    // Actualizar contraseña del usuario (por email de la sesión)
    const newHash = await bcrypt.hash(pwd, 10);
    const [result] = await db.query('UPDATE usuarios SET password = ? WHERE email = ?', [newHash, rec.email]);
    if (!result || result.affectedRows === 0) {
      return res.status(404).json({ code: 'USER_NOT_FOUND', error: 'Usuario no encontrado.' });
    }

    // Limpiar estado de recuperación
    delete req.session.pwdRecovery;
    try { await new Promise((resolve) => req.session.save(() => resolve())); } catch (_) {}

    return res.status(200).json({ success: true, message: 'Contraseña actualizada' });
  } catch (err) {
    console.error('Error en confirmarRecuperacion:', err);
    return res.status(500).json({ error: 'Error al confirmar la recuperación' });
  }
};

// Reenviar código de registro con cooldown incremental de 2 minutos
const resend = async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ message: 'Email requerido' });

    const pendings = await UsuarioPendiente.findByEmail((email || '').trim());
    if (!Array.isArray(pendings) || pendings.length === 0) {
      return res.status(404).json({ code: 'NO_PENDING', message: 'No hay registro pendiente para este correo' });
    }
    const p = pendings[0];
    const now = Date.now();
    if (p.next_resend_at && Number(p.next_resend_at) > now) {
      const waitMs = Number(p.next_resend_at) - now;
      const waitSec = Math.ceil(waitMs / 1000);
      return res.status(429).json({ code: 'RESEND_COOLDOWN', message: `Espera ${waitSec} segundos para reenviar el código.` });
    }

    // Reenviar el mismo código si no ha expirado
    if (p.expires && Number(p.expires) < now) {
      return res.status(400).json({ code: 'CODE_EXPIRED', message: 'El código ha expirado, inicia el registro nuevamente.' });
    }

    // Reenviar requiere leer el código original; como no lo almacenamos en claro,
    // generamos un NUEVO código, actualizamos hash y enviamos el nuevo código.
    const newCode = crypto.randomInt(100000, 999999).toString();
    const newHash = await bcrypt.hash(newCode, 10);
    await db.query('UPDATE usuarios_pendientes SET codigo = ? WHERE email = ?', [newHash, p.email]);
    
    if (p.metodo === 'sms' || p.metodo === 'telefono') {
      // Enviar código por WhatsApp usando el bot de MiBodega
      const { sendVerificationCode } = require('../../utils/whatsapp-notifier');
      const whatsappResult = await sendVerificationCode(p.numero, newCode, 'registro');
      if (!whatsappResult.success) {
        throw new Error('No se pudo enviar el código por WhatsApp');
      }
    } else {
      await mailer.sendMail({ to: p.email, subject: 'Kairos - Código de verificación', text: `Tu código de verificación es: ${newCode}` });
    }

    // Incrementar cooldown en bloques de 2 minutos
    const nextCount = (p.resend_count || 0) + 1;
    const cooldownMs = 2 * 60 * 1000 * nextCount; // se acumula 2min, 4min, 6min, ...
    const nextAt = now + cooldownMs;
    await UsuarioPendiente.updateResendState(p.email, nextCount, nextAt);

    return res.status(200).json({ success: true, message: 'Código reenviado', nextAllowedAt: nextAt, resendCount: nextCount });
  } catch (err) {
    console.error('Error en resend:', err);
    return res.status(500).json({ message: 'Error interno en reenvío' });
  }
};

module.exports = {
  getUserInfo,
  enviarCodigoVerificacion,
  verificarCodigoYGuardar,
  register,
  verify,
  login,
  getProfile,
  enviarCodigoRecuperacion,
  confirmarRecuperacion,
  resend,
};

// Agregar al final del archivo para exportar función resend (y luego incluirla en module.exports si prefieres)