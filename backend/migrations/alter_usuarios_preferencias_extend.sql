-- Migra incrementalmente la tabla usuarios_preferencias si ya existe sin created_at
-- - Agrega created_at si no existe
-- - Ajusta updated_at al formato deseado (idempotente)
-- - Asegura índice único uniq_usuario

-- Agregar created_at si no existe
SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios_preferencias' AND COLUMN_NAME = 'created_at'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE usuarios_preferencias ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Asegurar definición de updated_at (idempotente)
ALTER TABLE usuarios_preferencias
  MODIFY COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Asegurar índice único uniq_usuario
SET @idx_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios_preferencias' AND INDEX_NAME = 'uniq_usuario'
);
SET @sql := IF(@idx_exists = 0,
  'CREATE UNIQUE INDEX uniq_usuario ON usuarios_preferencias(usuario_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
