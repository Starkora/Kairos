import React from 'react';
import { IconRenderer, getColorPorTipo } from './IconRenderer';
import * as Icons from 'react-icons/fa';

interface TimelineMovimiento {
  id: number;
  descripcion: string;
  monto: number;
  tipo: string;
  fecha: string;
  cuenta?: string;
  icon?: string;
  hora?: string;
}

interface TimelineViewProps {
  movimientos: TimelineMovimiento[];
  onMovimientoClick?: (mov: TimelineMovimiento) => void;
}

/**
 * Componente de línea de tiempo visual para movimientos
 * Muestra burbujas proporcionales al monto en un timeline horizontal
 */
export const TimelineView: React.FC<TimelineViewProps> = ({ movimientos, onMovimientoClick }) => {
  // Ordenar por hora si existe, sino por monto
  const movimientosOrdenados = [...movimientos].sort((a, b) => {
    if (a.hora && b.hora) {
      return a.hora.localeCompare(b.hora);
    }
    return Number(b.monto) - Number(a.monto);
  });

  // Calcular el tamaño máximo y mínimo de burbuja
  const montos = movimientos.map(m => Number(m.monto));
  const montoMax = Math.max(...montos, 1);
  const montoMin = Math.min(...montos, 0);

  const calcularTamanio = (monto: number): number => {
    const minSize = 40;
    const maxSize = 100;
    const ratio = Number(monto) / montoMax;
    return minSize + (maxSize - minSize) * ratio;
  };

  if (movimientos.length === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: 40, 
        color: 'var(--color-muted)' 
      }}>
        No hay movimientos para mostrar en el timeline
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '20px 0',
      overflowX: 'auto',
      overflowY: 'visible'
    }}>
      {/* Línea de tiempo */}
      <div style={{ 
        position: 'relative',
        minHeight: 200,
        paddingTop: 40
      }}>
        {/* Línea horizontal */}
        <div style={{
          position: 'absolute',
          top: 100,
          left: 0,
          right: 0,
          height: 3,
          background: 'linear-gradient(90deg, var(--color-accent) 0%, var(--color-input-border) 100%)',
          borderRadius: 2
        }} />

        {/* Burbujas de movimientos */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          position: 'relative',
          minWidth: movimientos.length * 120,
          gap: 20,
          paddingBottom: 60
        }}>
          {movimientosOrdenados.map((mov, index) => {
            const tamanio = calcularTamanio(mov.monto);
            const color = getColorPorTipo(mov.tipo);
            
            return (
              <div
                key={mov.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  position: 'relative',
                  cursor: onMovimientoClick ? 'pointer' : 'default',
                  transition: 'transform 0.2s ease',
                }}
                onClick={() => onMovimientoClick?.(mov)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {/* Línea vertical hacia la burbuja */}
                <div style={{
                  width: 2,
                  height: 30,
                  background: color,
                  marginBottom: 8
                }} />

                {/* Burbuja */}
                <div style={{
                  width: tamanio,
                  height: tamanio,
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${color}dd, ${color})`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 700,
                  boxShadow: `0 4px 12px ${color}40`,
                  padding: 8,
                  border: `3px solid ${color}`,
                  position: 'relative'
                }}>
                  <div style={{ fontSize: tamanio * 0.35, marginBottom: 4 }}>
                    {mov.icon && (Icons as any)[mov.icon] ? (
                      React.createElement((Icons as any)[mov.icon], { size: tamanio * 0.35, color: '#fff' })
                    ) : (
                      <IconRenderer tipo={mov.tipo} size={tamanio * 0.35} color="#fff" />
                    )}
                  </div>
                  <div style={{ fontSize: tamanio * 0.18, textAlign: 'center', lineHeight: 1.2 }}>
                    S/ {Number(mov.monto).toFixed(0)}
                  </div>
                  
                  {/* Badge de tipo */}
                  <div style={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    background: '#fff',
                    color: color,
                    fontSize: 10,
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: 8,
                    border: `2px solid ${color}`,
                    textTransform: 'uppercase'
                  }}>
                    {mov.tipo.charAt(0)}
                  </div>
                </div>

                {/* Información debajo */}
                <div style={{
                  marginTop: 12,
                  textAlign: 'center',
                  maxWidth: tamanio + 40,
                  minWidth: 100
                }}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--color-text)',
                    marginBottom: 4,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {mov.descripcion}
                  </div>
                  {mov.hora && (
                    <div style={{
                      fontSize: 11,
                      color: 'var(--color-muted)',
                      fontWeight: 600
                    }}>
                      {mov.hora}
                    </div>
                  )}
                  <div style={{
                    fontSize: 11,
                    color: 'var(--color-muted)',
                    marginTop: 2
                  }}>
                    {mov.cuenta}
                  </div>
                </div>

                {/* Número de secuencia */}
                <div style={{
                  position: 'absolute',
                  top: -15,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'var(--color-card)',
                  color: 'var(--color-text)',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 12,
                  border: '1px solid var(--color-input-border)'
                }}>
                  #{index + 1}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Resumen al final */}
      <div style={{
        marginTop: 20,
        padding: 16,
        background: 'var(--color-card)',
        borderRadius: 10,
        display: 'flex',
        justifyContent: 'space-around',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 4 }}>Total Ingresos</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#4caf50' }}>
            +S/ {movimientos.filter(m => m.tipo === 'ingreso' || m.tipo === 'ahorro').reduce((sum, m) => sum + Number(m.monto), 0).toFixed(2)}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 4 }}>Total Egresos</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#f44336' }}>
            -S/ {movimientos.filter(m => m.tipo === 'egreso').reduce((sum, m) => sum + Number(m.monto), 0).toFixed(2)}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 4 }}>Balance</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>
            S/ {movimientos.reduce((sum, m) => {
              const signo = (m.tipo === 'ingreso' || m.tipo === 'ahorro') ? 1 : -1;
              return sum + (Number(m.monto) * signo);
            }, 0).toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
};
