# Componentes de Formulario y Tabla

Esta documentación describe los nuevos componentes reutilizables creados para mejorar la consistencia y mantenibilidad del código.

## 📦 Componentes Nuevos

### 1. ActionButtons
**Archivo:** `ActionButtons.tsx`

Botones de acción estandarizados para editar y eliminar con iconos SVG.

```tsx
import { ActionButtons, ActionButton } from './shared';

// Contenedor con ambos botones
<ActionButtons 
  onEdit={() => handleEdit(id)} 
  onDelete={() => handleDelete(id)}
/>

// Botón individual
<ActionButton 
  onClick={() => handleEdit(id)} 
  type="edit" 
  ariaLabel="Editar categoría" 
  title="Editar" 
/>
```

**Props ActionButtons:**
- `onEdit: () => void` - Callback para edición
- `onDelete: () => void` - Callback para eliminación

**Props ActionButton:**
- `onClick: () => void` - Callback al hacer clic
- `type: 'edit' | 'delete'` - Tipo de botón
- `ariaLabel: string` - Etiqueta para accesibilidad
- `title: string` - Tooltip al pasar el mouse

---

### 2. DataTable
**Archivo:** `DataTable.tsx`

Tabla de datos genérica con paginación opcional y configuración flexible de columnas.

```tsx
import { DataTable, type ColumnConfig } from './shared';

const columns: ColumnConfig<Categoria>[] = [
  { 
    header: 'Nombre', 
    accessor: 'nombre', 
    align: 'left' 
  },
  { 
    header: 'Tipo', 
    accessor: 'tipo', 
    align: 'left' 
  },
  { 
    header: 'Acciones', 
    accessor: (item) => (
      <ActionButtons 
        onEdit={() => handleEdit(item.id)} 
        onDelete={() => handleDelete(item.id)}
      />
    ),
    align: 'center',
    width: '150px'
  }
];

<DataTable
  data={categorias}
  columns={columns}
  loading={isLoading}
  className="my-table"
  wrapperClassName="table-wrapper"
  keyExtractor={(item) => item.id.toString()}
  pagination={true}
  pageSize={10}
/>
```

**Props:**
- `data: T[]` - Array de datos a mostrar
- `columns: ColumnConfig<T>[]` - Configuración de columnas
- `loading?: boolean` - Estado de carga
- `className?: string` - Clase CSS para la tabla
- `wrapperClassName?: string` - Clase CSS para el contenedor
- `keyExtractor: (item: T) => string | number` - Función para obtener key única
- `pagination?: boolean` - Habilitar paginación (default: false)
- `pageSize?: number` - Elementos por página (default: 6)

**ColumnConfig:**
- `header: string` - Texto del encabezado
- `accessor: keyof T | (item: T) => ReactNode` - Campo o función renderizadora
- `align?: 'left' | 'center' | 'right'` - Alineación (default: 'left')
- `width?: string` - Ancho de columna (ej: '150px', '30%')

---

### 3. FormComponents
**Archivo:** `FormComponents.tsx`

Conjunto de componentes para formularios con estilos consistentes.

#### FormCard
Contenedor para formularios.

```tsx
import { FormCard } from './shared';

<FormCard title="Mi Formulario">
  {/* contenido */}
</FormCard>

// Con submit
<FormCard onSubmit={handleSubmit}>
  {/* campos */}
</FormCard>
```

**Props:**
- `title?: string` - Título opcional
- `children: ReactNode` - Contenido
- `onSubmit?: (e: FormEvent) => void` - Handler de submit
- `style?: CSSProperties` - Estilos adicionales

#### FormInput
Input de texto estilizado.

```tsx
import { FormInput } from './shared';

<FormInput
  type="text"
  name="nombre"
  placeholder="Ingrese nombre"
  value={form.nombre}
  onChange={handleChange}
  label="Nombre"
  error={errors.nombre}
  required
/>
```

**Props:** Extiende HTMLInputElement props + 
- `label?: string` - Etiqueta del campo
- `error?: string` - Mensaje de error

#### FormSelect
Select estilizado con opciones.

```tsx
import { FormSelect } from './shared';

<FormSelect
  name="tipo"
  value={form.tipo}
  onChange={handleChange}
  label="Tipo"
  options={[
    { value: 'ingreso', label: 'Ingreso' },
    { value: 'egreso', label: 'Egreso' }
  ]}
/>
```

**Props:** Extiende HTMLSelectElement props +
- `label?: string` - Etiqueta del campo
- `error?: string` - Mensaje de error
- `options: Array<{ value: string | number; label: string }>` - Opciones

#### FormButton
Botón de formulario con variantes.

```tsx
import { FormButton } from './shared';

<FormButton type="submit" variant="primary">
  Guardar
</FormButton>

<FormButton type="button" variant="danger" onClick={handleDelete}>
  Eliminar
</FormButton>

<FormButton type="button" variant="secondary" fullWidth={false}>
  Cancelar
</FormButton>
```

**Props:** Extiende HTMLButtonElement props +
- `variant?: 'primary' | 'secondary' | 'danger'` - Estilo (default: 'primary')
- `fullWidth?: boolean` - Ancho completo (default: true)

#### FormGrid
Grid responsive para organizar campos de formulario.

```tsx
import { FormGrid } from './shared';

<FormGrid columns={3} gap={16}>
  <FormInput {...} />
  <FormSelect {...} />
  <FormButton {...} />
</FormGrid>
```

**Props:**
- `children: ReactNode` - Campos del formulario
- `columns?: number` - Número de columnas (default: 2)
- `gap?: number` - Espaciado entre elementos (default: 12)

---

## 🎯 Ejemplo Completo: Refactorización de Categorías

### Antes (código duplicado y difícil de mantener):
```tsx
<div style={{ background: 'var(--color-card)', borderRadius: 10, padding: 24 }}>
  <form onSubmit={handleSubmit}>
    <input
      type="text"
      name="nombre"
      placeholder="Nombre"
      value={form.nombre}
      onChange={handleChange}
      style={{ padding: 8, borderRadius: 6, width: '100%' }}
    />
    <select
      name="tipo"
      value={form.tipo}
      onChange={handleChange}
      style={{ padding: 8, borderRadius: 6, width: '100%' }}
    >
      <option value="ingreso">Ingreso</option>
      <option value="egreso">Egreso</option>
    </select>
    <button type="submit" style={{ background: 'var(--color-primary)', color: '#fff', ... }}>
      Agregar
    </button>
  </form>
</div>

<table>
  <thead>
    <tr>
      <th>Nombre</th>
      <th>Tipo</th>
      <th>Acciones</th>
    </tr>
  </thead>
  <tbody>
    {data.map(item => (
      <tr key={item.id}>
        <td>{item.nombre}</td>
        <td>{item.tipo}</td>
        <td>
          <button onClick={() => handleEdit(item.id)}>
            <svg>...</svg>
          </button>
          <button onClick={() => handleDelete(item.id)}>
            <svg>...</svg>
          </button>
        </td>
      </tr>
    ))}
  </tbody>
</table>
<!-- Paginación manual con lógica compleja -->
```

### Después (limpio, reutilizable y mantenible):
```tsx
import { 
  ActionButtons, 
  DataTable, 
  FormCard, 
  FormInput, 
  FormSelect, 
  FormButton, 
  FormGrid,
  type ColumnConfig
} from './shared';

// Configuración de columnas
const columns: ColumnConfig<any>[] = [
  { header: 'Nombre', accessor: 'nombre', align: 'left' },
  { header: 'Tipo', accessor: 'tipo', align: 'left' },
  { 
    header: 'Acciones', 
    accessor: (cat) => (
      <ActionButtons 
        onEdit={() => handleEdit(cat.id)} 
        onDelete={() => handleDelete(cat.id)}
      />
    ),
    align: 'center' 
  }
];

// Renderizado
<FormCard>
  <FormGrid columns={3}>
    <FormInput
      type="text"
      name="nombre"
      placeholder="Nombre de la categoría"
      value={form.nombre}
      onChange={handleChange}
      required
    />
    <FormSelect
      name="tipo"
      value={form.tipo}
      onChange={handleChange}
      options={[
        { value: 'ingreso', label: 'Ingreso' },
        { value: 'egreso', label: 'Egreso' }
      ]}
    />
    <FormButton type="button" onClick={handleSubmit}>
      Agregar
    </FormButton>
  </FormGrid>
</FormCard>

<FormCard>
  <DataTable
    data={categorias}
    columns={columns}
    loading={loading}
    keyExtractor={(cat) => cat.id.toString()}
    pagination={true}
    pageSize={6}
  />
</FormCard>
```

---

## ✅ Beneficios de la Refactorización

### 1. **Reducción de Código**
- Categorias.tsx: ~580 líneas → ~450 líneas (-22%)
- CategoriasCuenta.tsx: ~220 líneas → ~150 líneas (-32%)
- Eliminación de ~200 líneas de código duplicado

### 2. **Mantenibilidad**
- ✅ Cambios de estilo en un solo lugar
- ✅ Lógica centralizada (paginación, estilos, acciones)
- ✅ Más fácil agregar nuevas características
- ✅ Testing más sencillo

### 3. **Consistencia**
- ✅ Mismo look & feel en toda la aplicación
- ✅ Comportamiento predecible
- ✅ Accesibilidad estandarizada
- ✅ Responsive por defecto

### 4. **Reutilización**
- ✅ Componentes usables en cualquier parte
- ✅ API clara y documentada
- ✅ TypeScript para type safety
- ✅ Configuración flexible

### 5. **Developer Experience**
- ✅ Menos líneas de código para escribir
- ✅ Autocomplete con TypeScript
- ✅ Menos bugs por inconsistencias
- ✅ Onboarding más rápido para nuevos developers

---

## 🎨 Compatibilidad con Temas

Todos los componentes usan variables CSS para soportar modo claro/oscuro:

```css
--color-card
--color-text
--color-primary
--color-input-border
--color-table-header-bg
--color-muted
```

---

## 📱 Responsive

Los componentes se adaptan automáticamente a diferentes tamaños de pantalla:

- **FormGrid**: Se colapsa a 1 columna en móviles
- **DataTable**: Scroll horizontal automático
- **ActionButtons**: Tamaño apropiado en touch devices

---

## 🚀 Próximos Pasos

### Componentes Candidatos para Refactorización:
1. ✅ **Categorias.tsx** - Completado
2. ✅ **CategoriasCuenta.tsx** - Completado
3. **Cuentas.tsx** - Formulario de cuentas
4. **Registro.tsx** - Formulario de registro de movimientos
5. **Presupuestos.tsx** - Tabla de presupuestos

### Nuevos Componentes Potenciales:
- `SearchBar` - Barra de búsqueda con filtros
- `Card` - Tarjeta genérica con header/footer
- `Modal` - Modal reutilizable (alternativa a SweetAlert)
- `Badge` - Etiquetas de estado
- `Tabs` - Sistema de pestañas

---

## 📚 Referencias

- [Componentes Shared README](./README.md) - Documentación de otros componentes compartidos
- [Guía de Diseño Visual](../../docs/diseño-visual.md) - Estándares de diseño
- [TypeScript Handbook](https://www.typescriptlang.org/docs/) - Para tipos genéricos

---

## 💡 Tips de Uso

### 1. TypeScript Genéricos
```tsx
// Define el tipo de tus datos
interface Categoria {
  id: number;
  nombre: string;
  tipo: string;
}

// Usa el tipo en ColumnConfig
const columns: ColumnConfig<Categoria>[] = [
  { header: 'Nombre', accessor: 'nombre' }
];
```

### 2. Accessors Personalizados
```tsx
// Usar campo directo
{ header: 'Nombre', accessor: 'nombre' }

// Usar función para renderizado custom
{ 
  header: 'Acciones', 
  accessor: (item) => <CustomComponent data={item} />
}

// Formatear datos
{ 
  header: 'Fecha', 
  accessor: (item) => new Date(item.fecha).toLocaleDateString()
}
```

### 3. Estilos Personalizados
```tsx
// Extender estilos del FormCard
<FormCard style={{ maxWidth: 600, margin: '0 auto' }}>
  ...
</FormCard>

// Añadir clases CSS propias
<DataTable
  className="my-custom-table"
  wrapperClassName="my-wrapper"
  ...
/>
```

---

**Última actualización:** Noviembre 2025
