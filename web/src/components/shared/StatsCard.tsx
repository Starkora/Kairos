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

  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      padding: '20px 24px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      transition: 'transform 0.2s, box-shadow 0.2s',
      cursor: 'default',
      border: `1px solid ${bgColorMap[color]}`
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
    }}>
      {icon && (
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 10,
          background: bgColorMap[color],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: colorMap[color],
          fontSize: 24,
          flexShrink: 0
        }}>
          {icon}
        </div>
      )}
      
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13,
          color: '#666',
          marginBottom: 4,
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          {title}
        </div>
        
        <div style={{
          fontSize: 28,
          fontWeight: 700,
          color: '#222',
          lineHeight: 1,
          marginBottom: subtitle || trend ? 6 : 0
        }}>
          {value}
        </div>
        
        {subtitle && (
          <div style={{
            fontSize: 12,
            color: '#888',
            marginTop: 4
          }}>
            {subtitle}
          </div>
        )}
        
        {trend && (
          <div style={{
            fontSize: 12,
            color: trend.isPositive ? '#4caf50' : '#f44336',
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
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(auto-fit, minmax(${columns === 4 ? '200px' : columns === 3 ? '250px' : '300px'}, 1fr))`,
      gap: 16,
      marginBottom: 24
    }}>
      {children}
    </div>
  );
};
