import { supabase } from '../supabaseClient';

/**
 * Obtener todos los ítems del inventario activos
 */
export const fetchInventoryItems = async () => {
    try {
        const { data, error } = await supabase
            .from('inventory_items')
            .select('*')
            .eq('estado', true)
            .order('nombre', { ascending: true });

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error fetching inventory items:', error);
        return { data: null, error };
    }
};

/**
 * Obtener un ítem específico por ID
 */
export const fetchInventoryItemById = async (id) => {
    try {
        const { data, error } = await supabase
            .from('inventory_items')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error fetching inventory item:', error);
        return { data: null, error };
    }
};

/**
 * Crear o actualizar un ítem del inventario
 */
export const saveInventoryItem = async (itemData) => {
    try {
        const isUpdate = !!itemData.id;
        
        let query = supabase.from('inventory_items');
        
        if (isUpdate) {
            query = query.update({ ...itemData, updated_at: new Date().toISOString() }).eq('id', itemData.id);
        } else {
            query = query.insert([itemData]);
        }

        const { data, error } = await query.select();

        if (error) throw error;
        return { data: data ? data[0] : null, error: null };
    } catch (error) {
        console.error('Error saving inventory item:', error);
        return { data: null, error };
    }
};

/**
 * Inactivar (soft delete) un ítem del inventario
 */
export const deleteInventoryItem = async (id) => {
    try {
        const { error } = await supabase
            .from('inventory_items')
            .update({ estado: false, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw error;
        return { success: true, error: null };
    } catch (error) {
        console.error('Error deleting inventory item:', error);
        return { success: false, error };
    }
};

/**
 * Obtener el historial (Kárdex) de un ítem
 */
export const fetchInventoryMovements = async (itemId) => {
    try {
        const { data, error } = await supabase
            .from('inventory_movements')
            .select('*, usuarios_panel(nombre_completo)')
            .eq('item_id', itemId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error fetching inventory movements:', error);
        return { data: null, error };
    }
};

/**
 * Registrar un nuevo movimiento en el Kárdex
 * Nota: El trigger SQL se encargará de actualizar el stock_actual en inventory_items
 */
export const registerInventoryMovement = async (movementData) => {
    try {
        const { data, error } = await supabase
            .from('inventory_movements')
            .insert([movementData])
            .select();

        if (error) throw error;
        return { data: data ? data[0] : null, error: null };
    } catch (error) {
        console.error('Error registering inventory movement:', error);
        return { data: null, error };
    }
};
