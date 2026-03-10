-- Agregar categoría por defecto para pagos de tarjeta de crédito
-- Esta categoría se crea solo si no existe ya

-- Para cada usuario con plataforma web, crear la categoría si no existe
INSERT INTO categorias (usuario_id, nombre, tipo, plataforma)
SELECT DISTINCT u.id, 'Pago Tarjeta de Crédito', 'egreso', 'web'
FROM usuarios u
WHERE u.plataforma = 'web'
AND NOT EXISTS (
    SELECT 1 FROM categorias c 
    WHERE c.usuario_id = u.id 
    AND c.plataforma = 'web' 
    AND c.tipo = 'egreso'
    AND LOWER(c.nombre) = 'pago tarjeta de crédito'
);

-- Comentario: Esta categoría permite categorizar los pagos de tarjeta de crédito
-- de forma separada de otros egresos. Es opcional pero recomendada.
