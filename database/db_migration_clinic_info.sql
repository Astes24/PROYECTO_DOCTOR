-- ================================================================
-- Migración: Información Global del Consultorio
-- ================================================================

-- 1. Tabla clinic_info (singleton: una sola fila)
CREATE TABLE IF NOT EXISTS clinic_info (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    nombre_clinica VARCHAR(255) DEFAULT 'Mi Clínica',
    direccion TEXT,
    telefono VARCHAR(50),
    email VARCHAR(255),
    web VARCHAR(255),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Insertar fila inicial si no existe
INSERT INTO clinic_info (id, nombre_clinica, direccion, telefono)
VALUES (1, 'Clínica Ginecológica', 'Dirección por configurar', '999 000 000')
ON CONFLICT (id) DO NOTHING;

-- 3. Habilitar RLS
ALTER TABLE clinic_info ENABLE ROW LEVEL SECURITY;

-- 4. Políticas para usuarios autenticados
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'clinic_info' 
        AND policyname = 'Enable all for authenticated users (clinic_info)'
    ) THEN
        CREATE POLICY "Enable all for authenticated users (clinic_info)"
        ON clinic_info FOR ALL
        USING (auth.role() = 'authenticated');
    END IF;
END $$;
