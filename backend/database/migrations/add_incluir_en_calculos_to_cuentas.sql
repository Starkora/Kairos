-- Agregar campo para marcar si la cuenta debe incluirse en cálculos de ingresos/egresos/ahorro
ALTER TABLE cuentas ADD COLUMN incluir_en_calculos BOOLEAN DEFAULT TRUE;

-- Por defecto, todas las cuentas existentes se marcarán como incluidas
UPDATE cuentas SET incluir_en_calculos = TRUE WHERE incluir_en_calculos IS NULL;

-- Comentario: Este campo determina si los movimientos de esta cuenta 
-- se deben considerar en los cálculos de ingresos, egresos y ahorro.
-- Solo las cuentas marcadas como TRUE (típicamente la cuenta sueldo o cuentas principales)
-- se considerarán en estos cálculos.
