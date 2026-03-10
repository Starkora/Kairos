-- Script OPCIONAL: Convertir pagos de tarjeta antiguos al nuevo tipo
-- ADVERTENCIA: Este script modifica datos existentes. Haz BACKUP antes de ejecutar.

-- Este script identifica y convierte las transferencias que eran pagos de tarjeta
-- (registrados como dos movimientos: egreso origen + ingreso destino) 
-- al nuevo sistema de un solo movimiento tipo 'pago_tarjeta'.

-- IMPORTANTE: Solo ejecutar UNA VEZ y solo si tienes pagos de tarjeta antiguos
-- que quieres convertir al nuevo formato.

-- Paso 1: Identificar pares de movimientos que son pagos de tarjeta
-- (mismo usuario, misma fecha, mismo monto, descripción contiene "Pago" y "tarjeta")

SELECT 
    m1.id AS egreso_id,
    m1.cuenta_id AS cuenta_origen,
    m2.id AS ingreso_id,
    m2.cuenta_id AS cuenta_destino,
    m1.monto,
    m1.fecha,
    m1.descripcion
FROM movimientos m1
INNER JOIN movimientos m2 
    ON m1.usuario_id = m2.usuario_id 
    AND m1.fecha = m2.fecha
    AND m1.monto = m2.monto
    AND m1.tipo = 'egreso'
    AND m2.tipo = 'ingreso'
LEFT JOIN cuentas c2 ON m2.cuenta_id = c2.id
WHERE (
    m1.descripcion LIKE '%Pago%tarjeta%' 
    OR m1.descripcion LIKE '%Pago de tarjeta%'
    OR m2.descripcion LIKE '%Transferencia desde%tarjeta%'
    OR c2.tipo = 'tarjeta_credito'
)
ORDER BY m1.fecha DESC;

-- Paso 2 (OPCIONAL): Eliminar movimientos duplicados de ingreso a tarjetas
-- SOLO ejecutar después de verificar que los IDs son correctos

/*
DELETE m2 
FROM movimientos m1
INNER JOIN movimientos m2 
    ON m1.usuario_id = m2.usuario_id 
    AND m1.fecha = m2.fecha
    AND m1.monto = m2.monto
    AND m1.tipo = 'egreso'
    AND m2.tipo = 'ingreso'
LEFT JOIN cuentas c2 ON m2.cuenta_id = c2.id
WHERE (
    m1.descripcion LIKE '%Pago%tarjeta%' 
    OR m1.descripcion LIKE '%Pago de tarjeta%'
    OR m2.descripcion LIKE '%Transferencia desde%tarjeta%'
    OR c2.tipo = 'tarjeta_credito'
)
AND m2.categoria_id IN (
    SELECT id FROM categorias 
    WHERE nombre = 'Transferencia Interna' 
    OR nombre LIKE '%Pago Tarjeta%'
);
*/

-- Paso 3 (OPCIONAL): Convertir los movimientos de egreso a tipo 'pago_tarjeta'
-- SOLO ejecutar después de verificar que los IDs son correctos

/*
UPDATE movimientos m1
INNER JOIN movimientos m2 
    ON m1.usuario_id = m2.usuario_id 
    AND m1.fecha = m2.fecha
    AND m1.monto = m2.monto
    AND m1.tipo = 'egreso'
    AND m2.tipo = 'ingreso'
LEFT JOIN cuentas c2 ON m2.cuenta_id = c2.id
SET 
    m1.tipo = 'pago_tarjeta',
    m1.cuenta_destino_id = m2.cuenta_id,
    m1.categoria_id = NULL
WHERE (
    m1.descripcion LIKE '%Pago%tarjeta%' 
    OR m1.descripcion LIKE '%Pago de tarjeta%'
    OR m2.descripcion LIKE '%Transferencia desde%tarjeta%'
    OR c2.tipo = 'tarjeta_credito'
);
*/

-- Verificar resultados después de la conversión:
-- SELECT tipo, COUNT(*) FROM movimientos WHERE tipo = 'pago_tarjeta' GROUP BY tipo;

-- NOTAS:
-- 1. Los comandos UPDATE y DELETE están comentados por seguridad
-- 2. Primero ejecuta el SELECT para ver qué se va a modificar
-- 3. Haz BACKUP de tu base de datos antes de descomentar y ejecutar
-- 4. Si prefieres mantener historial, NO ejecutes este script
-- 5. Los nuevos pagos de tarjeta usarán automáticamente el tipo correcto
