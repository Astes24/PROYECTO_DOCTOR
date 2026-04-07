import { supabase } from '../supabaseClient';
import { getDailySlots, formatDateForDB, BUSINESS_HOURS, TIMEZONE } from './appointmentUtils';
// import { formatInTimeZone } from 'date-fns-tz'; // Removed unused import

/**
 * Checks availability for a specific date against Supabase.
 * @param {Date|string} date - Date object or YYYY-MM-DD string
 * @returns {Promise<string[]>} - List of available time slots (HH:mm:ss)
 */
export const checkAvailability = async (date) => {
    try {
        let dateStr;
        if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
            dateStr = date;
        } else {
            // Fallback for Date objects
            dateStr = formatDateForDB(new Date(date));
        }

        // 1. Generate all theoretical slots for this day (Mon-Sat, 9:30-13:10)
        const allSlots = getDailySlots(date);

        if (allSlots.length === 0) {
            return []; // Closed (e.g., Sunday)
        }

        // 2. Fetch existing appointments for this date
        // We only care about active appointments (not cancelled)
        const { data: appointments, error } = await supabase
            .from('citas')
            .select('hora')
            .eq('fecha', dateStr)
            .neq('estado', 'CANCELADA');

        if (error) throw error;

        // 3. Filter out occupied slots
        const occupiedTimes = new Set(appointments.map(appt => appt.hora));
        const availableSlots = allSlots.filter(slot => !occupiedTimes.has(slot));

        return availableSlots;
    } catch (error) {
        console.error('Error checking availability:', error);
        throw error;
    }
};

/**
 * Helper to ensure patient exists. 
 * Strategies:
 * 1. Search by DNI.
 * 2. If valid ID found, return it.
 * 3. If not found, insert new patient and return ID.
 */
const getOrCreatePatient = async (patientData) => {
    const { dni, nombre_completo, fecha_nacimiento, telefono_principal } = patientData;

    // 1. Search for existing patient
    const { data: existingPatient, error: searchError } = await supabase
        .from('pacientes')
        .select('id')
        .eq('dni', dni)
        .maybeSingle();

    if (searchError) throw searchError;

    if (existingPatient) {
        return existingPatient.id;
    }

    // 2. Create new patient if not exists
    const { data: newPatient, error: insertError } = await supabase
        .from('pacientes')
        .insert([{
            dni: dni.trim(),
            nombre_completo: nombre_completo.trim().toUpperCase(),
            fecha_nacimiento,
            telefono_principal
        }])
        .select('id')
        .single();

    if (insertError) {
        // Handle race condition: if patient was created by another process immediately after our check
        if (insertError.code === '23505') { // Unique violation
            const { data: retryPatient, error: retryError } = await supabase
                .from('pacientes')
                .select('id')
                .eq('dni', dni)
                .single();

            if (retryError) throw retryError;
            return retryPatient.id;
        }
        throw insertError;
    }

    return newPatient.id;
};

/**
 * Books an appointment following the strict flow.
 * @param {Object} patientData - { dni, nombre_completo, fecha_nacimiento, telefono_principal }
 * @param {Object} appointmentData - { fecha, hora }
 */
export const bookAppointment = async (patientData, appointmentData) => {
    const { fecha, hora } = appointmentData;
    let dateStr;
    if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        dateStr = fecha;
    } else {
        dateStr = formatDateForDB(new Date(fecha));
    }

    // Validate if slot is still available (Front-end check)
    // NOTE: This reduces race conditions but doesn't guarantee atomic safety without DB locks/constraints.
    // The backend should specifically enforce unique (fecha, hora) where status != CANCELLED.
    const available = await checkAvailability(dateStr);
    if (!available.includes(hora)) {
        throw new Error('SLOT_OCCUPIED: El horario seleccionado ya no está disponible.');
    }

    try {
        // 1. Get or Create Patient
        const patientId = await getOrCreatePatient(patientData);

        // 2. Create Appointment
        const { data: newAppointment, error: apptError } = await supabase
            .from('citas')
            .insert([{
                paciente_id: patientId,
                fecha: dateStr,
                hora: hora, // Format HH:mm:ss
                estado: 'PENDIENTE',
                origen: 'WEB'
            }])
            .select()
            .single();

        if (apptError) {
            // Check for specific constraint violation if backend has it
            if (apptError.code === '23505') {
                throw new Error('SLOT_OCCUPIED: El horario fue reservado por otro usuario mientras confirmabas.');
            }
            throw apptError;
        }

        return newAppointment;

    } catch (error) {
        console.error('Error booking appointment:', error);
        throw error;
    }
};
