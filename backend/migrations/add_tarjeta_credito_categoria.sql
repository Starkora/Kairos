-- Agregar tipo "Tarjeta de Crédito" a las categorías de cuenta
-- La tabla solo tiene: id, nombre, created_at, usuario_id
INSERT INTO categorias_cuenta (nombre)
VALUES ('Tarjeta de Crédito')
ON DUPLICATE KEY UPDATE 
  nombre = 'Tarjeta de Crédito';
