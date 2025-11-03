-- Crea un evento en MySQL para limpiar usuarios_pendientes expirados cada minuto
-- Requiere EVENT_SCHEDULER=ON y permisos para crear eventos
-- expires está almacenado como BIGINT en milisegundos

-- Intentar habilitar el Event Scheduler de manera segura (si hay permisos)
DELIMITER $$
CREATE PROCEDURE ensure_event_scheduler_on()
BEGIN
  DECLARE v_scheduler VARCHAR(16);
  DECLARE CONTINUE HANDLER FOR SQLEXCEPTION BEGIN END; -- Ignora errores de permiso
  SELECT @@event_scheduler INTO v_scheduler;
  IF v_scheduler = 'OFF' OR v_scheduler = 'DISABLED' THEN
    SET @enable_cmd := 'SET GLOBAL event_scheduler = ON';
    PREPARE stmt FROM @enable_cmd;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;
CALL ensure_event_scheduler_on();
DROP PROCEDURE ensure_event_scheduler_on;

CREATE EVENT IF NOT EXISTS ev_cleanup_usuarios_pendientes
ON SCHEDULE EVERY 1 MINUTE
DO
  DELETE FROM usuarios_pendientes
  WHERE expires IS NOT NULL AND expires < (UNIX_TIMESTAMP() * 1000);
