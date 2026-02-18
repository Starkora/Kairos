const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/auth/usuarios.controller');
const auth = require('../utils/auth/jwt');
const { rateLimit, rateLimitByKey } = require('../utils/security/rateLimiter');
const { captchaMiddleware } = require('../utils/security/captcha');

// Limites: 10 req/min por IP para login y register; 5/min para resend/verify
const rlLogin = rateLimit({ windowMs: 60_000, max: 10, message: 'Demasiados intentos de login. Intenta de nuevo en un minuto.' });
const rlLoginEmail = rateLimitByKey({ windowMs: 60_000, max: 6, keyName: 'email', message: 'Demasiados intentos para este correo. Espera un minuto.' });
const rlRegister = rateLimit({ windowMs: 60_000, max: 10, message: 'Demasiadas solicitudes de registro. Intenta luego.' });
const rlRegisterEmail = rateLimitByKey({ windowMs: 60_000, max: 6, keyName: 'email', message: 'Demasiados registros para este correo. Espera un minuto.' });
const rlResend = rateLimit({ windowMs: 60_000, max: 5, message: 'Demasiados reenvíos. Espera un poco.' });
const rlVerify = rateLimit({ windowMs: 60_000, max: 5, message: 'Demasiadas verificaciones. Intenta luego.' });
const rlRecovery = rateLimit({ windowMs: 60_000, max: 8, message: 'Demasiadas solicitudes. Intenta más tarde.' });
const rlRecoveryKey = rateLimitByKey({ windowMs: 60_000, max: 5, keyName: 'correo', message: 'Demasiadas solicitudes para este correo. Espera un minuto.' });
const rlRecoveryPhoneKey = rateLimitByKey({ windowMs: 60_000, max: 5, keyName: 'numero', message: 'Demasiadas solicitudes para este número. Espera un minuto.' });

router.post('/register', rlRegister, rlRegisterEmail, captchaMiddleware('CAPTCHA_ON_REGISTER'), usuariosController.register);
router.post('/verify', rlVerify, usuariosController.verify);
router.post('/resend', rlResend, usuariosController.resend);
router.post('/login', rlLogin, rlLoginEmail, captchaMiddleware('CAPTCHA_ON_LOGIN'), usuariosController.login);
router.get('/profile', auth, usuariosController.getProfile);
router.put('/perfil', auth, usuariosController.updateProfile); // Actualizar perfil
router.get('/me', auth, usuariosController.getUserInfo); // Alias para getUserInfo
router.get('/', auth, usuariosController.getUserInfo);

// Recuperación de contraseña
router.post('/recuperar', rlRecovery, rlRecoveryKey, rlRecoveryPhoneKey, usuariosController.enviarCodigoRecuperacion);
router.post('/recuperar/confirmar', rlRecovery, usuariosController.confirmarRecuperacion);

// Envío y verificación de código
router.post('/enviar-codigo', auth, usuariosController.enviarCodigoVerificacion);
router.post('/verificar-codigo', auth, usuariosController.verificarCodigoYGuardar);

module.exports = router;

