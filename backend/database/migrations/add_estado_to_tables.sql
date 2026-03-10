-- =====================================================
-- Migración: Agregar control de estados (soft delete)
-- Fecha: 2026-03-10
-- Descripción: Agrega columna 'estado' a tablas principales
--              para implementar eliminación lógica en lugar
--              de eliminación física (mejor backup/control)
-- =====================================================

-- 1. Agregar columna estado a movimientos
ALTER TABLE movimientos 
ADD COLUMN estado ENUM('activo', 'eliminado', 'archivado') NOT NULL DEFAULT 'activo'
AFTER plataforma;

-- 2. Agregar columna estado a cuentas
ALTER TABLE cuentas 
ADD COLUMN estado ENUM('activo', 'eliminado', 'archivado') NOT NULL DEFAULT 'activo'
AFTER activa;

-- 3. Agregar columna estado a categorias
ALTER TABLE categorias 
ADD COLUMN estado ENUM('activo', 'eliminado') NOT NULL DEFAULT 'activo'
AFTER usuario_id;

-- 4. Agregar columna estado a movimientos_recurrentes
ALTER TABLE movimientos_recurrentes 
ADD COLUMN estado ENUM('activo', 'eliminado', 'pausado') NOT NULL DEFAULT 'activo'
AFTER indefinido;

-- 5. Crear índices para mejorar rendimiento de filtros por estado
CREATE INDEX idx_movimientos_estado ON movimientos(estado);
CREATE INDEX idx_cuentas_estado ON cuentas(estado);
CREATE INDEX idx_categorias_estado ON categorias(estado);
CREATE INDEX idx_movimientos_recurrentes_estado ON movimientos_recurrentes(estado);

-- 6. Agregar columnas de auditoría (opcional pero recomendado)
ALTER TABLE movimientos
ADD COLUMN eliminado_en DATETIME NULL AFTER estado;

ALTER TABLE movimientos
ADD COLUMN eliminado_por INT NULL AFTER eliminado_en;

ALTER TABLE cuentas
ADD COLUMN eliminado_en DATETIME NULL AFTER estado;

ALTER TABLE cuentas
ADD COLUMN eliminado_por INT NULL AFTER eliminado_en;

-- 7. Crear vista para movimientos activos (facilita queries)
DROP VIEW IF EXISTS movimientos_activos;
CREATE VIEW movimientos_activos AS
SELECT * FROM movimientos WHERE estado = 'activo';

-- 8. Crear vista para cuentas activas
DROP VIEW IF EXISTS cuentas_activas;
CREATE VIEW cuentas_activas AS
SELECT * FROM cuentas WHERE estado = 'activo';

-- =====================================================
-- Notas:
-- - 'activo': Registro normal visible
-- - 'eliminado': Soft delete (oculto pero recuperable)
-- - 'archivado': Datos históricos (opcional)
-- - 'pausado': Solo para movimientos recurrentes
-- =====================================================
