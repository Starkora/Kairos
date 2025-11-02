CREATE TABLE IF NOT EXISTS presupuestos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  categoria_id INT NOT NULL,
  anio INT NOT NULL,
  mes INT NOT NULL,
  monto DECIMAL(12,2) NOT NULL,
  UNIQUE KEY uniq_user_cat_month (usuario_id, categoria_id, anio, mes)
);
