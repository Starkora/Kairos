import React from 'react';
import type { IconType } from 'react-icons';

interface ActionButtonProps {
  // Puede ser un elemento ya creado (<FaEdit />) o el componente (FaEdit) pasado como referencia
  // Acepta un elemento React, una referencia a un componente (ElementType) o IconType de react-icons
  icon: React.ReactNode | React.ElementType | IconType;
  color: string;
  title: string;
  onClick: () => void;
}

export const ActionButton: React.FC<ActionButtonProps> = ({ icon, color, title, onClick }) => {
  // Si recibimos un elemento React válido, lo renderizamos tal cual. Si recibimos un componente
  // (ElementType), lo instanciamos con JSX dinámico.
  const renderIcon = () => {
    if (React.isValidElement(icon)) return icon;
    if (typeof icon === 'function') {
      const IconComp = icon as React.ElementType;
      return <IconComp />;
    }
    return null;
  };

  // Botón visualmente destacado con Tailwind
  return (
    <button
      className={
        `inline-flex items-center justify-center px-2 py-2 rounded-md border border-cyan-500 bg-cyan-50 text-cyan-700 shadow-sm hover:bg-cyan-100 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 transition-all duration-150 text-lg mr-1`
      }
      title={title}
      onClick={onClick}
      type="button"
    >
      {renderIcon()}
    </button>
  );
};
