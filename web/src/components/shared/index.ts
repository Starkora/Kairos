// Exportar todos los componentes compartidos
export { IconRenderer, getColorPorTipo, getGradientPorTipo } from './IconRenderer';
export { MovimientoCard } from './MovimientoCard';
export { EstadisticasCard, EstadisticasMiniCards } from './EstadisticasCard';
export { TimelineView } from './TimelineView';
export { 
  DragDropProvider, 
  useDragDrop, 
  DraggableMovimiento, 
  DroppableDate 
} from './DragDrop';
export { 
  RecordatoriosList, 
  BadgeRecordatorio 
} from './Recordatorios';
export { ProgressBar, CircularProgress } from './ProgressBar';
export { ActionButton, ActionButtons } from './ActionButtons';
export { DataTable } from './DataTable';
export type { ColumnConfig } from './DataTable';
export { 
  FormCard, 
  FormInput, 
  FormSelect, 
  FormButton, 
  FormGrid 
} from './FormComponents';
export { 
  LoadingSpinner, 
  EmptyState, 
  SkeletonLoader 
} from './LoadingSpinner';
export { 
  SearchBar, 
  FilterButton, 
  FilterGroup 
} from './SearchAndFilter';
export { 
  ToastProvider, 
  useToast, 
  toast 
} from './Toast';
