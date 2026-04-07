-- ================================================================
-- Script de Base de Datos: Módulo Boletas de Venta
-- Ejecutar en el SQL Editor de tu proyecto en Supabase
-- ================================================================

-- 1. Tabla principal de boletas (cabecera)
CREATE TABLE IF NOT EXISTS sales_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_boleta VARCHAR(20) UNIQUE NOT NULL,       -- Formato: B001-00001
    fecha TIMESTAMPTZ DEFAULT NOW(),
    paciente_id BIGINT REFERENCES pacientes(id),
    paciente_nombre VARCHAR(255),                     -- Nombre en texto plano (por si no está en BD)
    paciente_dni VARCHAR(20),
    total NUMERIC(10, 2) DEFAULT 0,
    estado VARCHAR(20) DEFAULT 'EMITIDA' CHECK (estado IN ('EMITIDA', 'ANULADA')),
    notas TEXT,
    created_by UUID,                                  -- ID del usuario que emitió la boleta
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de ítems de cada boleta (detalle)
CREATE TABLE IF NOT EXISTS sales_receipt_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_id UUID NOT NULL REFERENCES sales_receipts(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('INVENTARIO', 'SERVICIO')),
    inventory_item_id UUID REFERENCES inventory_items(id),  -- Solo para tipo INVENTARIO
    descripcion VARCHAR(255) NOT NULL,
    cantidad NUMERIC(10, 2) NOT NULL DEFAULT 1,
    precio_unitario NUMERIC(10, 2) NOT NULL DEFAULT 0,
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,             -- cantidad * precio_unitario
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Habilitar RLS
ALTER TABLE sales_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_receipt_items ENABLE ROW LEVEL SECURITY;

-- 4. Políticas para usuarios autenticados
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'sales_receipts' 
        AND policyname = 'Enable all for authenticated users (sales_receipts)'
    ) THEN
        CREATE POLICY "Enable all for authenticated users (sales_receipts)"
        ON sales_receipts FOR ALL
        USING (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'sales_receipt_items' 
        AND policyname = 'Enable all for authenticated users (sales_receipt_items)'
    ) THEN
        CREATE POLICY "Enable all for authenticated users (sales_receipt_items)"
        ON sales_receipt_items FOR ALL
        USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- 5. Función para obtener el siguiente número correlativo de boleta
CREATE OR REPLACE FUNCTION get_next_boleta_number()
RETURNS VARCHAR AS $$
DECLARE
    last_num INT;
    next_num VARCHAR;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(numero_boleta FROM 6) AS INT)), 0) + 1
    INTO last_num
    FROM sales_receipts
    WHERE numero_boleta LIKE 'B001-%';
    
    next_num := 'B001-' || LPAD(last_num::TEXT, 5, '0');
    RETURN next_num;
END;
$$ LANGUAGE plpgsql;

-- 6. Habilitar realtime para las nuevas tablas (opcional pero recomendado)
-- Ejecuta esto en el panel de Supabase > Database > Replication si lo necesitas.
-- ALTER PUBLICATION supabase_realtime ADD TABLE sales_receipts;
-- ALTER PUBLICATION supabase_realtime ADD TABLE sales_receipt_items;
