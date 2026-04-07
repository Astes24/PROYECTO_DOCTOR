-- ================================================================
-- Script de Base de Datos: Módulo Recetas Médicas
-- Ejecutar en el SQL Editor de tu proyecto en Supabase
-- ================================================================

-- 1. Tabla principal de recetas (cabecera)
CREATE TABLE IF NOT EXISTS medical_prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_receta VARCHAR(20) UNIQUE NOT NULL,           -- Formato: RX-2026-00001
    fecha DATE DEFAULT CURRENT_DATE,
    -- Datos del médico (se ingresan manualmente por soporte multi-médico)
    medico_nombre VARCHAR(255),                          -- Nombre completo de quien prescribe
    medico_cmp VARCHAR(50),                              -- Número de colegiatura CMP
    medico_especialidad VARCHAR(255),                    -- Especialidad médica
    -- Datos del paciente
    paciente_id BIGINT REFERENCES pacientes(id),
    paciente_nombre VARCHAR(255),                        -- Nombre en texto plano
    paciente_dni VARCHAR(20),
    paciente_edad VARCHAR(50),                           -- Edad o fecha de nacimiento (texto libre)
    -- Diagnóstico
    diagnostico TEXT,                                    -- Texto libre del diagnóstico
    -- Pie de receta
    observaciones TEXT,                                  -- Instrucciones generales al paciente
    proxima_cita DATE,                                   -- Fecha de próxima cita (opcional)
    -- Control
    estado VARCHAR(20) DEFAULT 'EMITIDA' CHECK (estado IN ('EMITIDA', 'ANULADA')),
    created_by UUID,                                     -- ID del usuario que emitió la receta
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de ítems de cada receta (medicamentos prescritos)
CREATE TABLE IF NOT EXISTS prescription_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID NOT NULL REFERENCES medical_prescriptions(id) ON DELETE CASCADE,
    -- Referencia opcional al inventario (no afecta el stock)
    inventory_item_id UUID REFERENCES inventory_items(id),
    -- Datos del medicamento
    medicamento VARCHAR(255) NOT NULL,                   -- Nombre del medicamento
    concentracion VARCHAR(255),                          -- Ej: "500mg Cápsulas"
    via_administracion VARCHAR(100),                     -- Oral, IM, IV, Tópico, etc.
    dosis VARCHAR(255),                                  -- Ej: "1 cápsula"
    frecuencia VARCHAR(255),                             -- Ej: "cada 8 horas"
    duracion VARCHAR(255),                               -- Ej: "7 días"
    indicaciones TEXT,                                   -- Instrucciones especiales de este med.
    orden INT DEFAULT 0,                                 -- Orden de aparición en la receta
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Habilitar RLS
ALTER TABLE medical_prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_items ENABLE ROW LEVEL SECURITY;

-- 4. Políticas para usuarios autenticados
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'medical_prescriptions' 
        AND policyname = 'Enable all for authenticated users (medical_prescriptions)'
    ) THEN
        CREATE POLICY "Enable all for authenticated users (medical_prescriptions)"
        ON medical_prescriptions FOR ALL
        USING (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'prescription_items' 
        AND policyname = 'Enable all for authenticated users (prescription_items)'
    ) THEN
        CREATE POLICY "Enable all for authenticated users (prescription_items)"
        ON prescription_items FOR ALL
        USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- 5. Función para obtener el siguiente número correlativo de receta por año
CREATE OR REPLACE FUNCTION get_next_receta_number()
RETURNS VARCHAR AS $$
DECLARE
    current_year VARCHAR(4);
    year_prefix VARCHAR(8);
    last_num INT;
    next_num VARCHAR;
BEGIN
    current_year := EXTRACT(YEAR FROM NOW())::TEXT;
    year_prefix := 'RX-' || current_year || '-';
    
    SELECT COALESCE(
        MAX(CAST(SUBSTRING(numero_receta FROM LENGTH(year_prefix) + 1) AS INT)),
        0
    ) + 1
    INTO last_num
    FROM medical_prescriptions
    WHERE numero_receta LIKE year_prefix || '%';
    
    next_num := year_prefix || LPAD(last_num::TEXT, 5, '0');
    RETURN next_num;
END;
$$ LANGUAGE plpgsql;

-- 6. Índices para mejorar rendimiento de búsquedas
CREATE INDEX IF NOT EXISTS idx_medical_prescriptions_paciente ON medical_prescriptions(paciente_id);
CREATE INDEX IF NOT EXISTS idx_medical_prescriptions_fecha ON medical_prescriptions(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_prescription_items_prescription ON prescription_items(prescription_id);

-- 7. Habilitar realtime (opcional - ejecutar en Supabase > Database > Replication si se necesita)
-- ALTER PUBLICATION supabase_realtime ADD TABLE medical_prescriptions;
-- ALTER PUBLICATION supabase_realtime ADD TABLE prescription_items;
