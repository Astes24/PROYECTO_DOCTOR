import { supabase } from '../supabaseClient';

/**
 * Obtener el siguiente número de boleta correlativo
 */
const getNextBoletaNumber = async () => {
    const { data, error } = await supabase.rpc('get_next_boleta_number');
    if (error || !data) {
        // Fallback manual si la función no existe aún
        const { data: last } = await supabase
            .from('sales_receipts')
            .select('numero_boleta')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (last?.numero_boleta) {
            const num = parseInt(last.numero_boleta.split('-')[1] || '0', 10) + 1;
            return `B001-${String(num).padStart(5, '0')}`;
        }
        return 'B001-00001';
    }
    return data;
};

/**
 * Obtener todas las boletas con su total e información de paciente
 */
export const fetchSalesReceipts = async (filters = {}) => {
    try {
        let query = supabase
            .from('sales_receipts')
            .select('*, pacientes(nombre_completo, dni)')
            .order('created_at', { ascending: false });

        if (filters.estado) {
            query = query.eq('estado', filters.estado);
        }
        if (filters.desde) {
            query = query.gte('fecha', filters.desde);
        }
        if (filters.hasta) {
            query = query.lte('fecha', filters.hasta);
        }

        const { data, error } = await query;
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error fetching sales receipts:', error);
        return { data: null, error };
    }
};

/**
 * Obtener una boleta completa con sus ítems
 */
export const fetchSalesReceiptById = async (id) => {
    try {
        const { data: receipt, error: receiptError } = await supabase
            .from('sales_receipts')
            .select('*, pacientes(nombre_completo, dni, telefono_principal)')
            .eq('id', id)
            .single();

        if (receiptError) throw receiptError;

        const { data: items, error: itemsError } = await supabase
            .from('sales_receipt_items')
            .select('*, inventory_items(nombre, sku, unidad_medida)')
            .eq('receipt_id', id)
            .order('created_at', { ascending: true });

        if (itemsError) throw itemsError;

        return { data: { ...receipt, items: items || [] }, error: null };
    } catch (error) {
        console.error('Error fetching sales receipt by id:', error);
        return { data: null, error };
    }
};

/**
 * Crear una boleta completa con su detalle de ítems y descuento de stock automático
 * @param {Object} receiptHeader - Datos de la cabecera
 * @param {Array} items - Lista de ítems de la boleta
 * @param {string|null} userId - ID del usuario que emite
 */
export const createSalesReceipt = async (receiptHeader, items, userId = null) => {
    try {
        // 1. Generar número de boleta
        const numeroBoletaRaw = await getNextBoletaNumber();
        // Race condition guard: check it doesn't already exist
        const { count } = await supabase
            .from('sales_receipts')
            .select('*', { count: 'exact', head: true })
            .eq('numero_boleta', numeroBoletaRaw);

        const numeroBoleta = count > 0
            ? `B001-${String(parseInt(numeroBoletaRaw.split('-')[1] || '0', 10) + 1).padStart(5, '0')}`
            : numeroBoletaRaw;

        // 2. Calcular total
        const total = items.reduce((acc, item) => acc + (item.subtotal || 0), 0);

        // 3. Insertar boleta cabecera
        const { data: receipt, error: receiptError } = await supabase
            .from('sales_receipts')
            .insert({
                numero_boleta: numeroBoleta,
                fecha: receiptHeader.fecha || new Date().toISOString(),
                paciente_id: receiptHeader.paciente_id || null,
                paciente_nombre: receiptHeader.paciente_nombre || null,
                paciente_dni: receiptHeader.paciente_dni || null,
                total,
                estado: 'EMITIDA',
                notas: receiptHeader.notas || null,
                created_by: userId,
            })
            .select()
            .single();

        if (receiptError) throw receiptError;

        // 4. Insertar ítems de la boleta
        const itemsToInsert = items.map(item => ({
            receipt_id: receipt.id,
            tipo: item.tipo,
            inventory_item_id: item.inventory_item_id || null,
            descripcion: item.descripcion,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
            subtotal: item.subtotal,
        }));

        const { error: itemsError } = await supabase
            .from('sales_receipt_items')
            .insert(itemsToInsert);

        if (itemsError) throw itemsError;

        // 5. Descontar stock de inventario para los ítems tipo INVENTARIO
        const inventoryItems = items.filter(item => item.tipo === 'INVENTARIO' && item.inventory_item_id);
        for (const item of inventoryItems) {
            const { error: movError } = await supabase
                .from('inventory_movements')
                .insert({
                    item_id: item.inventory_item_id,
                    tipo: 'EGRESO',
                    cantidad: item.cantidad,
                    motivo: `Boleta de Venta ${numeroBoleta}`,
                    usuario_id: userId || null,
                });

            if (movError) {
                console.warn(`Error al descontar stock para item ${item.inventory_item_id}:`, movError);
            }
        }

        return { data: receipt, error: null };
    } catch (error) {
        console.error('Error creating sales receipt:', error);
        return { data: null, error };
    }
};

/**
 * Anular una boleta: cambia estado a ANULADA y repone stock de inventario
 */
export const voidSalesReceipt = async (id, userId = null) => {
    try {
        // 1. Obtener los ítems de la boleta para reponer stock
        const { data: receipt, error: receiptError } = await supabase
            .from('sales_receipts')
            .select('numero_boleta, estado')
            .eq('id', id)
            .single();

        if (receiptError) throw receiptError;
        if (receipt.estado === 'ANULADA') {
            return { success: false, error: new Error('La boleta ya está anulada.') };
        }

        const { data: items, error: itemsError } = await supabase
            .from('sales_receipt_items')
            .select('tipo, inventory_item_id, cantidad')
            .eq('receipt_id', id)
            .eq('tipo', 'INVENTARIO');

        if (itemsError) throw itemsError;

        // 2. Cambiar estado a ANULADA
        const { error: updateError } = await supabase
            .from('sales_receipts')
            .update({ estado: 'ANULADA', updated_at: new Date().toISOString() })
            .eq('id', id);

        if (updateError) throw updateError;

        // 3. Reponer stock con un INGRESO en el Kárdex por cada ítem de inventario
        const inventoryItems = (items || []).filter(i => i.inventory_item_id);
        for (const item of inventoryItems) {
            const { error: movError } = await supabase
                .from('inventory_movements')
                .insert({
                    item_id: item.inventory_item_id,
                    tipo: 'INGRESO',
                    cantidad: item.cantidad,
                    motivo: `Anulación Boleta ${receipt.numero_boleta} — devolución de stock`,
                    usuario_id: userId || null,
                });

            if (movError) {
                console.warn(`Error al reponer stock para item ${item.inventory_item_id}:`, movError);
            }
        }

        return { success: true, error: null };
    } catch (error) {
        console.error('Error voiding sales receipt:', error);
        return { success: false, error };
    }
};

/**
 * Eliminar permanentemente una boleta ANULADA (para restablecer el contador)
 * Solo funciona si la boleta ya está en estado ANULADA
 */
export const deleteSalesReceipt = async (id) => {
    try {
        // Verificar que esté anulada antes de eliminar
        const { data: receipt, error: checkError } = await supabase
            .from('sales_receipts')
            .select('estado, numero_boleta')
            .eq('id', id)
            .single();

        if (checkError) throw checkError;
        if (receipt.estado !== 'ANULADA') {
            return { success: false, error: new Error('Solo se pueden eliminar boletas anuladas.') };
        }

        // Los ítems se eliminan en cascada (ON DELETE CASCADE en la tabla sales_receipt_items)
        const { error } = await supabase
            .from('sales_receipts')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { success: true, numeroBoleta: receipt.numero_boleta, error: null };
    } catch (error) {
        console.error('Error deleting sales receipt:', error);
        return { success: false, error };
    }
};
