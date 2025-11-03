import React from 'react';

/**
 * Props para SearchBar
 */
interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onClear?: () => void;
}

/**
 * Barra de búsqueda reutilizable
 */
export const SearchBar: React.FC<SearchBarProps> = ({ 
  value, 
  onChange, 
  placeholder = 'Buscar...', 
  onClear 
}) => {
  // Detectar móvil para ajustar padding del placeholder más a la derecha
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 768;
  });

  React.useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div style={{ 
      position: 'relative', 
      width: '100%', 
      maxWidth: 400 
    }}>
      {/** Cálculos para mantener un margen seguro entre el ícono y el placeholder */}
      {(() => {
        return null;
      })()}
      <input
        className="search-input"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          // Padding dinámico: dejamos un gap constante (12px móvil, 10px desktop)
          paddingTop: 10,
          paddingRight: 40,
          paddingBottom: 10,
          paddingLeft: `${(isMobile ? 14 : 12) + (isMobile ? 18 : 16) + (isMobile ? 12 : 10)}px`,
          borderRadius: 8,
          border: '1px solid var(--color-input-border)',
          background: 'var(--color-card)',
          color: 'var(--color-text)',
          fontSize: 14,
          transition: 'border-color 0.2s'
        }}
        onFocus={(e) => e.currentTarget.style.borderColor = 'var(--color-primary)'}
        onBlur={(e) => e.currentTarget.style.borderColor = 'var(--color-input-border)'}
      />
      {/* Icono de búsqueda */}
      <svg
        style={{
          position: 'absolute',
          left: isMobile ? 14 : 12,
          top: '50%',
          transform: 'translateY(-50%)',
          width: isMobile ? 18 : 16,
          height: isMobile ? 18 : 16,
          opacity: 0.5,
          pointerEvents: 'none'
        }}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
        />
      </svg>
      {/* Botón de limpiar */}
      {value && (
        <button
          onClick={() => {
            onChange('');
            onClear?.();
          }}
          style={{
            position: 'absolute',
            right: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.5,
            transition: 'opacity 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.5'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

/**
 * Props para FilterButton
 */
interface FilterButtonProps {
  label: string;
  active?: boolean;
  count?: number;
  onClick: () => void;
}

/**
 * Botón de filtro con badge de contador
 */
export const FilterButton: React.FC<FilterButtonProps> = ({ 
  label, 
  active = false, 
  count, 
  onClick 
}) => {
  return (
    <button
      onClick={onClick}
      className="filter-button"
      style={{
        padding: '10px 18px',
        borderRadius: 20,
        border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-input-border)'}`,
        background: active ? 'var(--color-primary)' : 'transparent',
        color: active ? '#fff' : 'var(--color-text)',
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        transition: 'all 0.2s',
        whiteSpace: 'nowrap',
        minHeight: '40px'
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.borderColor = 'var(--color-primary)';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.borderColor = 'var(--color-input-border)';
        }
      }}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span style={{
          background: active ? 'rgba(255,255,255,0.3)' : 'var(--color-primary)',
          color: active ? '#fff' : '#fff',
          borderRadius: 10,
          padding: '3px 9px',
          fontSize: 12,
          fontWeight: 700,
          minWidth: 22,
          textAlign: 'center'
        }}>
          {count}
        </span>
      )}
    </button>
  );
};

/**
 * Props para FilterGroup
 */
interface FilterGroupProps {
  children: React.ReactNode;
  title?: string;
}

/**
 * Contenedor de filtros
 */
export const FilterGroup: React.FC<FilterGroupProps> = ({ children, title }) => {
  return (
    <div style={{ marginBottom: 16 }}>
      {title && (
        <label style={{
          display: 'block',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--color-text)',
          marginBottom: 8
        }}>
          {title}
        </label>
      )}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8
      }}>
        {children}
      </div>
    </div>
  );
};
