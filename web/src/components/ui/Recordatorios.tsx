import React from 'react';
import { FaBell, FaExclamationTriangle, FaInfoCircle, FaCheckCircle } from 'react-icons/fa';

interface Recordatorio {
  id: number;
  tipo: 'pendiente' | 'vencido' | 'proximo' | 'completado';
  mensaje: string;
  fecha?: string;
  accion?: () => void;
  accionTexto?: string;
}

interface RecordatoriosListProps {
  recordatorios: Recordatorio[];
  onDismiss?: (id: number) => void;
  maxVisible?: number;
}

/**
 * Componente para mostrar recordatorios y alertas de movimientos recurrentes
 */
export const RecordatoriosList: React.FC<RecordatoriosListProps> = ({ 
  recordatorios, 
  onDismiss,
  maxVisible = 5 
}) => {
  const [expandido, setExpandido] = React.useState(false);
  const recordatoriosVisibles = expandido ? recordatorios : recordatorios.slice(0, maxVisible);

  const getIcono = (tipo: Recordatorio['tipo']) => {
    switch (tipo) {
      case 'vencido':
        return React.createElement(FaExclamationTriangle as any, { style: { color: '#f44336', fontSize: 18 } });
      case 'pendiente':
        return React.createElement(FaBell as any, { style: { color: '#ff9800', fontSize: 18 } });
      case 'proximo':
        return React.createElement(FaInfoCircle as any, { style: { color: '#2196f3', fontSize: 18 } });
      case 'completado':
        return React.createElement(FaCheckCircle as any, { style: { color: '#4caf50', fontSize: 18 } });
    }
  };

  const getColor = (tipo: Recordatorio['tipo']) => {
    switch (tipo) {
      case 'vencido':
        return { bg: '#ffebee', border: '#f44336', text: '#c62828' };
      case 'pendiente':
        return { bg: '#fff3e0', border: '#ff9800', text: '#e65100' };
      case 'proximo':
        return { bg: '#e3f2fd', border: '#2196f3', text: '#0d47a1' };
      case 'completado':
        return { bg: '#e8f5e9', border: '#4caf50', text: '#2e7d32' };
    }
  };

  if (recordatorios.length === 0) {
    return null;
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12
      }}>
        <h3 style={{ 
          fontSize: 16, 
          fontWeight: 700, 
          color: 'var(--color-text)',
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          {React.createElement(FaBell as any, { style: { color: 'var(--color-accent)' } })}
          Recordatorios
          {recordatorios.length > 0 && (
            <span style={{
              background: '#f44336',
              color: '#fff',
              fontSize: 11,
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: 12,
              minWidth: 20,
              textAlign: 'center'
            }}>
              {recordatorios.length}
            </span>
          )}
        </h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {recordatoriosVisibles.map((rec) => {
          const colores = getColor(rec.tipo);
          return (
            <div
              key={rec.id}
              style={{
                background: colores.bg,
                border: `1px solid ${colores.border}`,
                borderLeft: `4px solid ${colores.border}`,
                borderRadius: 10,
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                position: 'relative'
              }}
            >
              <div>{getIcono(rec.tipo)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontSize: 14, 
                  fontWeight: 600, 
                  color: colores.text,
                  marginBottom: rec.fecha ? 4 : 0
                }}>
                  {rec.mensaje}
                </div>
                {rec.fecha && (
                  <div style={{ 
                    fontSize: 12, 
                    color: colores.text, 
                    opacity: 0.8 
                  }}>
                    {rec.fecha}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {rec.accion && rec.accionTexto && (
                  <button
                    onClick={rec.accion}
                    style={{
                      background: colores.border,
                      color: '#fff',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {rec.accionTexto}
                  </button>
                )}
                {onDismiss && (
                  <button
                    onClick={() => onDismiss(rec.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: colores.text,
                      cursor: 'pointer',
                      fontSize: 18,
                      padding: '4px 8px',
                      opacity: 0.6
                    }}
                    title="Descartar"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {recordatorios.length > maxVisible && (
        <button
          onClick={() => setExpandido(!expandido)}
          style={{
            marginTop: 10,
            background: 'transparent',
            border: '1px solid var(--color-input-border)',
            color: 'var(--color-text)',
            padding: '8px 16px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            width: '100%'
          }}
        >
          {expandido ? 'Ver menos' : `Ver ${recordatorios.length - maxVisible} más`}
        </button>
      )}
    </div>
  );
};

interface BadgeRecordatorioProps {
  cantidad: number;
  onClick?: () => void;
}

/**
 * Badge compacto para mostrar cantidad de recordatorios
 */
export const BadgeRecordatorio: React.FC<BadgeRecordatorioProps> = ({ cantidad, onClick }) => {
  if (cantidad === 0) return null;

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        display: 'inline-flex',
        cursor: onClick ? 'pointer' : 'default'
      }}
    >
      {React.createElement(FaBell as any, { 
        style: { 
          fontSize: 20, 
          color: 'var(--color-accent)',
          animation: cantidad > 0 ? 'bell-ring 1s ease-in-out infinite' : 'none'
        }
      })}
      <span style={{
        position: 'absolute',
        top: -6,
        right: -6,
        background: '#f44336',
        color: '#fff',
        fontSize: 10,
        fontWeight: 800,
        padding: '2px 6px',
        borderRadius: 10,
        minWidth: 18,
        textAlign: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
      }}>
        {cantidad > 99 ? '99+' : cantidad}
      </span>
      <style>{`
        @keyframes bell-ring {
          0%, 100% { transform: rotate(0deg); }
          10%, 30% { transform: rotate(-10deg); }
          20%, 40% { transform: rotate(10deg); }
        }
      `}</style>
    </div>
  );
};
