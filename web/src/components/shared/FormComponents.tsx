import React from 'react';

/**
 * Props para FormCard - Contenedor de formulario
 */
interface FormCardProps {
  title?: string;
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  style?: React.CSSProperties;
}

/**
 * Contenedor de formulario con estilos consistentes
 */
export const FormCard: React.FC<FormCardProps> = ({ title, children, onSubmit, style }) => {
  return (
    <div style={{ 
      background: 'var(--color-card)', 
      borderRadius: 10, 
      padding: 24, 
      marginBottom: title ? 32 : 0,
      ...style
    }}>
      {title && (
        <h3 style={{ 
          marginBottom: 16, 
          fontSize: 18, 
          fontWeight: 600, 
          color: 'var(--color-text)' 
        }}>
          {title}
        </h3>
      )}
      {onSubmit ? (
        <form onSubmit={onSubmit}>
          {children}
        </form>
      ) : (
        children
      )}
    </div>
  );
};

/**
 * Props para FormInput
 */
interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

/**
 * Input de formulario con estilos consistentes
 */
export const FormInput: React.FC<FormInputProps> = ({ label, error, style, ...props }) => {
  return (
    <div style={{ width: '100%' }}>
      {label && (
        <label style={{ 
          display: 'block', 
          marginBottom: 6, 
          fontSize: 14, 
          fontWeight: 500,
          color: 'var(--color-text)'
        }}>
          {label}
        </label>
      )}
      <input 
        {...props}
        style={{ 
          padding: 8, 
          borderRadius: 6, 
          width: '100%', 
          minWidth: 0,
          border: '1px solid var(--color-input-border)',
          background: 'var(--color-card)',
          color: 'var(--color-text)',
          ...style
        }}
      />
      {error && (
        <span style={{ 
          display: 'block', 
          marginTop: 4, 
          fontSize: 12, 
          color: '#f44336' 
        }}>
          {error}
        </span>
      )}
    </div>
  );
};

/**
 * Props para FormSelect
 */
interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string | number; label: string }>;
}

/**
 * Select de formulario con estilos consistentes
 */
export const FormSelect: React.FC<FormSelectProps> = ({ label, error, options, style, ...props }) => {
  return (
    <div style={{ width: '100%' }}>
      {label && (
        <label style={{ 
          display: 'block', 
          marginBottom: 6, 
          fontSize: 14, 
          fontWeight: 500,
          color: 'var(--color-text)'
        }}>
          {label}
        </label>
      )}
      <select 
        {...props}
        style={{ 
          padding: 8, 
          borderRadius: 6, 
          width: '100%', 
          minWidth: 0,
          border: '1px solid var(--color-input-border)',
          background: 'var(--color-card)',
          color: 'var(--color-text)',
          ...style
        }}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <span style={{ 
          display: 'block', 
          marginTop: 4, 
          fontSize: 12, 
          color: '#f44336' 
        }}>
          {error}
        </span>
      )}
    </div>
  );
};

/**
 * Props para FormButton
 */
interface FormButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  fullWidth?: boolean;
}

/**
 * Botón de formulario con estilos consistentes
 */
export const FormButton: React.FC<FormButtonProps> = ({ 
  variant = 'primary', 
  fullWidth = true,
  children, 
  style,
  ...props 
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return { 
          background: 'var(--color-primary)', 
          color: '#fff' 
        };
      case 'secondary':
        return { 
          background: 'transparent', 
          color: 'var(--color-text)',
          border: '1px solid var(--color-input-border)'
        };
      case 'danger':
        return { 
          background: '#f44336', 
          color: '#fff' 
        };
      default:
        return {};
    }
  };

  return (
    <button 
      {...props}
      style={{ 
        border: 'none', 
        borderRadius: 8, 
        padding: '8px 16px', 
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'opacity 0.2s',
        width: fullWidth ? '100%' : 'auto',
        ...getVariantStyles(),
        ...style
      }}
      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
    >
      {children}
    </button>
  );
};

/**
 * Grid de formulario responsive
 */
interface FormGridProps {
  children: React.ReactNode;
  columns?: number;
  gap?: number;
}

export const FormGrid: React.FC<FormGridProps> = ({ children, columns = 2, gap = 12 }) => {
  return (
    <div className="categories-form" style={{ 
      display: 'grid', 
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap,
      marginBottom: 24,
      alignItems: 'end'
    }}>
      {children}
    </div>
  );
};
