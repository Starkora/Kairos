import React from 'react';

interface ProgressBarProps {
  current: number;
  total: number;
  height?: number;
  showPercentage?: boolean;
  showLabel?: boolean;
  color?: string;
  backgroundColor?: string;
  label?: string;
  animate?: boolean;
}

/**
 * Barra de progreso reutilizable
 * Usado para mostrar progreso de deudas, metas, presupuestos, etc.
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  total,
  height = 24,
  showPercentage = true,
  showLabel = false,
  color,
  backgroundColor = 'rgba(0,0,0,0.08)',
  label,
  animate = true
}) => {
  const percentage = total > 0 ? Math.min((current / total) * 100, 100) : 0;
  
  // Color automático basado en porcentaje si no se especifica
  const getAutoColor = (): string => {
    if (color) return color;
    if (percentage >= 100) return '#4caf50';
    if (percentage >= 75) return '#8bc34a';
    if (percentage >= 50) return '#ffc107';
    if (percentage >= 25) return '#ff9800';
    return '#f44336';
  };

  const barColor = getAutoColor();

  return (
    <div style={{ width: '100%' }}>
      {showLabel && label && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginBottom: 6,
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--color-text)'
        }}>
          <span>{label}</span>
          {showPercentage && (
            <span style={{ color: barColor }}>
              {percentage.toFixed(1)}%
            </span>
          )}
        </div>
      )}
      <div style={{
        width: '100%',
        height: height,
        backgroundColor: backgroundColor,
        borderRadius: height / 2,
        overflow: 'hidden',
        position: 'relative',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          width: `${percentage}%`,
          height: '100%',
          background: `linear-gradient(90deg, ${barColor}, ${barColor}dd)`,
          borderRadius: height / 2,
          transition: animate ? 'width 0.5s ease, background 0.3s ease' : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Efecto de brillo animado */}
          {animate && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
              animation: 'shimmer 2s infinite'
            }} />
          )}
        </div>
        {showPercentage && !showLabel && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: height * 0.5,
            fontWeight: 700,
            color: percentage > 50 ? '#fff' : 'var(--color-text)',
            textShadow: percentage > 50 ? '0 1px 2px rgba(0,0,0,0.2)' : 'none',
            pointerEvents: 'none'
          }}>
            {percentage.toFixed(0)}%
          </div>
        )}
      </div>
      <style>{`
        @keyframes shimmer {
          0% { left: -100%; }
          100% { left: 200%; }
        }
      `}</style>
    </div>
  );
};

interface CircularProgressProps {
  current: number;
  total: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  showPercentage?: boolean;
  label?: string;
}

/**
 * Progreso circular
 * Ideal para cards compactas o dashboards
 */
export const CircularProgress: React.FC<CircularProgressProps> = ({
  current,
  total,
  size = 100,
  strokeWidth = 8,
  color,
  showPercentage = true,
  label
}) => {
  const percentage = total > 0 ? Math.min((current / total) * 100, 100) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const getAutoColor = (): string => {
    if (color) return color;
    if (percentage >= 100) return '#4caf50';
    if (percentage >= 75) return '#8bc34a';
    if (percentage >= 50) return '#ffc107';
    return '#f44336';
  };

  const progressColor = getAutoColor();

  return (
    <div style={{ 
      position: 'relative', 
      width: size, 
      height: size,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Círculo de fondo */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(0,0,0,0.08)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Círculo de progreso */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={progressColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ 
            transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease'
          }}
        />
      </svg>
      <div style={{
        position: 'absolute',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {showPercentage && (
          <div style={{ 
            fontSize: size * 0.2, 
            fontWeight: 700,
            color: progressColor
          }}>
            {percentage.toFixed(0)}%
          </div>
        )}
        {label && (
          <div style={{ 
            fontSize: size * 0.1, 
            color: 'var(--color-muted)',
            marginTop: 2,
            textAlign: 'center'
          }}>
            {label}
          </div>
        )}
      </div>
    </div>
  );
};
