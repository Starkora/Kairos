import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MdWarning, MdClose } from 'react-icons/md';
import API_BASE from '../../utils/apiBase';
import { getToken } from '../../utils/auth';

export default function NoCategoriasAlert() {
  const [hasCategories, setHasCategories] = useState<boolean | null>(null);
  const [hasCategorias, setHasCategorias] = useState<boolean>(false);
  const [hasCategoriasCuenta, setHasCategoriasCuenta] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Resetear dismissed al cambiar de ruta
    setDismissed(false);
    console.log('🔔 NoCategoriasAlert - Ruta cambiada, reseteando dismissed');

    // Verificar si hay categorías
    const checkCategories = async () => {
      try {
        const token = getToken();
        if (!token) {
          console.log('🔔 NoCategoriasAlert - No hay token');
          setHasCategories(true); // Si no hay token, no mostrar alerta
          return;
        }

        console.log('🔔 NoCategoriasAlert - Verificando categorías...');
        const [categoriasRes, categoriasCuentaRes] = await Promise.all([
          fetch(`${API_BASE}/api/categorias?plataforma=web`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${API_BASE}/api/categorias-cuenta`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        console.log('🔔 NoCategoriasAlert - Response status:', categoriasRes.ok, categoriasCuentaRes.ok);

        if (categoriasRes.ok && categoriasCuentaRes.ok) {
          const categorias = await categoriasRes.json();
          const categoriasCuenta = await categoriasCuentaRes.json();
          
          console.log('🔔 NoCategoriasAlert - Categorías:', categorias);
          console.log('🔔 NoCategoriasAlert - Categorías cuenta:', categoriasCuenta);
          
          const hasCat = Array.isArray(categorias) && categorias.length > 0;
          const hasCatCuenta = Array.isArray(categoriasCuenta) && categoriasCuenta.length > 0;
          
          console.log('🔔 NoCategoriasAlert - hasCat:', hasCat, 'hasCatCuenta:', hasCatCuenta);
          
          // Guardar estados individuales
          setHasCategorias(hasCat);
          setHasCategoriasCuenta(hasCatCuenta);
          
          // Mostrar alerta si falta alguna de las dos
          const hasAllCategories = hasCat && hasCatCuenta;
          setHasCategories(hasAllCategories);
          console.log('🔔 NoCategoriasAlert - setHasCategories:', hasAllCategories);

          // Si no tiene todas las categorías, ocultar automáticamente después de 10 segundos
          if (!hasAllCategories) {
            const timer = setTimeout(() => {
              console.log('🔔 NoCategoriasAlert - Auto-descartando después de 10 segundos');
              setDismissed(true);
            }, 10000);
            return () => clearTimeout(timer);
          }
        } else {
          console.log('🔔 NoCategoriasAlert - Error en respuestas');
          setHasCategories(true); // Si hay error, no mostrar
        }
      } catch (error) {
        console.error('🔔 NoCategoriasAlert - Error verificando categorías:', error);
        setHasCategories(true); // Si hay error, no mostrar
      }
    };

    checkCategories();
  }, [location.pathname]);

  const handleDismiss = () => {
    setDismissed(true);
    console.log('🔔 NoCategoriasAlert - Alerta descartada (solo para esta vista)');
  };

  const handleGoToCategories = () => {
    navigate('/categorias');
    handleDismiss();
  };

  // No mostrar si: está cargando (null), tiene categorías (true), fue descartada, o está en la página de categorías
  if (hasCategories === null || hasCategories === true || dismissed || location.pathname === '/categorias') {
    console.log('🔔 NoCategoriasAlert - NO SE MUESTRA. hasCategories:', hasCategories, 'dismissed:', dismissed, 'pathname:', location.pathname);
    return null;
  }

  console.log('🔔 NoCategoriasAlert - SE MUESTRA LA ALERTA');

  // Determinar el mensaje según qué categorías faltan
  const faltanCategorias = !hasCategorias;
  const faltanCategoriasCuenta = !hasCategoriasCuenta;

  let titulo = '';
  let mensaje = '';

  if (faltanCategorias && faltanCategoriasCuenta) {
    titulo = 'No tienes categorías registradas';
    mensaje = 'Las categorías son el primer paso para organizar tus movimientos. Crea categorías de ingreso, egreso y ahorro, además de categorías de cuenta.';
  } else if (faltanCategorias) {
    titulo = 'Te faltan categorías de movimientos';
    mensaje = 'Crea categorías de ingreso, egreso y ahorro para clasificar tus transacciones.';
  } else if (faltanCategoriasCuenta) {
    titulo = '¡Último paso! Agrega categorías de cuenta';
    mensaje = 'Ya tienes categorías de movimientos. Ahora crea categorías de cuenta para organizar dónde guardas tu dinero (banco, efectivo, tarjetas, etc.).';
  }

  return (
    <div style={{
      position: 'fixed',
      top: '80px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000,
      maxWidth: '90vw',
      width: '600px'
    }}>
      <div style={{
        background: 'var(--color-primary, #6c4fa1)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '16px 20px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        animation: 'slideDown 0.3s ease-out'
      }}>
        {React.createElement(MdWarning as any, { 
          style: { 
            fontSize: '24px', 
            color: '#fff',
            flexShrink: 0,
            marginTop: '2px'
          } 
        })}
        <div style={{ flex: 1 }}>
          <div style={{ 
            fontWeight: 600, 
            fontSize: '15px',
            color: '#fff',
            marginBottom: '4px'
          }}>
            {titulo}
          </div>
          <div style={{ 
            fontSize: '14px',
            color: 'rgba(255,255,255,0.9)',
            marginBottom: '12px'
          }}>
            {mensaje}
          </div>
          <button
            onClick={handleGoToCategories}
            style={{
              background: '#fff',
              color: 'var(--color-primary, #6c4fa1)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            Ir a Categorías
          </button>
        </div>
        <button
          onClick={handleDismiss}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            flexShrink: 0
          }}
          title="Cerrar"
        >
          {React.createElement(MdClose as any, { style: { fontSize: '20px' } })}
        </button>
      </div>
    </div>
  );
}
