import React, { useState } from 'react';
import { getToken } from '../utils/auth';
import { showAlert } from '../utils/sweetalert';
import API_BASE from '../utils/apiBase';
import {
  FormCard,
  FormInput,
  FormButton,
  FormGrid,
  StatsCard,
  StatsGrid,
  Modal,
  Badge
} from './ui';
import { FaUser, FaEnvelope, FaPhone, FaEdit, FaCheck, FaTimes, FaShieldAlt, FaClock } from 'react-icons/fa';

export default function MiCuenta() {
  const [userInfo, setUserInfo] = useState({
    email: '',
    telefono: '',
    nombre: '',
    apellido: ''
  });
  const [originalUserInfo, setOriginalUserInfo] = useState({
    email: '',
    telefono: '',
    nombre: '',
    apellido: ''
  });
  // Control de edición individual para datos principales y grupal para perfil
  const [editableInputs, setEditableInputs] = useState({ email: false, telefono: false });
  const [perfilEditMode, setPerfilEditMode] = useState(false);
  const [codigoVerificacion, setCodigoVerificacion] = useState(''); // Estado para el código de verificación
  const [mostrarPopup, setMostrarPopup] = useState(false); // Estado para mostrar el popup 

  React.useEffect(() => {
    const token = getToken();
    console.log('Token enviado al backend:', token); // Log para depuración

    fetch(`${API_BASE}/api/usuarios`, {
      headers: {
        'Authorization': 'Bearer ' + token,
        'ngrok-skip-browser-warning': 'true'
      },
      credentials: 'include'
    })
      .then((res) => {
        console.log('Respuesta recibida del servidor:', res); // Log para depuración
        return res.json();
      })
      .then((data) => {
        console.log('Datos obtenidos del servidor:', data); // Log para depuración
        // El backend puede devolver: 1) un array de usuarios, 2) un objeto usuario, o
        // 3) una estructura anidada como [rows, ...]. Normalizamos esas formas.
        let usuario = null;
        if (Array.isArray(data) && data.length > 0) {
          // Caso común: array plano de usuarios
          usuario = data[0];
        } else if (data && typeof data === 'object' && !Array.isArray(data)) {
          // Caso donde el backend devuelve directamente un objeto usuario
          usuario = data;
        } else if (Array.isArray(data) && Array.isArray(data[0]) && data[0].length > 0) {
          // Caso de respuesta anidada: [rows, ...]
          usuario = data[0][0];
        }

        if (usuario) {
          setUserInfo({
            email: usuario.email || '',
            telefono: usuario.telefono || usuario.numero || '',
            nombre: usuario.nombre || '',
            apellido: usuario.apellido || ''
          });
          setOriginalUserInfo({
            email: usuario.email || '',
            telefono: usuario.telefono || usuario.numero || '',
            nombre: usuario.nombre || '',
            apellido: usuario.apellido || ''
          });
          console.log('Estado actualizado con los datos del usuario:', {
            email: usuario.email || '',
            telefono: usuario.telefono || usuario.numero || '',
            nombre: usuario.nombre || '',
            apellido: usuario.apellido || ''
          }); // Log para depuración
        }
      })
      .catch((err) => {
        console.error('Error al obtener información del usuario:', err); // Log para depuración
      });
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Validación para el campo de teléfono
    if (name === 'telefono') {
      const regex = /^[0-9]{0,9}$/; // Permitir hasta 9 dígitos
      if (!regex.test(value)) {
        showAlert({
          icon: 'error',
          title: 'Número inválido',
          text: 'El número de teléfono debe tener exactamente 9 dígitos y solo contener números.'
        });
        return;
      }
    }

    setUserInfo((prev) => ({ ...prev, [name]: value }));
  };

  const actualizarCuenta = () => {
    fetch(`${API_BASE}/api/usuarios`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + getToken(),
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify(userInfo)
    })
      .then((res) => {
        if (res.ok) {
          showAlert({
            icon: 'success',
            title: 'Cuenta actualizada',
            text: 'Tu información ha sido actualizada exitosamente.'
          });
        } else {
          showAlert({
            icon: 'error',
            title: 'Error',
            text: 'Hubo un problema al actualizar tu cuenta.'
          });
        }
      })
      .catch(() => {
        showAlert({
          icon: 'error',
          title: 'Error',
          text: 'Hubo un problema al actualizar tu cuenta.'
        });
      });
  };

  const toggleEditableInput = (inputName) => {
    setEditableInputs((prev) => ({ ...prev, [inputName]: !prev[inputName] }));
  };

  const enviarCodigo = () => {
    fetch(`${API_BASE}/api/usuarios/enviar-codigo`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + getToken(),
        'ngrok-skip-browser-warning': 'true'
      },
      credentials: 'include' // Incluir credenciales para mantener la sesión
    })
      .then((res) => {
        if (res.ok) {
          return res.json();
        } else {
          throw new Error('No se pudo enviar el código de verificación.');
        }
      })
      .then((data) => {
        showAlert({
          icon: 'success',
          title: 'Código enviado',
          text: data.message || 'Por favor revisa tu correo.'
        });
        setMostrarPopup(true);
      })
      .catch((err) => {
        showAlert({
          icon: 'error',
          title: 'Error',
          text: err.message || 'Hubo un problema al enviar el código de verificación.'
        });
      });
  };

  const verificarCodigo = () => {
    fetch(`${API_BASE}/api/usuarios/verificar-codigo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + getToken(),
        'ngrok-skip-browser-warning': 'true'
      },
      credentials: 'include',
      body: JSON.stringify({ codigo: codigoVerificacion, userInfo })
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.message) {
          showAlert({
            icon: 'success',
            title: 'Datos actualizados',
            text: 'Tus datos han sido actualizados correctamente.'
          });
          setMostrarPopup(false);
          setEditableInputs({ email: false, telefono: false }); // Bloquear todos los campos
          // Actualizar originales con los nuevos valores confirmados
          setOriginalUserInfo((prev) => ({ ...prev, ...userInfo }));
          window.location.reload(); // Recargar la página
        } else {
          showAlert({
            icon: 'error',
            title: 'Error',
            text: data.error || 'El código ingresado es incorrecto.'
          });
        }
      })
      .catch((err) => {
        console.error('Error al verificar código:', err);
      });
  };

  const handleEditClick = (field) => {
    if (field === 'perfil') {
      setPerfilEditMode(true);
      return;
    }
    const isActive = !!editableInputs[field];
    // Si estamos cancelando (estaba activo), restaurar valor original
    if (isActive) {
      setUserInfo((prev) => ({ ...prev, [field]: originalUserInfo[field] }));
    }
    toggleEditableInput(field);
  };

  const handleSaveClick = (field) => {
    if (field === 'email') {
      const e = (userInfo.email || '').trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!e) {
        showAlert({ icon: 'error', title: 'Email vacío', text: 'El email no puede estar vacío.' });
        return;
      }
      if (!emailRegex.test(e)) {
        showAlert({ icon: 'error', title: 'Email inválido', text: 'Ingresa un correo válido.' });
        return;
      }
    }
    if (field === 'telefono') {
      const t = (userInfo.telefono || '').trim();
      if (!t) {
        showAlert({ icon: 'error', title: 'Teléfono vacío', text: 'El teléfono no puede estar vacío.' });
        return;
      }
      if (t.length !== 9) {
      showAlert({
        icon: 'error',
        title: 'Número inválido',
        text: 'El número de teléfono debe tener exactamente 9 dígitos.'
      });
      return;
    }
    }
    if (field === 'perfil') {
      const nameRegex = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ '\- ]+$/;
      const n = (userInfo.nombre || '').trim();
      const a = (userInfo.apellido || '').trim();
      if (!n) {
        showAlert({ icon: 'error', title: 'Nombre vacío', text: 'El nombre no puede estar vacío.' });
        return;
      }
      if (!nameRegex.test(n)) {
        showAlert({ icon: 'error', title: 'Nombre inválido', text: 'El nombre solo puede contener letras y espacios.' });
        return;
      }
      if (n.length > 50) {
        showAlert({ icon: 'error', title: 'Nombre demasiado largo', text: 'Máximo 50 caracteres.' });
        return;
      }
      if (!a) {
        showAlert({ icon: 'error', title: 'Apellido vacío', text: 'El apellido no puede estar vacío.' });
        return;
      }
      if (!nameRegex.test(a)) {
        showAlert({ icon: 'error', title: 'Apellido inválido', text: 'El apellido solo puede contener letras y espacios.' });
        return;
      }
      if (a.length > 50) {
        showAlert({ icon: 'error', title: 'Apellido demasiado largo', text: 'Máximo 50 caracteres.' });
        return;
      }
    }
    enviarCodigo();
  };

  const handleVerificationSubmit = () => {
    // El backend espera { codigo, userInfo } en /verificar-codigo (ruta protegida)
    fetch(`${API_BASE}/api/usuarios/verificar-codigo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + getToken(),
        'ngrok-skip-browser-warning': 'true'
      },
      credentials: 'include',
      body: JSON.stringify({ codigo: codigoVerificacion, userInfo })
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (res.ok && (data.message || data.success)) {
          showAlert({
            icon: 'success',
            title: 'Datos actualizados',
            text: data.message || 'Tus datos han sido actualizados correctamente.'
          });
          setMostrarPopup(false);
          setEditableInputs({ email: false, telefono: false });
          setOriginalUserInfo((prev) => ({ ...prev, ...userInfo }));
          // Opcional: recargar para reflejar cambios en toda la app
          window.location.reload();
        } else {
          showAlert({
            icon: 'error',
            title: 'Error de verificación',
            text: (data && (data.error || data.message)) || 'El código ingresado es incorrecto.'
          });
        }
      })
      .catch((err) => {
        console.error('Error al verificar el código:', err);
        showAlert({
          icon: 'error',
          title: 'Error',
          text: 'Hubo un problema al verificar el código.'
        });
      });
  };

  return (
    <div style={{ maxWidth: 1200, margin: '24px auto', padding: '0 16px' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 24 
      }}>
        <h1 style={{ 
          margin: 0, 
          fontWeight: 700, 
          fontSize: 28, 
          color: 'var(--text-primary, #222)' 
        }}>
          Mi Cuenta
        </h1>
      </div>

      {/* Estadísticas */}
      <StatsGrid columns={3}>
        <StatsCard
          title="Usuario"
          value={`${userInfo.nombre} ${userInfo.apellido}`}
          icon={React.createElement(FaUser as any)}
          color="primary"
          subtitle="Nombre completo"
        />
        <StatsCard
          title="Email"
          value={userInfo.email || 'No configurado'}
          icon={React.createElement(FaEnvelope as any)}
          color="info"
          subtitle="Correo electrónico"
        />
        <StatsCard
          title="Teléfono"
          value={userInfo.telefono || 'No configurado'}
          icon={React.createElement(FaPhone as any)}
          color="success"
          subtitle="Número de contacto"
        />
      </StatsGrid>

      {/* Sección: Datos principales */}
      <FormCard>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: 20
        }}>
          <h2 style={{ 
            margin: 0, 
            fontSize: 20, 
            fontWeight: 600,
            color: 'var(--text-primary, #222)'
          }}>
            Datos principales
          </h2>
          {React.createElement(FaShieldAlt as any, { 
            style: { color: 'var(--success-color, #4caf50)', fontSize: 20 } 
          })}
        </div>

        <FormGrid columns={1}>
          {/* Email */}
          <div>
            <label style={{ 
              display: 'flex',
              alignItems: 'center',
              marginBottom: 8, 
              fontSize: 14, 
              fontWeight: 600,
              color: 'var(--text-primary, #222)'
            }}>
              {React.createElement(FaEnvelope as any, { 
                style: { marginRight: 8, color: 'var(--info-color, #2196f3)' } 
              })}
              Email
            </label>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <FormInput
                type="email"
                name="email"
                placeholder="tu@email.com"
                value={userInfo.email}
                onChange={handleInputChange}
                disabled={!editableInputs.email}
                style={{ flex: 1 }}
              />
              <FormButton
                type="button"
                onClick={() => handleEditClick('email')}
                variant="secondary"
                fullWidth={false}
                style={{ minWidth: 100 }}
              >
                {editableInputs.email ? (
                  <>
                    {React.createElement(FaTimes as any, { style: { marginRight: 6 } })}
                    Cancelar
                  </>
                ) : (
                  <>
                    {React.createElement(FaEdit as any, { style: { marginRight: 6 } })}
                    Editar
                  </>
                )}
              </FormButton>
              {editableInputs.email && (
                <FormButton
                  type="button"
                  onClick={() => handleSaveClick('email')}
                  disabled={userInfo.email === originalUserInfo.email}
                  fullWidth={false}
                  style={{ minWidth: 100 }}
                >
                  {React.createElement(FaCheck as any, { style: { marginRight: 6 } })}
                  Guardar
                </FormButton>
              )}
            </div>
          </div>

          {/* Teléfono */}
          <div>
            <label style={{ 
              display: 'flex',
              alignItems: 'center',
              marginBottom: 8, 
              fontSize: 14, 
              fontWeight: 600,
              color: 'var(--text-primary, #222)'
            }}>
              {React.createElement(FaPhone as any, { 
                style: { marginRight: 8, color: 'var(--success-color, #4caf50)' } 
              })}
              Teléfono
            </label>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <FormInput
                type="text"
                name="telefono"
                placeholder="999999999"
                value={userInfo.telefono}
                onChange={handleInputChange}
                disabled={!editableInputs.telefono}
                style={{ flex: 1 }}
              />
              <FormButton
                type="button"
                onClick={() => handleEditClick('telefono')}
                variant="secondary"
                fullWidth={false}
                style={{ minWidth: 100 }}
              >
                {editableInputs.telefono ? (
                  <>
                    {React.createElement(FaTimes as any, { style: { marginRight: 6 } })}
                    Cancelar
                  </>
                ) : (
                  <>
                    {React.createElement(FaEdit as any, { style: { marginRight: 6 } })}
                    Editar
                  </>
                )}
              </FormButton>
              {editableInputs.telefono && (
                <FormButton
                  type="button"
                  onClick={() => handleSaveClick('telefono')}
                  disabled={userInfo.telefono === originalUserInfo.telefono}
                  fullWidth={false}
                  style={{ minWidth: 100 }}
                >
                  {React.createElement(FaCheck as any, { style: { marginRight: 6 } })}
                  Guardar
                </FormButton>
              )}
            </div>
          </div>
        </FormGrid>
      </FormCard>

      {/* Sección: Perfil */}
      <FormCard>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: 20
        }}>
          <h2 style={{ 
            margin: 0, 
            fontSize: 20, 
            fontWeight: 600,
            color: 'var(--text-primary, #222)'
          }}>
            Perfil
          </h2>
          {React.createElement(FaUser as any, { 
            style: { color: 'var(--primary-color, #6c4fa1)', fontSize: 20 } 
          })}
        </div>

        <FormGrid columns={2}>
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: 8, 
              fontSize: 14, 
              fontWeight: 600,
              color: 'var(--text-primary, #222)'
            }}>
              Nombre
            </label>
            <FormInput
              type="text"
              name="nombre"
              placeholder="Tu nombre"
              value={userInfo.nombre}
              onChange={handleInputChange}
              disabled={!perfilEditMode}
            />
          </div>
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: 8, 
              fontSize: 14, 
              fontWeight: 600,
              color: 'var(--text-primary, #222)'
            }}>
              Apellido
            </label>
            <FormInput
              type="text"
              name="apellido"
              placeholder="Tu apellido"
              value={userInfo.apellido}
              onChange={handleInputChange}
              disabled={!perfilEditMode}
            />
          </div>
        </FormGrid>

        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          {!perfilEditMode ? (
            <FormButton
              type="button"
              onClick={() => handleEditClick('perfil')}
              variant="secondary"
              fullWidth={false}
            >
              {React.createElement(FaEdit as any, { style: { marginRight: 6 } })}
              Editar Perfil
            </FormButton>
          ) : (
            <>
              <FormButton
                type="button"
                onClick={() => { 
                  setPerfilEditMode(false); 
                  setUserInfo((prev) => ({ 
                    ...prev, 
                    nombre: originalUserInfo.nombre || '', 
                    apellido: originalUserInfo.apellido || '' 
                  })); 
                }}
                variant="danger"
                fullWidth={false}
              >
                {React.createElement(FaTimes as any, { style: { marginRight: 6 } })}
                Cancelar
              </FormButton>
              <FormButton
                type="button"
                onClick={() => handleSaveClick('perfil')}
                disabled={userInfo.nombre === originalUserInfo.nombre && userInfo.apellido === originalUserInfo.apellido}
                fullWidth={false}
              >
                {React.createElement(FaCheck as any, { style: { marginRight: 6 } })}
                Guardar Cambios
              </FormButton>
            </>
          )}
        </div>
      </FormCard>

      {/* Modal de Verificación */}
      <Modal
        isOpen={mostrarPopup}
        onClose={() => {
          setMostrarPopup(false);
          setCodigoVerificacion('');
        }}
        title="Verificación de Seguridad"
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          {React.createElement(FaShieldAlt as any, { 
            style: { fontSize: 48, color: 'var(--primary-color, #6c4fa1)', marginBottom: 16 } 
          })}
          <p style={{ 
            margin: 0, 
            color: 'var(--text-secondary, #666)',
            fontSize: 14
          }}>
            Hemos enviado un código de verificación a tu correo electrónico. 
            Por favor, ingrésalo para confirmar los cambios.
          </p>
        </div>

        <FormGrid columns={1}>
          <FormInput
            type="text"
            placeholder="Ingresa el código de 6 dígitos"
            value={codigoVerificacion}
            onChange={(e) => setCodigoVerificacion(e.target.value)}
            style={{ textAlign: 'center', fontSize: 18, letterSpacing: 4 }}
          />
        </FormGrid>

        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <FormButton
            type="button"
            onClick={handleVerificationSubmit}
            disabled={!codigoVerificacion}
          >
            {React.createElement(FaCheck as any, { style: { marginRight: 6 } })}
            Verificar Código
          </FormButton>
          <FormButton
            type="button"
            variant="danger"
            onClick={() => {
              setMostrarPopup(false);
              setCodigoVerificacion('');
            }}
          >
            {React.createElement(FaTimes as any, { style: { marginRight: 6 } })}
            Cancelar
          </FormButton>
        </div>
      </Modal>
    </div>
  );
}