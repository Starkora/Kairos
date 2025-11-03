-- Agrega columnas de forma idempotente y compatible con MySQL 5.7/8
-- Añadir resend_count si no existe
SET @resend_count_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'usuarios_pendientes'
    AND COLUMN_NAME = 'resend_count'
);

SET @sql := IF(@resend_count_exists = 0,
  'ALTER TABLE usuarios_pendientes ADD COLUMN resend_count INT NOT NULL DEFAULT 0',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Añadir next_resend_at si no existe
SET @next_resend_at_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'usuarios_pendientes'
    AND COLUMN_NAME = 'next_resend_at'
);

SET @sql := IF(@next_resend_at_exists = 0,
  'ALTER TABLE usuarios_pendientes ADD COLUMN next_resend_at BIGINT NULL',
  'SELECT 1'
);
PREPARE stmt2 FROM @sql;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;
