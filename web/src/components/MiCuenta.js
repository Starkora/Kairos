import React, { useState } from 'react';
import { getToken } from '../utils/auth';
import Swal from 'sweetalert2';
import API_BASE from '../utils/apiBase';

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
        Swal.fire({
          icon: 'error',
          title: 'Número inválido',
          text: 'El número de teléfono debe tener exactamente 9 dígitos y solo contener números.',
          confirmButtonColor: '#6C4AB6'
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
          Swal.fire({
            icon: 'success',
            title: 'Cuenta actualizada',
            text: 'Tu información ha sido actualizada exitosamente.',
            confirmButtonColor: '#6C4AB6'
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Hubo un problema al actualizar tu cuenta.',
            confirmButtonColor: '#6C4AB6'
          });
        }
      })
      .catch(() => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Hubo un problema al actualizar tu cuenta.',
          confirmButtonColor: '#6C4AB6'
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
        Swal.fire({
          icon: 'success',
          title: 'Código enviado',
          text: data.message || 'Por favor revisa tu correo.',
          confirmButtonColor: '#6C4AB6'
        });
        setMostrarPopup(true);
      })
      .catch((err) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err.message || 'Hubo un problema al enviar el código de verificación.',
          confirmButtonColor: '#6C4AB6'
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
          Swal.fire({
            icon: 'success',
            title: 'Datos actualizados',
            text: 'Tus datos han sido actualizados correctamente.',
            confirmButtonColor: '#6C4AB6'
          });
          setMostrarPopup(false);
          setEditableInputs({}); // Bloquear todos los campos
          // Actualizar originales con los nuevos valores confirmados
          setOriginalUserInfo((prev) => ({ ...prev, ...userInfo }));
          window.location.reload(); // Recargar la página
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: data.error || 'El código ingresado es incorrecto.',
            confirmButtonColor: '#6C4AB6'
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
        Swal.fire({ icon: 'error', title: 'Email vacío', text: 'El email no puede estar vacío.', confirmButtonColor: '#6C4AB6' });
        return;
      }
      if (!emailRegex.test(e)) {
        Swal.fire({ icon: 'error', title: 'Email inválido', text: 'Ingresa un correo válido.', confirmButtonColor: '#6C4AB6' });
        return;
      }
    }
    if (field === 'telefono') {
      const t = (userInfo.telefono || '').trim();
      if (!t) {
        Swal.fire({ icon: 'error', title: 'Teléfono vacío', text: 'El teléfono no puede estar vacío.', confirmButtonColor: '#6C4AB6' });
        return;
      }
      if (t.length !== 9) {
      Swal.fire({
        icon: 'error',
        title: 'Número inválido',
        text: 'El número de teléfono debe tener exactamente 9 dígitos.',
        confirmButtonColor: '#6C4AB6'
      });
      return;
    }
    }
    if (field === 'perfil') {
      const nameRegex = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ '\- ]+$/;
      const n = (userInfo.nombre || '').trim();
      const a = (userInfo.apellido || '').trim();
      if (!n) {
        Swal.fire({ icon: 'error', title: 'Nombre vacío', text: 'El nombre no puede estar vacío.', confirmButtonColor: '#6C4AB6' });
        return;
      }
      if (!nameRegex.test(n)) {
        Swal.fire({ icon: 'error', title: 'Nombre inválido', text: 'El nombre solo puede contener letras y espacios.', confirmButtonColor: '#6C4AB6' });
        return;
      }
      if (n.length > 50) {
        Swal.fire({ icon: 'error', title: 'Nombre demasiado largo', text: 'Máximo 50 caracteres.', confirmButtonColor: '#6C4AB6' });
        return;
      }
      if (!a) {
        Swal.fire({ icon: 'error', title: 'Apellido vacío', text: 'El apellido no puede estar vacío.', confirmButtonColor: '#6C4AB6' });
        return;
      }
      if (!nameRegex.test(a)) {
        Swal.fire({ icon: 'error', title: 'Apellido inválido', text: 'El apellido solo puede contener letras y espacios.', confirmButtonColor: '#6C4AB6' });
        return;
      }
      if (a.length > 50) {
        Swal.fire({ icon: 'error', title: 'Apellido demasiado largo', text: 'Máximo 50 caracteres.', confirmButtonColor: '#6C4AB6' });
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
          Swal.fire({
            icon: 'success',
            title: 'Datos actualizados',
            text: data.message || 'Tus datos han sido actualizados correctamente.',
            confirmButtonColor: '#6C4AB6'
          });
          setMostrarPopup(false);
          setEditableInputs({});
          setOriginalUserInfo((prev) => ({ ...prev, ...userInfo }));
          // Opcional: recargar para reflejar cambios en toda la app
          window.location.reload();
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Error de verificación',
            text: (data && (data.error || data.message)) || 'El código ingresado es incorrecto.',
            confirmButtonColor: '#6C4AB6'
          });
        }
      })
      .catch((err) => {
        console.error('Error al verificar el código:', err);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Hubo un problema al verificar el código.',
          confirmButtonColor: '#6C4AB6'
        });
      });
  };

  return (
    <div style={{ padding: '20px', maxWidth: '720px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ textAlign: 'center', color: '#6C4AB6' }}>Mi Cuenta</h1>

      {/* Sección: Datos principales */}
      <section style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 2px 10px #0001', marginBottom: 20 }}>
        <h2 style={{ color: '#6C4AB6', marginTop: 0 }}>Datos principales</h2>
        {/* Email */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 14, fontWeight: 'bold' }}>Email:</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="email"
              name="email"
              value={userInfo.email}
              onChange={handleInputChange}
              disabled={!editableInputs.email}
              maxLength={120}
              style={{ padding: '8px', borderRadius: 6, border: '1px solid #ccc', flex: 1 }}
            />
            <button type="button" onClick={() => handleEditClick('email')} className="icon-btn" title={editableInputs.email ? 'Cancelar' : 'Editar'} aria-label={editableInputs.email ? 'Cancelar' : 'Editar'}
              style={{ background: 'none', border: 'none', padding: 6, cursor: 'pointer' }}>
              {editableInputs.email ? (
                <span style={{ color: '#6C4AB6', fontWeight: 600 }}>Cancelar</span>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6c4fa1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"/>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
                </svg>
              )}
            </button>
            {editableInputs.email && (
              <button
                type="button"
                onClick={() => handleSaveClick('email')}
                disabled={userInfo.email === originalUserInfo.email}
                style={{ padding: '6px 12px', background: userInfo.email === originalUserInfo.email ? '#a5d6a7' : '#28a745', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: userInfo.email === originalUserInfo.email ? 'not-allowed' : 'pointer' }}
              >
                Guardar
              </button>
            )}
          </div>
        </div>
        {/* Teléfono */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 14, fontWeight: 'bold' }}>Teléfono:</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="text"
              name="telefono"
              value={userInfo.telefono}
              onChange={handleInputChange}
              disabled={!editableInputs.telefono}
              maxLength={9}
              style={{ padding: '8px', borderRadius: 6, border: '1px solid #ccc', flex: 1 }}
            />
            <button type="button" onClick={() => handleEditClick('telefono')} className="icon-btn" title={editableInputs.telefono ? 'Cancelar' : 'Editar'} aria-label={editableInputs.telefono ? 'Cancelar' : 'Editar'}
              style={{ background: 'none', border: 'none', padding: 6, cursor: 'pointer' }}>
              {editableInputs.telefono ? (
                <span style={{ color: '#6C4AB6', fontWeight: 600 }}>Cancelar</span>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6c4fa1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"/>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
                </svg>
              )}
            </button>
            {editableInputs.telefono && (
              <button
                type="button"
                onClick={() => handleSaveClick('telefono')}
                disabled={userInfo.telefono === originalUserInfo.telefono}
                style={{ padding: '6px 12px', background: userInfo.telefono === originalUserInfo.telefono ? '#a5d6a7' : '#28a745', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: userInfo.telefono === originalUserInfo.telefono ? 'not-allowed' : 'pointer' }}
              >
                Guardar
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Sección: Perfil */}
      <section style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 2px 10px #0001' }}>
        <h2 style={{ color: '#6C4AB6', marginTop: 0 }}>Perfil</h2>
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 240px))', justifyContent: 'start', columnGap: 24, rowGap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 14, fontWeight: 'bold', display: 'block', marginBottom: 6 }}>Nombre:</label>
            <input
              type="text"
              name="nombre"
              value={userInfo.nombre}
              onChange={handleInputChange}
              disabled={!perfilEditMode}
              maxLength={50}
              style={{ padding: '6px', borderRadius: 4, border: '1px solid #ccc', width: '100%', marginTop: 2, fontSize: 14 }}
            />
          </div>
            <div>
            <label style={{ fontSize: 14, fontWeight: 'bold', display: 'block', marginBottom: 6 }}>Apellido:</label>
            <input
              type="text"
              name="apellido"
              value={userInfo.apellido}
              onChange={handleInputChange}
              disabled={!perfilEditMode}
              maxLength={50}
              style={{ padding: '6px', borderRadius: 4, border: '1px solid #ccc', width: '100%', marginTop: 2, fontSize: 14 }}
            />
          </div>
        </div>
        {!perfilEditMode ? (
          <button type="button" onClick={() => handleEditClick('perfil')} className="icon-btn" title="Editar" aria-label="Editar"
            style={{ background: 'none', border: 'none', padding: 6, cursor: 'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6c4fa1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"/>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
            </svg>
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={() => { setPerfilEditMode(false); setUserInfo((prev) => ({ ...prev, nombre: originalUserInfo.nombre || '', apellido: originalUserInfo.apellido || '' })); }} style={{ padding: '8px 16px', background: '#bbb', color: '#333', border: 'none', borderRadius: 6, fontWeight: 700 }}>
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => handleSaveClick('perfil')}
              disabled={userInfo.nombre === originalUserInfo.nombre && userInfo.apellido === originalUserInfo.apellido}
              style={{ padding: '8px 16px', background: (userInfo.nombre === originalUserInfo.nombre && userInfo.apellido === originalUserInfo.apellido) ? '#a5d6a7' : '#28a745', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: (userInfo.nombre === originalUserInfo.nombre && userInfo.apellido === originalUserInfo.apellido) ? 'not-allowed' : 'pointer' }}
            >
              Guardar
            </button>
          </div>
        )}
      </section>
      {mostrarPopup && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 0 10px rgba(0,0,0,0.3)' }}>
          <h2 style={{ color: '#6C4AB6' }}>Verificación</h2>
          <p>Ingresa el código enviado a tu correo:</p>
          <input
            type="text"
            value={codigoVerificacion}
            onChange={(e) => setCodigoVerificacion(e.target.value)}
            style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ccc', marginTop: '5px', width: '100%' }}
          />
          <button
            type="button"
            onClick={handleVerificationSubmit}
            style={{ padding: '10px 20px', backgroundColor: '#6C4AB6', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' }}
          >
            Verificar
          </button>
          <button
            type="button"
            onClick={() => { setMostrarPopup(false); setCodigoVerificacion(''); }}
            style={{ padding: '10px 20px', backgroundColor: '#bbb', color: '#333', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px', marginLeft: '10px' }}
          >
            Cerrar
          </button>
        </div>
      )}
      {/* Tooltips nativos via title en iconos de editar */}
    </div>
  );
}