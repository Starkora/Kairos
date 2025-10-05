-- Migración para hacer categorias_cuenta multiusuario
ALTER TABLE categorias_cuenta ADD COLUMN usuario_id INT;
ALTER TABLE categorias_cuenta ADD CONSTRAINT fk_categorias_cuenta_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id);
