-- Add role and approval columns to usuarios
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS rol VARCHAR(20) NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS aprobado TINYINT(1) NOT NULL DEFAULT 0;

-- Optional helpful index for queries on approval state
-- Nota: Si el índice ya existe, esta sentencia puede fallar en MySQL. En ese caso, omite su ejecución.
CREATE INDEX idx_usuarios_aprobado ON usuarios (aprobado);
