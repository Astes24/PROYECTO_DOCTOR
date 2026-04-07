import { supabase } from '../supabaseClient';

/**
 * Obtener la información global del consultorio
 */
export const getClinicInfo = async () => {
    try {
        const { data, error } = await supabase
            .from('clinic_info')
            .select('*')
            .eq('id', 1)
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error fetching clinic info:', error);
        return { data: null, error };
    }
};

/**
 * Actualizar la información del consultorio
 */
export const updateClinicInfo = async (payload) => {
    try {
        const { data, error } = await supabase
            .from('clinic_info')
            .update({
                ...payload,
                updated_at: new Date().toISOString(),
            })
            .eq('id', 1)
            .select()
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error updating clinic info:', error);
        return { data: null, error };
    }
};
