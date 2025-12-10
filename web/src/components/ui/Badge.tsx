import React from 'react';
import { MdTrendingUp, MdTrendingDown, MdSavings } from 'react-icons/md';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  outlined?: boolean;
  rounded?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  outlined = false,
  rounded = false
}) => {
  const colorMap = {
    primary: { bg: '#6c4fa1', text: '#fff', border: '#6c4fa1' },
    success: { bg: '#4caf50', text: '#fff', border: '#4caf50' },
    warning: { bg: '#ff9800', text: '#fff', border: '#ff9800' },
    danger: { bg: '#f44336', text: '#fff', border: '#f44336' },
    info: { bg: '#2196f3', text: '#fff', border: '#2196f3' },
    secondary: { bg: '#757575', text: '#fff', border: '#757575' }
  };

  const outlinedColorMap = {
    primary: { bg: '#f3f0f7', text: '#6c4fa1', border: '#6c4fa1' },
    success: { bg: '#e8f5e9', text: '#2e7d32', border: '#4caf50' },
    warning: { bg: '#fff3e0', text: '#e65100', border: '#ff9800' },
    danger: { bg: '#ffebee', text: '#c62828', border: '#f44336' },
    info: { bg: '#e3f2fd', text: '#1565c0', border: '#2196f3' },
    secondary: { bg: '#f5f5f5', text: '#424242', border: '#757575' }
  };

  const sizeMap = {
    sm: { padding: '2px 8px', fontSize: 11 },
    md: { padding: '4px 12px', fontSize: 13 },
    lg: { padding: '6px 16px', fontSize: 14 }
  };

  const colors = outlined ? outlinedColorMap[variant] : colorMap[variant];
  const sizing = sizeMap[size];

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: sizing.padding,
      fontSize: sizing.fontSize,
      fontWeight: 600,
      borderRadius: rounded ? 100 : 6,
      background: colors.bg,
      color: colors.text,
      border: outlined ? `1.5px solid ${colors.border}` : 'none',
      textTransform: 'capitalize',
      whiteSpace: 'nowrap',
      letterSpacing: '0.3px'
    }}>
      {children}
    </span>
  );
};

// Badge específico para tipos de categoría
export interface CategoryBadgeProps {
  tipo: 'ingreso' | 'egreso' | 'ahorro';
  size?: 'sm' | 'md' | 'lg';
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({ tipo, size = 'md' }) => {
  const variantMap = {
    ingreso: 'success' as const,
    egreso: 'danger' as const,
    ahorro: 'info' as const
  };

  const labelMap = {
    ingreso: 'Ingreso',
    egreso: 'Egreso',
    ahorro: 'Ahorro'
  };

  const iconMap = {
    ingreso: MdTrendingUp,
    egreso: MdTrendingDown,
    ahorro: MdSavings
  };

  const IconComponent = iconMap[tipo];

  return (
    <Badge variant={variantMap[tipo]} size={size} rounded>
      <>
        {React.createElement(IconComponent as any, { 
          size: 16,
          style: { 
            marginRight: 6,
            verticalAlign: 'middle',
            minWidth: '16px',
            minHeight: '16px'
          } 
        })}
        {labelMap[tipo]}
      </>
    </Badge>
  );
};
