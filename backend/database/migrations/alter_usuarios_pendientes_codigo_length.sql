-- Ampliar la columna codigo para almacenar hash (bcrypt ~60 chars)
-- Idempotente: solo cambia si la longitud actual es menor a 50

SET @needs_change := (
  SELECT CASE WHEN CHARACTER_MAXIMUM_LENGTH < 50 THEN 1 ELSE 0 END
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'usuarios_pendientes'
    AND COLUMN_NAME = 'codigo'
);

SET @sql := IF(@needs_change = 1,
  'ALTER TABLE usuarios_pendientes MODIFY COLUMN codigo VARCHAR(100) NOT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
