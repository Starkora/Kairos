-- Índices para acelerar /api/insights (KPIs, presupuestos, forecast)
-- Usa INFORMATION_SCHEMA para crear solo si no existen

-- movimientos: sumas por usuario/applied/tipo/fecha y agrupación por categoria_id
SET @db := DATABASE();

-- idx_mov_user_applied_tipo_fecha
SET @q1 := IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
   WHERE TABLE_SCHEMA=@db AND TABLE_NAME='movimientos' AND INDEX_NAME='idx_mov_user_applied_tipo_fecha')=0,
  'CREATE INDEX idx_mov_user_applied_tipo_fecha ON movimientos(usuario_id, applied, tipo, fecha)',
  'SELECT 1');
PREPARE s1 FROM @q1; EXECUTE s1; DEALLOCATE PREPARE s1;

-- idx_mov_user_tipo_fecha
SET @q2 := IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
   WHERE TABLE_SCHEMA=@db AND TABLE_NAME='movimientos' AND INDEX_NAME='idx_mov_user_tipo_fecha')=0,
  'CREATE INDEX idx_mov_user_tipo_fecha ON movimientos(usuario_id, tipo, fecha)',
  'SELECT 1');
PREPARE s2 FROM @q2; EXECUTE s2; DEALLOCATE PREPARE s2;

-- idx_mov_user_categoria
SET @q3 := IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
   WHERE TABLE_SCHEMA=@db AND TABLE_NAME='movimientos' AND INDEX_NAME='idx_mov_user_categoria')=0,
  'CREATE INDEX idx_mov_user_categoria ON movimientos(usuario_id, categoria_id)',
  'SELECT 1');
PREPARE s3 FROM @q3; EXECUTE s3; DEALLOCATE PREPARE s3;

-- presupuestos: filtro por usuario/año/mes y lookups por categoria
SET @q4 := IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
   WHERE TABLE_SCHEMA=@db AND TABLE_NAME='presupuestos' AND INDEX_NAME='idx_pres_user_periodo_categoria')=0,
  'CREATE INDEX idx_pres_user_periodo_categoria ON presupuestos(usuario_id, anio, mes, categoria_id)',
  'SELECT 1');
PREPARE s4 FROM @q4; EXECUTE s4; DEALLOCATE PREPARE s4;

-- movimientos_recurrentes: filtros por usuario/tipo
SET @q5 := IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
   WHERE TABLE_SCHEMA=@db AND TABLE_NAME='movimientos_recurrentes' AND INDEX_NAME='idx_recur_user_tipo')=0,
  'CREATE INDEX idx_recur_user_tipo ON movimientos_recurrentes(usuario_id, tipo)',
  'SELECT 1');
PREPARE s5 FROM @q5; EXECUTE s5; DEALLOCATE PREPARE s5;

-- movimientos_recurrentes_excepciones: lookups por rid y fechas
SET @q6 := IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
   WHERE TABLE_SCHEMA=@db AND TABLE_NAME='movimientos_recurrentes_excepciones' AND INDEX_NAME='idx_recur_exc_rid_fechas')=0,
  'CREATE INDEX idx_recur_exc_rid_fechas ON movimientos_recurrentes_excepciones(movimiento_recurrente_id, fecha_original, fecha_nueva)',
  'SELECT 1');
PREPARE s6 FROM @q6; EXECUTE s6; DEALLOCATE PREPARE s6;

-- deudas: filtros por usuario/pagada/fecha_vencimiento
SET @q7 := IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
   WHERE TABLE_SCHEMA=@db AND TABLE_NAME='deudas' AND INDEX_NAME='idx_deudas_user_pagada_venc')=0,
  'CREATE INDEX idx_deudas_user_pagada_venc ON deudas(usuario_id, pagada, fecha_vencimiento)',
  'SELECT 1');
PREPARE s7 FROM @q7; EXECUTE s7; DEALLOCATE PREPARE s7;
