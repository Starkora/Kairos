import React from 'react';

/**
 * Botón de acción individual con icono SVG
 */
interface ActionButtonProps {
  onClick: () => void;
  type: 'edit' | 'delete';
  ariaLabel: string;
  title: string;
}

export const ActionButton: React.FC<ActionButtonProps> = ({ onClick, type, ariaLabel, title }) => {
  const isEdit = type === 'edit';
  const color = isEdit ? '#6c4fa1' : '#f44336';
  
  return (
    <button
      onClick={onClick}
      style={{ 
        background: 'none', 
        border: 'none', 
        padding: 6, 
        cursor: 'pointer',
        transition: 'opacity 0.2s'
      }}
      aria-label={ariaLabel}
      title={title}
      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
    >
      {isEdit ? (
        <svg 
          className="icon-accion" 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke={color} 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
        </svg>
      ) : (
        <svg 
          className="icon-accion" 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke={color} 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
      )}
    </button>
  );
};

/**
 * Contenedor de botones de acción (Editar + Eliminar)
 */
interface ActionButtonsProps {
  onEdit: () => void;
  onDelete: () => void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({ onEdit, onDelete }) => {
  return (
    <div 
      className="acciones" 
      style={{ 
        display: 'inline-flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        gap: 8 
      }}
    >
      <ActionButton 
        onClick={onEdit} 
        type="edit" 
        ariaLabel="Editar" 
        title="Editar" 
      />
      <ActionButton 
        onClick={onDelete} 
        type="delete" 
        ariaLabel="Eliminar" 
        title="Eliminar" 
      />
    </div>
  );
};
