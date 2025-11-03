import React from 'react';

export interface StatsCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon,
  color = 'primary',
  subtitle,
  trend
}) => {
  const colorMap = {
    primary: '#6c4fa1',
    success: '#4caf50',
    warning: '#ff9800',
    danger: '#f44336',
    info: '#2196f3'
  };

  const bgColorMap = {
    primary: '#f3f0f7',
    success: '#e8f5e9',
    warning: '#fff3e0',
    danger: '#ffebee',
    info: '#e3f2fd'
  };

  // Dark mode colors
  const darkColorMap = {
    primary: '#9575cd',
    success: '#66bb6a',
    warning: '#ffa726',
    danger: '#ef5350',
    info: '#42a5f5'
  };

  const darkBgColorMap = {
    primary: 'rgba(149, 117, 205, 0.15)',
    success: 'rgba(102, 187, 106, 0.15)',
    warning: 'rgba(255, 167, 38, 0.15)',
    danger: 'rgba(239, 83, 80, 0.15)',
    info: 'rgba(66, 165, 245, 0.15)'
  };

  return (
    <div style={{
      background: 'var(--card-bg, #fff)',
      borderRadius: 12,
      padding: '20px 24px',
      boxShadow: 'var(--card-shadow, 0 2px 8px rgba(0,0,0,0.08))',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      transition: 'transform 0.2s, box-shadow 0.2s',
      cursor: 'default',
      border: `1px solid var(--border-color-${color}, ${bgColorMap[color]})`
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = 'var(--card-shadow-hover, 0 4px 12px rgba(0,0,0,0.12))';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = 'var(--card-shadow, 0 2px 8px rgba(0,0,0,0.08))';
    }}>
      {icon && (
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 10,
          background: `var(--icon-bg-${color}, ${bgColorMap[color]})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: `var(--icon-color-${color}, ${colorMap[color]})`,
          fontSize: 20,
          flexShrink: 0
        }}>
          {icon}
        </div>
      )}
      
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13,
          color: 'var(--text-secondary, #666)',
          marginBottom: 4,
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          {title}
        </div>
        
        <div 
          style={{
            fontSize: typeof value === 'string' && value.length > 25 ? 20 : 28,
            fontWeight: 700,
            color: 'var(--text-primary, #222)',
            lineHeight: 1.2,
            marginBottom: subtitle || trend ? 6 : 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
          title={typeof value === 'string' && value.length > 20 ? value : undefined}
        >
          {value}
        </div>
        
        {subtitle && (
          <div style={{
            fontSize: 12,
            color: 'var(--text-tertiary, #888)',
            marginTop: 4
          }}>
            {subtitle}
          </div>
        )}
        
        {trend && (
          <div style={{
            fontSize: 12,
            color: trend.isPositive ? 'var(--success-color, #4caf50)' : 'var(--danger-color, #f44336)',
            marginTop: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}>
            <span>{trend.isPositive ? '↗' : '↘'}</span>
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
    </div>
  );
};

export interface StatsGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
}

export const StatsGrid: React.FC<StatsGridProps> = ({ 
  children, 
  columns = 4 
}) => {
  return (
    <div 
      className="stats-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(${columns === 4 ? '200px' : columns === 3 ? '250px' : '300px'}, 1fr))`,
        gap: 16,
        marginBottom: 24
      }}
    >
      {children}
      <style>{`
        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)) !important;
          }
        }
        @media (max-width: 480px) {
          .stats-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
