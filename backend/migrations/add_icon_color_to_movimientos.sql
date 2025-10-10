-- Agrega columnas opcionales para icono y color en la tabla movimientos
ALTER TABLE movimientos
  ADD COLUMN icon VARCHAR(8) NULL AFTER descripcion,
  ADD COLUMN color VARCHAR(16) NULL AFTER icon;
