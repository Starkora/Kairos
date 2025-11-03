import React from 'react';

/**
 * Dirección de ordenamiento
 */
export type SortDirection = 'asc' | 'desc' | null;

/**
 * Configuración de ordenamiento
 */
export interface SortConfig<T> {
  key: keyof T | null;
  direction: SortDirection;
}

/**
 * Hook para manejar ordenamiento de tablas
 */
export function useSortableData<T>(
  data: T[],
  defaultSortKey?: keyof T,
  defaultDirection: SortDirection = 'asc'
) {
  const [sortConfig, setSortConfig] = React.useState<SortConfig<T>>({
    key: defaultSortKey || null,
    direction: defaultDirection
  });

  const sortedData = React.useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) {
      return data;
    }

    const sorted = [...data].sort((a, b) => {
      const aValue = a[sortConfig.key!];
      const bValue = b[sortConfig.key!];

      // Manejar valores null/undefined
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      // Comparar strings
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      // Comparar números
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc'
          ? aValue - bValue
          : bValue - aValue;
      }

      // Comparar fechas
      if (aValue instanceof Date && bValue instanceof Date) {
        return sortConfig.direction === 'asc'
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime();
      }

      // Default: comparar como strings
      return sortConfig.direction === 'asc'
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });

    return sorted;
  }, [data, sortConfig]);

  const requestSort = (key: keyof T) => {
    let direction: SortDirection = 'asc';

    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') {
        direction = 'desc';
      } else if (sortConfig.direction === 'desc') {
        direction = null; // Volver al orden original
      }
    }

    setSortConfig({ key: direction ? key : null, direction });
  };

  return { sortedData, sortConfig, requestSort };
}

/**
 * Props para SortableHeader
 */
interface SortableHeaderProps<T> {
  label: string;
  sortKey: keyof T;
  currentSort: SortConfig<T>;
  onSort: (key: keyof T) => void;
  align?: 'left' | 'center' | 'right';
}

/**
 * Header de tabla ordenable con iconos
 */
export function SortableHeader<T>({
  label,
  sortKey,
  currentSort,
  onSort,
  align = 'left'
}: SortableHeaderProps<T>) {
  const isActive = currentSort.key === sortKey;
  const direction = isActive ? currentSort.direction : null;

  return (
    <th
      onClick={() => onSort(sortKey)}
      style={{
        textAlign: align,
        padding: 8,
        cursor: 'pointer',
        userSelect: 'none',
        position: 'relative',
        transition: 'background 0.2s'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--color-hover-bg, rgba(108, 79, 161, 0.05))';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--color-table-header-bg)';
      }}
    >
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6
      }}>
        {label}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          opacity: isActive ? 1 : 0.3,
          transition: 'opacity 0.2s'
        }}>
          {/* Flecha arriba */}
          <svg
            width="10"
            height="6"
            viewBox="0 0 10 6"
            style={{
              marginBottom: -2,
              fill: direction === 'asc' ? 'var(--color-primary)' : 'currentColor'
            }}
          >
            <path d="M5 0L0 6h10L5 0z" />
          </svg>
          {/* Flecha abajo */}
          <svg
            width="10"
            height="6"
            viewBox="0 0 10 6"
            style={{
              fill: direction === 'desc' ? 'var(--color-primary)' : 'currentColor'
            }}
          >
            <path d="M5 6L10 0H0l5 6z" />
          </svg>
        </div>
      </div>
    </th>
  );
}

/**
 * Extensión de ColumnConfig para soportar ordenamiento
 */
export interface SortableColumnConfig<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  align?: 'left' | 'center' | 'right';
  width?: string;
  searchable?: boolean;
  sortable?: boolean; // Nueva prop
  sortKey?: keyof T; // Key alternativa para ordenar (útil cuando accessor es función)
}
