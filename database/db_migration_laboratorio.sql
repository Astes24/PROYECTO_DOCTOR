-- ================================================================
-- Script de Base de Datos: Módulo Laboratorio
-- Ejecutar en el SQL Editor de tu proyecto en Supabase
-- ================================================================

-- 1. Tabla principal de órdenes de laboratorio (cabecera)
CREATE TABLE IF NOT EXISTS laboratory_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_orden VARCHAR(20) UNIQUE NOT NULL,           -- Formato: LAB-2026-00001
    fecha DATE DEFAULT CURRENT_DATE,
    -- Datos del médico
    medico_nombre VARCHAR(255),
    medico_cmp VARCHAR(50),
    medico_rne VARCHAR(50),
    medico_especialidad VARCHAR(255),
    medico_direccion TEXT,
    -- Datos del paciente
    paciente_id BIGINT REFERENCES pacientes(id),
    paciente_nombre VARCHAR(255),
    paciente_dni VARCHAR(20),
    paciente_edad VARCHAR(50),
    -- Diagnóstico / Sospecha Clínica
    sospecha_clinica TEXT,
    diagnostico TEXT,
    -- Pie de orden
    observaciones TEXT,                                  -- Instrucciones generales / Preparación
    -- Control
    estado VARCHAR(20) DEFAULT 'EMITIDA' CHECK (estado IN ('EMITIDA', 'ANULADA')),
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de ítems de cada orden (exámenes solicitados)
CREATE TABLE IF NOT EXISTS laboratory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES laboratory_orders(id) ON DELETE CASCADE,
    -- Datos del examen
    examen VARCHAR(255) NOT NULL,                        -- Nombre del examen (ej: Hemograma)
    tipo_muestra VARCHAR(255),                           -- Ej: Sangre, Orina
    indicaciones TEXT,                                   -- Ej: Ayuno 8h
    orden INT DEFAULT 0,                                 -- Orden de aparición
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Habilitar RLS
ALTER TABLE laboratory_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE laboratory_items ENABLE ROW LEVEL SECURITY;

-- 4. Políticas para usuarios autenticados
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'laboratory_orders' 
        AND policyname = 'Enable all for authenticated users (laboratory_orders)'
    ) THEN
        CREATE POLICY "Enable all for authenticated users (laboratory_orders)"
        ON laboratory_orders FOR ALL
        USING (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'laboratory_items' 
        AND policyname = 'Enable all for authenticated users (laboratory_items)'
    ) THEN
        CREATE POLICY "Enable all for authenticated users (laboratory_items)"
        ON laboratory_items FOR ALL
        USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- 5. Función para obtener el siguiente número correlativo de orden por año
CREATE OR REPLACE FUNCTION get_next_laboratorio_number()
RETURNS VARCHAR AS $$
DECLARE
    current_year VARCHAR(4);
    year_prefix VARCHAR(9);
    last_num INT;
    next_num VARCHAR;
BEGIN
    current_year := EXTRACT(YEAR FROM NOW())::TEXT;
    year_prefix := 'LAB-' || current_year || '-';
    
    SELECT COALESCE(
        MAX(CAST(SUBSTRING(numero_orden FROM LENGTH(year_prefix) + 1) AS INT)),
        0
    ) + 1
    INTO last_num
    FROM laboratory_orders
    WHERE numero_orden LIKE year_prefix || '%';
    
    next_num := year_prefix || LPAD(last_num::TEXT, 5, '0');
    RETURN next_num;
END;
$$ LANGUAGE plpgsql;

-- 6. Índices
CREATE INDEX IF NOT EXISTS idx_laboratory_orders_paciente ON laboratory_orders(paciente_id);
CREATE INDEX IF NOT EXISTS idx_laboratory_orders_fecha ON laboratory_orders(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_laboratory_items_order ON laboratory_items(order_id);
