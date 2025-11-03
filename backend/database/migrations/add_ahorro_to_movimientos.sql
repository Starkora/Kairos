-- Migración: permitir el tipo 'ahorro' en la tabla movimientos
-- Recomendación: convertir la columna `tipo` a VARCHAR para evitar futuras restricciones con ENUM.
-- Opción A (recomendada): convertir a VARCHAR(32)
ALTER TABLE movimientos MODIFY COLUMN tipo VARCHAR(32) NOT NULL DEFAULT 'egreso';

-- Opción B: si prefieres mantener ENUM y solo agregar 'ahorro'
-- ALTER TABLE movimientos MODIFY COLUMN tipo ENUM('ingreso','egreso','ahorro') NOT NULL DEFAULT 'egreso';

-- Nota: Haz backup antes de ejecutar. Después de aplicar la migración, reinicia la aplicación si fuese necesario.
