-- PASO 3 (Opcional): Crear vista para facilitar consultas de tarjetas de crédito
-- Ejecutar DESPUÉS de add_tarjeta_credito_trigger.sql

DROP VIEW IF EXISTS v_tarjetas_credito;

CREATE VIEW v_tarjetas_credito AS
SELECT 
  id,
  usuario_id,
  nombre,
  tipo,
  limite_credito,
  deuda_actual,
  saldo_disponible,
  CASE 
    WHEN limite_credito > 0 THEN (deuda_actual / limite_credito) * 100
    ELSE 0
  END AS porcentaje_uso,
  activa,
  plataforma
FROM cuentas
WHERE tipo LIKE '%Tarjeta%' OR tipo LIKE '%Crédito%' OR tipo = 'Tarjeta de Crédito';
