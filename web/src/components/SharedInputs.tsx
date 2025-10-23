// Este archivo permite compartir los selectores de tipo, frecuencia, categoría y color entre Registro y MovimientosRecurrentes
// para evitar duplicación y mantener la lógica centralizada.
import React from 'react';

export function TipoSelect({ value, onChange, ...props }) {
  return (
    <select name="tipo" value={value} onChange={onChange} {...props}>
      <option value="ingreso">Ingreso</option>
      <option value="egreso">Egreso</option>
      <option value="ahorro">Ahorro</option>
    </select>
  );
}

export function FrecuenciaSelect({ value, onChange, ...props }) {
  return (
    <select name="frecuencia" value={value} onChange={onChange} {...props}>
      <option value="mensual">Mensual</option>
      <option value="semanal">Semanal</option>
      <option value="diaria">Diaria</option>
    </select>
  );
}

export function ColorInput({ value, onChange, ...props }) {
  return (
    <input type="color" name="color" value={value} onChange={onChange} style={{ width: 48, height: 36, padding: 0, border: 'none', background: 'transparent' }} {...props} />
  );
}
