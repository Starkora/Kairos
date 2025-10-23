import React from 'react';
import API_BASE from '../utils/apiBase';

function isDev() {
  return process.env.REACT_APP_SHOW_API_BADGE === 'true';
}

export default function ApiEndpointBadge() {
  if (!isDev()) return null;

  let label = API_BASE;
  try {
    const url = new URL(API_BASE);
    label = url.host;
  } catch (_) {}

  const isDevTunnel = typeof window !== 'undefined' && /-3000\.[\w.-]*devtunnels\.ms$/i.test(window.location.hostname);

  const [urlOverride, setUrlOverride] = React.useState('');
  const [portOverride, setPortOverride] = React.useState('');

  const applyOverrides = () => {
    try {
      if (urlOverride) {
        localStorage.setItem('API_BASE_OVERRIDE', urlOverride);
      } else {
        localStorage.removeItem('API_BASE_OVERRIDE');
      }
      if (portOverride) {
        localStorage.setItem('API_PORT_OVERRIDE', portOverride);
      } else {
        localStorage.removeItem('API_PORT_OVERRIDE');
      }
      window.location.reload();
    } catch {}
  };

  const clearOverrides = () => {
    try {
      localStorage.removeItem('API_BASE_OVERRIDE');
      localStorage.removeItem('API_PORT_OVERRIDE');
      window.location.reload();
    } catch {}
  };

  return (
    <div style={{
      position: 'fixed',
      right: 12,
      bottom: 12,
      zIndex: 9999,
      background: '#111827',
      color: '#E5E7EB',
      border: '1px solid #374151',
      borderRadius: 10,
      padding: '8px 12px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
      fontSize: 12,
      lineHeight: 1.3,
      opacity: 0.9
    }} title={`API_BASE: ${API_BASE}`}>
      <div style={{fontWeight: 700, marginBottom: 2}}>API</div>
      <div style={{whiteSpace: 'nowrap', marginBottom: 6}}>↳ <a href={API_BASE} target="_blank" rel="noreferrer" style={{color:'#93C5FD', textDecoration:'none'}}>{label}</a></div>
      {isDevTunnel && <div style={{marginTop: 2, color: '#FBBF24'}}>Dev Tunnels</div>}
      <div style={{marginTop: 8, display:'flex', flexDirection:'column', gap:6}}>
        <input placeholder="URL override (https://...)" value={urlOverride} onChange={e=>setUrlOverride(e.target.value)} style={{background:'#1F2937', color:'#E5E7EB', border:'1px solid #374151', borderRadius:6, padding:'4px 6px'}} />
        <input placeholder="Puerto override (ej. 3002)" value={portOverride} onChange={e=>setPortOverride(e.target.value)} style={{background:'#1F2937', color:'#E5E7EB', border:'1px solid #374151', borderRadius:6, padding:'4px 6px'}} />
        <div style={{display:'flex', gap:6}}>
          <button onClick={applyOverrides} style={{background:'#2563EB', color:'#fff', border:'none', borderRadius:6, padding:'4px 8px', cursor:'pointer'}}>Aplicar</button>
          <button onClick={clearOverrides} style={{background:'#6B7280', color:'#fff', border:'none', borderRadius:6, padding:'4px 8px', cursor:'pointer'}}>Limpiar</button>
        </div>
      </div>
    </div>
  );
}
