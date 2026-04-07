-- Script para crear el esquema de Base de Datos para el Inventario
-- Por favor ejecuta esto en el SQL Editor de tu proyecto en Supabase

-- 1. Tabla principal de productos/insumos
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    sku VARCHAR(100),
    categoria VARCHAR(100) NOT NULL,
    unidad_medida VARCHAR(50) NOT NULL,
    stock_actual NUMERIC(10, 2) DEFAULT 0,
    stock_minimo NUMERIC(10, 2) DEFAULT 0,
    stock_maximo NUMERIC(10, 2),
    lote VARCHAR(100),
    fecha_vencimiento DATE,
    registro_sanitario VARCHAR(100),
    principio_activo VARCHAR(255),
    proveedor VARCHAR(255), -- Modificado de UUID a varchar (texto simple) según requerimiento
    costo_compra NUMERIC(10, 2) DEFAULT 0,
    precio_venta NUMERIC(10, 2) DEFAULT 0,
    estado BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de Movimientos (Kárdex)
CREATE TABLE IF NOT EXISTS inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('INGRESO', 'EGRESO', 'AJUSTE')),
    cantidad NUMERIC(10, 2) NOT NULL,
    fecha TIMESTAMPTZ DEFAULT NOW(),
    usuario_id UUID, -- El que registró el movimiento (opcional)
    motivo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Habilitar RLS (Row Level Security)
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- 4. Políticas (Policies) para permitir lectura/escritura (Todo usuario autenticado puede ver/modificar)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'inventory_items' AND policyname = 'Enable all for authenticated users (items)'
    ) THEN
        CREATE POLICY "Enable all for authenticated users (items)" ON inventory_items FOR ALL USING (auth.role() = 'authenticated');
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'inventory_movements' AND policyname = 'Enable all for authenticated users (movements)'
    ) THEN
        CREATE POLICY "Enable all for authenticated users (movements)" ON inventory_movements FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- 5. Trigger y Función para actualizar el stock después de un movimiento de Kárdex de manera transaccional
CREATE OR REPLACE FUNCTION update_inventory_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tipo = 'INGRESO' THEN
        UPDATE inventory_items SET stock_actual = stock_actual + NEW.cantidad, updated_at = NOW() WHERE id = NEW.item_id;
    ELSIF NEW.tipo = 'EGRESO' THEN
        UPDATE inventory_items SET stock_actual = stock_actual - NEW.cantidad, updated_at = NOW() WHERE id = NEW.item_id;
    ELSIF NEW.tipo = 'AJUSTE' THEN
        UPDATE inventory_items SET stock_actual = NEW.cantidad, updated_at = NOW() WHERE id = NEW.item_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Evitar error si el trigger ya existe
DROP TRIGGER IF EXISTS on_inventory_movement_insert ON inventory_movements;

CREATE TRIGGER on_inventory_movement_insert
AFTER INSERT ON inventory_movements
FOR EACH ROW EXECUTE FUNCTION update_inventory_stock();
