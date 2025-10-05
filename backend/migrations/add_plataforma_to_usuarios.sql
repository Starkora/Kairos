ALTER TABLE usuarios ADD COLUMN plataforma VARCHAR(20) DEFAULT 'web';

ALTER TABLE cuentas ADD COLUMN plataforma VARCHAR(20) DEFAULT 'web';
ALTER TABLE deudas ADD COLUMN plataforma VARCHAR(20) DEFAULT 'web';
ALTER TABLE categorias ADD COLUMN plataforma VARCHAR(20) DEFAULT 'web';
ALTER TABLE movimientos ADD COLUMN plataforma VARCHAR(20) DEFAULT 'web';
ALTER TABLE metas ADD COLUMN plataforma VARCHAR(20) DEFAULT 'web';
-- Repite este patrón en otras tablas si necesitas independencia por plataforma.
