
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DataGrid } from '@mui/x-data-grid';
import {
    IconButton, Tooltip, Box, Typography, Button, Dialog, DialogTitle,
    DialogContent, DialogActions, TextField, Snackbar, Alert, MenuItem, Menu,
    CircularProgress, useTheme, useMediaQuery, List, ListItem, ListItemText, Divider,
    Fab
} from '@mui/material';
import { supabase } from '../supabaseClient';
import PatientDetailsPanel from '../components/PatientDetailsPanel';
import {
    format,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameMonth,
    addMonths,
    subMonths,
    addDays,
    isSameDay,
    addWeeks,
    subWeeks,
    startOfDay
} from 'date-fns';
import { es } from 'date-fns/locale';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import {
    getDailySlots,
    formatDate,
    TIMEZONE,
    generateSlotsFromSchedules
} from '../services/appointmentUtils';

// Icons
import AddIcon from '@mui/icons-material/Add';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CalendarViewWeekIcon from '@mui/icons-material/CalendarViewWeek';
import ListAltIcon from '@mui/icons-material/ListAlt';
import CloseIcon from '@mui/icons-material/Close';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import FilterListIcon from '@mui/icons-material/FilterList';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ConfirmDialog from '../components/ConfirmDialog';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import HistoriaClinicaEditor from '../components/HistoriaClinicaEditor';

import { gridLocaleText, gridSlotProps } from '../components/dataGridDefaults';
const StatusBadge = ({ status }) => {
    const styles = {
        'CONFIRMADA': { bgcolor: '#0D948820', color: '#0D9488', border: '1px solid #0D948840' },
        'PENDIENTE': { bgcolor: '#D9770620', color: '#D97706', border: '1px solid #D9770640' },
        'CANCELADA': { bgcolor: '#EF444420', color: '#EF4444', border: '1px solid #EF444440', textDecoration: 'line-through', opacity: 0.7 },
        'REALIZADA': { bgcolor: '#2563EB20', color: '#2563EB', border: '1px solid #2563EB40' },
        'POSPUESTA': { bgcolor: '#EA580C20', color: '#EA580C', border: '1px solid #EA580C40' },
        'NO_ASISTIO': { bgcolor: '#64748B20', color: '#64748B', border: '1px solid #64748B40' },
    };
    return (
        <Box
            component="span"
            sx={{ px: 1, py: 0.5, borderRadius: 4, fontSize: '0.75rem', fontWeight: 600, ...styles[status] || styles['PENDIENTE'] }}
        >
            {status}
        </Box>
    );
};

// Helper function to calculate age
const renderAge = (fechaNacimiento) => {
    if (!fechaNacimiento || fechaNacimiento === '-') return '';
    try {
        const birthDate = new Date(fechaNacimiento);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return `(${age} años)`;
    } catch (e) {
        return '';
    }
};

const formatTime12h = (timeStr) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    let hours = parseInt(h, 10);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours.toString().padStart(2, '0')}:${m} ${ampm}`;
};

const formatDateDDMMYYYY = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.includes('-') ? dateStr.split('-') : dateStr.split('/');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
};

const formatDateText = (dateStr) => {
    if (!dateStr) return '';
    // Use formatInTimeZone to avoid local timezone shifts
    const dateObj = new Date(dateStr + 'T12:00:00'); // Use noon to avoid day shifts when converting to zoned
    return formatInTimeZone(dateObj, TIMEZONE, "EEEE d 'de' MMMM 'del' yyyy", { locale: es });
};

const capitalizeWords = (str) => {
    if (!str) return '';
    return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const MobileCalendar = ({ appointments, onDateSelect, selectedDate, isMobile }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const startDate = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const endDate = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

    return (
        <Box sx={{ flexShrink: 0, display: 'flex', flexDirection: 'column', bgcolor: 'background.paper', borderRadius: isMobile ? 0 : 4, p: 2, boxShadow: isMobile ? 0 : 1, borderBottom: isMobile ? '1px solid' : 'none', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <IconButton onClick={handlePrevMonth} size="small"><ChevronLeftIcon fontSize="small" /></IconButton>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ textTransform: 'capitalize' }}>
                    {format(currentMonth, 'MMMM yyyy', { locale: es })}
                </Typography>
                <IconButton onClick={handleNextMonth} size="small"><ChevronRightIcon fontSize="small" /></IconButton>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: isMobile ? 0.5 : 1, mb: 1 }}>
                {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, idx) => (
                    <Typography key={idx} align="center" variant="caption" fontWeight="bold" color="text.secondary" sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem' }}>{day}</Typography>
                ))}
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: isMobile ? 0.5 : 1 }}>
                {days.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const dayAppts = appointments.filter(a => a.fecha === dateStr && a.estado !== 'CANCELADA');
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isSelected = selectedDate === dateStr;

                    return (
                        <Box
                            key={day.toISOString()}
                            onClick={() => onDateSelect(dateStr)}
                            sx={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                p: isMobile ? 0.5 : 1, height: isMobile ? 36 : 40,
                                borderRadius: 2,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                border: isSelected ? '2px solid' : '1px solid',
                                borderColor: isSelected ? 'primary.main' : (dayAppts.length > 0 ? 'primary.light' : 'transparent'),
                                bgcolor: isSelected ? 'primary.light' : (dayAppts.length > 0 ? 'rgba(var(--c-primary-rgb), 0.05)' : 'transparent'),
                                opacity: isCurrentMonth ? 1 : 0.3,
                                position: 'relative',
                                '&:hover': { bgcolor: 'action.hover' },
                                minWidth: 0
                            }}
                        >
                            <Typography
                                variant="caption"
                                fontWeight={dayAppts.length > 0 || isSelected ? "bold" : "medium"}
                                sx={{ color: isSelected ? 'primary.dark' : (dayAppts.length > 0 ? 'primary.main' : 'text.primary') }}
                            >
                                {format(day, 'd')}
                            </Typography>
                            {dayAppts.length > 0 && !isSelected && (
                                <Box sx={{ width: 4, height: 4, bgcolor: 'primary.main', borderRadius: '50%', position: 'absolute', bottom: 4 }} />
                            )}
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );
};

const Appointments = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    // Navigation and Filters
    const location = useLocation();
    const navigate = useNavigate();

    // UI State
    const [viewMode, setViewMode] = useState(() => {
        const query = new URLSearchParams(location.search);
        return query.get('filter') ? 'list' : 'week';
    }); // 'week' | 'list'
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    // Use Lima timezone for the current week start
    const [currentWeekStart, setCurrentWeekStart] = useState(() => {
        const nowLima = toZonedTime(new Date(), TIMEZONE);
        return startOfWeek(nowLima, { weekStartsOn: 1 });
    });
    const [loading, setLoading] = useState(false);
    const [appointments, setAppointments] = useState([]);
    const [schedules, setSchedules] = useState([]);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', type: 'info' });
    const [confirmCancelDialog, setConfirmCancelDialog] = useState({ open: false, id: null });

    const [filterModel, setFilterModel] = useState({ items: [] });
    const [activeFilters, setActiveFilters] = useState([]);
    const [filterAnchorEl, setFilterAnchorEl] = useState(null);
    const isFilterMenuOpen = Boolean(filterAnchorEl);

    // Mobile Context Menu State
    const [mobileMenuPosition, setMobileMenuPosition] = useState(null);
    const [menuAppt, setMenuAppt] = useState(null);
    const isMobileMenuOpen = mobileMenuPosition !== null;

    const filterOptions = [
        { label: 'Confirmadas', value: 'CONFIRMADA', activeColor: '#0D9488' },
        { label: 'Pendientes', value: 'PENDIENTE', activeColor: '#D97706' },
        { label: 'Pospuestas', value: 'POSPUESTA', activeColor: '#EA580C' },
        { label: 'Canceladas', value: 'CANCELADA', activeColor: '#EF4444' },
        { label: 'Hoy', value: 'HOY', activeColor: 'var(--c-primary)' },
        { label: 'Mañana', value: 'MANANA', activeColor: 'var(--c-primary)' }
    ];

    const handleFilterToggle = (filterName) => {
        setActiveFilters(prev => {
            if (prev.includes(filterName)) {
                return prev.filter(f => f !== filterName);
            } else {
                return [...prev, filterName];
            }
        });
    };

    const filteredAppointments = React.useMemo(() => {
        if (activeFilters.length === 0) return appointments;

        const statuses = activeFilters.filter(f => ['CONFIRMADA', 'PENDIENTE', 'POSPUESTA', 'CANCELADA'].includes(f));
        const dates = activeFilters.filter(f => ['HOY', 'MANANA'].includes(f));

        return appointments.filter(appt => {
            let statusMatch = true;
            let dateMatch = true;

            if (statuses.length > 0) {
                statusMatch = statuses.includes(appt.estado);
            }

            if (dates.length > 0) {
                const nowLima = toZonedTime(new Date(), TIMEZONE);
                const todayStr = formatDate(startOfDay(nowLima));
                const tomorrowStr = formatDate(addDays(startOfDay(nowLima), 1));

                if (dates.includes('HOY') && dates.includes('MANANA')) {
                    dateMatch = appt.fecha === todayStr || appt.fecha === tomorrowStr;
                } else if (dates.includes('HOY')) {
                    dateMatch = appt.fecha === todayStr;
                } else if (dates.includes('MANANA')) {
                    dateMatch = appt.fecha === tomorrowStr;
                }
            }

            return statusMatch && dateMatch;
        });
    }, [appointments, activeFilters]);

    // Load URL params on mount or location change
    useEffect(() => {
        const query = new URLSearchParams(location.search);
        const filterParam = query.get('filter');
        const dateFilterParam = query.get('dateFilter');

        if (filterParam || dateFilterParam) {
            setViewMode('list');
            const newFilters = [];
            if (filterParam) newFilters.push(filterParam);
            if (dateFilterParam) newFilters.push(dateFilterParam);
            setActiveFilters(newFilters);
        } else {
            setActiveFilters([]);
        }
    }, [location.search]);

    // Dialog State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isApptDetailsOpen, setIsApptDetailsOpen] = useState(false);
    const [isPatientInfoOpen, setIsPatientInfoOpen] = useState(false);
    const [isClinicalHistoryOpen, setIsClinicalHistoryOpen] = useState(false);
    const [patientPanelTab, setPatientPanelTab] = useState(0);
    const [selectedAppt, setSelectedAppt] = useState(null);
    const [isReprogramDialogOpen, setIsReprogramDialogOpen] = useState(false);
    const [reprogramData, setReprogramData] = useState({ id: null, fecha: '', hora: '' });
    const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
    const [isFetchingSlots, setIsFetchingSlots] = useState(false);
    // eslint-disable-next-line no-unused-vars
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [formData, setFormData] = useState({
        dni: '',
        nombre: '',
        fecha_nacimiento: '',
        telefono: '',
        email: '',
        fecha: '',
        hora: '',
        origen: 'MANUAL'
    });
    const [isManualTime, setIsManualTime] = useState(false);
    const [isContactBookOpen, setIsContactBookOpen] = useState(false);
    const [contactBookPatients, setContactBookPatients] = useState([]);
    const [isFetchingContacts, setIsFetchingContacts] = useState(false);
    const [contactSearchTerm, setContactSearchTerm] = useState('');

    // Define fetchAppointments BEFORE the useEffects that reference it
    const fetchAppointments = React.useCallback(async (isBackground = false) => {
        if (!isBackground) setLoading(true);
        try {
            let startDateStr = formatDate(currentWeekStart);
            let endDateStr = formatDate(addDays(currentWeekStart, 7));

            if (viewMode === 'list') {
                startDateStr = formatDate(addDays(new Date(), -30));
                endDateStr = formatDate(addDays(new Date(), 60));
            }

            const { data, error } = await supabase
                .from('citas')
                .select(`
                    id,
                    fecha,
                    hora,
                    estado,
                    origen,
                    paciente_id,
                    paciente:pacientes (
                        id,
                        nombre_completo,
                        dni,
                        fecha_nacimiento,
                        telefono:telefono_principal,
                        email
                    )
                `)
                .gte('fecha', startDateStr)
                .lte('fecha', endDateStr);

            if (error) throw error;
            const fetchedData = data || [];
            setAppointments(fetchedData);

            // Fetch schedules for the same range
            const { data: schedData, error: schedError } = await supabase
                .from('horarios_diarios')
                .select('*')
                .gte('fecha_exacta', startDateStr)
                .lte('fecha_exacta', endDateStr);

            if (!schedError) setSchedules(schedData || []);

            // Update selectedAppt if it's currently open to keep details in sync
            setSelectedAppt(prev => {
                if (!prev) return null;
                const updated = fetchedData.find(a => a.id === prev.id);
                return updated || prev;
            });

        } catch (error) {
            console.error('Error fetching appointments:', error);
            showSnackbar('Error al cargar citas: ' + (error.message || error.toString()), 'error');
        } finally {
            if (!isBackground) setLoading(false);
        }
    }, [currentWeekStart, viewMode]);

    // Load Appointments when week/view changes
    useEffect(() => {
        fetchAppointments(false);
    }, [fetchAppointments]);

    // Realtime subscription: re-run whenever fetchAppointments changes (i.e., week/view changes)
    useEffect(() => {
        let debounceTimer;
        // Use a unique channel ID each time to avoid conflicts on remount
        const channelId = `citas_page_${Math.random().toString(36).substring(7)}`;

        const subscription = supabase
            .channel(channelId)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'citas' }, () => {
                if (debounceTimer) clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => fetchAppointments(true), 500);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pacientes' }, () => {
                if (debounceTimer) clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => fetchAppointments(true), 800);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'horarios_diarios' }, () => {
                // Also refresh when schedule configurations change
                if (debounceTimer) clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => fetchAppointments(true), 500);
            })
            .subscribe();

        return () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            supabase.removeChannel(subscription);
        };
    }, [fetchAppointments]);

    // --- Actions ---

    const handleSlotClick = async (date, slotTime) => {
        const dateStr = formatDate(date);
        const timeStr = slotTime;

        const isOccupied = appointments.find(app =>
            app.fecha === dateStr &&
            app.hora.substring(0, 5) === timeStr.substring(0, 5) &&
            app.estado !== 'CANCELADA'
        );

        if (isOccupied) return;

        setFormData(prev => ({ ...prev, fecha: dateStr, hora: timeStr.substring(0, 5) }));
        setIsManualTime(false);
        setIsDialogOpen(true);

        // Fetch slots so the dropdown is populated
        setIsFetchingSlots(true);
        try {
            const available = await fetchAvailableSlotsForDate(dateStr);
            // Re-inject the selected time even if occupied just in case it doesn't exist, though it shouldn't be occupied
            if (!available.includes(timeStr.substring(0, 5))) {
                available.push(timeStr.substring(0, 5));
                available.sort();
            }
            setAvailableTimeSlots(available);
        } catch {
            setAvailableTimeSlots([]);
        } finally {
            setIsFetchingSlots(false);
        }
    };

    const fetchExceptionSlotsForDate = async (dateStr) => {
        const { data: schedData } = await supabase
            .from('horarios_diarios')
            .select('*')
            .eq('fecha_exacta', dateStr);

        const regularSlots = generateSlotsFromSchedules(schedData || []);
        const lastSlot = regularSlots.length > 0 ? regularSlots[regularSlots.length - 1] : "09:10:00";
        
        let [hours, minutes] = lastSlot.split(':').map(Number);
        const exceptionSlots = [];
        for (let i = 0; i < 15; i++) { 
            minutes += 20;
            if (minutes >= 60) {
                hours += Math.floor(minutes / 60);
                minutes = minutes % 60;
            }
            if (hours >= 24) break;
            const h = hours.toString().padStart(2, '0');
            const m = minutes.toString().padStart(2, '0');
            exceptionSlots.push(`${h}:${m}`);
        }

        const { data } = await supabase
            .from('citas')
            .select('hora')
            .eq('fecha', dateStr)
            .neq('estado', 'CANCELADA');

        const occupiedTimes = (data || []).map(appt => appt.hora.substring(0, 5));
        return exceptionSlots.filter(slot => !occupiedTimes.includes(slot));
    };

    const fetchAvailableSlotsForDate = async (dateStr) => {
        const { data: schedData, error: schedError } = await supabase
            .from('horarios_diarios')
            .select('*')
            .eq('fecha_exacta', dateStr);

        if (schedError) {
            console.error('Error fetching schedules for date', schedError);
            return [];
        }

        const slotsForDay = generateSlotsFromSchedules(schedData || []);

        if (slotsForDay.length === 0) {
            return [];
        }

        const { data, error } = await supabase
            .from('citas')
            .select('hora')
            .eq('fecha', dateStr)
            .neq('estado', 'CANCELADA');

        if (error) throw error;

        const occupiedTimes = data.map(appt => appt.hora.substring(0, 5));
        return slotsForDay.map(s => s.substring(0, 5)).filter(slot => !occupiedTimes.includes(slot));
    };

    const handleNewApptDateChange = async (dateStr, isExceptionMode = isManualTime) => {
        setFormData(prev => ({ ...prev, fecha: dateStr, hora: '' }));
        if (!dateStr) {
            setAvailableTimeSlots([]);
            return;
        }

        setIsFetchingSlots(true);
        try {
            const available = await (isExceptionMode ? fetchExceptionSlotsForDate(dateStr) : fetchAvailableSlotsForDate(dateStr));
            setAvailableTimeSlots(available);
        } catch (error) {
            console.error('Error fetching available slots:', error);
            setAvailableTimeSlots([]);
        } finally {
            setIsFetchingSlots(false);
        }
    };

    const handleCloseNewApptDialog = () => {
        setIsDialogOpen(false);
        setIsContactBookOpen(false);
        setIsManualTime(false);
        setFormData(prev => ({
            ...prev,
            dni: '',
            nombre: '',
            fecha_nacimiento: '',
            telefono: '',
            email: ''
        }));
    };

    const handleOpenContactBook = async () => {
        setIsContactBookOpen(true);
        setIsFetchingContacts(true);
        const { data, error } = await supabase.from('pacientes').select('*').order('nombre_completo', { ascending: true });
        if (error) console.error("Error fetching patients", error);
        if (data) setContactBookPatients(data);
        setIsFetchingContacts(false);
    };

    const handleSelectContact = (patient) => {
        setFormData(prev => ({
            ...prev,
            dni: patient.dni || '',
            nombre: patient.nombre_completo || '',
            fecha_nacimiento: patient.fecha_nacimiento || '',
            telefono: patient.telefono_principal || patient.telefono || '',
            email: patient.email || ''
        }));
        setIsContactBookOpen(false);
        setContactSearchTerm('');
        showSnackbar('Paciente seleccionado', 'success');
    };

    const handlePatientSearch = async (dni) => {
        if (dni.length < 8) return;

        const { data } = await supabase
            .from('pacientes')
            .select('*')
            .eq('dni', dni)
            .single();

        if (data) {
            setFormData(prev => ({
                ...prev,
                nombre: data.nombre_completo,
                fecha_nacimiento: data.fecha_nacimiento || '',
                telefono: data.telefono_principal || data.telefono || '',
                email: data.email || ''
            }));
            showSnackbar('Paciente encontrado', 'success');
        }
    };

    const handleCreateAppointment = async (e) => {
        e.preventDefault();
        try {
            const timeWithSeconds = formData.hora.length === 5 ? `${formData.hora}:00` : formData.hora;

            const { count } = await supabase
                .from('citas')
                .select('*', { count: 'exact', head: true })
                .eq('fecha', formData.fecha)
                .eq('hora', timeWithSeconds)
                .neq('estado', 'CANCELADA');

            if (count > 0) {
                showSnackbar('¡El turno acaba de ser ocupado!', 'error');
                return;
            }

            const { data: patient, error: patientError } = await supabase
                .from('pacientes')
                .upsert({
                    dni: formData.dni,
                    nombre_completo: formData.nombre,
                    fecha_nacimiento: formData.fecha_nacimiento || null,
                    telefono_principal: formData.telefono,
                    email: formData.email || null
                }, { onConflict: 'dni' })
                .select()
                .single();

            if (patientError) throw patientError;

            const { error: apptError } = await supabase
                .from('citas')
                .insert({
                    paciente_id: patient.id,
                    fecha: formData.fecha,
                    hora: timeWithSeconds,
                    estado: 'PENDIENTE',
                    origen: formData.origen
                });

            if (apptError) throw apptError;

            showSnackbar('Cita agendada correctamente', 'success');
            setIsDialogOpen(false);
            fetchAppointments();
            setFormData({ dni: '', nombre: '', fecha_nacimiento: '', telefono: '', email: '', fecha: '', hora: '', origen: 'MANUAL' });

        } catch (err) {
            console.error(err);
            showSnackbar('Error al guardar la cita: ' + err.message, 'error');
        }
    };

    const confirmCancelAppointment = (id) => {
        setConfirmCancelDialog({ open: true, id });
    };

    const handleCancelAppointment = async () => {
        const id = confirmCancelDialog.id;
        setConfirmCancelDialog({ open: false, id: null });
        if (!id) return;

        const { error } = await supabase
            .from('citas')
            .update({ estado: 'CANCELADA' })
            .eq('id', id);

        if (error) showSnackbar('Error al cancelar', 'error');
        else {
            fetchAppointments();
        }
    };

    const handleConfirmAppointment = async (id) => {
        // Optimistic update
        setAppointments(prev => prev.map(a =>
            a.id === id ? { ...a, estado: 'CONFIRMADA' } : a
        ));

        const { error } = await supabase
            .from('citas')
            .update({ estado: 'CONFIRMADA' })
            .eq('id', id);

        if (error) {
            console.error('Error confirming appointment:', error);
            showSnackbar('Error al confirmar cita', 'error');
            fetchAppointments(); // Revert/Refresh on error
        } else {
            showSnackbar('Cita confirmada exitosamente', 'success');
        }
    };

    const handleReprogramAppointment = (id) => {
        setReprogramData({ id, fecha: '', hora: '' });
        setAvailableTimeSlots([]);
        setIsReprogramDialogOpen(true);
    };

    const handleReprogramDateChange = async (dateStr) => {
        setReprogramData(prev => ({ ...prev, fecha: dateStr, hora: '' }));
        if (!dateStr) {
            setAvailableTimeSlots([]);
            return;
        }

        setIsFetchingSlots(true);
        try {
            const available = await fetchAvailableSlotsForDate(dateStr);
            setAvailableTimeSlots(available);
        } catch (error) {
            console.error('Error fetching available slots:', error);
            setAvailableTimeSlots([]);
        } finally {
            setIsFetchingSlots(false);
        }
    };

    const submitReprogramAppointment = async (e) => {
        e.preventDefault();
        try {
            const timeWithSeconds = reprogramData.hora.length === 5 ? `${reprogramData.hora}:00` : reprogramData.hora;

            const { count } = await supabase
                .from('citas')
                .select('*', { count: 'exact', head: true })
                .eq('fecha', reprogramData.fecha)
                .eq('hora', timeWithSeconds)
                .neq('estado', 'CANCELADA');

            if (count > 0) {
                showSnackbar('¡La nueva fecha y hora ya están ocupadas!', 'error');
                return;
            }

            setAppointments(prev => prev.map(a =>
                a.id === reprogramData.id ? { ...a, estado: 'POSPUESTA', fecha: reprogramData.fecha, hora: timeWithSeconds } : a
            ));

            const { error } = await supabase
                .from('citas')
                .update({ estado: 'POSPUESTA', fecha: reprogramData.fecha, hora: timeWithSeconds })
                .eq('id', reprogramData.id);

            if (error) {
                console.error('Error reprogramming appointment:', error);
                showSnackbar('Error al reprogramar cita', 'error');
            } else {
                showSnackbar('Cita reprogramada a estado POSPUESTA exitosamente', 'success');
                setIsReprogramDialogOpen(false);
                setIsApptDetailsOpen(false);
                fetchAppointments();
            }
        } catch (err) {
            console.error(err);
            showSnackbar('Error al reprogramar: ' + err.message, 'error');
        }
    };

    const handleMobileMenuClose = () => {
        setMobileMenuPosition(null);
        setMenuAppt(null);
    };

    const showSnackbar = (msg, type) => {
        setSnackbar({ open: true, message: msg, type });
        setTimeout(() => setSnackbar({ ...snackbar, open: false }), 4000);
    };

    const weekDays = [0, 1, 2, 3, 4, 5].map(i => addDays(currentWeekStart, i)); // Mon-Sat

    const filteredContacts = contactBookPatients.filter(patient =>
        (patient.nombre_completo && patient.nombre_completo.toLowerCase().includes(contactSearchTerm.toLowerCase())) ||
        (patient.dni && patient.dni.includes(contactSearchTerm))
    );

    // --- Render Components ---

    return (
        <Box sx={{
            width: isMobile ? '100%' : '95%',
            maxWidth: '100vw',
            mx: 'auto',
            height: 'calc(100vh - 48px)',
            display: 'flex',
            flexDirection: 'column',
            px: isMobile ? 0 : 3,
            py: isMobile ? 1 : 3,
            gap: isMobile ? 1 : 3,
            bgcolor: 'transparent',
            overflowX: 'hidden'
        }}>
            {/* Header */}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'center', md: 'center' }, gap: 2, position: 'relative', minHeight: 48 }}>
                <Box>
                    <Typography variant={isMobile ? "h5" : "h3"} sx={{ fontWeight: 800, color: 'text.primary', textAlign: isMobile ? 'center' : 'left', px: isMobile ? 2 : 0 }}>
                        Agenda Médica
                    </Typography>
                </Box>

                <Box sx={{
                    display: 'flex',
                    width: isMobile ? '100%' : 'auto',
                    position: isMobile ? 'static' : 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: isMobile ? 'none' : 'translate(-50%, -50%)',
                    alignItems: 'center',
                    justifyContent: isMobile ? 'space-between' : 'center',
                    gap: 1,
                    px: isMobile ? 2 : 0,
                    zIndex: 1
                }}>
                    {isMobile && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Button
                                variant="outlined"
                                onClick={(e) => setFilterAnchorEl(e.currentTarget)}
                                startIcon={<FilterListIcon />}
                                size="small"
                                sx={{
                                    borderRadius: '20px',
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    bgcolor: activeFilters.length > 0 ? 'primary.light' : 'background.paper',
                                    color: activeFilters.length > 0 ? 'primary.main' : 'text.primary',
                                    borderColor: activeFilters.length > 0 ? 'primary.main' : 'divider',
                                    boxShadow: 1
                                }}
                            >
                                Filtros {activeFilters.length > 0 && `(${activeFilters.length})`}
                            </Button>
                            <Menu
                                anchorEl={filterAnchorEl}
                                open={isFilterMenuOpen}
                                onClose={() => setFilterAnchorEl(null)}
                                PaperProps={{ sx: { borderRadius: 2, mt: 1, minWidth: 180 } }}
                            >
                                {filterOptions
                                    .filter(opt => viewMode === 'list' ? true : !['HOY', 'MANANA'].includes(opt.value))
                                    .map(option => {
                                        const isActive = activeFilters.includes(option.value);
                                        return (
                                            <MenuItem
                                                key={option.value}
                                                onClick={() => {
                                                    handleFilterToggle(option.value);
                                                    setFilterAnchorEl(null);
                                                }}
                                                sx={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    color: isActive ? option.activeColor : 'text.primary',
                                                    fontWeight: isActive ? 700 : 400
                                                }}
                                            >
                                                {option.label}
                                                {isActive && <CheckCircleIcon sx={{ fontSize: 16, ml: 1, color: option.activeColor }} />}
                                            </MenuItem>
                                        );
                                    })}
                            </Menu>
                            <Button
                                variant="outlined"
                                onClick={() => {
                                    setFilterModel({ items: [] });
                                    setActiveFilters([]);
                                    setSelectedDate(null);
                                    if (location.search) {
                                        navigate('/appointments', { replace: true });
                                    }
                                }}
                                startIcon={<FilterAltOffIcon />}
                                size="small"
                                sx={{
                                    borderRadius: '20px',
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    bgcolor: 'background.paper',
                                    color: 'text.primary',
                                    borderColor: 'divider',
                                    boxShadow: 1
                                }}
                            >
                                Limpiar
                            </Button>
                        </Box>
                    )}

                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        bgcolor: 'background.paper',
                        p: 0.5,
                        borderRadius: 2,
                        boxShadow: 1
                    }}>
                        <IconButton
                            onClick={() => setViewMode('week')}
                            color={viewMode === 'week' ? 'primary' : 'default'}
                            sx={{ bgcolor: viewMode === 'week' ? 'primary.light' : 'transparent', '&:hover': { bgcolor: viewMode === 'week' ? 'primary.light' : 'action.hover' } }}
                            size={isMobile ? "small" : "medium"}
                        >
                            <CalendarViewWeekIcon />
                        </IconButton>
                        <IconButton
                            onClick={() => setViewMode('list')}
                            color={viewMode === 'list' ? 'primary' : 'default'}
                            sx={{ bgcolor: viewMode === 'list' ? 'primary.light' : 'transparent', '&:hover': { bgcolor: viewMode === 'list' ? 'primary.light' : 'action.hover' } }}
                            size={isMobile ? "small" : "medium"}
                        >
                            <ListAltIcon />
                        </IconButton>
                    </Box>
                </Box>

                {/* Botones de acción originales - Solo en Escritorio */}
                {
                    !isMobile && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: 'auto', justifyContent: 'flex-end', zIndex: 1 }}>
                            <Button
                                variant="outlined"
                                color="inherit"
                                onClick={() => {
                                    setFilterModel({ items: [] });
                                    setActiveFilters([]);
                                    setSelectedDate(null);
                                    if (location.search) {
                                        navigate('/appointments', { replace: true });
                                    }
                                }}
                                startIcon={<FilterAltOffIcon />}
                                sx={{ bgcolor: 'background.paper', color: 'text.primary', border: '1px solid', borderColor: 'divider', '&:hover': { bgcolor: 'action.hover' } }}
                            >
                                Restablecer Filtros
                            </Button>
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={() => {
                                    setFormData({ dni: '', nombre: '', fecha_nacimiento: '', telefono: '', email: '', fecha: '', hora: '', origen: 'MANUAL' });
                                    setAvailableTimeSlots([]);
                                    setIsManualTime(false);
                                    setIsDialogOpen(true);
                                }}
                                startIcon={<AddIcon />}
                                sx={{ boxShadow: '0px 8px 16px rgba(var(--c-primary-rgb), 0.25)' }}
                            >
                                Nueva Cita
                            </Button>
                        </Box>
                    )
                }
            </Box >

            {/* Week Navigation - Solo en Escritorio */}
            {
                viewMode === 'week' && !isMobile && (
                    <div className="flex items-center justify-between bg-surface px-4 py-3 rounded-xl shadow-sm">
                        <button onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-text-secondary">
                            <ChevronLeftIcon />
                        </button>
                        <span className="font-semibold text-text-primary capitalize">
                            {formatInTimeZone(currentWeekStart, TIMEZONE, 'MMMM yyyy', { locale: es })}
                        </span>
                        <button onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-text-secondary">
                            <ChevronRightIcon />
                        </button>
                    </div>
                )
            }

            {/* Content Area */}
            <div className="flex-1 overflow-hidden bg-surface rounded-2xl shadow-sm relative flex flex-col w-full min-w-0">

                {loading && (
                    <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                )}

                {viewMode === 'list' && !isMobile && (
                    <Box sx={{
                        display: 'flex',
                        gap: 1,
                        px: 3,
                        pt: 3,
                        pb: 2,
                        width: '100%',
                        maxWidth: '100%',
                        flexWrap: 'wrap',
                        justifyContent: 'flex-start',
                        flexShrink: 0
                    }}>
                        {filterOptions.map(btn => {
                            const isActive = activeFilters.includes(btn.value);
                            return (
                                <Button
                                    key={btn.value}
                                    variant="outlined"
                                    onClick={() => handleFilterToggle(btn.value)}
                                    sx={{
                                        borderRadius: '20px',
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        border: '1px solid',
                                        borderColor: isActive ? btn.activeColor : 'divider',
                                        color: isActive ? btn.activeColor : 'text.primary',
                                        bgcolor: isActive ? `${btn.activeColor}15` : 'transparent',
                                        whiteSpace: 'nowrap',
                                        minWidth: 'fit-content',
                                        '&:hover': {
                                            bgcolor: isActive ? `${btn.activeColor}25` : 'action.hover',
                                            borderColor: isActive ? btn.activeColor : 'divider'
                                        }
                                    }}
                                >
                                    {btn.label}
                                </Button>
                            );
                        })
                        }
                    </Box>
                )}

                {viewMode === 'week' ? (
                    isMobile ? (
                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 0, overflowY: 'auto' }}>
                            <Box sx={{ p: 0 }}>
                                <MobileCalendar
                                    appointments={appointments}
                                    onDateSelect={(date) => setSelectedDate(date)}
                                    selectedDate={selectedDate}
                                    isMobile={isMobile}
                                />
                            </Box>
                            <Typography variant="subtitle2" sx={{ px: 2, pb: 1, pt: 1, fontWeight: 'bold', textAlign: 'center', width: '100%' }}>
                                {selectedDate ? `Citas para el ${formatDateDDMMYYYY(selectedDate)}` : 'Selecciona un día'}
                            </Typography>
                            <Divider />
                            <List sx={{ flex: 1 }}>
                                {([...filteredAppointments]
                                    .filter(a => a.fecha === selectedDate || !selectedDate))
                                    .sort((a, b) => a.hora.localeCompare(b.hora))
                                    .map(appt => (
                                        <React.Fragment key={appt.id}>
                                            <ListItem
                                                alignItems="center"
                                                onClick={(e) => {
                                                    setMenuAppt(appt);
                                                    setMobileMenuPosition({
                                                        mouseX: e.clientX,
                                                        mouseY: e.clientY,
                                                    });
                                                }}
                                                sx={{ px: 2, py: 1.5, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                                            >
                                                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1.5 }}>
                                                    {/* COL 1: FECHA/HORA */}
                                                    <Box sx={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        minWidth: 75,
                                                        alignItems: 'flex-start',
                                                        justifyContent: 'center'
                                                    }}>
                                                        <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.1 }}>
                                                            {formatTime12h(appt.hora)}
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.7rem' }}>
                                                            {formatDateDDMMYYYY(appt.fecha).substring(0, 5)}
                                                        </Typography>
                                                    </Box>

                                                    {/* COL 2: NOMBRE (MAYOR TAMAÑO Y MANEJO DE OVERFLOW) */}
                                                    <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
                                                        <Typography
                                                            variant="body1"
                                                            sx={{
                                                                fontWeight: 800,
                                                                color: 'text.primary',
                                                                fontSize: '0.95rem',
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis'
                                                            }}
                                                        >
                                                            {capitalizeWords(appt.paciente?.nombre_completo || 'Sin nombre')}
                                                        </Typography>
                                                    </Box>

                                                    {/* COL 3: ESTADO */}
                                                    <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', minWidth: 'fit-content' }}>
                                                        <StatusBadge status={appt.estado} />
                                                    </Box>
                                                </Box>
                                            </ListItem>
                                            <Divider component="li" />
                                        </React.Fragment>
                                    ))}
                                {filteredAppointments.filter(a => a.fecha === selectedDate).length === 0 && selectedDate && (
                                    <Box sx={{ p: 4, textAlign: 'center' }}>
                                        <Typography variant="body2" color="text.secondary">No hay citas para este día</Typography>
                                    </Box>
                                )}
                            </List>
                        </Box>
                    ) : (
                        <div className="flex-1 overflow-auto">
                            <div className="grid grid-cols-1 md:grid-cols-6 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-700 min-h-full">
                                {weekDays.map((day) => {
                                    const dateStr = formatDate(day);
                                    const nowLima = toZonedTime(new Date(), TIMEZONE);
                                    const isToday = isSameDay(day, startOfDay(nowLima));
                                    
                                    const daySchedules = schedules.filter(s => s.fecha_exacta === dateStr);
                                    const regularSlots = generateSlotsFromSchedules(daySchedules);
                                    const dayAppts = appointments.filter(a => a.fecha === dateStr && a.estado !== 'CANCELADA');
                                    const apptTimes = dayAppts.map(a => a.hora.substring(0, 5));
                                    
                                    // Combine regular slots with existing appointments (even if they are outside regular hours)
                                    const slots = Array.from(new Set([...regularSlots.map(s => s.substring(0, 5)), ...apptTimes])).sort();

                                    return (
                                        <div key={day.toString()} className="flex flex-col">
                                            {/* Day Header */}
                                            <div className={`p-4 text-center sticky top-0 z-10 transition-colors duration-200 ${isToday ? 'bg-primary-50 dark:bg-primary-900/40 shadow-sm' : 'bg-surface'}`}>
                                                <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${isToday ? 'text-text-primary dark:text-primary' : 'text-text-secondary'}`}>
                                                    {formatInTimeZone(day, TIMEZONE, 'EEE', { locale: es })}
                                                </p>
                                                <p className={`text-xl font-bold ${isToday ? 'text-text-primary dark:text-primary-light' : 'text-text-primary'}`}>
                                                    {formatInTimeZone(day, TIMEZONE, 'd', { locale: es })}
                                                </p>
                                            </div>

                                            {/* Slots */}
                                            <div className={`flex-1 p-2 space-y-2 transition-colors duration-200 ${isToday ? 'bg-primary-50/30 dark:bg-primary-900/10' : 'bg-transparent'} hover:bg-cyan-50/50 dark:hover:bg-cyan-900/10`}>
                                                {slots.map((slotTime) => {
                                                    const timeStr = slotTime;
                                                    const appt = appointments.find(a =>
                                                        a.fecha === dateStr && a.hora.substring(0, 5) === timeStr.substring(0, 5) && a.estado !== 'CANCELADA'
                                                    );

                                                    return (
                                                        <div
                                                            key={timeStr}
                                                            onClick={() => {
                                                                if (appt) {
                                                                    setSelectedAppt(appt);
                                                                    setPatientPanelTab(0);
                                                                    setIsApptDetailsOpen(true);
                                                                } else {
                                                                    handleSlotClick(day, slotTime);
                                                                }
                                                            }}
                                                            className={`
                                                                group relative p-2 rounded-lg text-sm transition-all duration-200
                                                                ${appt
                                                                    ? 'bg-surface shadow-sm cursor-pointer hover:shadow-md'
                                                                    : 'bg-surface/50 shadow-sm hover:shadow-md hover:border-secondary cursor-pointer opacity-80 hover:opacity-100 hover:bg-surface'
                                                                }
                                                            `}
                                                        >
                                                            <div className="flex justify-between items-start mb-1 h-5">
                                                                <span className="font-mono text-xs font-medium text-text-secondary">
                                                                    {timeStr.substring(0, 5)}
                                                                </span>
                                                                {appt && <StatusBadge status={appt.estado} />}
                                                            </div>

                                                            {appt ? (
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-semibold text-text-primary truncate" title={appt.paciente?.nombre_completo}>
                                                                        {capitalizeWords(appt.paciente?.nombre_completo || 'Sin nombre')}
                                                                    </p>
                                                                    <p className="text-xs text-text-secondary flex items-center gap-1 truncate">
                                                                        {appt.paciente?.dni}
                                                                    </p>
                                                                    <button
                                                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1 bg-surface rounded-full shadow-md z-20"
                                                                        onClick={(e) => { e.stopPropagation(); confirmCancelAppointment(appt.id); }}
                                                                        title="Cancelar Cita"
                                                                    >
                                                                        <CancelIcon fontSize="small" />
                                                                    </button>
                                                                    {appt.estado !== 'CANCELADA' && appt.estado !== 'POSPUESTA' && (
                                                                        <button
                                                                            className="absolute top-2 right-9 opacity-0 group-hover:opacity-100 text-orange-500 hover:text-orange-700 p-1 bg-surface rounded-full shadow-md z-20"
                                                                            onClick={(e) => { e.stopPropagation(); handleReprogramAppointment(appt.id); }}
                                                                            title="Reprogramar Cita"
                                                                        >
                                                                            <AccessTimeIcon fontSize="small" />
                                                                        </button>
                                                                    )}
                                                                    {(appt.estado === 'PENDIENTE' || appt.estado === 'POSPUESTA') && (
                                                                        <button
                                                                            className="absolute top-2 right-16 opacity-0 group-hover:opacity-100 text-teal-600 hover:text-teal-700 p-1 bg-surface rounded-full shadow-md z-20"
                                                                            onClick={(e) => { e.stopPropagation(); handleConfirmAppointment(appt.id); }}
                                                                            title="Confirmar Cita"
                                                                        >
                                                                            <CheckCircleIcon fontSize="small" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <div className="h-6 flex items-center justify-center text-primary opacity-0 group-hover:opacity-100">
                                                                    <AddIcon fontSize="small" key="add" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                                {slots.length === 0 && (
                                                    <div className="text-center py-10 text-text-secondary text-sm">
                                                        Cerrado
                                                    </div>
                                                )}
                                                <div className="flex justify-center mt-2 pb-2">
                                                    <Tooltip title="Agregar turno extra">
                                                        <IconButton
                                                            size="small"
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                const dateStr = formatDate(day);
                                                                setFormData({ dni: '', nombre: '', fecha_nacimiento: '', telefono: '', email: '', fecha: dateStr, hora: '', origen: 'MANUAL' });
                                                                setIsManualTime(true);
                                                                setIsDialogOpen(true);
                                                                
                                                                setIsFetchingSlots(true);
                                                                try {
                                                                    const exceptionSlots = await fetchExceptionSlotsForDate(dateStr);
                                                                    setAvailableTimeSlots(exceptionSlots);
                                                                } catch {
                                                                    setAvailableTimeSlots([]);
                                                                } finally {
                                                                    setIsFetchingSlots(false);
                                                                }
                                                            }}
                                                            sx={{
                                                                bgcolor: 'transparent',
                                                                border: '1px dashed',
                                                                borderColor: 'primary.main',
                                                                color: 'var(--c-primary-text)',
                                                                opacity: 0.7,
                                                                '&:hover': {
                                                                    bgcolor: 'primary.50',
                                                                    opacity: 1,
                                                                }
                                                            }}
                                                        >
                                                            <AddIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )
                ) : (
                    <div className="flex-1 w-full min-h-0 overflow-hidden">
                        {isMobile ? (
                            <List sx={{ px: 0 }}>
                                {[...filteredAppointments]
                                    .sort((a, b) => {
                                        const dateComp = a.fecha.localeCompare(b.fecha);
                                        return dateComp !== 0 ? dateComp : a.hora.localeCompare(b.hora);
                                    })
                                    .map((appt, index, sortedArr) => {
                                        const showHeader = index === 0 || sortedArr[index - 1].fecha !== appt.fecha;
                                        return (
                                            <React.Fragment key={appt.id}>
                                                {showHeader && (
                                                    <Typography
                                                        variant="subtitle2"
                                                        sx={{
                                                            px: 2,
                                                            py: 1,
                                                            bgcolor: 'rgba(var(--c-primary-rgb), 0.05)',
                                                            fontWeight: 'bold',
                                                            textAlign: 'center',
                                                            color: 'var(--c-primary-text)',
                                                            borderBottom: '1px solid',
                                                            borderColor: 'divider'
                                                        }}
                                                    >
                                                        Citas para el {formatDateDDMMYYYY(appt.fecha)}
                                                    </Typography>
                                                )}
                                                <ListItem
                                                    alignItems="center"
                                                    onClick={(e) => {
                                                        setMenuAppt(appt);
                                                        setMobileMenuPosition({
                                                            mouseX: e.clientX,
                                                            mouseY: e.clientY,
                                                        });
                                                    }}
                                                    sx={{ px: 2, py: 1.5, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                                                >
                                                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1.5 }}>
                                                        {/* COL 1: FECHA/HORA */}
                                                        <Box sx={{
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            minWidth: 75,
                                                            alignItems: 'flex-start',
                                                            justifyContent: 'center'
                                                        }}>
                                                            <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.1 }}>
                                                                {formatTime12h(appt.hora)}
                                                            </Typography>
                                                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.7rem' }}>
                                                                {formatDateDDMMYYYY(appt.fecha).substring(0, 5)}
                                                            </Typography>
                                                        </Box>

                                                        {/* COL 2: NOMBRE (MAYOR TAMAÑO Y MANEJO DE OVERFLOW) */}
                                                        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
                                                            <Typography
                                                                variant="body1"
                                                                sx={{
                                                                    fontWeight: 800,
                                                                    color: 'text.primary',
                                                                    fontSize: '0.95rem',
                                                                    whiteSpace: 'nowrap',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis'
                                                                }}
                                                            >
                                                                {capitalizeWords(appt.paciente?.nombre_completo || 'Sin nombre')}
                                                            </Typography>
                                                        </Box>

                                                        {/* COL 3: ESTADO */}
                                                        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', minWidth: 'fit-content' }}>
                                                            <StatusBadge status={appt.estado} />
                                                        </Box>
                                                    </Box>
                                                </ListItem>
                                                <Divider component="li" />
                                            </React.Fragment>
                                        );
                                    })}
                                {filteredAppointments.length === 0 && (
                                    <Box sx={{ p: 4, textAlign: 'center' }}>
                                        <Typography variant="body2" color="text.secondary">No hay citas registradas</Typography>
                                    </Box>
                                )}
                            </List>
                        ) : (
                            <DataGrid
                                rows={filteredAppointments}
                                columns={[
                                    { field: 'id', headerName: 'ID', width: 70 },
                                    { field: 'fecha', headerName: 'Fecha', width: 120, valueGetter: (value) => formatDateDDMMYYYY(value) },
                                    { field: 'hora', headerName: 'Hora', width: 100, valueGetter: (value) => formatTime12h(value) },
                                    {
                                        field: 'paciente',
                                        headerName: 'Paciente',
                                        width: 250,
                                        valueGetter: (value, row) => capitalizeWords(row?.paciente?.nombre_completo || 'Desconocido')
                                    },
                                    {
                                        field: 'dni',
                                        headerName: 'DNI/CE',
                                        width: 120,
                                        valueGetter: (value, row) => row?.paciente?.dni || '-'
                                    },
                                    {
                                        field: 'estado',
                                        headerName: 'Estado',
                                        width: 150,
                                        renderCell: (params) => <StatusBadge status={params.value} />
                                    },
                                    {
                                        field: 'actions',
                                        headerName: 'Acciones',
                                        width: 120,
                                        sortable: false,
                                        renderCell: (params) => (
                                            <div className="flex items-center gap-1 h-full">
                                                {(params.row.estado === 'PENDIENTE' || params.row.estado === 'POSPUESTA') && (
                                                    <Tooltip title="Confirmar">
                                                        <IconButton
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleConfirmAppointment(params.row.id);
                                                            }}
                                                            size="small"
                                                            className="text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20"
                                                        >
                                                            <CheckCircleIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                                {params.row.estado !== 'CANCELADA' && params.row.estado !== 'POSPUESTA' && (
                                                    <Tooltip title="Reprogramar">
                                                        <IconButton
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleReprogramAppointment(params.row.id);
                                                            }}
                                                            size="small"
                                                            className="text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                                                        >
                                                            <AccessTimeIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                                {params.row.estado !== 'CANCELADA' && (
                                                    <Tooltip title="Cancelar">
                                                        <IconButton
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                confirmCancelAppointment(params.row.id);
                                                            }}
                                                            size="small"
                                                            className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                        >
                                                            <CancelIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </div>
                                        )
                                    }
                                ]}
                                initialState={{
                                    pagination: { paginationModel: { pageSize: 15 } },
                                }}
                                pageSizeOptions={[15, 30]}
                                filterModel={filterModel}
                                onFilterModelChange={(newModel) => setFilterModel(newModel)}
                                disableSelectionOnClick
                                localeText={gridLocaleText}
                                slotProps={gridSlotProps}
                                onRowClick={(params) => {
                                    setSelectedAppt(params.row);
                                    setIsPatientInfoOpen(false);
                                    setPatientPanelTab(0);
                                    setIsApptDetailsOpen(true);
                                }}
                                sx={{
                                    border: 'none',
                                    '& .MuiDataGrid-cell': {
                                        color: (theme) => theme.palette.mode === 'dark' ? '#cbd5e1' : undefined
                                    },
                                    '& .MuiDataGrid-columnHeaders': {
                                        backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#1e293b' : undefined,
                                        color: (theme) => theme.palette.mode === 'dark' ? '#cbd5e1' : undefined
                                    }
                                }}
                            />
                        )}
                    </div>
                )}
            </div>

            {/* Modal Nueva Cita */}
            <Dialog
                open={isDialogOpen}
                onClose={handleCloseNewApptDialog}
                maxWidth={isContactBookOpen ? false : 'sm'}
                fullWidth={!isContactBookOpen}
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        display: 'flex',
                        flexDirection: 'row',
                        bgcolor: 'background.default',
                        overflow: 'hidden',
                        minHeight: 400,
                        ...(isContactBookOpen && {
                            width: '80%',
                            maxWidth: 'none',
                            height: '95vh',
                            maxHeight: '95vh'
                        })
                    }
                }}
            >
                <Box sx={{ width: isContactBookOpen ? '500px' : '100%', display: 'flex', flexDirection: 'column', flexShrink: 0, bgcolor: 'background.paper', borderRight: isContactBookOpen ? '1px solid divider' : 'none' }}>
                    <DialogTitle sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, position: 'relative' }}>
                        <Typography variant="h6" fontWeight="bold">Nueva Cita</Typography>
                        <IconButton onClick={handleCloseNewApptDialog} sx={{ color: 'inherit', position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}>
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>

                    <form onSubmit={handleCreateAppointment} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <DialogContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3, overflowY: 'auto' }}>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <TextField
                                    label="Fecha"
                                    type="date"
                                    required
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                    value={formData.fecha}
                                    onChange={e => handleNewApptDateChange(e.target.value)}
                                />
                                <TextField
                                    label="Hora"
                                    select
                                    required
                                    fullWidth
                                    value={formData.hora}
                                    onChange={e => setFormData({ ...formData, hora: e.target.value })}
                                    disabled={!formData.fecha || isFetchingSlots}
                                    InputProps={{
                                        startAdornment: isFetchingSlots && <CircularProgress size={20} sx={{ mr: 1 }} />
                                    }}
                                >
                                    {availableTimeSlots.map((slot) => (
                                        <MenuItem key={slot} value={slot}>
                                            {formatTime12h(slot)}
                                        </MenuItem>
                                    ))}
                                    {availableTimeSlots.length === 0 && !isFetchingSlots && (
                                        <MenuItem disabled value="">
                                            {isManualTime ? 'No hay horarios extra disponibles' : 'No hay horarios disponibles'}
                                        </MenuItem>
                                    )}
                                </TextField>
                            </Box>

                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <TextField
                                    label="DNI/CE"
                                    required
                                    sx={{ flex: 1 }}
                                    placeholder="Ingrese DNI/CE"
                                    value={formData.dni}
                                    onChange={e => {
                                        const val = e.target.value.replace(/\D/g, '').slice(0, 15);
                                        setFormData({ ...formData, dni: val });
                                        if (val.length >= 8) handlePatientSearch(val);
                                    }}
                                />
                                <Button
                                    variant="contained"
                                    onClick={handleOpenContactBook}
                                    startIcon={<ListAltIcon />}
                                    sx={{
                                        flex: 1,
                                        textTransform: 'none',
                                        fontWeight: 'bold',
                                        bgcolor: '#B3E5FC',
                                        color: '#01579B',
                                        boxShadow: 1,
                                        '&:hover': {
                                            bgcolor: '#81D4FA'
                                        }
                                    }}
                                >
                                    Contactos
                                </Button>
                            </Box>

                            <TextField
                                label="Nombre Completo"
                                required
                                fullWidth
                                value={formData.nombre}
                                onChange={e => setFormData({ ...formData, nombre: e.target.value.toUpperCase() })}
                            />

                            <TextField
                                label="Fecha de Nacimiento"
                                type="date"
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                value={formData.fecha_nacimiento}
                                onChange={e => setFormData({ ...formData, fecha_nacimiento: e.target.value })}
                            />

                            <TextField
                                label="Teléfono Principal"
                                type="tel"
                                required
                                fullWidth
                                value={formData.telefono}
                                onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                            />

                            <TextField
                                label="Correo Electrónico (Opcional)"
                                type="email"
                                fullWidth
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                        </DialogContent>

                        <DialogActions sx={{ p: 3, pt: 0 }}>
                            <Button
                                onClick={handleCloseNewApptDialog}
                                color="inherit"
                                sx={{ color: 'text.secondary' }}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                variant="contained"
                                color="primary"
                                sx={{ boxShadow: 2 }}
                            >
                                Agendar cita
                            </Button>
                        </DialogActions>
                    </form>
                </Box>

                {isContactBookOpen && (
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: 'background.paper', minWidth: 300 }}>
                        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, position: 'relative' }}>
                            <Typography variant="h6" fontWeight="bold">Libreta de Contactos</Typography>
                            <IconButton onClick={() => setIsContactBookOpen(false)} sx={{ color: 'inherit', position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}>
                                <CloseIcon />
                            </IconButton>
                        </DialogTitle>
                        <DialogContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <TextField
                                autoFocus
                                fullWidth
                                placeholder="Buscar por nombre o DNI..."
                                value={contactSearchTerm}
                                onChange={(e) => setContactSearchTerm(e.target.value)}
                                variant="outlined"
                                sx={{ mt: 1 }}
                            />
                            {isFetchingContacts ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                                    <CircularProgress />
                                </Box>
                            ) : (
                                <List sx={{ overflow: 'auto', flex: 1, p: 0 }}>
                                    {filteredContacts.map((patient) => (
                                        <ListItem
                                            button="true"
                                            key={patient.id}
                                            onClick={() => handleSelectContact(patient)}
                                            sx={{ borderBottom: '1px solid', borderColor: 'divider', '&:hover': { bgcolor: 'action.hover' }, borderRadius: 1, cursor: 'pointer' }}
                                        >
                                            <ListItemText
                                                primary={
                                                    <Typography variant="subtitle1" fontWeight="bold">
                                                        {capitalizeWords(patient.nombre_completo || 'Sin nombre')}
                                                    </Typography>
                                                }
                                                secondary={
                                                    <React.Fragment>
                                                        <Typography component="span" variant="body2" color="text.secondary">
                                                            DNI: {patient.dni || '-'} • Tel: {patient.telefono_principal || patient.telefono || '-'}
                                                        </Typography>
                                                    </React.Fragment>
                                                }
                                            />
                                        </ListItem>
                                    ))}
                                    {filteredContacts.length === 0 && (
                                        <Box sx={{ p: 4, textAlign: 'center' }}>
                                            <Typography variant="body2" color="text.secondary">No se encontraron pacientes</Typography>
                                        </Box>
                                    )}
                                </List>
                            )}
                        </DialogContent>
                    </Box>
                )}
            </Dialog>

            {/* Modal Detalles de Cita y Paciente (Alineación Side by Side) */}
            <Dialog
                open={isApptDetailsOpen}
                onClose={() => { setIsApptDetailsOpen(false); setIsPatientInfoOpen(false); }}
                maxWidth={isPatientInfoOpen ? false : 'xs'}
                fullWidth={!isPatientInfoOpen}
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        display: 'flex',
                        flexDirection: 'row',
                        bgcolor: 'background.default',
                        overflow: 'hidden',
                        minHeight: 400,
                        ...(isPatientInfoOpen && {
                            width: '80%',
                            maxWidth: 'none',
                            height: '95vh',
                            maxHeight: '95vh'
                        })
                    }
                }}
            >
                <Box sx={{ width: isPatientInfoOpen ? '380px' : '100%', display: 'flex', flexDirection: 'column', flexShrink: 0, bgcolor: 'background.paper', borderRight: isPatientInfoOpen ? '1px solid divider' : 'none' }}>
                    <DialogTitle sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2, position: 'relative' }}>
                        <Typography variant="h6" fontWeight="bold" sx={{ textTransform: 'uppercase' }}>Detalles de la Cita</Typography>
                        <IconButton onClick={() => setIsApptDetailsOpen(false)} sx={{ color: 'inherit', position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}>
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>

                    <DialogContent sx={{ p: 3, pt: 5, display: 'flex', flexDirection: 'column', gap: 3, position: 'relative' }}>
                        <Box sx={{ mb: 2, mt: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <Button
                                variant="text"
                                onClick={() => { setPatientPanelTab(0); setIsPatientInfoOpen(true); }}
                                sx={{
                                    p: 0,
                                    textTransform: 'none',
                                    fontSize: '1.6rem',
                                    fontWeight: '900',
                                    color: 'text.primary',
                                    textDecoration: 'none',
                                    textAlign: 'center',
                                    lineHeight: 1.35,
                                    wordBreak: 'break-word',
                                    whiteSpace: 'normal',
                                    px: 2
                                }}
                            >
                                {capitalizeWords(selectedAppt?.paciente?.nombre_completo || 'Sin nombre')}
                            </Button>
                        </Box>

                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                            {/* Columna Izquierda */}
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, borderRight: { sm: 1 }, borderColor: { sm: 'divider' }, pr: { sm: 2 } }}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ textTransform: 'uppercase' }}>Teléfono</Typography>
                                    <Typography variant="body2" fontWeight="medium">{selectedAppt?.paciente?.telefono || '-'}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ textTransform: 'uppercase' }}>Edad</Typography>
                                    <Typography variant="body2" fontWeight="medium">
                                        {selectedAppt?.paciente?.fecha_nacimiento && selectedAppt.paciente.fecha_nacimiento !== '-'
                                            ? renderAge(selectedAppt.paciente.fecha_nacimiento).replace(/[()]/g, '')
                                            : '-'}
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ textTransform: 'uppercase' }}>Fecha Nac.</Typography>
                                    <Typography variant="body2" fontWeight="medium">{selectedAppt?.paciente?.fecha_nacimiento || '-'}</Typography>
                                </Box>
                            </Box>

                            {/* Columna Derecha */}
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pl: { sm: 1 } }}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ textTransform: 'uppercase' }}>DNI/CE</Typography>
                                    <Typography variant="body2" fontWeight="medium">{selectedAppt?.paciente?.dni || '-'}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ textTransform: 'uppercase' }}>Correo Electrónico</Typography>
                                    <Typography variant="body2" fontWeight="medium" sx={{ wordBreak: 'break-all' }}>{selectedAppt?.paciente?.email || '-'}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ textTransform: 'uppercase' }}>Origen</Typography>
                                    <Typography variant="body2" fontWeight="medium" sx={{ textTransform: 'capitalize' }}>{selectedAppt?.origen || 'Manual'}</Typography>
                                </Box>
                            </Box>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, pt: 2, borderTop: '1px solid divider' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <CalendarMonthIcon color="primary" sx={{ fontSize: '2rem' }} />
                                <Box>
                                    <Typography variant="body1" fontWeight="bold" sx={{ textTransform: 'capitalize', lineHeight: 1.2 }}>{formatDateText(selectedAppt?.fecha)}</Typography>
                                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
                                        <Typography variant="body2" color="text.secondary" fontWeight="medium">{formatDateDDMMYYYY(selectedAppt?.fecha)}</Typography>
                                        <Typography variant="body2" color="primary.main" fontWeight="bold">• {formatTime12h(selectedAppt?.hora)}</Typography>
                                    </Box>
                                </Box>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                                {selectedAppt && <StatusBadge status={selectedAppt.estado} />}
                            </Box>
                        </Box>
                    </DialogContent>

                    <DialogActions sx={{ p: 3, pt: 0, justifyContent: 'space-between', gap: 1 }}>
                        {(() => {
                            if (!selectedAppt) return null;
                            const showCancel = selectedAppt.estado !== 'CANCELADA';
                            const showConfirm = selectedAppt.estado === 'PENDIENTE' || selectedAppt.estado === 'POSPUESTA';

                            return (
                                <>
                                    {showCancel && (
                                        <Button
                                            variant="contained"
                                            color="error"
                                            onClick={() => { confirmCancelAppointment(selectedAppt.id); setIsApptDetailsOpen(false); }}
                                            sx={{ flex: 1, fontWeight: 'bold' }}
                                        >
                                            Cancelar
                                        </Button>
                                    )}

                                    <Button
                                        variant="contained"
                                        startIcon={<MedicalServicesIcon />}
                                        onClick={() => setIsClinicalHistoryOpen(true)}
                                        sx={{
                                            flex: 1,
                                            fontWeight: 'bold',
                                            bgcolor: '#B3E5FC',
                                            color: '#01579B', // Deep blue text for celeste background
                                            '&:hover': {
                                                bgcolor: '#81D4FA'
                                            }
                                        }}
                                    >
                                        Historial Clínico
                                    </Button>

                                    {showConfirm && (
                                        <Button
                                            variant="contained"
                                            sx={{ flex: 1, bgcolor: '#0D9488', '&:hover': { bgcolor: '#0F766E' }, color: 'white', fontWeight: 'bold' }}
                                            onClick={() => { handleConfirmAppointment(selectedAppt.id); setIsApptDetailsOpen(false); }}
                                        >
                                            Confirmar
                                        </Button>
                                    )}
                                </>
                            );
                        })()}
                    </DialogActions>
                </Box>

                {isPatientInfoOpen && selectedAppt && (
                    <Box sx={{ flexGrow: 1, width: '100%', bgcolor: 'background.paper', overflowY: 'auto', p: 0 }}>
                        <PatientDetailsPanel
                            patientId={selectedAppt.paciente_id || selectedAppt.paciente?.id}
                            baseInfo={selectedAppt.paciente}
                            onClose={() => setIsPatientInfoOpen(false)}
                            initialTab={patientPanelTab}
                        />
                    </Box>
                )}
            </Dialog>

            {/* Modal Reprogramar Cita */}
            <Dialog
                open={isReprogramDialogOpen}
                onClose={() => setIsReprogramDialogOpen(false)}
                maxWidth="xs"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3 } }}
            >
                <DialogTitle sx={{ bgcolor: 'secondary.main', color: 'var(--c-primary-text)', display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2, position: 'relative' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AccessTimeIcon />
                        <Typography variant="h6" fontWeight="bold" sx={{ textTransform: 'uppercase' }}>Reprogramar Cita</Typography>
                    </Box>
                    <IconButton onClick={() => setIsReprogramDialogOpen(false)} sx={{ color: 'inherit', position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>

                <form onSubmit={submitReprogramAppointment}>
                    <DialogContent sx={{ p: 3, pt: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <TextField
                            label="Nueva Fecha"
                            type="date"
                            required
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={reprogramData.fecha}
                            onChange={e => handleReprogramDateChange(e.target.value)}
                        />
                        <TextField
                            label="Nueva Hora"
                            select
                            required
                            fullWidth
                            disabled={!reprogramData.fecha || isFetchingSlots || availableTimeSlots.length === 0}
                            value={reprogramData.hora}
                            onChange={e => setReprogramData({ ...reprogramData, hora: e.target.value })}
                            InputProps={{
                                startAdornment: isFetchingSlots && <CircularProgress size={20} sx={{ mr: 1 }} />
                            }}
                        >
                            {availableTimeSlots.map((slot) => (
                                <MenuItem key={slot} value={slot}>
                                    {formatTime12h(slot)}
                                </MenuItem>
                            ))}
                            {availableTimeSlots.length === 0 && !isFetchingSlots && (
                                <MenuItem disabled value="">
                                    {reprogramData.fecha ? 'No hay horarios o cerrado' : 'Seleccione un día primero'}
                                </MenuItem>
                            )}
                        </TextField>
                    </DialogContent>

                    <DialogActions sx={{ p: 3, pt: 0 }}>
                        <Button
                            onClick={() => setIsReprogramDialogOpen(false)}
                            color="inherit"
                            sx={{ color: 'text.secondary' }}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            sx={{ boxShadow: 2 }}
                        >
                            Reprogramar
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

            {/* Notifications */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                sx={{ zIndex: 110 }}
            >
                <Alert
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    severity={snackbar.type || 'info'}
                    sx={{ width: '100%', borderRadius: 3, boxShadow: 3 }}
                    variant="filled"
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>

            <ConfirmDialog
                open={confirmCancelDialog.open}
                title="Cancelar Cita"
                content="¿Estás seguro de que deseas cancelar esta cita? El paciente será notificado y el espacio quedará libre."
                onConfirm={handleCancelAppointment}
                onCancel={() => setConfirmCancelDialog({ open: false, id: null })}
                confirmText="Sí, cancelar cita"
            />

            {/* Mobile Actions Menu */}
            <Menu
                open={isMobileMenuOpen}
                onClose={handleMobileMenuClose}
                anchorReference="anchorPosition"
                anchorPosition={
                    mobileMenuPosition !== null
                        ? { top: mobileMenuPosition.mouseY, left: mobileMenuPosition.mouseX }
                        : undefined
                }
                PaperProps={{
                    sx: {
                        borderRadius: 2,
                        minWidth: 180,
                        boxShadow: '0px 8px 24px rgba(0,0,0,0.15)',
                        mt: 0.5
                    }
                }}
            >
                <MenuItem onClick={() => {
                    setSelectedAppt(menuAppt);
                    setPatientPanelTab(0);
                    setIsApptDetailsOpen(true);
                    handleMobileMenuClose();
                }}>
                    <VisibilityIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2">Ver detalle</Typography>
                </MenuItem>

                {(menuAppt?.estado === 'PENDIENTE' || menuAppt?.estado === 'POSPUESTA') && (
                    <MenuItem onClick={() => {
                        handleConfirmAppointment(menuAppt.id);
                        handleMobileMenuClose();
                    }}>
                        <CheckCircleIcon fontSize="small" sx={{ mr: 1, color: 'teal' }} />
                        <Typography variant="body2">Confirmar</Typography>
                    </MenuItem>
                )}

                {menuAppt?.estado !== 'CANCELADA' && (
                    <MenuItem onClick={() => {
                        handleReprogramAppointment(menuAppt.id);
                        handleMobileMenuClose();
                    }}>
                        <AccessTimeIcon fontSize="small" sx={{ mr: 1, color: 'orange' }} />
                        <Typography variant="body2">Reprogramar</Typography>
                    </MenuItem>
                )}

                {menuAppt?.estado !== 'CANCELADA' && (
                    <MenuItem onClick={() => {
                        confirmCancelAppointment(menuAppt.id);
                        handleMobileMenuClose();
                    }} sx={{ color: 'error.main' }}>
                        <CancelIcon fontSize="small" sx={{ mr: 1 }} />
                        <Typography variant="body2">Cancelar</Typography>
                    </MenuItem>
                )}
            </Menu>

            {/* Global Mobile FAB */}
            {
                isMobile && (
                    <Fab
                        color="primary"
                        aria-label="add"
                        sx={{
                            position: 'fixed',
                            bottom: 24,
                            right: 24,
                            boxShadow: '0px 8px 16px rgba(var(--c-primary-rgb), 0.4)',
                            bgcolor: 'primary.main',
                            '&:hover': { bgcolor: 'primary.dark' },
                            zIndex: 1000
                        }}
                        onClick={() => {
                            const todayLima = toZonedTime(new Date(), TIMEZONE);
                            const initialDate = (viewMode === 'week' && selectedDate) ? selectedDate : format(todayLima, 'yyyy-MM-dd');

                            setFormData({
                                dni: '',
                                nombre: '',
                                fecha_nacimiento: '',
                                telefono: '',
                                email: '',
                                fecha: initialDate,
                                hora: '',
                                origen: 'MANUAL'
                            });

                            if (initialDate) {
                                handleNewApptDateChange(initialDate);
                            } else {
                                setAvailableTimeSlots([]);
                            }
                            setIsManualTime(false);
                            setIsDialogOpen(true);
                        }}
                    >
                        <AddIcon />
                    </Fab>
                )
            }

            {/* Historia Clínica Editor Dialog */}
            <Dialog
                open={isClinicalHistoryOpen}
                onClose={() => setIsClinicalHistoryOpen(false)}
                maxWidth={false}
                fullWidth={false}
                PaperProps={{
                    sx: { width: { xs: '95%', sm: '80%' }, maxWidth: 'none', borderRadius: 3, overflow: 'hidden', height: '95vh', maxHeight: '95vh' }
                }}
            >
                {selectedAppt?.paciente && (
                    <HistoriaClinicaEditor
                        dniPaciente={selectedAppt.paciente.dni || ''}
                        nombreCompleto={selectedAppt.paciente.nombre_completo || 'Sin nombre'}
                        fechaNacimiento={selectedAppt.paciente.fecha_nacimiento}
                        onClose={() => setIsClinicalHistoryOpen(false)}
                    />
                )}
            </Dialog>
        </Box>
    );
};

export default Appointments;
