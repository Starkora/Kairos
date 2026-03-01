-- PASO 1: Agregar campos para manejo de tarjetas de crédito
-- Ejecutar esta migración primero

ALTER TABLE cuentas
ADD COLUMN limite_credito DECIMAL(15,2) DEFAULT NULL COMMENT 'Límite de crédito disponible (solo para tarjetas de crédito)',
ADD COLUMN deuda_actual DECIMAL(15,2) DEFAULT 0 COMMENT 'Deuda actual en tarjeta de crédito',
ADD COLUMN saldo_disponible DECIMAL(15,2) DEFAULT NULL COMMENT 'Crédito disponible = limite_credito - deuda_actual';
