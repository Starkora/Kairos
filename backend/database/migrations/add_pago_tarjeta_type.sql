-- Migración: Habilitar el tipo 'pago_tarjeta' en movimientos
-- NOTA: Si tu tabla movimientos usa ENUM, primero ejecuta add_ahorro_to_movimientos.sql
-- para convertir el tipo a VARCHAR(32). Esta migración solo documenta el nuevo tipo.

-- Verificar que la columna tipo es VARCHAR (no ENUM)
-- Si es ENUM, ejecuta primero: ALTER TABLE movimientos MODIFY COLUMN tipo VARCHAR(32) NOT NULL DEFAULT 'egreso';

-- No se requiere ALTER TABLE si ya es VARCHAR
-- El tipo 'pago_tarjeta' se puede usar directamente

-- IMPORTANTE: Los pagos de tarjeta de crédito ahora se registran como UN SOLO movimiento
-- en lugar de crear dos (egreso origen + ingreso destino).
-- Esto evita que se cuenten como ingresos en las estadísticas.

-- Características del tipo 'pago_tarjeta':
-- - Solo afecta el saldo de las cuentas (origen disminuye, destino aumenta)
-- - NO se cuenta en ingresos, egresos ni ahorros para estadísticas
-- - Se excluye automáticamente de los cálculos de insights
-- - En exportaciones Excel aparece como "Pago Tarjeta Crédito" 

-- No hay cambios de esquema requeridos si ya tienes VARCHAR
SELECT 'La columna tipo ya soporta pago_tarjeta si es VARCHAR' AS mensaje;
