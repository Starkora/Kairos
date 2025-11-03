-- Hacer los índices únicos por plataforma para permitir el mismo email/numero en distintas plataformas
-- NOTA: este script intenta ser idempotente, pero si existen constraints con nombres diferentes, ajústalos manualmente.

SET @hasPlat := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'plataforma'
);

-- Asegurar columna plataforma
SET @sql := IF(@hasPlat = 0,
  'ALTER TABLE usuarios ADD COLUMN plataforma VARCHAR(20) DEFAULT ''web''',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Quitar únicos simples si existen
SET @hasUniqueEmail := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND INDEX_NAME = 'email' AND NON_UNIQUE = 0
);
SET @sql := IF(@hasUniqueEmail = 1,
  'ALTER TABLE usuarios DROP INDEX `email`',
  'SELECT 1'
);
PREPARE stmt2 FROM @sql; EXECUTE stmt2; DEALLOCATE PREPARE stmt2;

SET @hasUniqueNumero := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND INDEX_NAME = 'numero' AND NON_UNIQUE = 0
);
SET @sql := IF(@hasUniqueNumero = 1,
  'ALTER TABLE usuarios DROP INDEX `numero`',
  'SELECT 1'
);
PREPARE stmt3 FROM @sql; EXECUTE stmt3; DEALLOCATE PREPARE stmt3;

-- Crear índices únicos compuestos (email, plataforma) y (numero, plataforma)
SET @hasUniqueEmailPlat := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND INDEX_NAME = 'uniq_email_plat' AND NON_UNIQUE = 0
);
SET @sql := IF(@hasUniqueEmailPlat = 0,
  'ALTER TABLE usuarios ADD UNIQUE KEY `uniq_email_plat` (email, plataforma)',
  'SELECT 1'
);
PREPARE stmt4 FROM @sql; EXECUTE stmt4; DEALLOCATE PREPARE stmt4;

SET @hasUniqueNumeroPlat := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND INDEX_NAME = 'uniq_numero_plat' AND NON_UNIQUE = 0
);
SET @sql := IF(@hasUniqueNumeroPlat = 0,
  'ALTER TABLE usuarios ADD UNIQUE KEY `uniq_numero_plat` (numero, plataforma)',
  'SELECT 1'
);
PREPARE stmt5 FROM @sql; EXECUTE stmt5; DEALLOCATE PREPARE stmt5;
