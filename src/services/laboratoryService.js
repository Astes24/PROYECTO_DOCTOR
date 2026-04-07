import { supabase } from '../supabaseClient';

/**
 * Obtener todas las órdenes de laboratorio (listado)
 */
export const fetchLaboratoryOrders = async () => {
    try {
        const { data, error } = await supabase
            .from('laboratory_orders')
            .select(`
                *,
                pacientes(nombre_completo)
            `)
            .order('fecha', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error fetching laboratory orders:', error);
        return { data: null, error };
    }
};

/**
 * Obtener una orden con sus ítems de exámenes
 */
export const fetchLaboratoryOrderById = async (id) => {
    try {
        const { data: order, error: orderError } = await supabase
            .from('laboratory_orders')
            .select(`
                *,
                pacientes(nombre_completo, dni, telefono_principal)
            `)
            .eq('id', id)
            .single();

        if (orderError) throw orderError;

        const { data: items, error: itemsError } = await supabase
            .from('laboratory_items')
            .select('*')
            .eq('order_id', id)
            .order('orden', { ascending: true });

        if (itemsError) throw itemsError;

        return { data: { ...order, items: items || [] }, error: null };
    } catch (error) {
        console.error('Error fetching laboratory order by id:', error);
        return { data: null, error };
    }
};

/**
 * Crear una nueva orden de laboratorio con sus ítems
 */
export const createLaboratoryOrder = async (header, items, userId) => {
    try {
        // 1. Obtener el siguiente número de orden
        const { data: numData, error: numError } = await supabase
            .rpc('get_next_laboratorio_number');

        if (numError) throw numError;

        // 2. Insertar la cabecera
        const { data: order, error: orderError } = await supabase
            .from('laboratory_orders')
            .insert([{
                numero_orden: numData,
                ...header,
                created_by: userId,
            }])
            .select()
            .single();

        if (orderError) throw orderError;

        // 3. Insertar los ítems de exámenes
        if (items && items.length > 0) {
            const itemsToInsert = items.map((item, index) => ({
                order_id: order.id,
                examen: item.examen,
                tipo_muestra: item.tipo_muestra || null,
                indicaciones: item.indicaciones || null,
                orden: index,
            }));

            const { error: itemsError } = await supabase
                .from('laboratory_items')
                .insert(itemsToInsert);

            if (itemsError) throw itemsError;
        }

        return { data: order, error: null };
    } catch (error) {
        console.error('Error creating laboratory order:', error);
        return { data: null, error };
    }
};

/**
 * Anular una orden de laboratorio (cambiar estado a ANULADA)
 */
export const voidLaboratoryOrder = async (id, userId) => {
    try {
        const { error } = await supabase
            .from('laboratory_orders')
            .update({
                estado: 'ANULADA',
                updated_at: new Date().toISOString(),
            })
            .eq('id', id);

        if (error) throw error;
        return { success: true, error: null };
    } catch (error) {
        console.error('Error voiding laboratory order:', error);
        return { success: false, error };
    }
};

/**
 * Eliminar permanentemente una orden anulada y sus ítems (CASCADE)
 */
export const deleteLaboratoryOrder = async (id) => {
    try {
        // Obtener número de orden antes de eliminar
        const { data: order } = await supabase
            .from('laboratory_orders')
            .select('numero_orden')
            .eq('id', id)
            .single();

        const { error } = await supabase
            .from('laboratory_orders')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { success: true, numeroOrden: order?.numero_orden, error: null };
    } catch (error) {
        console.error('Error deleting laboratory order:', error);
        return { success: false, error };
    }
};
