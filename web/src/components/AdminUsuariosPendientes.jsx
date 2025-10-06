import React, { useEffect, useMemo, useState } from 'react';
import { getToken } from '../utils/auth';
import API_BASE from '../utils/apiBase';

export default function AdminUsuariosPendientes() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [usuarios, setUsuarios] = useState([]);
  const token = getToken();
  const [query, setQuery] = useState('');

  const fetchPendientes = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/pending`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Error ${res.status}`);
      }
      const list = await res.json();
      setUsuarios(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const aprobar = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${id}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Error ${res.status}`);
      }
      await fetchPendientes();
    } catch (e) {
      alert(e.message);
    }
  };

  useEffect(() => { fetchPendientes(); }, []);

  const filtered = useMemo(() => {
    const q = (query || '').toLowerCase().trim();
    if (!q) return usuarios;
    return usuarios.filter(u => {
      const email = String(u.email || '').toLowerCase();
      const nombre = String(u.nombre || '').toLowerCase();
      const apellido = String(u.apellido || '').toLowerCase();
      return email.includes(q) || nombre.includes(q) || apellido.includes(q);
    });
  }, [usuarios, query]);

  return (
    <div className="card centered-card" style={{maxWidth: 900}}>
      <h2>Usuarios pendientes de aprobación</h2>
      <div style={{display:'flex', gap:12, alignItems:'center', marginBottom:12}}>
        <input
          type="text"
          placeholder="Filtrar por email o nombre..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{flex:1, padding:'8px 12px'}}
        />
        <span style={{opacity:0.7, whiteSpace:'nowrap'}}>
          {filtered.length}/{usuarios.length}
        </span>
        <button className="btn" onClick={() => setQuery('')} disabled={!query}>Limpiar</button>
      </div>
      {error && <div className="alert error">{error}</div>}
      <div className="table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Email</th>
              <th>Nombre</th>
              <th>Apellido</th>
              <th>Plataforma</th>
              <th>Creado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.length === 0 && (
              <tr><td colSpan={7} style={{textAlign:'center'}}>{loading ? 'Cargando…' : 'No hay usuarios pendientes.'}</td></tr>
            )}
            {filtered.map(u => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.email}</td>
                <td>{u.nombre || '-'}</td>
                <td>{u.apellido || '-'}</td>
                <td>{u.plataforma || '-'}</td>
                <td>{u.creado_en || '-'}</td>
                <td>
                  <button onClick={() => aprobar(u.id)} className="btn btn-primary">Aprobar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{marginTop:16}}>
        <button onClick={fetchPendientes} className="btn">Refrescar</button>
      </div>
    </div>
  );
}
