-- Extender la longitud de la columna icon en movimientos para soportar nombres de iconos más largos
-- Fecha: 2025-01-04
-- Razón: Los nombres de iconos como 'FaMoneyBillWave' (16 caracteres) exceden el límite actual de VARCHAR(8)

ALTER TABLE movimientos
  MODIFY COLUMN icon VARCHAR(20) NULL;

-- También actualizar movimientos_recurrentes si existe la columna
ALTER TABLE movimientos_recurrentes
  MODIFY COLUMN icon VARCHAR(20) NULL;
