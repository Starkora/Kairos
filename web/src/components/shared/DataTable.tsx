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
          <div className={`table-responsive ${wrapperClassName}`}>
            <table className={className} style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
              {/* Colgroup para anchos de columna */}
              {columns.some(col => col.width) && (
                <colgroup>
                  {columns.map((col, idx) => (
                    <col key={idx} style={col.width ? { width: col.width } : undefined} />
                  ))}
                </colgroup>
              )}
              
              <thead>
                <tr style={{ background: 'var(--color-table-header-bg)' }}>
                  {columns.map((col, idx) => (
                    <th 
                      key={idx} 
                      style={{ 
                        textAlign: col.align || 'left', 
                        padding: 8 
                      }}
                    >
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              
              <tbody>
                {paginatedData.map((item) => (
                  <tr 
                    key={keyExtractor(item)} 
                    style={{ borderBottom: '1px solid var(--color-input-border)' }}
                  >
                    {columns.map((col, idx) => (
                      <td 
                        key={idx} 
                        style={{ 
                          textAlign: col.align || 'left', 
                          padding: 8,
                          fontWeight: idx === 0 ? 600 : 'normal'
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
              marginTop: 12 
            }}>
              <span style={{ color: 'var(--color-muted)', fontSize: 13 }}>
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
                    padding: '6px 10px', 
                    borderRadius: 6, 
                    border: '1px solid var(--color-input-border)', 
                    background: 'var(--color-card)', 
                    cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                    opacity: currentPage <= 1 ? 0.5 : 1
                  }}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  style={{ 
                    padding: '6px 10px', 
                    borderRadius: 6, 
                    border: '1px solid var(--color-input-border)', 
                    background: 'var(--color-card)', 
                    cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                    opacity: currentPage >= totalPages ? 0.5 : 1
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
