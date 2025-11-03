import React, { useState } from 'react';

interface DragDropContextValue {
  draggedItem: any | null;
  setDraggedItem: (item: any | null) => void;
  dragOverDate: Date | null;
  setDragOverDate: (date: Date | null) => void;
}

const DragDropContext = React.createContext<DragDropContextValue>({
  draggedItem: null,
  setDraggedItem: () => {},
  dragOverDate: null,
  setDragOverDate: () => {}
});

/**
 * Provider para manejar el contexto de drag & drop
 */
export const DragDropProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [draggedItem, setDraggedItem] = useState<any | null>(null);
  const [dragOverDate, setDragOverDate] = useState<Date | null>(null);

  return (
    <DragDropContext.Provider value={{ draggedItem, setDraggedItem, dragOverDate, setDragOverDate }}>
      {children}
    </DragDropContext.Provider>
  );
};

export const useDragDrop = () => React.useContext(DragDropContext);

interface DraggableMovimientoProps {
  movimiento: any;
  children: React.ReactNode;
  onDragStart?: (mov: any) => void;
  onDragEnd?: () => void;
}

/**
 * Wrapper para hacer un movimiento draggable
 */
export const DraggableMovimiento: React.FC<DraggableMovimientoProps> = ({ 
  movimiento, 
  children,
  onDragStart,
  onDragEnd
}) => {
  const { setDraggedItem } = useDragDrop();

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify(movimiento));
    setDraggedItem(movimiento);
    onDragStart?.(movimiento);
    
    // Añadir estilo visual al elemento arrastrado
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
    setDraggedItem(null);
    onDragEnd?.();
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      style={{ cursor: 'grab' }}
    >
      {children}
    </div>
  );
};

interface DroppableDateProps {
  date: Date;
  onDrop: (mov: any, newDate: Date) => void;
  children: React.ReactNode;
}

/**
 * Wrapper para hacer una fecha/día droppable
 */
export const DroppableDate: React.FC<DroppableDateProps> = ({ 
  date, 
  onDrop, 
  children 
}) => {
  const { draggedItem, setDragOverDate } = useDragDrop();
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsOver(true);
    setDragOverDate(date);
  };

  const handleDragLeave = () => {
    setIsOver(false);
    setDragOverDate(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    setDragOverDate(null);

    if (draggedItem) {
      onDrop(draggedItem, date);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        position: 'relative',
        transition: 'all 0.2s ease',
        ...(isOver ? {
          background: 'rgba(103, 58, 183, 0.1)',
          borderRadius: 8,
          boxShadow: '0 0 0 2px var(--color-accent)'
        } : {})
      }}
    >
      {children}
      {isOver && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'var(--color-accent)',
          color: '#fff',
          padding: '8px 16px',
          borderRadius: 8,
          fontWeight: 700,
          fontSize: 14,
          pointerEvents: 'none',
          zIndex: 10,
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
        }}>
          Soltar aquí para cambiar fecha
        </div>
      )}
    </div>
  );
};
