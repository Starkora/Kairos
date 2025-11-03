-- Agregar columna 'applied' para marcar si el movimiento ya afectó el saldo
ALTER TABLE movimientos
  ADD COLUMN applied TINYINT(1) NOT NULL DEFAULT 1 AFTER plataforma;
