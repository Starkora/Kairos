import React from 'react';

/**
 * Props para ExportButton
 */
interface ExportButtonProps<T> {
  data: T[];
  filename: string;
  columns?: Array<{
    header: string;
    accessor: keyof T | ((item: T) => any);
  }>;
  format?: 'csv' | 'json';
  variant?: 'primary' | 'secondary';
}

/**
 * Botón para exportar datos a CSV o JSON
 */
export function ExportButton<T>({
  data,
  filename,
  columns,
  format = 'csv',
  variant = 'secondary'
}: ExportButtonProps<T>) {
  const handleExport = () => {
    if (format === 'csv') {
      exportToCSV(data, filename, columns);
    } else {
      exportToJSON(data, filename);
    }
  };

  return (
    <button
      onClick={handleExport}
      style={{
        padding: '8px 16px',
        borderRadius: 8,
        border: variant === 'primary' ? 'none' : '1px solid var(--color-input-border)',
        background: variant === 'primary' ? 'var(--color-primary)' : 'transparent',
        color: variant === 'primary' ? '#fff' : 'var(--color-text)',
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        transition: 'all 0.2s'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = '0.9';
        if (variant === 'secondary') {
          e.currentTarget.style.borderColor = 'var(--color-primary)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = '1';
        if (variant === 'secondary') {
          e.currentTarget.style.borderColor = 'var(--color-input-border)';
        }
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      Exportar {format.toUpperCase()}
    </button>
  );
}

/**
 * Exportar datos a CSV
 */
function exportToCSV<T>(
  data: T[],
  filename: string,
  columns?: Array<{
    header: string;
    accessor: keyof T | ((item: T) => any);
  }>
) {
  if (data.length === 0) {
    alert('No hay datos para exportar');
    return;
  }

  let csvContent = '';

  // Headers
  if (columns) {
    csvContent += columns.map(col => escapeCSV(col.header)).join(',') + '\n';
  } else {
    // Usar las keys del primer objeto como headers
    const headers = Object.keys(data[0] as object);
    csvContent += headers.map(h => escapeCSV(h)).join(',') + '\n';
  }

  // Rows
  data.forEach(item => {
    if (columns) {
      const row = columns.map(col => {
        const value = typeof col.accessor === 'function'
          ? col.accessor(item)
          : item[col.accessor];
        return escapeCSV(String(value ?? ''));
      });
      csvContent += row.join(',') + '\n';
    } else {
      const values = Object.values(item as object).map(v => escapeCSV(String(v ?? '')));
      csvContent += values.join(',') + '\n';
    }
  });

  // Descargar archivo
  downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;');
}

/**
 * Exportar datos a JSON
 */
function exportToJSON<T>(data: T[], filename: string) {
  if (data.length === 0) {
    alert('No hay datos para exportar');
    return;
  }

  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, `${filename}.json`, 'application/json');
}

/**
 * Escapar valores CSV
 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Descargar archivo
 */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Grupo de botones de exportación
 */
interface ExportGroupProps<T> {
  data: T[];
  filename: string;
  columns?: Array<{
    header: string;
    accessor: keyof T | ((item: T) => any);
  }>;
}

export function ExportGroup<T>({ data, filename, columns }: ExportGroupProps<T>) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <ExportButton
        data={data}
        filename={filename}
        columns={columns}
        format="csv"
        variant="secondary"
      />
      <ExportButton
        data={data}
        filename={filename}
        format="json"
        variant="secondary"
      />
    </div>
  );
}
