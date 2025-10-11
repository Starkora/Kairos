-- Migración: permitir el tipo 'ahorro' en la tabla categorias
-- Recomendación: convertir la columna `tipo` a VARCHAR para evitar futuras restricciones con ENUM.
-- Opciones (elige una y ejecútala en tu servidor MySQL):

-- Opción A: convertir a VARCHAR(32) (recomendada)
ALTER TABLE categorias MODIFY COLUMN tipo VARCHAR(32) NOT NULL DEFAULT 'egreso';

-- Opción B: si prefieres mantener ENUM y solo agregar 'ahorro' (más arriesgado si otros entornos difieren):
-- ALTER TABLE categorias MODIFY COLUMN tipo ENUM('ingreso','egreso','ahorro') NOT NULL DEFAULT 'egreso';

-- Nota: Haz respaldo antes de ejecutar. Después de aplicar la migración, reinicia la aplicación si fuese necesario.
