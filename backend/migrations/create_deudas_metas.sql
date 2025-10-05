-- Tabla para deudas
CREATE TABLE deudas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  descripcion VARCHAR(255) NOT NULL,
  monto_total DECIMAL(12,2) NOT NULL,
  monto_pagado DECIMAL(12,2) DEFAULT 0,
  fecha_inicio DATE,
  fecha_vencimiento DATE,
  pagada BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- Tabla para metas
CREATE TABLE metas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  descripcion VARCHAR(255) NOT NULL,
  monto_objetivo DECIMAL(12,2) NOT NULL,
  monto_ahorrado DECIMAL(12,2) DEFAULT 0,
  fecha_inicio DATE,
  fecha_objetivo DATE,
  cumplida BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);
