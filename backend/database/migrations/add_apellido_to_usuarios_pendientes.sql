-- Idempotente: agrega columna 'apellido' a usuarios_pendientes si no existe
DELIMITER //
DROP PROCEDURE IF EXISTS add_apellido_if_not_exists //
CREATE PROCEDURE add_apellido_if_not_exists()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'usuarios_pendientes'
      AND COLUMN_NAME = 'apellido'
  ) THEN
    SET @s = 'ALTER TABLE usuarios_pendientes ADD COLUMN apellido VARCHAR(100) NULL AFTER nombre';
    PREPARE stmt FROM @s;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END //
CALL add_apellido_if_not_exists() //
DROP PROCEDURE add_apellido_if_not_exists //
DELIMITER ;
