import React from 'react';

interface Estadistica {
  label: string;
  valor: number;
  formato?: 'moneda' | 'numero' | 'porcentaje';
  color?: string;
  icono?: string;
}

interface EstadisticasCardProps {
  titulo: string;
  estadisticas: Estadistica[];
  gradient?: string;
  notaAdicional?: string;
  className?: string;
}

/**
 * Componente reutilizable para mostrar tarjetas de estadísticas
 * Usado en Cuentas, Calendario, Dashboard, etc.
 */
export const EstadisticasCard: React.FC<EstadisticasCardProps> = ({
  titulo,
  estadisticas,
  gradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  notaAdicional,
  className = ''
}) => {
  const formatearValor = (valor: number, formato: 'moneda' | 'numero' | 'porcentaje' = 'moneda'): string => {
    switch (formato) {
      case 'moneda':
        return `S/ ${valor.toFixed(2)}`;
      case 'porcentaje':
        return `${valor.toFixed(1)}%`;
      case 'numero':
        return valor.toString();
      default:
        return valor.toString();
    }
  };

  return (
    <div 
      className={className}
      style={{
        background: gradient,
        borderRadius: 12,
        padding: 20,
        color: '#fff',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        marginBottom: 20
      }}
    >
      <h2 style={{ 
        fontSize: 20, 
        marginBottom: 16, 
        fontWeight: 700, 
        display: 'flex', 
        alignItems: 'center', 
        gap: 8 
      }}>
        {titulo}
      </h2>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
        gap: 12 
      }}>
        {estadisticas.map((stat, index) => (
          <div 
            key={index}
            style={{ 
              background: 'rgba(255,255,255,0.15)', 
              borderRadius: 8, 
              padding: 12,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{ 
              fontSize: 12, 
              opacity: 0.9, 
              marginBottom: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}>
              {stat.icono && <span>{stat.icono}</span>}
              {stat.label}
            </div>
            <div style={{ 
              fontSize: 20, 
              fontWeight: 700,
              color: stat.color || '#fff'
            }}>
              {stat.formato === 'moneda' && stat.valor > 0 && '+'}
              {stat.formato === 'moneda' && stat.valor < 0 && '-'}
              {formatearValor(Math.abs(stat.valor), stat.formato)}
            </div>
          </div>
        ))}
      </div>
      {notaAdicional && (
        <div style={{ 
          marginTop: 12, 
          fontSize: 13, 
          opacity: 0.85, 
          display: 'flex', 
          alignItems: 'center', 
          gap: 6 
        }}>
          <span>📈</span>
          <span>{notaAdicional}</span>
        </div>
      )}
    </div>
  );
};

/**
 * Componente para estadísticas en formato de mini cards (horizontal)
 */
export const EstadisticasMiniCards: React.FC<{ estadisticas: Estadistica[] }> = ({ estadisticas }) => {
  return (
    <div style={{ 
      display: 'flex', 
      gap: 12, 
      flexWrap: 'wrap',
      marginBottom: 20 
    }}>
      {estadisticas.map((stat, index) => (
        <div 
          key={index}
          style={{
            flex: '1 1 200px',
            background: 'var(--color-card)',
            borderRadius: 12,
            padding: '16px 20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            borderLeft: `4px solid ${stat.color || 'var(--color-accent)'}`
          }}
        >
          <div style={{ 
            fontSize: 13, 
            color: 'var(--color-muted)', 
            marginBottom: 6,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}>
            {stat.icono && <span style={{ fontSize: 16 }}>{stat.icono}</span>}
            {stat.label}
          </div>
          <div style={{ 
            fontSize: 24, 
            fontWeight: 800,
            color: stat.color || 'var(--color-text)'
          }}>
            {stat.formato === 'moneda' && 'S/ '}
            {stat.valor.toLocaleString(undefined, { 
              minimumFractionDigits: stat.formato === 'moneda' ? 2 : 0,
              maximumFractionDigits: stat.formato === 'moneda' ? 2 : 0
            })}
            {stat.formato === 'porcentaje' && '%'}
          </div>
        </div>
      ))}
    </div>
  );
};
