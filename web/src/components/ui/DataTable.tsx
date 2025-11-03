import React from 'react';
import { SearchBar } from './SearchAndFilter';
import { EmptyState, LoadingSpinner, SkeletonLoader } from './LoadingSpinner';

/**
 * Configuración de columna para DataTable
 */
export interface ColumnConfig<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  align?: 'left' | 'center' | 'right';
  width?: string;
  searchable?: boolean; // Nueva prop para indicar si la columna es buscable
}

/**
 * Props para DataTable
 */
interface DataTableProps<T> {
  data: T[];
  columns: ColumnConfig<T>[];
  loading?: boolean;
  className?: string;
  wrapperClassName?: string;
  keyExtractor: (item: T) => string | number;
  pagination?: boolean;
  pageSize?: number;
  searchable?: boolean; // Habilitar búsqueda
  searchPlaceholder?: string;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  onEmptyAction?: { label: string; onClick: () => void };
}

/**
 * Componente de tabla reutilizable con paginación opcional y búsqueda
 */
export function DataTable<T>({ 
  data, 
  columns, 
  loading = false, 
  className = '', 
  wrapperClassName = '',
  keyExtractor,
  pagination = false,
  pageSize = 6,
  searchable = false,
  searchPlaceholder = 'Buscar...',
  emptyStateTitle = 'No hay datos',
  emptyStateDescription = 'No se encontraron resultados',
  onEmptyAction
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [searchTerm, setSearchTerm] = React.useState('');

  // Filtrar datos por búsqueda
  const filteredData = React.useMemo(() => {
    if (!searchable || !searchTerm) return data;

    return data.filter((item) => {
      return columns.some((column) => {
        if (column.searchable === false) return false;
        
        const value = typeof column.accessor === 'function' 
          ? null // No buscar en funciones
          : item[column.accessor];

        if (value === null || value === undefined) return false;
        
        return String(value).toLowerCase().includes(searchTerm.toLowerCase());
      });
    });
  }, [data, searchTerm, columns, searchable]);

  // Calcular paginación con datos filtrados
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const paginatedData = pagination 
    ? filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : filteredData;

  // Asegurar que la página actual esté dentro de rango
  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Reset page cuando cambia el término de búsqueda
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  if (loading) {
    return <SkeletonLoader rows={pageSize} columns={columns.length} />;
  }

  const renderCellContent = (item: T, column: ColumnConfig<T>) => {
    if (typeof column.accessor === 'function') {
      return column.accessor(item);
    }
    return (item[column.accessor] as React.ReactNode) || '';
  };

  return (
    <>
      {/* Barra de búsqueda */}
      {searchable && (
        <div style={{ marginBottom: 16 }}>
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder={searchPlaceholder}
            onClear={() => setSearchTerm('')}
          />
        </div>
      )}

      {/* Tabla o estado vacío */}
      {filteredData.length === 0 ? (
        <EmptyState
          title={emptyStateTitle}
          description={emptyStateDescription}
          action={onEmptyAction}
        />
      ) : (
        <>
          <div className={`table-responsive ${wrapperClassName}`} style={{ width: '100%', overflowX: 'auto' }}>
            <table className={className} style={{ 
              minWidth: 600,
              width: '100%', 
              borderCollapse: 'separate',
              borderSpacing: 0,
              marginTop: 12,
              border: '1px solid var(--border-color, #e0e0e0)',
              borderRadius: 8,
              overflow: 'hidden'
            }}>
              {/* Colgroup para anchos de columna */}
              {columns.some(col => col.width) && (
                <colgroup>
                  {columns.map((col, idx) => (
                    <col key={idx} style={col.width ? { width: col.width } : undefined} />
                  ))}
                </colgroup>
              )}
              
              <thead>
                <tr style={{ 
                  background: 'var(--table-header-bg, #f5f5f7)',
                  borderBottom: '2px solid var(--border-color, #e0e0e0)'
                }}>
                  {columns.map((col, idx) => (
                    <th 
                      key={idx} 
                      style={{ 
                        textAlign: col.align || 'left', 
                        padding: '14px 16px',
                        fontWeight: 600,
                        fontSize: 13,
                        color: 'var(--text-secondary, #666)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        whiteSpace: 'nowrap',
                        borderRight: idx < columns.length - 1 ? '1px solid var(--border-color, #e0e0e0)' : 'none'
                      }}
                    >
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              
              <tbody>
                {paginatedData.map((item, rowIdx) => (
                  <tr 
                    key={keyExtractor(item)} 
                    style={{ 
                      borderBottom: rowIdx < paginatedData.length - 1 ? '1px solid var(--border-color, #e0e0e0)' : 'none',
                      background: 'var(--card-bg, #fff)',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--table-row-hover, #f9f9fb)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--card-bg, #fff)';
                    }}
                  >
                    {columns.map((col, idx) => (
                      <td 
                        key={idx} 
                        style={{ 
                          textAlign: col.align || 'left', 
                          padding: '14px 16px',
                          fontWeight: idx === 0 ? 600 : 'normal',
                          color: 'var(--text-primary, #222)',
                          fontSize: 14,
                          whiteSpace: 'nowrap',
                          borderRight: idx < columns.length - 1 ? '1px solid var(--border-color, #e0e0e0)' : 'none'
                        }}
                      >
                        {renderCellContent(item, col)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Controles de paginación */}
          {pagination && filteredData.length > 0 && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginTop: 16,
              padding: '12px 0'
            }}>
              <span style={{ color: 'var(--text-secondary, #666)', fontSize: 14, fontWeight: 500 }}>
                {(() => {
                  const start = filteredData.length ? (currentPage - 1) * pageSize + 1 : 0;
                  const end = Math.min(currentPage * pageSize, filteredData.length);
                  return `Mostrando ${start}-${end} de ${filteredData.length}`;
                })()}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  style={{ 
                    padding: '8px 16px', 
                    borderRadius: 6, 
                    border: '1px solid var(--border-color, #e0e0e0)', 
                    background: currentPage <= 1 ? 'var(--card-bg, #fff)' : 'var(--primary-color, #6c4fa1)',
                    color: currentPage <= 1 ? 'var(--text-tertiary, #aaa)' : '#fff',
                    cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                    opacity: currentPage <= 1 ? 0.5 : 1,
                    fontWeight: 500,
                    fontSize: 13,
                    transition: 'all 0.2s'
                  }}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  style={{ 
                    padding: '8px 16px', 
                    borderRadius: 6, 
                    border: '1px solid var(--border-color, #e0e0e0)', 
                    background: currentPage >= totalPages ? 'var(--card-bg, #fff)' : 'var(--primary-color, #6c4fa1)',
                    color: currentPage >= totalPages ? 'var(--text-tertiary, #aaa)' : '#fff',
                    cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                    opacity: currentPage >= totalPages ? 0.5 : 1,
                    fontWeight: 500,
                    fontSize: 13,
                    transition: 'all 0.2s'
                  }}
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
