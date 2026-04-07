import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { 
    Box, Typography, IconButton, CircularProgress, 
    Snackbar, Alert, Dialog, DialogTitle, DialogContent, 
    DialogActions, Tooltip, Divider, useTheme, Fab, Button
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ScheduleModal from './ScheduleModal';
import dayjs from 'dayjs';
import 'dayjs/locale/es';

dayjs.locale('es');

const PINK_BABY = '#fdf2f8'; 
const PINK_PASTEL = '#fbcfe8'; 
const PINK_MAIN = '#db2777'; 
const PINK_CONTRAST = '#be185d';

const DOCTOR_COLORS = [
    { bg: '#0284c7', light: '#e0f2fe' },
    { bg: '#7c3aed', light: '#ede9fe' },
    { bg: '#db2777', light: '#fce7f3' },
    { bg: '#d97706', light: '#fef3c7' },
    { bg: '#059669', light: '#d1fae5' },
    { bg: '#dc2626', light: '#fee2e2' },
    { bg: '#0891b2', light: '#cffafe' },
    { bg: '#65a30d', light: '#ecfccb' },
];

const fmtTime = (t) => t ? t.substring(0, 5) : '';

const DayTooltipContent = ({ entries, onDelete }) => (
    <Box sx={{ p: 1, minWidth: 160 }}>
        <Typography variant="caption" fontWeight={700} sx={{ color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', mb: 1, display: 'block' }}>
            Turnos del día
        </Typography>
        {entries.map((e, i) => (
            <Box key={i} sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                gap: 1.5, 
                mb: i < entries.length - 1 ? 0.8 : 0,
                p: 0.5,
                borderRadius: 1,
                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: e.color, flexShrink: 0 }} />
                    <Typography variant="caption" sx={{ color: 'white', lineHeight: 1.2 }}>
                        <strong>Dra. {e.nombre}</strong><br />
                        {fmtTime(e.hora_inicio)} – {fmtTime(e.hora_fin)}
                    </Typography>
                </Box>
                <IconButton 
                    size="small" 
                    onClick={(event) => {
                        event.stopPropagation();
                        onDelete(e.db_id);
                    }}
                    sx={{ color: '#fca5a5', p: 0.5, '&:hover': { color: '#ef4444', bgcolor: 'rgba(255,255,255,0.1)' } }}
                >
                    <DeleteIcon sx={{ fontSize: 14 }} />
                </IconButton>
            </Box>
        ))}
    </Box>
);

const DoctorMarker = ({ color }) => (
    <Box sx={{
        width: '85%', 
        height: 6, 
        borderRadius: '3px',
        bgcolor: color,
        mt: '2px',
        flexShrink: 0,
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
    }} />
);

const SchedulesTab = () => {
    const theme = useTheme();
    const [schedules, setSchedules] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [currentMonth, setCurrentMonth] = useState(dayjs().startOf('month'));

    const fetchData = async () => {
        setLoading(true);
        const [docRes, schedRes] = await Promise.all([
            supabase.from('doctores').select('*').order('es_principal', { ascending: false }).order('nombre_completo', { ascending: true }),
            supabase.from('horarios_diarios').select('*, doctores(nombre_completo)')
        ]);

        if (!docRes.error) setDoctors(docRes.data || []);
        if (!schedRes.error) setSchedules(schedRes.data || []);
        
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
        const subscription = supabase
            .channel('horarios_tab_changes_all')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'horarios_diarios' }, () => fetchData())
            .subscribe();
        return () => supabase.removeChannel(subscription);
    }, []);

    const doctorColorMap = useMemo(() => {
        const map = {};
        doctors.forEach((doc, idx) => {
            map[doc.id] = DOCTOR_COLORS[idx % DOCTOR_COLORS.length];
        });
        return map;
    }, [doctors]);

    const occupiedMap = useMemo(() => {
        const map = {};
        schedules.forEach(sched => {
            if (!map[sched.fecha_exacta]) map[sched.fecha_exacta] = [];
            map[sched.fecha_exacta].push({
                db_id: sched.id,
                id: sched.doctor_id,
                nombre: sched.doctores?.nombre_completo || 'Doctor',
                hora_inicio: sched.hora_inicio,
                hora_fin: sched.hora_fin,
                color: doctorColorMap[sched.doctor_id]?.bg || '#94a3b8'
            });
        });
        return map;
    }, [schedules, doctorColorMap]);

    const showSnackbar = (message, severity = 'success') => setSnackbar({ open: true, message, severity });
    const handleCloseSnackbar = () => setSnackbar(prev => ({ ...prev, open: false }));

    const handleConfirmDelete = async () => {
        const id = confirmDelete.id;
        setConfirmDelete({ open: false, id: null });
        const { error } = await supabase.from('horarios_diarios').delete().eq('id', id);
        if (error) showSnackbar('Error al eliminar horario', 'error');
        else {
            showSnackbar('Horario eliminado correctamente');
            fetchData();
        }
    };

    const daysInMonth = currentMonth.daysInMonth();
    const startOffset = (currentMonth.day() + 6) % 7;
    const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const today = dayjs().startOf('day');

    const cells = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    
    const weeks = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

    return (
        <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100%', 
            position: 'relative',
            overflow: 'hidden' 
        }}>
            {/* Calendar Main View - Fully adapted to fill height */}
            <Box sx={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                bgcolor: 'white', 
                borderRadius: 4, 
                overflow: 'hidden', 
                border: '1px solid', 
                borderColor: PINK_PASTEL, 
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)' 
            }}>
                {/* Month Navigator */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 1.5, bgcolor: PINK_BABY }}>
                    <IconButton size="small" onClick={() => setCurrentMonth(currentMonth.subtract(1, 'month'))}
                        sx={{ color: PINK_MAIN, bgcolor: 'white', '&:hover': { bgcolor: PINK_PASTEL } }}>
                        <Typography sx={{ fontWeight: 900, fontSize: '1.2rem', lineHeight: 1 }}>‹</Typography>
                    </IconButton>
                    <Typography variant="h6" fontWeight={900} sx={{ textTransform: 'uppercase', letterSpacing: '0.15em', color: PINK_MAIN, fontSize: '1rem' }}>
                        {currentMonth.format('MMMM YYYY')}
                    </Typography>
                    <IconButton size="small" onClick={() => setCurrentMonth(currentMonth.add(1, 'month'))}
                        sx={{ color: PINK_MAIN, bgcolor: 'white', '&:hover': { bgcolor: PINK_PASTEL } }}>
                        <Typography sx={{ fontWeight: 900, fontSize: '1.2rem', lineHeight: 1 }}>›</Typography>
                    </IconButton>
                </Box>

                {/* Calendar Grid Container */}
                <Box sx={{ flex: 1, p: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                            <CircularProgress sx={{ color: PINK_MAIN }} />
                        </Box>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            {/* Week Header */}
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', mb: 0.5 }}>
                                {weekDays.map(d => (
                                    <Box key={d} sx={{ py: 0.5, textAlign: 'center' }}>
                                        <Typography variant="caption" fontWeight={900} sx={{ color: PINK_CONTRAST, opacity: 0.6, textTransform: 'uppercase', fontSize: '0.65rem' }}>
                                            {d}
                                        </Typography>
                                    </Box>
                                ))}
                            </Box>

                            {/* Days Container - Stretch to fill available vertical space */}
                            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                {weeks.map((week, wi) => (
                                    <Box key={wi} sx={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
                                        {week.map((day, di) => {
                                            if (!day) return <Box key={`e-${wi}-${di}`} sx={{ flex: 1 }} />;
                                            
                                            const dateStr = currentMonth.date(day).format('YYYY-MM-DD');
                                            const isToday = currentMonth.date(day).isSame(today, 'day');
                                            const dayEntries = occupiedMap[dateStr] || [];

                                            return (
                                                <Tooltip 
                                                    key={day} 
                                                    title={dayEntries.length > 0 ? <DayTooltipContent entries={dayEntries} onDelete={(id) => setConfirmDelete({ open: true, id })} /> : ""}
                                                    placement="top"
                                                    arrow
                                                    disableHoverListener={dayEntries.length === 0}
                                                >
                                                    <Box sx={{
                                                        flex: 1,
                                                        p: 0.5,
                                                        borderRadius: 2,
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        bgcolor: isToday ? PINK_BABY : 'rgba(0,0,0,0.02)',
                                                        border: '1px solid',
                                                        borderColor: isToday ? PINK_MAIN : 'transparent',
                                                        transition: 'all 0.15s',
                                                        cursor: dayEntries.length > 0 ? 'pointer' : 'default',
                                                        '&:hover': {
                                                            bgcolor: PINK_BABY,
                                                            transform: 'translateY(-2px)',
                                                            boxShadow: '0 4px 12px rgba(219,39,119,0.1)',
                                                            zIndex: 1
                                                        }
                                                    }}>
                                                        <Typography variant="body2" fontWeight={isToday ? 900 : 700} sx={{ 
                                                            color: isToday ? PINK_MAIN : 'text.primary',
                                                            mb: 0.25,
                                                            fontSize: '0.8rem',
                                                            lineHeight: 1
                                                        }}>
                                                            {day}
                                                        </Typography>

                                                        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', overflow: 'hidden' }}>
                                                            {dayEntries.map((e, idx) => (
                                                                <DoctorMarker key={idx} color={e.color} />
                                                            ))}
                                                        </Box>
                                                    </Box>
                                                </Tooltip>
                                            );
                                        })}
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    )}
                </Box>

                {/* Footer Legend Strip */}
                {!loading && doctors.length > 0 && (
                    <Box sx={{ 
                        p: 1.5, 
                        bgcolor: PINK_BABY, 
                        borderTop: '1px solid', 
                        borderColor: PINK_PASTEL, 
                        display: 'flex', 
                        justifyContent: 'center', 
                        gap: 2.5, 
                        flexWrap: 'wrap' 
                    }}>
                        {doctors.map(doc => (
                            <Box key={doc.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: doctorColorMap[doc.id]?.bg || '#94a3b8' }} />
                                <Typography variant="caption" fontWeight={700} color="text.primary" sx={{ fontSize: '0.7rem' }}>
                                    Dra. {doc.nombre_completo}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                )}
            </Box>

            {/* Floating Action Button - Expanded & Lowered */}
            <Fab 
                variant="extended"
                onClick={() => setModalOpen(true)}
                sx={{ 
                    position: 'absolute', 
                    bottom: 24, 
                    right: 24, 
                    bgcolor: PINK_MAIN, 
                    color: 'white',
                    fontWeight: 800,
                    textTransform: 'none',
                    borderRadius: 3,
                    '&:hover': { bgcolor: PINK_CONTRAST, transform: 'scale(1.05)' },
                    transition: 'all 0.2s',
                    boxShadow: '0 10px 20px rgba(219, 39, 119, 0.4)',
                    px: 3,
                    py: 1.5,
                    zIndex: 10
                }}
            >
                <AddIcon sx={{ mr: 1 }} />
                Agregar turnos
            </Fab>

            {modalOpen && (
                <ScheduleModal 
                    open={modalOpen} 
                    onClose={() => setModalOpen(false)} 
                    onSuccess={(msg) => {
                        setModalOpen(false);
                        showSnackbar(msg);
                        fetchData();
                    }}
                    showSnackbar={showSnackbar}
                />
            )}

            {/* Confirm Delete Dialog */}
            <Dialog open={confirmDelete.open} onClose={() => setConfirmDelete({ open: false, id: null })} PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
                <DialogTitle sx={{ fontWeight: 900, textAlign: 'center', color: PINK_CONTRAST }}>¿Eliminar este turno?</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" textAlign="center">
                        Esta acción quitará la disponibilidad de este bloque horario para el bot.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'center', pb: 2, gap: 1 }}>
                    <Button onClick={() => setConfirmDelete({ open: false, id: null })} color="inherit" sx={{ textTransform: 'none', fontWeight: 600 }}>Cancelar</Button>
                    <Button onClick={handleConfirmDelete} variant="contained" sx={{ bgcolor: '#EF4444', '&:hover': { bgcolor: '#DC2626' }, textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>Eliminar</Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%', borderRadius: 2 }}>{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
};

export default SchedulesTab;

