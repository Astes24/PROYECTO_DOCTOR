import { format, addMinutes, parse } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

export const TIMEZONE = 'America/Lima';
export const SLOT_DURATION = 20;

// Horario: 09:30 AM a 01:40 PM
export const BUSINESS_HOURS = {
    start: "09:30:00",
    end: "13:40:00"
};

/**
 * Returns the current date in Lima timezone as a Date object 
 * (with time set to start of day or similar, for comparison)
 */
export const getLimaDate = () => {
    const now = new Date();
    const limaDateStr = formatInTimeZone(now, TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
    return new Date(limaDateStr);
};

export const formatDateForDB = (date) => formatInTimeZone(date, TIMEZONE, 'yyyy-MM-dd');
// Restore legacy exports for Frontend components
export const formatDate = (date) => formatInTimeZone(date, TIMEZONE, 'yyyy-MM-dd');
export const formatTime = (date) => formatInTimeZone(date, TIMEZONE, 'HH:mm:00');

/**
 * Generates all possible slots for a given date string (YYYY-MM-DD)
 * Returns array of time strings "HH:mm:ss"
 */
export const getDailySlots = (date) => {
    // date can be a Date object or string. We just need the day of week.
    // If string, parse it.
    let dateObj = date;
    if (typeof date === 'string') {
        // Fix Timezone Bug: 'YYYY-MM-DD' parses as UTC midnight.
        // In Lima (UTC-5), that is 7pm previous day.
        // We force it to be treated as a specific time in Peru (e.g. noon) to ensure correct day.
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            dateObj = new Date(`${date}T12:00:00-05:00`);
        } else {
            dateObj = new Date(date);
        }
    }

    // Check strict day of week in Lima
    // We use formatInTimeZone to get the day name or index in Lima
    const dayIndex = parseInt(formatInTimeZone(dateObj, TIMEZONE, 'i')); // 1 (Mon) - 7 (Sun)

    if (dayIndex === 7) return []; // Closed on Sundays

    const slots = [];

    // Start at 09:30
    let currentValidator = parse(BUSINESS_HOURS.start, 'HH:mm:ss', new Date());
    const endValidator = parse(BUSINESS_HOURS.end, 'HH:mm:ss', new Date());

    while (currentValidator <= endValidator) {
        slots.push(format(currentValidator, 'HH:mm:ss'));
        currentValidator = addMinutes(currentValidator, SLOT_DURATION);
    }

    return slots;
};

/**
 * Generates discrete time slots from a list of schedule blocks (horarios_diarios)
 * Combining slots if multiple doctors/blocks exist for the same day.
 * @param {Array} daySchedules - Array of objects from 'horarios_diarios' table
 * @returns {Array} List of time strings "HH:mm:00"
 */
export const generateSlotsFromSchedules = (daySchedules) => {
    if (!daySchedules || daySchedules.length === 0) return [];

    const allSlotsSet = new Set();

    daySchedules.forEach(sched => {
        // We use a dummy date for parsing time strings
        const baseDate = new Date();
        let current = parse(sched.hora_inicio, 'HH:mm:ss', baseDate);
        const end = parse(sched.hora_fin, 'HH:mm:ss', baseDate);
        const interval = sched.intervalo_minutos || SLOT_DURATION;

        while (current <= end) {
            allSlotsSet.add(format(current, 'HH:mm:00'));
            current = addMinutes(current, interval);
        }
    });

    return Array.from(allSlotsSet).sort();
};

