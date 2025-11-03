import React from 'react';

/**
 * Props para LoadingSpinner
 */
interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  text?: string;
}

/**
 * Spinner de carga reutilizable
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium', 
  color = 'var(--color-primary)',
  text 
}) => {
  const sizes = {
    small: 20,
    medium: 40,
    large: 60
  };

  const spinnerSize = sizes[size];

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      gap: 12,
      padding: 20
    }}>
      <div 
        style={{
          width: spinnerSize,
          height: spinnerSize,
          border: `3px solid ${color}20`,
          borderTop: `3px solid ${color}`,
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }}
      />
      {text && (
        <p style={{ 
          color: 'var(--color-muted)', 
          fontSize: 14,
          margin: 0 
        }}>
          {text}
        </p>
      )}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

/**
 * Props para EmptyState
 */
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Estado vacío con call-to-action
 */
export const EmptyState: React.FC<EmptyStateProps> = ({ 
  icon, 
  title, 
  description, 
  action 
}) => {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '60px 20px',
      textAlign: 'center'
    }}>
      {icon && (
        <div style={{ 
          fontSize: 48, 
          opacity: 0.3,
          marginBottom: 16 
        }}>
          {icon}
        </div>
      )}
      <h3 style={{ 
        color: 'var(--color-text)', 
        fontSize: 18,
        fontWeight: 600,
        marginBottom: 8,
        margin: 0
      }}>
        {title}
      </h3>
      {description && (
        <p style={{ 
          color: 'var(--color-muted)', 
          fontSize: 14,
          maxWidth: 400,
          marginBottom: action ? 24 : 0,
          margin: '8px 0'
        }}>
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          style={{
            background: 'var(--color-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 20px',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 14,
            transition: 'opacity 0.2s',
            marginTop: 16
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

/**
 * Props para SkeletonLoader
 */
interface SkeletonLoaderProps {
  rows?: number;
  columns?: number;
  height?: number;
}

/**
 * Skeleton loader para tablas
 */
export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ 
  rows = 5, 
  columns = 3,
  height = 40
}) => {
  return (
    <div style={{ width: '100%' }}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div 
          key={rowIndex}
          style={{ 
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: 12,
            padding: 12,
            borderBottom: '1px solid var(--color-input-border)'
          }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={colIndex}
              style={{
                height,
                background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                backgroundSize: '200% 100%',
                animation: 'loading 1.5s ease-in-out infinite',
                borderRadius: 4
              }}
            />
          ))}
        </div>
      ))}
      <style>{`
        @keyframes loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
};
