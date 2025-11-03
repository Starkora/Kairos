import React from 'react';
import { IconRenderer, getGradientPorTipo, getColorPorTipo } from './IconRenderer';

interface Movimiento {
  id: number;
  descripcion: string;
  monto: number;
  tipo: string;
  cuenta?: string;
  categoria_nombre?: string;
  icon?: string;
  color?: string;
  _recurrente?: boolean;
  frecuencia?: string;
  [key: string]: any;
}

interface MovimientoCardProps {
  movimiento: Movimiento;
  compacto?: boolean;
  onEdit?: (mov: Movimiento) => void;
  onDelete?: (mov: Movimiento) => void;
  onAplicarHoy?: (mov: Movimiento) => void;
  onSaltarHoy?: (mov: Movimiento) => void;
  onPosponer?: (mov: Movimiento, dias: number) => void;
  mostrarBotones?: boolean;
}

/**
 * Componente reutilizable para mostrar un movimiento/transacción
 * Soporta vista normal y compacta
 */
export const MovimientoCard: React.FC<MovimientoCardProps> = ({
  movimiento: mov,
  compacto = false,
  onEdit,
  onDelete,
  onAplicarHoy,
  onSaltarHoy,
  onPosponer,
  mostrarBotones = true
}) => {
  const esTransferencia = mov.tipo.toLowerCase() === 'transferencia';
  const esRecurrente = mov._recurrente || mov.frecuencia;

  if (compacto) {
    return (
      <li style={{
        marginBottom: 10,
        padding: '14px 18px',
        borderRadius: 12,
        background: 'var(--color-card)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
        borderLeft: `4px solid ${getColorPorTipo(mov.tipo)}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24 }}>
            {mov.icon ? (
              <span style={{ fontSize: 24 }}>{mov.icon}</span>
            ) : (
              <IconRenderer tipo={mov.tipo} size={24} color={getColorPorTipo(mov.tipo)} />
            )}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text)' }}>
              {mov.descripcion}
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-muted)' }}>
              {mov.cuenta}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ 
            fontWeight: 800, 
            fontSize: 17, 
            color: getColorPorTipo(mov.tipo)
          }}>
            {mov.tipo === 'ingreso' || mov.tipo === 'ahorro' ? '+' : mov.tipo === 'transferencia' ? '' : '-'}
            S/ {Number(mov.monto).toFixed(2)}
          </span>
          {mostrarBotones && (
            <>
              {!esTransferencia && onEdit && (
                <button 
                  onClick={() => onEdit(mov)} 
                  style={{ 
                    background: 'var(--color-accent)', 
                    border: 'none', 
                    color: '#fff', 
                    padding: '6px 10px', 
                    borderRadius: 8, 
                    cursor: 'pointer', 
                    fontSize: 13,
                    fontWeight: 700
                  }}
                >
                  ✏️
                </button>
              )}
              {onDelete && (
                <button 
                  onClick={() => onDelete(mov)} 
                  style={{ 
                    background: '#f44336', 
                    border: 'none', 
                    color: '#fff', 
                    padding: '6px 10px', 
                    borderRadius: 8, 
                    cursor: 'pointer', 
                    fontSize: 13,
                    fontWeight: 700
                  }}
                >
                  🗑️
                </button>
              )}
            </>
          )}
        </div>
      </li>
    );
  }

  // Vista normal (completa)
  return (
    <li style={{
      marginBottom: 18,
      padding: 22,
      borderRadius: 18,
      background: mov.color || getGradientPorTipo(mov.tipo),
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
      position: 'relative',
    }}>
      <div style={{ marginRight: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36 }}>
        {mov.icon ? (
          <span style={{ fontSize: 36 }}>{mov.icon}</span>
        ) : (
          <IconRenderer tipo={mov.tipo} size={36} color="#fff" />
        )}
      </div>
      <div className="movimiento-main" style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 20 }}>{mov.descripcion}</div>
          <div style={{ 
            fontSize: 12, 
            padding: '4px 8px', 
            borderRadius: 12, 
            background: mov.tipo === 'ingreso' ? '#1de9b6' : (mov.tipo === 'ahorro' ? '#4fc3f7' : (mov.tipo === 'transferencia' ? '#90caf9' : '#ff8a80')), 
            color: mov.tipo === 'transferencia' ? '#0d47a1' : '#222', 
            fontWeight: 800, 
            textTransform: 'capitalize' 
          }}>
            {mov.tipo}
          </div>
        </div>
        <div style={{ fontSize: 15, opacity: 0.9, marginTop: 4 }}>{mov.cuenta}</div>
      </div>
      <div className="movimiento-right" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div className="movimiento-amount" style={{ 
          fontWeight: 800, 
          fontSize: 22, 
          minWidth: 160, 
          textAlign: 'right' 
        }}>
          {mov.tipo === 'ingreso' || mov.tipo === 'ahorro' ? '+' : mov.tipo === 'transferencia' ? '' : '-'}
          S/ {Number(mov.monto).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </div>
        {mostrarBotones && (
          <div className="movimiento-actions" style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
            {!esTransferencia && onEdit && (
              <button 
                onClick={() => onEdit(mov)} 
                style={{ 
                  background: 'rgba(255,255,255,0.2)', 
                  border: 'none', 
                  color: '#fff', 
                  padding: '8px 12px', 
                  borderRadius: 10, 
                  cursor: 'pointer', 
                  fontWeight: 700 
                }}
              >
                {esRecurrente ? 'Editar serie' : 'Editar'}
              </button>
            )}
            {esRecurrente && onAplicarHoy && onSaltarHoy && onPosponer && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button 
                  onClick={() => onAplicarHoy(mov)} 
                  style={{ 
                    background: 'rgba(255,255,255,0.2)', 
                    border: 'none', 
                    color: '#fff', 
                    padding: '6px 10px', 
                    borderRadius: 10, 
                    cursor: 'pointer', 
                    fontWeight: 700,
                    fontSize: 12
                  }}
                >
                  Aplicar hoy
                </button>
                <button 
                  onClick={() => onSaltarHoy(mov)} 
                  style={{ 
                    background: 'rgba(0,0,0,0.2)', 
                    border: 'none', 
                    color: '#fff', 
                    padding: '6px 10px', 
                    borderRadius: 10, 
                    cursor: 'pointer', 
                    fontWeight: 700,
                    fontSize: 12
                  }}
                >
                  Saltar hoy
                </button>
                <button 
                  onClick={() => onPosponer(mov, 7)} 
                  style={{ 
                    background: 'rgba(0,0,0,0.2)', 
                    border: 'none', 
                    color: '#fff', 
                    padding: '6px 10px', 
                    borderRadius: 10, 
                    cursor: 'pointer', 
                    fontWeight: 700,
                    fontSize: 12
                  }}
                >
                  +1 semana
                </button>
                <button 
                  onClick={() => onPosponer(mov, 30)} 
                  style={{ 
                    background: 'rgba(0,0,0,0.2)', 
                    border: 'none', 
                    color: '#fff', 
                    padding: '6px 10px', 
                    borderRadius: 10, 
                    cursor: 'pointer', 
                    fontWeight: 700,
                    fontSize: 12
                  }}
                >
                  +1 mes
                </button>
              </div>
            )}
            {onDelete && (
              <button 
                onClick={() => onDelete(mov)} 
                style={{ 
                  background: 'rgba(0,0,0,0.15)', 
                  border: 'none', 
                  color: '#fff', 
                  padding: '8px 12px', 
                  borderRadius: 10, 
                  cursor: 'pointer', 
                  fontWeight: 700 
                }}
              >
                {esRecurrente ? 'Eliminar serie' : 'Eliminar'}
              </button>
            )}
          </div>
        )}
      </div>
    </li>
  );
};
