import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Tabs, Tab, Typography, Chip, IconButton, Tooltip, Box, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, CircularProgress } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import CloseIcon from '@mui/icons-material/Close';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import ViewListIcon from '@mui/icons-material/ViewList';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameMonth, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { NotificationList, NotificationDetail } from './notifications/NotificationSplitView';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial';
import { marked } from 'marked';
import { useTheme } from '@mui/material/styles';
import AssessmentIcon from '@mui/icons-material/Assessment';
import HistoriaClinicaEditor, { EntryEditor, getContentStyles } from './HistoriaClinicaEditor';
import PatientDocumentsPanel from './PatientDocumentsPanel';
import ConfirmDialog from './ConfirmDialog';

const StatusBadge = ({ status }) => {
    const getStatusColor = (s) => {
        switch (s) {
            case 'CONFIRMADA': return { color: '#0d9488', bgcolor: '#ccfbf1', borderColor: '#99f6e4' };
            case 'REALIZADA': return { color: '#1e40af', bgcolor: '#dbeafe', borderColor: '#bfdbfe' };
            case 'PENDIENTE': return { color: '#92400e', bgcolor: '#fef3c7', borderColor: '#fde68a' };
            case 'POSPUESTA': return { color: '#9a3412', bgcolor: '#ffedd5', borderColor: '#fed7aa' };
            case 'CANCELADA': return { color: '#f87171', bgcolor: '#fef2f2', borderColor: '#fee2e2', textDecoration: 'line-through', opacity: 0.7 };
            case 'NO_ASISTIO': return { color: '#1e293b', bgcolor: '#f1f5f9', borderColor: '#e2e8f0' };
            default: return { color: '#92400e', bgcolor: '#fef3c7', borderColor: '#fde68a' };
        }
    };

    return (
        <Box
            component="span"
            sx={{
                px: 1,
                py: 0.25,
                borderRadius: '9999px',
                fontSize: '0.625rem',
                fontWeight: 'bold',
                border: '1px solid',
                ...getStatusColor(status)
            }}
        >
            {status}
        </Box>
    );
};

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
    const dateObj = new Date(dateStr + 'T00:00:00'); // Ensure local timezone
    return format(dateObj, "EEEE d 'de' MMMM 'del' yyyy", { locale: es });
};

const AppointmentCalendar = ({ appointments }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const startDate = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const endDate = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

    return (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: 'background.paper', borderRadius: 4, p: 2, boxShadow: 1, overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <IconButton onClick={handlePrevMonth} size="small" sx={{ '&:hover': { bgcolor: 'action.hover' } }}><ArrowBackIosNewIcon fontSize="small" /></IconButton>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ textTransform: 'capitalize', color: 'text.primary' }}>
                    {format(currentMonth, 'MMMM yyyy', { locale: es })}
                </Typography>
                <IconButton onClick={handleNextMonth} size="small" sx={{ '&:hover': { bgcolor: 'action.hover' } }}><ArrowForwardIosIcon fontSize="small" /></IconButton>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, mb: 1 }}>
                {['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'].map(day => (
                    <Typography key={day} align="center" variant="caption" fontWeight="bold" color="text.secondary">{day}</Typography>
                ))}
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, flex: 1, minHeight: 0 }}>
                {days.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const dayAppts = appointments.filter(a => a.fecha === dateStr);
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    return (
                        <Box key={day.toISOString()} sx={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', p: 0.5, minHeight: 0,
                            border: '1px solid',
                            borderColor: isCurrentMonth ? 'divider' : 'transparent',
                            bgcolor: isCurrentMonth ? 'background.default' : 'background.paper',
                            borderRadius: 2,
                            opacity: isCurrentMonth ? 1 : 0.5,
                            ...(dayAppts.length > 0 && {
                                borderColor: 'primary.main',
                                bgcolor: 'primary.light',
                                borderStyle: 'solid',
                                borderWidth: '2px',
                            })
                        }}>
                            <Typography variant="caption" fontWeight="bold" sx={{ mb: 0.5, color: dayAppts.length > 0 ? 'primary.dark' : 'text.primary' }}>
                                {format(day, 'd')}
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, width: '100%', mt: 'auto', overflow: 'hidden' }}>
                                {dayAppts.slice(0, 3).map(appt => (
                                    <Box key={appt.id} sx={{
                                        fontSize: '0.6rem',
                                        fontWeight: 'bold',
                                        bgcolor: 'primary.main',
                                        color: 'primary.contrastText',
                                        borderRadius: 1,
                                        px: 0.5,
                                        py: 0.25,
                                        textAlign: 'center',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }} title={`${appt.hora.substring(0, 5)} - ${appt.estado}`}>
                                        {appt.hora.substring(0, 5)}
                                    </Box>
                                ))}
                                {dayAppts.length > 3 && (
                                    <Typography variant="caption" align="center" fontWeight="bold" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                                        +{dayAppts.length - 3}
                                    </Typography>
                                )}
                            </Box>
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );
};

export default function PatientDetailsPanel({ patientId, baseInfo, onClose, initialTab = 0 }) {
    const [activeTab, setActiveTab] = useState(initialTab);
    
    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    const [citasView, setCitasView] = useState('list');
    const [loading, setLoading] = useState(true);
    const [patientInfo, setPatientInfo] = useState(null);
    const [isReprogramDialogOpen, setIsReprogramDialogOpen] = useState(false);
    const [reprogramData, setReprogramData] = useState({ id: null, fecha: '', hora: '' });
    const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
    const [isFetchingSlots, setIsFetchingSlots] = useState(false);
    const [appointments, setAppointments] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [selectedNotification, setSelectedNotification] = useState(null);

    // Edit State
    const [isEditing, setIsEditing] = useState(false);
    const [editFormData, setEditFormData] = useState({});

    const [isEditingDescripcion, setIsEditingDescripcion] = useState(false);
    const theme = useTheme();

    const [confirmDeleteDialog, setConfirmDeleteDialog] = useState({ open: false, id: null });
    const [confirmDNIChangeDialog, setConfirmDNIChangeDialog] = useState({ open: false });
    const [confirmCancelApptDialog, setConfirmCancelApptDialog] = useState({ open: false, id: null });

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                let currentPatient = baseInfo;

                // 1. Fetch full patient info if id is provided
                if (patientId) {
                    const { data: pData } = await supabase
                        .from('pacientes')
                        .select('*')
                        .eq('id', patientId)
                        .single();
                    if (pData) currentPatient = pData;
                }

                // fallback to passed baseInfo if query fails or no ID
                if (!currentPatient) return;

                // 2. Fetch all appointments to get stats & list
                const { data: appts } = await supabase
                    .from('citas')
                    .select('*')
                    .eq(patientId ? 'paciente_id' : 'dni', patientId || currentPatient.dni)
                    .order('fecha', { ascending: false })
                    .order('hora', { ascending: false });

                const processedAppts = appts || [];
                setAppointments(processedAppts);

                let confirmadas = 0, pendientes = 0, canceladas = 0, pospuestas = 0, bot = 0, manual = 0;
                processedAppts.forEach(c => {
                    if (c.estado === 'CONFIRMADA' || c.estado === 'REALIZADA') confirmadas++;
                    else if (c.estado === 'CANCELADA') canceladas++;
                    else if (c.estado === 'POSPUESTA') pospuestas++;
                    else if (c.estado === 'PENDIENTE') pendientes++;

                    if (c.origen === 'BOT') bot++;
                    else if (c.origen === 'MANUAL') manual++;
                });

                // 3. Fetch notifications
                let notifsPorVer = 0;
                let urgencias = 0;
                let fetchedNotifs = [];

                const phone = currentPatient.telefono_principal || currentPatient.telefono;
                if (phone && phone !== '-') {
                    const normalizedPhone = phone.replace(/\D/g, '').slice(-9);
                    const { data: notifData } = await supabase
                        .from('notificaciones')
                        .select('*')
                        .ilike('telefono_paciente', `%${normalizedPhone}%`)
                        .order('created_at', { ascending: false });

                    if (notifData) {
                        fetchedNotifs = notifData;
                        notifData.forEach(n => {
                            if (!n.completado) {
                                if (['URGENCIA', 'EMERGENCIA'].includes(n.tipo)) urgencias++;
                                else notifsPorVer++;
                            }
                        });
                    }
                }
                setNotifications(fetchedNotifs);

                // Setup patient data with stats
                setPatientInfo({
                    ...currentPatient,
                    confirmadas,
                    pendientes,
                    canceladas,
                    pospuestas,
                    notifs_por_ver: notifsPorVer,
                    urgencias,
                    agendadas_bot: bot,
                    agendadas_manual: manual
                });

            } catch (error) {
                console.error("Error fetching panel patient data:", error);
            } finally {
                setLoading(false);
            }
        };

        if (patientId || baseInfo) {
            fetchData();
        }
        // baseInfo is intentionally omitted from stable-dep perspective:
        // it re-runs when patientId changes (patient switch) or baseInfo identity changes (first open)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [patientId, baseInfo]);

    // --- Dedicated Realtime subscription (stable: only depends on patientId) ---
    useEffect(() => {
        if (!patientId && !baseInfo) return;

        // fetchData is re-created on each render so we need a ref to call latest version
        const reloadData = async () => {
            try {
                let currentPatient = null;

                if (patientId) {
                    const { data: pData } = await supabase.from('pacientes').select('*').eq('id', patientId).single();
                    currentPatient = pData;
                }
                if (!currentPatient) return;

                const { data: appts } = await supabase
                    .from('citas').select('*')
                    .eq('paciente_id', patientId)
                    .order('fecha', { ascending: false })
                    .order('hora', { ascending: false });

                const processedAppts = appts || [];
                setAppointments(processedAppts);

                let confirmadas = 0, pendientes = 0, canceladas = 0, pospuestas = 0, bot = 0, manual = 0;
                processedAppts.forEach(c => {
                    if (c.estado === 'CONFIRMADA' || c.estado === 'REALIZADA') confirmadas++;
                    else if (c.estado === 'CANCELADA') canceladas++;
                    else if (c.estado === 'POSPUESTA') pospuestas++;
                    else if (c.estado === 'PENDIENTE') pendientes++;
                    if (c.origen === 'BOT') bot++;
                    else if (c.origen === 'MANUAL') manual++;
                });

                const phone = currentPatient.telefono_principal;
                let fetchedNotifs = [], notifsPorVer = 0, urgencias = 0;
                if (phone && phone !== '-') {
                    const normalizedPhone = phone.replace(/\D/g, '').slice(-9);
                    const { data: notifData } = await supabase
                        .from('notificaciones').select('*')
                        .ilike('telefono_paciente', `%${normalizedPhone}%`)
                        .order('created_at', { ascending: false });
                    if (notifData) {
                        fetchedNotifs = notifData;
                        notifData.forEach(n => {
                            if (!n.completado) {
                                if (['URGENCIA', 'EMERGENCIA'].includes(n.tipo)) urgencias++;
                                else notifsPorVer++;
                            }
                        });
                    }
                }
                setNotifications(fetchedNotifs);
                setPatientInfo(prev => ({
                    ...prev,
                    ...currentPatient,
                    confirmadas, pendientes, canceladas, pospuestas,
                    notifs_por_ver: notifsPorVer, urgencias,
                    agendadas_bot: bot, agendadas_manual: manual
                }));
            } catch (err) {
                console.error('Realtime reload error:', err);
            }
        };

        let debounceTimer;
        const channelId = `patient_panel_rt_${patientId || 'x'}_${Math.random().toString(36).substring(7)}`;
        const channel = supabase
            .channel(channelId)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'citas' }, () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(reloadData, 400);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'notificaciones' }, () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(reloadData, 400);
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pacientes' }, () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(reloadData, 400);
            })
            .subscribe();

        return () => {
            clearTimeout(debounceTimer);
            supabase.removeChannel(channel);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [patientId]);

    if (!patientId && !baseInfo) return null;

    const displayInfo = patientInfo || baseInfo || {};
    const nombre = displayInfo.nombre_completo || 'Sin nombre';
    const telefono = displayInfo.telefono_principal || displayInfo.telefono || '-';

    const markAsRead = async (id) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, leido: true } : n));
        await supabase.from('notificaciones').update({ leido: true }).eq('id', id);
    };

    const confirmDeleteNotification = (id) => {
        setConfirmDeleteDialog({ open: true, id });
    };

    const deleteNotification = async () => {
        const id = confirmDeleteDialog.id;
        setConfirmDeleteDialog({ open: false, id: null });
        if (!id) return;

        const previousNotifications = [...notifications];
        setNotifications(prev => prev.filter(n => n.id !== id));
        if (selectedNotification?.id === id) setSelectedNotification(null);

        const { error } = await supabase.from('notificaciones').delete().eq('id', id);

        if (error) {
            console.error('Error al intentar eliminar:', error);
            setNotifications(previousNotifications);
            alert('Hubo un error al eliminar la notificación de la base de datos.');
        }
    };

    const handleMarkAsCompleted = async (id) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, completado: true } : n));
        setSelectedNotification(prev => ({ ...prev, completado: true }));
        await supabase.from('notificaciones').update({ completado: true }).eq('id', id);
    };

    const handleMarkAsUncompleted = async (id) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, completado: false } : n));
        setSelectedNotification(prev => ({ ...prev, completado: false }));
        await supabase.from('notificaciones').update({ completado: false }).eq('id', id);
    };

    const handleNotificationClick = (notif) => {
        if (!notif.leido) markAsRead(notif.id);
        setSelectedNotification(notif);
    };

    const handleConfirmAppointment = async (id) => {
        setAppointments(prev => prev.map(a => a.id === id ? { ...a, estado: 'CONFIRMADA' } : a));
        await supabase.from('citas').update({ estado: 'CONFIRMADA' }).eq('id', id);
    };

    const handleReprogramAppointment = (id) => {
        setReprogramData({ id, fecha: '', hora: '' });
        setAvailableTimeSlots([]);
        setIsReprogramDialogOpen(true);
    };

    const handleEditClick = () => {
        setEditFormData({
            dni: displayInfo.dni || '',
            nombre_completo: displayInfo.nombre_completo || '',
            telefono_principal: displayInfo.telefono_principal || displayInfo.telefono || '',
            email: displayInfo.email || '',
            fecha_nacimiento: displayInfo.fecha_nacimiento || ''
        });
        setIsEditing(true);
    };

    const handleSavePatientInfo = async () => {
        if (!editFormData.dni || !editFormData.nombre_completo) {
            alert("El DNI y Nombre Completo son obligatorios.");
            return;
        }
        if (editFormData.dni !== displayInfo.dni) {
            setConfirmDNIChangeDialog({ open: true });
            return;
        }
        proceedSavePatientInfo();
    };

    const proceedSavePatientInfo = async () => {
        setConfirmDNIChangeDialog({ open: false });
        try {
            const { error } = await supabase
                .from('pacientes')
                .update({
                    dni: editFormData.dni,
                    nombre_completo: editFormData.nombre_completo,
                    telefono_principal: editFormData.telefono_principal,
                    email: editFormData.email,
                    fecha_nacimiento: editFormData.fecha_nacimiento
                })
                .eq('id', patientId || displayInfo.id);

            if (error) throw error;

            setPatientInfo(prev => ({ ...prev, ...editFormData }));
            setIsEditing(false);
        } catch (error) {
            console.error("Error updating patient info:", error);
            alert("Hubo un error al actualizar los datos del paciente.");
        }
    };

    const handleSaveDescripcion = async (markdownText) => {
        try {
            const now = new Date().toISOString();
            const { error } = await supabase
                .from('pacientes')
                .update({
                    descripcion: markdownText,
                    fecha_modificacion: now
                })
                .eq('id', patientId || displayInfo.id);

            if (error) throw error;

            setPatientInfo(prev => ({
                ...prev,
                descripcion: markdownText,
                fecha_modificacion: now
            }));
            setIsEditingDescripcion(false);
        } catch (error) {
            console.error("Error updating descripcion:", error);
            alert("Hubo un error al guardar la descripción.");
        }
    };

    const handleReprogramDateChange = async (dateStr) => {
        setReprogramData(prev => ({ ...prev, fecha: dateStr, hora: '' }));
        if (!dateStr) {
            setAvailableTimeSlots([]);
            return;
        }

        setIsFetchingSlots(true);
        try {
            const dateObj = new Date(dateStr + 'T00:00:00');
            const dayOfWeek = dateObj.getDay();
            const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
            const dayName = dayNames[dayOfWeek];

            const horarios_disponibles = {
                "Lunes": ["09:30", "09:50", "10:10", "10:30", "10:50", "11:10", "11:30", "11:50", "12:10", "12:30", "12:50", "13:10"],
                "Martes": ["09:30", "09:50", "10:10", "10:30", "10:50", "11:10", "11:30", "11:50", "12:10", "12:30", "12:50", "13:10"],
                "Miércoles": ["09:30", "09:50", "10:10", "10:30", "10:50", "11:10", "11:30", "11:50", "12:10", "12:30", "12:50", "13:10"],
                "Jueves": ["09:30", "09:50", "10:10", "10:30", "10:50", "11:10", "11:30", "11:50", "12:10", "12:30", "12:50", "13:10"],
                "Viernes": ["09:30", "09:50", "10:10", "10:30", "10:50", "11:10", "11:30", "11:50", "12:10", "12:30", "12:50", "13:10"],
                "Sábado": ["09:30", "09:50", "10:10", "10:30", "10:50", "11:10", "11:30", "11:50", "12:10", "12:30", "12:50", "13:10"],
                "Domingo": []
            };

            const slotsForDay = horarios_disponibles[dayName] || [];

            if (slotsForDay.length === 0) {
                setAvailableTimeSlots([]);
                return;
            }

            const { data, error } = await supabase
                .from('citas')
                .select('hora')
                .eq('fecha', dateStr)
                .neq('estado', 'CANCELADA');

            if (error) throw error;

            const occupiedTimes = data.map(appt => appt.hora.substring(0, 5));
            const available = slotsForDay.filter(slot => !occupiedTimes.includes(slot));

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
                alert('¡La nueva fecha y hora ya están ocupadas!');
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
                alert('Error al reprogramar cita');
            } else {
                setIsReprogramDialogOpen(false);
            }
        } catch (err) {
            console.error(err);
            alert('Error al reprogramar: ' + err.message);
        }
    };

    const confirmCancelAppointment = (id) => {
        setConfirmCancelApptDialog({ open: true, id });
    };

    const handleCancelAppointment = async () => {
        const id = confirmCancelApptDialog.id;
        setConfirmCancelApptDialog({ open: false, id: null });
        if (!id) return;

        setAppointments(prev => prev.map(a => a.id === id ? { ...a, estado: 'CANCELADA' } : a));
        await supabase.from('citas').update({ estado: 'CANCELADA' }).eq('id', id);
    };

    return (
        <div className="flex flex-col h-full bg-surface w-full overflow-hidden">
            {/* Header */}
            <div className="bg-primary px-6 py-4 flex flex-col justify-start relative w-full items-start text-on-brand shadow-sm flex-shrink-0">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 hover:bg-black/10 rounded-full p-1 transition-colors flex items-center justify-center bg-black/5"
                    title="Cerrar panel de paciente"
                >
                    <CloseIcon />
                </button>

                <div className="w-full break-words pr-12 pb-2">
                    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                        <h2 className={`font-black uppercase tracking-wider leading-tight ${nombre.length > 28 ? 'text-3xl sm:text-4xl' : 'text-4xl sm:text-5xl'}`}>
                            {nombre}
                        </h2>
                        {displayInfo.fecha_nacimiento && displayInfo.fecha_nacimiento !== '-' && (
                            <span className="text-xl sm:text-2xl font-medium opacity-80 normal-case tracking-normal whitespace-nowrap">
                                {renderAge(displayInfo.fecha_nacimiento)}
                            </span>
                        )}
                    </div>
                </div>

                <Tabs
                    value={activeTab}
                    onChange={(e, v) => setActiveTab(v)}
                    textColor="inherit"
                    indicatorColor="secondary"
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                        minHeight: 48,
                        width: '100%',
                        '& .MuiTabs-indicator': { backgroundColor: 'white', height: 3 },
                        '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: '1rem', minWidth: 120, px: 2, opacity: 0.7, '&.Mui-selected': { opacity: 1 } }
                    }}
                >
                    <Tab icon={<PersonIcon fontSize="small" />} iconPosition="start" label="Datos Personales" />
                    <Tab icon={<MedicalServicesIcon fontSize="small" />} iconPosition="start" label="Historial Clínico" />
                    <Tab icon={<FolderSpecialIcon fontSize="small" />} iconPosition="start" label="Documentos" />
                    <Tab icon={<CalendarMonthIcon fontSize="small" />} iconPosition="start" label="Citas Agendadas" />
                    <Tab icon={<NotificationsNoneIcon fontSize="small" />} iconPosition="start" label="Notificaciones" />
                    <Tab icon={<AssessmentIcon fontSize="small" />} iconPosition="start" label="Resumen de Actividad" />
                    <Tab icon={<WhatsAppIcon fontSize="small" />} iconPosition="start" label="Contactar" />
                </Tabs>
            </div>

            {/* Content */}
            <Box sx={{ flex: 1, overflowY: 'auto', bgcolor: 'background.default', position: 'relative' }}>
                {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : (
                    <div className="p-6 h-full flex flex-col">
                        {activeTab === 0 && (
                            <div className="flex flex-col lg:flex-row gap-6 animate-in fade-in duration-300 flex-1 min-h-0">
                                {/* Datos Row */}
                                <div className="w-full lg:w-[30%] bg-surface p-6 rounded-2xl shadow-sm flex flex-col h-full relative">
                                    <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-800 pb-2">
                                        <h3 className="text-lg font-bold text-text-primary ml-auto mr-auto pl-8">Información de Contacto</h3>
                                        {!isEditing ? (
                                            <IconButton onClick={handleEditClick} size="small" sx={{ color: 'text.secondary', border: '1px solid', borderColor: 'divider', '&:hover': { color: 'primary.main', bgcolor: 'primary.light', opacity: 0.1 } }} title="Editar Información">
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        ) : (
                                            <Box sx={{ display: 'flex', gap: 1 }}>
                                                <IconButton onClick={() => setIsEditing(false)} size="small" color="error" title="Cancelar">
                                                    <CancelIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton onClick={handleSavePatientInfo} size="small" color="success" title="Guardar Cambios">
                                                    <SaveIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        )}
                                    </div>

                                    <div className="flex-1 space-y-5 flex flex-col justify-between">
                                        {!isEditing ? (
                                            <div className="space-y-4 flex flex-col items-center text-center">
                                                <div className="w-full">
                                                    <p className="text-xs font-semibold text-text-secondary uppercase mb-1">DNI / CE</p>
                                                    <p className="text-base font-medium text-text-primary">{displayInfo.dni || '-'}</p>
                                                </div>
                                                <div className="w-full">
                                                    <p className="text-xs font-semibold text-text-secondary uppercase mb-1">Teléfono Principal</p>
                                                    <p className="text-base font-medium text-text-primary">{displayInfo.telefono_principal || displayInfo.telefono || '-'}</p>
                                                </div>
                                                <div className="w-full">
                                                    <p className="text-xs font-semibold text-text-secondary uppercase mb-1">Correo Electrónico</p>
                                                    <p className="text-base font-medium text-text-primary truncate" title={displayInfo.email || '-'}>
                                                        {displayInfo.email || '-'}
                                                    </p>
                                                </div>
                                                <div className="w-full">
                                                    <p className="text-xs font-semibold text-text-secondary uppercase mb-1">Fecha de Nacimiento</p>
                                                    <p className="text-base font-medium text-text-primary">{displayInfo.fecha_nacimiento || '-'}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                <TextField
                                                    label="Nombre Completo"
                                                    size="small"
                                                    fullWidth
                                                    value={editFormData.nombre_completo}
                                                    onChange={e => setEditFormData({ ...editFormData, nombre_completo: e.target.value })}
                                                />
                                                <TextField
                                                    label="DNI / CE"
                                                    size="small"
                                                    color="error"
                                                    fullWidth
                                                    value={editFormData.dni}
                                                    onChange={e => setEditFormData({ ...editFormData, dni: e.target.value })}
                                                />
                                                <TextField
                                                    label="Teléfono Principal"
                                                    size="small"
                                                    fullWidth
                                                    value={editFormData.telefono_principal}
                                                    onChange={e => setEditFormData({ ...editFormData, telefono_principal: e.target.value })}
                                                />
                                                <TextField
                                                    label="Correo Electrónico"
                                                    size="small"
                                                    fullWidth
                                                    value={editFormData.email}
                                                    onChange={e => setEditFormData({ ...editFormData, email: e.target.value })}
                                                />
                                                <TextField
                                                    label="Fecha de Nacimiento"
                                                    type="date"
                                                    size="small"
                                                    fullWidth
                                                    InputLabelProps={{ shrink: true }}
                                                    value={editFormData.fecha_nacimiento}
                                                    onChange={e => setEditFormData({ ...editFormData, fecha_nacimiento: e.target.value })}
                                                />
                                            </Box>
                                        )}

                                        <div className="pt-4 flex justify-center mt-auto">
                                            {/* Botón movido a pestaña "Contactar" */}
                                        </div>
                                    </div>
                                </div>

                                {/* Descripción del paciente */}
                                <div className="w-full lg:w-[70%] bg-surface p-6 rounded-2xl shadow-sm flex flex-col h-full overflow-hidden">
                                    <div className="flex justify-between items-center mb-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                                        <h3 className="text-lg font-bold text-text-primary ml-auto mr-auto pl-8">Descripción del Paciente</h3>
                                        {!isEditingDescripcion && (
                                            <IconButton onClick={() => setIsEditingDescripcion(true)} size="small" sx={{ color: 'text.secondary', border: '1px solid', borderColor: 'divider', '&:hover': { color: 'primary.main', bgcolor: 'primary.light', opacity: 0.1 } }} title="Editar Descripción">
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        )}
                                    </div>
                                    <div className="flex-1 overflow-y-auto mt-2 h-full flex flex-col">
                                        {isEditingDescripcion ? (
                                            <div className="flex-1 flex flex-col min-h-[300px]">
                                                <EntryEditor
                                                    initialText={displayInfo.descripcion || ''}
                                                    onSave={handleSaveDescripcion}
                                                    onCancel={() => setIsEditingDescripcion(false)}
                                                    disableSign={true}
                                                    fullHeight={true}
                                                />
                                            </div>
                                        ) : (
                                            <Box sx={{ flex: 1, ...getContentStyles(theme) }} dangerouslySetInnerHTML={{ __html: displayInfo.descripcion ? marked.parse(displayInfo.descripcion) : '<p style="color: gray; font-style: italic;">Sin descripción registrada.</p>' }} />
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 1 && (
                            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, borderRadius: 4, overflow: 'hidden', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                                <HistoriaClinicaEditor
                                    dniPaciente={displayInfo.dni}
                                    nombreCompleto={displayInfo.nombre_completo}
                                    fechaNacimiento={displayInfo.fecha_nacimiento}
                                    embedded={true}
                                />
                            </Box>
                        )}

                        {activeTab === 2 && (
                            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, borderRadius: 4, overflow: 'hidden', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                                <PatientDocumentsPanel
                                    patient={displayInfo}
                                    onClose={onClose}
                                    embedded={true}
                                />
                            </Box>
                        )}

                        {activeTab === 3 && (
                            <div className="animate-in fade-in duration-300 flex-1 flex flex-col min-h-0">
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'background.paper', p: 0.5, borderRadius: 2, boxShadow: 1, ml: 'auto', mb: 2, width: 'max-content' }}>
                                    <IconButton
                                        onClick={() => setCitasView('list')}
                                        color={citasView === 'list' ? 'primary' : 'default'}
                                        sx={{ bgcolor: citasView === 'list' ? 'primary.light' : 'transparent', '&:hover': { bgcolor: citasView === 'list' ? 'primary.light' : 'action.hover' }, opacity: citasView === 'list' ? 0.3 : 1 }}
                                    >
                                        <ViewListIcon />
                                    </IconButton>
                                    <IconButton
                                        onClick={() => setCitasView('calendar')}
                                        color={citasView === 'calendar' ? 'primary' : 'default'}
                                        sx={{ bgcolor: citasView === 'calendar' ? 'primary.light' : 'transparent', '&:hover': { bgcolor: citasView === 'calendar' ? 'primary.light' : 'action.hover' }, opacity: citasView === 'calendar' ? 0.3 : 1 }}
                                    >
                                        <CalendarMonthIcon />
                                    </IconButton>
                                </Box>
                                {appointments.length === 0 ? (
                                    <div className="text-center py-10 bg-surface rounded-2xl border border-slate-100 dark:border-slate-800">
                                        <CalendarMonthIcon className="text-slate-300 dark:text-slate-600 mb-2" sx={{ fontSize: 60 }} />
                                        <Typography variant="body1" color="text.secondary">Este paciente no tiene historial de citas.</Typography>
                                    </div>
                                ) : citasView === 'list' ? (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        {appointments.map(appt => (
                                            <Box key={appt.id} sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, bgcolor: 'background.paper', p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', boxShadow: 1, gap: 2, '&:hover': { bgcolor: 'action.hover' } }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                    <Box sx={{ bgcolor: 'secondary.main', p: 1.5, borderRadius: '50%', display: { xs: 'none', sm: 'block' } }}>
                                                        <CalendarMonthIcon color="primary" />
                                                    </Box>
                                                    <Box>
                                                        <Typography variant="subtitle1" fontWeight="bold" sx={{ color: 'text.primary', textTransform: 'capitalize' }}>
                                                            {formatDateText(appt.fecha)}
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            {formatTime12h(appt.hora)}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: { xs: '100%', sm: 'auto' }, justifyContent: { xs: 'space-between', sm: 'flex-end' } }}>
                                                    <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', fontWeight: 600 }}>
                                                        ORIGEN: {appt.origen}
                                                    </Typography>
                                                    <Box sx={{ height: 16, width: '1px', bgcolor: 'divider', mx: 0.5 }} />
                                                    <StatusBadge status={appt.estado} />
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, borderLeft: '1px solid', borderColor: 'divider', pl: 1, ml: 1 }}>
                                                        {(appt.estado === 'PENDIENTE' || appt.estado === 'POSPUESTA') && (
                                                            <Tooltip title="Confirmar">
                                                                <IconButton onClick={(e) => { e.stopPropagation(); handleConfirmAppointment(appt.id); }} size="small" sx={{ color: '#0d9488', '&:hover': { bgcolor: '#ccfbf1' } }}>
                                                                    <CheckCircleIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        )}
                                                        {appt.estado !== 'CANCELADA' && appt.estado !== 'POSPUESTA' && (
                                                            <Tooltip title="Reprogramar">
                                                                <IconButton onClick={(e) => { e.stopPropagation(); handleReprogramAppointment(appt.id); }} size="small" sx={{ color: 'primary.main', '&:hover': { bgcolor: 'primary.light', opacity: 0.1 } }}>
                                                                    <AccessTimeIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        )}
                                                        {appt.estado !== 'CANCELADA' && (
                                                            <Tooltip title="Cancelar">
                                                                <IconButton onClick={(e) => { e.stopPropagation(); confirmCancelAppointment(appt.id); }} size="small" sx={{ color: '#f87171', '&:hover': { bgcolor: '#fef2f2' } }}>
                                                                    <CancelIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        )}
                                                    </Box>
                                                </Box>
                                            </Box>
                                        ))}
                                    </Box>
                                ) : (
                                    <AppointmentCalendar appointments={appointments} />
                                )}
                            </div>
                        )}

                        {activeTab === 4 && (
                            <div className="animate-in fade-in duration-300 flex-1 flex flex-col md:flex-row mt-2 min-h-0 bg-surface rounded-2xl overflow-hidden shadow-sm">
                                {/* Left Panel: List */}
                                <div className="w-full md:w-5/12 lg:w-4/12 flex-shrink-0 h-full overflow-hidden flex flex-col bg-surface">
                                    <NotificationList
                                        notifications={notifications}
                                        onNotificationClick={handleNotificationClick}
                                        onMarkAsRead={markAsRead}
                                        onDelete={confirmDeleteNotification}
                                        selectedId={selectedNotification?.id}
                                    />
                                </div>

                                {/* Right Panel: Detail */}
                                <div className="w-full md:w-7/12 lg:w-8/12 flex-shrink-0 h-full overflow-hidden flex flex-col bg-surface">
                                    <NotificationDetail
                                        notification={selectedNotification}
                                        onMarkAsCompleted={handleMarkAsCompleted}
                                        onMarkAsUncompleted={handleMarkAsUncompleted}
                                    />
                                </div>
                            </div>
                        )}

                        {activeTab === 5 && (
                            <div className="animate-in fade-in duration-300 flex-1 min-h-0 flex flex-col xl:flex-row items-stretch justify-center gap-6 p-2 sm:p-4 overflow-y-auto">
                                {/* Resumen Stats */}
                                <div className="bg-surface p-4 sm:p-8 rounded-2xl shadow-sm flex flex-col flex-grow xl:max-w-2xl w-full flex-shrink-0 h-full">
                                    <div className="flex flex-col gap-3 sm:gap-4 flex-1 justify-center h-full">
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 flex-1 min-h-0">
                                            <div className="bg-[#10b981] p-3 sm:p-4 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg shadow-[#10b981]/20 transition-transform hover:scale-[1.02] h-full">
                                                <p className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl font-black mb-1 leading-none drop-shadow-sm line-clamp-1">{displayInfo.confirmadas || 0}</p>
                                                <p className="text-[10px] sm:text-[11px] md:text-xs font-bold uppercase opacity-95 leading-tight tracking-wide text-center line-clamp-1">Confirmadas</p>
                                            </div>
                                            <div className="bg-[#f59e0b] p-3 sm:p-4 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg shadow-[#f59e0b]/20 transition-transform hover:scale-[1.02] h-full">
                                                <p className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl font-black mb-1 leading-none drop-shadow-sm line-clamp-1">{displayInfo.pendientes || 0}</p>
                                                <p className="text-[10px] sm:text-[11px] md:text-xs font-bold uppercase opacity-95 leading-tight tracking-wide text-center line-clamp-1">Pendientes</p>
                                            </div>
                                            <div className="bg-[#ef4444] p-3 sm:p-4 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg shadow-[#ef4444]/20 transition-transform hover:scale-[1.02] h-full">
                                                <p className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl font-black mb-1 leading-none drop-shadow-sm line-clamp-1">{displayInfo.canceladas || 0}</p>
                                                <p className="text-[10px] sm:text-[11px] md:text-xs font-bold uppercase opacity-95 leading-tight tracking-wide text-center line-clamp-1">Canceladas</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 flex-1 min-h-0">
                                            <div className="bg-[#8b5cf6] p-3 sm:p-4 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg shadow-[#8b5cf6]/20 transition-transform hover:scale-[1.02] h-full">
                                                <p className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl font-black mb-1 leading-none drop-shadow-sm line-clamp-1">{displayInfo.agendadas_bot || 0}</p>
                                                <p className="text-[10px] sm:text-[11px] md:text-xs font-bold uppercase opacity-95 leading-tight tracking-wide text-center line-clamp-1">Por el Bot</p>
                                            </div>
                                            <div className="bg-[#64748b] p-3 sm:p-4 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg shadow-[#64748b]/20 transition-transform hover:scale-[1.02] h-full">
                                                <p className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl font-black mb-1 leading-none drop-shadow-sm line-clamp-1">{displayInfo.agendadas_manual || 0}</p>
                                                <p className="text-[10px] sm:text-[11px] md:text-xs font-bold uppercase opacity-95 leading-tight tracking-wide text-center line-clamp-1">Manualmente</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 flex-1 min-h-0">
                                            <div className="bg-[#3b82f6] p-3 sm:p-4 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg shadow-[#3b82f6]/20 transition-transform hover:scale-[1.02] h-full">
                                                <p className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl font-black mb-1 leading-none drop-shadow-sm line-clamp-1">{displayInfo.notifs_por_ver || 0}</p>
                                                <p className="text-[10px] sm:text-[11px] md:text-xs font-bold uppercase opacity-95 leading-tight tracking-wide text-center line-clamp-1">Alertas</p>
                                            </div>
                                            <div className="bg-[#be123c] p-3 sm:p-4 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg shadow-[#be123c]/20 transition-transform hover:scale-[1.02] h-full">
                                                <p className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl font-black mb-1 leading-none drop-shadow-sm line-clamp-1">{displayInfo.urgencias || 0}</p>
                                                <p className="text-[10px] sm:text-[11px] md:text-xs font-bold uppercase opacity-95 leading-tight tracking-wide text-center line-clamp-1">Urgencias</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Tarjeta de Fechas */}
                                <div className="w-full xl:max-w-xs bg-surface p-6 sm:p-8 rounded-2xl shadow-sm flex flex-col justify-center gap-6 border border-transparent flex-shrink-0">
                                    <div className="text-center">
                                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 }}>
                                            Fecha de Creación
                                        </Typography>
                                        <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 'bold', mt: 1 }}>
                                            {displayInfo.created_at ? format(new Date(displayInfo.created_at), "dd 'de' MMMM, yyyy", { locale: es }) : '-'}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                                            {displayInfo.created_at ? format(new Date(displayInfo.created_at), "hh:mm a", { locale: es }) : ''}
                                        </Typography>
                                    </div>
                                    <Box sx={{ height: '1px', bgcolor: 'divider', width: '60%', mx: 'auto' }} />
                                    <div className="text-center">
                                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 }}>
                                            Última Modificación
                                        </Typography>
                                        <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 'bold', mt: 1 }}>
                                            {displayInfo.fecha_modificacion ? format(new Date(displayInfo.fecha_modificacion), "dd 'de' MMMM, yyyy", { locale: es }) : '-'}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                                            {displayInfo.fecha_modificacion ? format(new Date(displayInfo.fecha_modificacion), "hh:mm a", { locale: es }) : ''}
                                        </Typography>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 6 && (
                            <div className="animate-in fade-in duration-300 flex-1 min-h-0 flex flex-col items-center justify-center p-4">
                                {telefono !== '-' ? (
                                    <a
                                        href={`https://wa.me/${telefono.replace(/\D/g, '')}?text=${encodeURIComponent("Hola soy la asistente de la Doctora")}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-8 py-4 flex items-center justify-center gap-3 bg-green-500 hover:bg-green-600 text-white rounded-2xl text-xl font-bold tracking-wide normal-case transition-transform hover:scale-105 shadow-lg w-full max-w-md"
                                    >
                                        <WhatsAppIcon sx={{ fontSize: 32 }} /> Contactar por WhatsApp
                                    </a>
                                ) : (
                                    <div className="bg-surface p-8 rounded-2xl shadow-sm border border-divider text-center max-w-md">
                                        <InfoOutlinedIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
                                        <Typography color="text.secondary" fontWeight="bold">No hay teléfono registrado para este paciente.</Typography>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </Box>

            {/* Modal Reprogramar Cita */}
            <Dialog
                open={isReprogramDialogOpen}
                onClose={() => setIsReprogramDialogOpen(false)}
                maxWidth="xs"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3, zIndex: 1600 } }}
            >
                <DialogTitle sx={{ bgcolor: 'secondary.main', color: 'primary.main', display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2, position: 'relative' }}>
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

            <ConfirmDialog
                open={confirmDeleteDialog.open}
                title="Eliminar Notificación"
                content="¿Estás seguro de que deseas eliminar esta notificación?"
                onConfirm={deleteNotification}
                onCancel={() => setConfirmDeleteDialog({ open: false, id: null })}
                confirmText="Sí, eliminar"
            />

            <ConfirmDialog
                open={confirmDNIChangeDialog.open}
                title="Cuidado al modificar DNI"
                content={"Modificar el DNI del paciente puede causar que pierda su historial de citas y desvincule alertas previas.\n\n¿Estás absolutamente seguro de que deseas continuar?"}
                onConfirm={proceedSavePatientInfo}
                onCancel={() => setConfirmDNIChangeDialog({ open: false })}
                confirmText="Sí, actualizar DNI"
            />

            <ConfirmDialog
                open={confirmCancelApptDialog.open}
                title="Cancelar Cita"
                content="¿Seguro que deseas cancelar esta cita?"
                onConfirm={handleCancelAppointment}
                onCancel={() => setConfirmCancelApptDialog({ open: false, id: null })}
                confirmText="Sí, cancelar cita"
            />
        </div>
    );
}
