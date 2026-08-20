CREATE TABLE IF NOT EXISTS pacientes (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  mail VARCHAR(255) UNIQUE NOT NULL,
  contrasena VARCHAR(255) NOT NULL,
  fecha_nacimiento DATE NOT NULL,
  dni VARCHAR(20) UNIQUE NOT NULL,
  obra_social VARCHAR(100),
  verificado BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medicos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  mail VARCHAR(255) UNIQUE NOT NULL,
  contrasena VARCHAR(255) NOT NULL,
  dni VARCHAR(20) UNIQUE NOT NULL,
  verificado BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  mail VARCHAR(255) UNIQUE NOT NULL,
  contrasena VARCHAR(255) NOT NULL,
  verificado BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mensajes (
  id SERIAL PRIMARY KEY,
  paciente_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  medico_id INTEGER NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
  emisor VARCHAR(20) NOT NULL CHECK (emisor IN ('paciente', 'medico')),
  contenido TEXT NOT NULL,
  fecha_hora_entrega TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  editado_en TIMESTAMPTZ,
  eliminado_en TIMESTAMPTZ
);

ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS editado_en TIMESTAMPTZ;
ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS eliminado_en TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS notificaciones (
  id SERIAL PRIMARY KEY,
  usuario_tipo VARCHAR(20) NOT NULL CHECK (usuario_tipo IN ('paciente', 'medico', 'admin')),
  usuario_id INTEGER NOT NULL,
  contenido TEXT NOT NULL,
  leida BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_hora_entrega TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS leida BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS analisis (
  id SERIAL PRIMARY KEY,
  paciente_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  porcentaje NUMERIC(5, 2) NOT NULL CHECK (porcentaje >= 0 AND porcentaje <= 100),
  fecha_hora_entrega TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS codigos_verificacion (
  id SERIAL PRIMARY KEY,
  usuario_tipo VARCHAR(20) NOT NULL CHECK (usuario_tipo IN ('paciente', 'medico', 'admin')),
  usuario_id INTEGER NOT NULL,
  codigo VARCHAR(10) NOT NULL,
  expira_en TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mensajes_paciente_id ON mensajes(paciente_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_medico_id ON mensajes(medico_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario ON notificaciones(usuario_tipo, usuario_id);
CREATE INDEX IF NOT EXISTS idx_analisis_paciente_id ON analisis(paciente_id);
CREATE INDEX IF NOT EXISTS idx_codigos_verificacion_usuario ON codigos_verificacion(usuario_tipo, usuario_id);
