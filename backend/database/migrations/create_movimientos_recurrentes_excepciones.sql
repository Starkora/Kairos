CREATE TABLE IF NOT EXISTS movimientos_recurrentes_excepciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  movimiento_recurrente_id INT NOT NULL,
  usuario_id INT NOT NULL,
  fecha_original DATE NOT NULL,
  accion VARCHAR(16) NOT NULL, -- 'skip' | 'postpone'
  fecha_nueva DATE NULL,
  CONSTRAINT fk_mre_rec FOREIGN KEY (movimiento_recurrente_id) REFERENCES movimientos_recurrentes(id) ON DELETE CASCADE,
  INDEX idx_mre_user_date (usuario_id, fecha_original),
  INDEX idx_mre_new_date (usuario_id, fecha_nueva)
);
