import React, { useState, useEffect } from 'react';
import API_BASE from '../../utils/apiBase';
import Swal from 'sweetalert2';
import { FaSun, FaMoon } from 'react-icons/fa';

const RecuperarPassword = ({ onVolver }) => {
  const [metodo, setMetodo] = useState('correo');
  const [correo, setCorreo] = useState('');
  const [numero, setNumero] = useState('');
  const [codigo, setCodigo] = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [paso, setPaso] = useState(1); // 1: pedir dato, 2: pedir código y nueva pass
  const [loading, setLoading] = useState(false);
  
  // Modo oscuro/claro
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true; // Por defecto oscuro
  });
  
  // Aplicar tema al cargar
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);
  
  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  const handleEnviarCodigo = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/usuarios/recuperar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        credentials: 'include',
        body: JSON.stringify({
          metodo,
          correo: correo.trim(),
          numero: numero.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPaso(2);
        Swal.fire('Código enviado', 'Revisa tu ' + (metodo === 'correo' ? 'correo' : 'teléfono'), 'info');
      } else {
        Swal.fire('Error', data.error || 'No se pudo enviar el código', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'No se pudo conectar al servidor', 'error');
    }
    setLoading(false);
  };

  const handleCambiarPassword = async (e) => {
    e.preventDefault();
    if (nuevaPassword !== confirmarPassword) {
      Swal.fire('Error', 'Las contraseñas no coinciden', 'error');
      return;
    }
    if (nuevaPassword.length < 8) {
      Swal.fire('Error', 'La contraseña debe tener al menos 8 caracteres', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/usuarios/recuperar/confirmar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        credentials: 'include',
        body: JSON.stringify({
          metodo,
          correo: correo.trim(),
          numero: numero.trim(),
          codigo,
          nuevaPassword
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        Swal.fire('¡Listo!', 'Contraseña actualizada. Ahora puedes iniciar sesión.', 'success');
        if (onVolver) onVolver();
      } else {
        Swal.fire('Error', data.error || 'No se pudo actualizar la contraseña', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'No se pudo conectar al servidor', 'error');
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--color-bg)', position: 'relative' }}>
      {/* Botón de toggle de tema */}
      <button
        onClick={toggleTheme}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          width: '55px',
          height: '55px',
          borderRadius: '50%',
          border: 'none',
          background: darkMode ? '#FFD700' : '#1a1a2e',
          color: darkMode ? '#1a1a2e' : '#FFD700',
          cursor: 'pointer',
          display: 'flex',var(--color-input-border)', background: 'var(--color-input-bg)', color: 'var(--color-text)', fontSize: '1rem' }} />
            ) : (
              <input type="tel" placeholder="Teléfono" value={numero} onChange={e => setNumero(e.target.value)} required style={{ padding: '0.7rem', borderRadius: 6, border: '1px solid var(--color-input-border)', background: 'var(--color-input-bg)', color: 'var(--color-text)', fontSize: '1rem' }} />
            )}
            <button type="submit" disabled={loading} style={{ padding: '0.7rem', borderRadius: 6, background: 'var(--color-primary)', color: '#fff', fontWeight: 600, fontSize: '1.1rem', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}>
              {loading ? 'Enviando...' : 'Enviar código'}
            </button>
            <button type="button" onClick={onVolver} style={{ background: 'none', border: 'none', color: '#60a5fa
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.15) rotate(20deg)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.5)';
        }}var(--color-input-border)', background: 'var(--color-input-bg)', color: 'var(--color-text)', fontSize: '1rem' }} />
            <input type="password" placeholder="Nueva contraseña" value={nuevaPassword} onChange={e => setNuevaPassword(e.target.value)} required style={{ padding: '0.7rem', borderRadius: 6, border: '1px solid var(--color-input-border)', background: 'var(--color-input-bg)', color: 'var(--color-text)', fontSize: '1rem' }} />
            <input type="password" placeholder="Confirmar contraseña" value={confirmarPassword} onChange={e => setConfirmarPassword(e.target.value)} required style={{ padding: '0.7rem', borderRadius: 6, border: '1px solid var(--color-input-border)', background: 'var(--color-input-bg)', color: 'var(--color-text)', fontSize: '1rem' }} />
            <button type="submit" disabled={loading} style={{ padding: '0.7rem', borderRadius: 6, background: 'var(--color-primary)', color: '#fff', fontWeight: 600, fontSize: '1.1rem', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}>
              {loading ? 'Cambiando...' : 'Cambiar contraseña'}
            </button>
            <button type="button" onClick={() => { setPaso(1); setCodigo(''); setNuevaPassword(''); setConfirmarPassword(''); }} style={{ background: 'none', border: 'none', color: '#60a5fa
      >
        {darkMode ? <FaSun /> : <FaMoon />}
      </button>
      
      <div style={{ background: 'var(--color-card)', padding: '2.5rem 2rem', borderRadius: '12px', boxShadow: '0 2px 16px var(--card-shadow)', minWidth: '340px', maxWidth: 400 }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', fontSize: '2rem', color: 'var(--color-text)' }}>Recuperar Contraseña</h2>
        {paso === 1 ? (
          <form onSubmit={handleEnviarCodigo} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', margin: '0.5rem 0' }}>
              <span>Recuperar vía:</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input type="radio" name="metodo" value="correo" checked={metodo === 'correo'} onChange={() => setMetodo('correo')} /> Correo
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input type="radio" name="metodo" value="telefono" checked={metodo === 'telefono'} onChange={() => setMetodo('telefono')} /> Teléfono
              </label>
            </div>
            {metodo === 'correo' ? (
              <input type="email" placeholder="Correo electrónico" value={correo} onChange={e => setCorreo(e.target.value)} required style={{ padding: '0.7rem', borderRadius: 6, border: '1px solid #ccc', fontSize: '1rem' }} />
            ) : (
              <input type="tel" placeholder="Teléfono" value={numero} onChange={e => setNumero(e.target.value)} required style={{ padding: '0.7rem', borderRadius: 6, border: '1px solid #ccc', fontSize: '1rem' }} />
            )}
            <button type="submit" disabled={loading} style={{ padding: '0.7rem', borderRadius: 6, background: '#6C4AB6', color: '#fff', fontWeight: 600, fontSize: '1.1rem', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}>
              {loading ? 'Enviando...' : 'Enviar código'}
            </button>
            <button type="button" onClick={onVolver} style={{ background: 'none', border: 'none', color: '#6C4AB6', fontWeight: 600, cursor: 'pointer', marginTop: 8 }}>Volver</button>
          </form>
        ) : (
          <form onSubmit={handleCambiarPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input type="text" placeholder="Código recibido" value={codigo} onChange={e => setCodigo(e.target.value)} required style={{ padding: '0.7rem', borderRadius: 6, border: '1px solid #ccc', fontSize: '1rem' }} />
            <input type="password" placeholder="Nueva contraseña" value={nuevaPassword} onChange={e => setNuevaPassword(e.target.value)} required style={{ padding: '0.7rem', borderRadius: 6, border: '1px solid #ccc', fontSize: '1rem' }} />
            <input type="password" placeholder="Confirmar contraseña" value={confirmarPassword} onChange={e => setConfirmarPassword(e.target.value)} required style={{ padding: '0.7rem', borderRadius: 6, border: '1px solid #ccc', fontSize: '1rem' }} />
            <button type="submit" disabled={loading} style={{ padding: '0.7rem', borderRadius: 6, background: '#6C4AB6', color: '#fff', fontWeight: 600, fontSize: '1.1rem', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}>
              {loading ? 'Cambiando...' : 'Cambiar contraseña'}
            </button>
            <button type="button" onClick={() => { setPaso(1); setCodigo(''); setNuevaPassword(''); setConfirmarPassword(''); }} style={{ background: 'none', border: 'none', color: '#6C4AB6', fontWeight: 600, cursor: 'pointer', marginTop: 8 }}>Volver</button>
          </form>
        )}
      </div>
    </div>
  );
};

export default RecuperarPassword;
