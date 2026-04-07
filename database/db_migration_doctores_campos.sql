-- ================================================================
-- Migración: Campos de identificación médica peruana en tabla doctores
-- Ejecutar en el SQL Editor de tu proyecto en Supabase
-- ================================================================

-- Agregar columnas de identificación médica peruana
ALTER TABLE doctores
    ADD COLUMN IF NOT EXISTS cmp VARCHAR(20),                      -- N° Colegio Médico del Perú (obligatorio para prescribir)
    ADD COLUMN IF NOT EXISTS rne VARCHAR(20),                      -- Registro Nacional de Especialistas (si tiene especialidad)
    ADD COLUMN IF NOT EXISTS dni VARCHAR(15),                      -- DNI del médico
    ADD COLUMN IF NOT EXISTS telefono VARCHAR(20),                 -- Teléfono de contacto
    ADD COLUMN IF NOT EXISTS direccion_consultorio TEXT,           -- Dirección del consultorio / clínica
    ADD COLUMN IF NOT EXISTS firma_url TEXT;                       -- URL de imagen de firma (opcional, para futuro)

-- Índice para búsqueda rápida por CMP
CREATE INDEX IF NOT EXISTS idx_doctores_cmp ON doctores(cmp);

-- Comentarios descriptivos
COMMENT ON COLUMN doctores.cmp IS 'Número de colegiatura del Colegio Médico del Perú';
COMMENT ON COLUMN doctores.rne IS 'Registro Nacional de Especialistas (SINAREME)';
COMMENT ON COLUMN doctores.dni IS 'Documento Nacional de Identidad del médico';
COMMENT ON COLUMN doctores.telefono IS 'Número de teléfono de contacto del médico';
COMMENT ON COLUMN doctores.direccion_consultorio IS 'Dirección del consultorio o clínica donde ejerce';
COMMENT ON COLUMN doctores.firma_url IS 'URL de la imagen digitalizada de la firma del médico';
