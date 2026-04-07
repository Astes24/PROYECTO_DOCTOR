import { supabase } from '../supabaseClient';

/**
 * Obtener todas las recetas médicas (listado)
 */
export const fetchPrescriptions = async () => {
    try {
        const { data, error } = await supabase
            .from('medical_prescriptions')
            .select(`
                *,
                pacientes(nombre_completo)
            `)
            .order('fecha', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error fetching prescriptions:', error);
        return { data: null, error };
    }
};

/**
 * Obtener una receta con sus ítems de medicamentos
 */
export const fetchPrescriptionById = async (id) => {
    try {
        const { data: prescription, error: prescError } = await supabase
            .from('medical_prescriptions')
            .select(`
                *,
                pacientes(nombre_completo, dni, telefono_principal)
            `)
            .eq('id', id)
            .single();

        if (prescError) throw prescError;

        const { data: items, error: itemsError } = await supabase
            .from('prescription_items')
            .select('*')
            .eq('prescription_id', id)
            .order('orden', { ascending: true });

        if (itemsError) throw itemsError;

        return { data: { ...prescription, items: items || [] }, error: null };
    } catch (error) {
        console.error('Error fetching prescription by id:', error);
        return { data: null, error };
    }
};

/**
 * Crear una nueva receta médica con sus ítems
 */
export const createPrescription = async (header, items, userId) => {
    try {
        // 1. Obtener el siguiente número de receta
        const { data: numData, error: numError } = await supabase
            .rpc('get_next_receta_number');

        if (numError) throw numError;

        // 2. Insertar la cabecera
        const { data: prescription, error: prescError } = await supabase
            .from('medical_prescriptions')
            .insert([{
                numero_receta: numData,
                ...header,
                created_by: userId,
            }])
            .select()
            .single();

        if (prescError) throw prescError;

        // 3. Insertar los ítems de medicamentos
        if (items && items.length > 0) {
            const itemsToInsert = items.map((item, index) => ({
                prescription_id: prescription.id,
                inventory_item_id: item.inventory_item_id || null,
                medicamento: item.medicamento,
                concentracion: item.concentracion || null,
                via_administracion: item.via_administracion || null,
                dosis: item.dosis || null,
                frecuencia: item.frecuencia || null,
                duracion: item.duracion || null,
                indicaciones: item.indicaciones || null,
                orden: index,
            }));

            const { error: itemsError } = await supabase
                .from('prescription_items')
                .insert(itemsToInsert);

            if (itemsError) throw itemsError;
        }

        return { data: prescription, error: null };
    } catch (error) {
        console.error('Error creating prescription:', error);
        return { data: null, error };
    }
};

/**
 * Anular una receta médica (cambiar estado a ANULADA)
 */
export const voidPrescription = async (id, userId) => {
    try {
        const { error } = await supabase
            .from('medical_prescriptions')
            .update({
                estado: 'ANULADA',
                updated_at: new Date().toISOString(),
            })
            .eq('id', id);

        if (error) throw error;
        return { success: true, error: null };
    } catch (error) {
        console.error('Error voiding prescription:', error);
        return { success: false, error };
    }
};

/**
 * Eliminar permanentemente una receta anulada y sus ítems (CASCADE)
 */
export const deletePrescription = async (id) => {
    try {
        // Obtener número de receta antes de eliminar
        const { data: presc } = await supabase
            .from('medical_prescriptions')
            .select('numero_receta')
            .eq('id', id)
            .single();

        const { error } = await supabase
            .from('medical_prescriptions')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { success: true, numeroReceta: presc?.numero_receta, error: null };
    } catch (error) {
        console.error('Error deleting prescription:', error);
        return { success: false, error };
    }
};

/**
 * Obtener medicamentos del inventario como catálogo (sin afectar stock)
 */
export const fetchMedicamentsCatalog = async () => {
    try {
        const { data, error } = await supabase
            .from('inventory_items')
            .select('id, nombre, sku, categoria, unidad_medida')
            .eq('estado', true)
            .order('nombre', { ascending: true });

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error fetching medicaments catalog:', error);
        return { data: null, error };
    }
};
