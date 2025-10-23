# Guía de Diseño Visual Kairos Web

## Principios
- Utiliza Tailwind CSS para estilos utilitarios y responsivos.
- Mantén la estructura visual clara, moderna y accesible.
- Prefiere componentes reutilizables para botones, filas de formularios y tarjetas.

## Estructura General
- Sidebar fijo a la izquierda, fondo oscuro en modo dark.
- Contenido principal en tarjetas (`card`) con bordes redondeados y sombra.
- Tablas responsivas con scroll horizontal y vertical.
- Formularios alineados: label a la izquierda, input a la derecha.

## Componentes Reutilizables
### Botón de acción
- Usar Tailwind: `bg-transparent border-none cursor-pointer text-lg flex items-center justify-center transition-colors`
- Color por tipo: editar (`text-cyan-600`), eliminar (`text-red-600`)
- Icono: usar `react-icons` (ejemplo: `<FaEdit />`, `<FaTrash />`)

### Fila de formulario
- Estructura: `flex items-center mb-4`
- Label: `w-40 font-semibold text-left`
- Input: `flex-1 ml-4 text-right swal2-input`

### Tarjeta
- `bg-white dark:bg-gray-800 rounded-xl shadow p-6 mb-6 border`

## Ejemplo de uso de componentes
```jsx
// Botón de acción reutilizable
export function ActionButton({ icon, color, title, onClick }) {
  return (
    <button
      className={`bg-transparent border-none cursor-pointer text-lg flex items-center justify-center transition-colors ${color}`}
      title={title}
      onClick={onClick}
    >
      {icon}
    </button>
  );
}

// Fila de formulario reutilizable
export function FormRow({ label, children }) {
  return (
    <div className="flex items-center mb-4">
      <label className="w-40 font-semibold text-left">{label}</label>
      <div className="flex-1 ml-4 text-right">{children}</div>
    </div>
  );
}
```

## Paleta de colores
- Primario: `#6c4fa1` (morado)
- Secundario: `#f5f5f5` (gris claro)
- Éxito: `#4caf50` (verde)
- Peligro: `#f44336` (rojo)
- Fondo dark: `#363636`

## Tipografía
- Fuente principal: 'Segoe UI', Arial, sans-serif
- Tamaño base: 16px

## Responsive
- Usa clases Tailwind como `max-w-2xl`, `w-full`, `flex-wrap`, `gap-4`, `mb-4` para adaptar a pantallas pequeñas.

---
Este documento sirve como referencia para mantener la coherencia visual y facilitar el desarrollo colaborativo.
