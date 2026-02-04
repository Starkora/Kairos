# Componentes Compartidos / Shared Components

Este directorio contiene componentes reutilizables que se pueden usar en toda la aplicación Kairos.

## 📦 Componentes Disponibles

### 1. IconRenderer
**Archivo:** `IconRenderer.tsx`

Renderiza iconos consistentes basados en tipos de cuenta, categorías o movimientos.

```tsx
import { IconRenderer, getColorPorTipo, getGradientPorTipo } from './shared';

// Uso básico
<IconRenderer tipo="efectivo" size={24} color="#4caf50" />

// Helpers de color
const color = getColorPorTipo('ingreso'); // '#4caf50'
const gradient = getGradientPorTipo('egreso'); // 'linear-gradient(...)'
```

**Iconos soportados:**
- **Cuentas:** efectivo, banco, tarjeta, ahorro, inversion, billetera
- **Categorías:** comida, transporte, vivienda, educacion, salud, entretenimiento, viajes, regalos, servicios, telefono, ropa, juegos, libros, mascotas, mantenimiento, compras
- **Movimientos:** ingresos, transferencia, factura, monedas

---

### 2. MovimientoCard
**Archivo:** `MovimientoCard.tsx`

Tarjeta para mostrar movimientos/transacciones con dos modos: normal y compacto.

```tsx
import { MovimientoCard } from './shared';

<MovimientoCard
  movimiento={movimiento}
  compacto={false}
  onEdit={(mov) => handleEdit(mov)}
  onDelete={(mov) => handleDelete(mov)}
  onAplicarHoy={(mov) => aplicar(mov)}
  onSaltarHoy={(mov) => saltar(mov)}
  onPosponer={(mov, dias) => posponer(mov, dias)}
  mostrarBotones={true}
/>
```

**Props:**
- `movimiento`: Objeto con datos del movimiento
- `compacto`: Vista compacta (default: false)
- `onEdit`, `onDelete`: Callbacks para acciones
- `onAplicarHoy`, `onSaltarHoy`, `onPosponer`: Para movimientos recurrentes
- `mostrarBotones`: Mostrar u ocultar botones de acción

---

### 3. EstadisticasCard
**Archivo:** `EstadisticasCard.tsx`

Tarjetas de estadísticas con gradientes personalizables.

```tsx
import { EstadisticasCard, EstadisticasMiniCards } from './shared';

// Card con gradiente
<EstadisticasCard
  titulo="📊 Estadísticas del Mes"
  estadisticas={[
    { label: 'Ingresos', valor: 5000, formato: 'moneda', color: '#4caf50', icono: '💰' },
    { label: 'Egresos', valor: -3000, formato: 'moneda', color: '#f44336' },
    { label: 'Balance', valor: 2000, formato: 'moneda' },
    { label: 'Movimientos', valor: 45, formato: 'numero' }
  ]}
  gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
  notaAdicional="Promedio del mes: S/ 150/día"
/>

// Mini cards horizontales
<EstadisticasMiniCards
  estadisticas={[
    { label: 'Total', valor: 5000, formato: 'moneda', color: '#2196f3', icono: '💵' },
    { label: 'Ahorro', valor: 15.5, formato: 'porcentaje', color: '#4caf50', icono: '🐷' }
  ]}
/>
```

**Formatos soportados:** `moneda`, `numero`, `porcentaje`

---

### 4. TimelineView
**Archivo:** `TimelineView.tsx`

Vista de línea de tiempo horizontal con burbujas proporcionales al monto.

```tsx
import { TimelineView } from './shared';

<TimelineView
  movimientos={movimientos.map(m => ({
    ...m,
    hora: m.fecha?.slice(11, 16) // Opcional: extraer hora
  }))}
  onMovimientoClick={(mov) => handleEdit(mov)}
/>
```

**Características:**
- Burbujas de tamaño proporcional al monto
- Ordenamiento automático por hora o monto
- Código de colores por tipo de movimiento
- Resumen de totales al final
- Hover effects

---

### 5. DragDrop (Drag & Drop System)
**Archivo:** `DragDrop.tsx`

Sistema completo de arrastrar y soltar para movimientos.

```tsx
import { DragDropProvider, DraggableMovimiento, DroppableDate, useDragDrop } from './shared';

// 1. Envolver la aplicación
<DragDropProvider>
  <MiComponente />
</DragDropProvider>

// 2. Hacer un elemento draggable
<DraggableMovimiento
  movimiento={mov}
  onDragStart={(m) => console.log('Arrastrando:', m)}
  onDragEnd={() => console.log('Fin')}
>
  <div>Mi contenido</div>
</DraggableMovimiento>

// 3. Hacer un área droppable
<DroppableDate
  date={new Date()}
  onDrop={(mov, newDate) => handleCambiarFecha(mov, newDate)}
>
  <div>Día 15</div>
</DroppableDate>

// 4. Usar el hook para estado global
const { draggedItem, setDraggedItem, dragOverDate, setDragOverDate } = useDragDrop();
```

---

### 6. Recordatorios (Reminders System)
**Archivo:** `Recordatorios.tsx`

Sistema de notificaciones y recordatorios visuales.

```tsx
import { RecordatoriosList, BadgeRecordatorio } from './shared';

// Lista completa de recordatorios
<RecordatoriosList
  recordatorios={[
    {
      id: 1,
      tipo: 'vencido', // 'vencido' | 'pendiente' | 'proximo' | 'completado'
      mensaje: 'Pago de luz atrasado',
      fecha: '2024-11-01',
      accion: () => aplicarPago(),
      accionTexto: 'Aplicar ahora'
    }
  ]}
  onDismiss={(id) => descartar(id)}
  maxVisible={5}
/>

// Badge con contador animado
<BadgeRecordatorio
  cantidad={recordatoriosPendientes.length}
  onClick={() => mostrarRecordatorios()}
/>
```

**Tipos de recordatorios:**
- **vencido:** Rojo, alerta urgente
- **pendiente:** Naranja, acción requerida hoy
- **proximo:** Azul, información futura
- **completado:** Verde, confirmación

---

## 🎨 Estilos y Temas

Todos los componentes respetan las variables CSS del tema:

```css
--color-text
--color-muted
--color-card
--color-accent
--color-input-border
--card-shadow
```

Los componentes se adaptan automáticamente al modo claro/oscuro.

---

## 📱 Responsive

Todos los componentes son responsive y se adaptan a:
- **Desktop:** Vista completa con todos los detalles
- **Tablet:** Diseño adaptativo con wrapping
- **Mobile:** Vista compacta automática

---

## 🔧 Uso en Componentes Existentes

### Ejemplo: Integrar en Calendario

```tsx
import {
  TimelineView,
  DragDropProvider,
  RecordatoriosList,
  BadgeRecordatorio,
  EstadisticasCard
} from './shared';

export default function Calendario() {
  // ... lógica del componente

  return (
    <DragDropProvider>
      <div className="calendario">
        {/* Estadísticas */}
        <EstadisticasCard
          titulo="📊 Estadísticas del Día"
          estadisticas={estadisticasDia}
          gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        />

        {/* Recordatorios */}
        <RecordatoriosList recordatorios={recordatoriosPendientes} />

        {/* Vista Timeline */}
        {vistaTimeline ? (
          <TimelineView movimientos={movimientos} />
        ) : (
          <ListaNormal />
        )}
      </div>
    </DragDropProvider>
  );
}
```

---

##  Próximas Mejoras

- [ ] Agregar animaciones de entrada/salida
- [ ] Soporte para temas personalizados
- [ ] Modo accesibilidad (a11y)
- [ ] Exportar componentes como biblioteca NPM separada
- [ ] Tests unitarios con Jest + React Testing Library
- [ ] Storybook para documentación interactiva

---

## 📄 Licencia

Estos componentes son parte del proyecto Kairos y siguen la misma licencia del proyecto principal.
