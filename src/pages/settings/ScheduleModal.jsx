import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { Dialog, TextField, Button, Box, CircularProgress, IconButton, Typography, MenuItem, Tooltip, Divider, useTheme } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import WatchLaterIcon from '@mui/icons-material/WatchLater';
import dayjs from 'dayjs';
import 'dayjs/locale/es';

dayjs.locale('es');

// Doctor palette remains for indicators
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

// 4:3 cell ratio
const CELL_H = 54;
const CELL_W = 72;
// Total width = (7 cells * 72px) + (6 gaps * 2px) + (2 sides padding * 8px) = 532px
const CAL_TOTAL_WIDTH = (CELL_W * 7) + (6 * 2) + 16; 

const fmtTime = (t) => t ? t.substring(0, 5) : '';

// Pink Palette for the UI
const PINK_BABY = '#fdf2f8'; 
const PINK_PASTEL = '#fbcfe8'; 
const PINK_MAIN = '#db2777'; 
const PINK_CONTRAST = '#be185d';

// Tooltip content - Added "Dr./Dra. " prefix
const DayTooltipContent = ({ entries }) => (
    <Box sx={{ p: 0.5 }}>
        {entries.map((e, i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: i < entries.length - 1 ? 0.5 : 0 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: e.color, flexShrink: 0 }} />
                <Typography variant="caption" sx={{ color: 'white', lineHeight: 1.3 }}>
                    <strong>Dr./Dra. {e.nombre}</strong><br />{fmtTime(e.hora_inicio)} – {fmtTime(e.hora_fin)}
                </Typography>
            </Box>
        ))}
    </Box>
);

const TimePill = ({ hora_inicio, hora_fin, color, faded }) => (
    <Box sx={{
        width: CELL_W - 8, borderRadius: '4px',
        bgcolor: faded ? 'rgba(255,255,255,0.28)' : color,
        px: '3px', py: '2px', mt: '2px', textAlign: 'center',
        overflow: 'hidden', flexShrink: 0,
    }}>
        <Typography sx={{
            color: 'white', fontSize: '0.58rem', fontWeight: 700,
            letterSpacing: '-0.3px', lineHeight: 1.2,
            userSelect: 'none', whiteSpace: 'nowrap',
            overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
            {fmtTime(hora_inicio)}–{fmtTime(hora_fin)}
        </Typography>
    </Box>
);

const MultiDayCalendar = ({ selectedDates, onChange, occupiedMap, doctorColorMap, currentMonth, onMonthChange }) => {
    const theme = useTheme();
    const daysInMonth = currentMonth.daysInMonth();
    const startOffset = (currentMonth.day() + 6) % 7;

    const toggleDay = (dayNum) => {
        const dateStr = currentMonth.date(dayNum).format('YYYY-MM-DD');
        if (currentMonth.date(dayNum).isBefore(dayjs().startOf('day'))) return;
        onChange(prev => prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]);
    };

    const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const today = dayjs().startOf('day');

    const cells = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    const weeks = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

    return (
        <Box sx={{ width: '100%', bgcolor: 'background.paper' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5, bgcolor: PINK_BABY }}>
                <IconButton size="small" onClick={() => onMonthChange(currentMonth.subtract(1, 'month'))}
                    sx={{ color: PINK_MAIN, p: 0.5, '&:hover': { bgcolor: PINK_PASTEL } }}>
                    <Typography sx={{ fontWeight: 900, fontSize: '1.2rem', lineHeight: 1 }}>‹</Typography>
                </IconButton>
                <Typography fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.85rem', color: PINK_MAIN }}>
                    {currentMonth.format('MMMM YYYY')}
                </Typography>
                <IconButton size="small" onClick={() => onMonthChange(currentMonth.add(1, 'month'))}
                    sx={{ color: PINK_MAIN, p: 0.5, '&:hover': { bgcolor: PINK_PASTEL } }}>
                    <Typography sx={{ fontWeight: 900, fontSize: '1.2rem', lineHeight: 1 }}>›</Typography>
                </IconButton>
            </Box>

            {/* Weekday headers */}
            <Box sx={{ display: 'flex', gap: '2px', px: 1, bgcolor: PINK_BABY, opacity: 0.8, borderBottom: '1px solid', borderColor: PINK_PASTEL }}>
                {weekDays.map(d => (
                    <Box key={d} sx={{ width: CELL_W, textAlign: 'center', py: 0.75, flexShrink: 0 }}>
                        <Typography variant="caption" fontWeight={700} color={PINK_CONTRAST} sx={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {d}
                        </Typography>
                    </Box>
                ))}
            </Box>

            {/* Week rows */}
            <Box sx={{ px: 1, pt: 1, pb: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {weeks.map((week, wi) => (
                    <Box key={wi} sx={{ display: 'flex', gap: '2px' }}>
                        {week.map((day, di) => {
                            if (!day) return <Box key={`e-${wi}-${di}`} sx={{ width: CELL_W, height: CELL_H, flexShrink: 0 }} />;

                            const dateStr = currentMonth.date(day).format('YYYY-MM-DD');
                            const isPast = currentMonth.date(day).isBefore(today);
                            const isSelected = selectedDates.includes(dateStr);
                            const isToday = currentMonth.date(day).isSame(today, 'day');
                            const dow = currentMonth.date(day).day();
                            const isWeekend = dow === 0 || dow === 6;
                            const dayEntries = (occupiedMap[dateStr] || []).map(e => ({
                                ...e, color: doctorColorMap[e.id]?.bg || '#94a3b8'
                            }));

                            const cellBox = (
                                <Box onClick={() => !isPast && toggleDay(day)} sx={{
                                    width: CELL_W, height: CELL_H, flexShrink: 0,
                                    display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', pt: '7px',
                                    borderRadius: '6px',
                                    cursor: isPast ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.15s',
                                    bgcolor: isSelected ? PINK_PASTEL : isToday ? PINK_BABY : 'transparent',
                                    border: isToday && !isSelected ? '2px solid' : '2px solid transparent',
                                    borderColor: isToday && !isSelected ? PINK_MAIN : 'transparent',
                                    opacity: isPast ? 0.3 : 1,
                                    '&:hover': !isPast ? {
                                        bgcolor: isSelected ? '#fbcfe8' : '#fdf2f8',
                                        transform: 'scale(1.04)'
                                    } : {}
                                }}>
                                    <Typography variant="body2"
                                        fontWeight={isSelected || isToday ? 700 : isWeekend ? 500 : 400}
                                        sx={{
                                            color: isSelected ? PINK_CONTRAST : isToday ? PINK_MAIN : isWeekend ? 'text.secondary' : 'text.primary',
                                            fontSize: '0.88rem', lineHeight: 1, userSelect: 'none'
                                        }}>
                                        {day}
                                    </Typography>

                                    {dayEntries.slice(0, 2).map((e, i) => (
                                        <TimePill key={i} hora_inicio={e.hora_inicio} hora_fin={e.hora_fin} color={e.color} faded={isSelected} />
                                    ))}
                                    {dayEntries.length > 2 && (
                                        <Typography sx={{ color: isSelected ? PINK_CONTRAST : 'text.disabled', fontSize: '0.55rem', mt: '1px', opacity: 0.7 }}>
                                            +{dayEntries.length - 2}
                                        </Typography>
                                    )}
                                </Box>
                            );

                            return dayEntries.length > 0 ? (
                                <Tooltip key={day} title={<DayTooltipContent entries={dayEntries} />} placement="top" arrow>
                                    {cellBox}
                                </Tooltip>
                            ) : (
                                <React.Fragment key={day}>{cellBox}</React.Fragment>
                            );
                        })}
                    </Box>
                ))}
            </Box>
        </Box>
    );
};

const ScheduleModal = ({ open, onClose, onSuccess }) => {
    const theme = useTheme();
    const [doctors, setDoctors] = useState([]);
    const [loadingData, setLoadingData] = useState(false);
    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [selectedDates, setSelectedDates] = useState([]);
    const [existingSchedules, setExistingSchedules] = useState([]);
    const [currentMonth, setCurrentMonth] = useState(dayjs().startOf('month'));
    const [formData, setFormData] = useState({ doctor_id: '', hora_inicio: '09:30', hora_fin: '13:40', intervalo_minutos: 20 });

    const doctorColorMap = useMemo(() => {
        const map = {};
        doctors.forEach((doc, idx) => { map[doc.id] = DOCTOR_COLORS[idx % DOCTOR_COLORS.length]; });
        return map;
    }, [doctors]);

    const occupiedMap = useMemo(() => {
        const map = {};
        existingSchedules.forEach(sched => {
            if (!map[sched.fecha_exacta]) map[sched.fecha_exacta] = [];
            if (!map[sched.fecha_exacta].some(d => d.id === sched.doctor_id)) {
                const doc = doctors.find(d => d.id === sched.doctor_id);
                if (doc) map[sched.fecha_exacta].push({ id: doc.id, nombre: doc.nombre_completo, hora_inicio: sched.hora_inicio, hora_fin: sched.hora_fin });
            }
        });
        return map;
    }, [existingSchedules, doctors]);

    const legendDoctors = useMemo(() => {
        const monthStr = currentMonth.format('YYYY-MM');
        const ids = new Set(existingSchedules.filter(s => s.fecha_exacta.startsWith(monthStr)).map(s => s.doctor_id));
        return doctors.filter(d => ids.has(d.id));
    }, [existingSchedules, doctors, currentMonth]);

    useEffect(() => {
        if (open) {
            setFormData({ doctor_id: '', hora_inicio: '09:30', hora_fin: '13:40', intervalo_minutos: 20 });
            setSelectedDates([]);
            setErrorMsg('');
            setCurrentMonth(dayjs().startOf('month'));
            fetchData();
        }
    }, [open]);

    const fetchData = async () => {
        setLoadingData(true);
        const [docRes, schedRes] = await Promise.all([
            supabase.from('doctores').select('id, nombre_completo, especialidad, es_principal')
                .eq('activo', true)
                .order('es_principal', { ascending: false })
                .order('nombre_completo', { ascending: true }),
            supabase.from('horarios_diarios').select('id, fecha_exacta, doctor_id, hora_inicio, hora_fin')
        ]);
        if (!docRes.error && docRes.data) setDoctors(docRes.data);
        else setErrorMsg('No se pudieron cargar los doctores activos.');
        if (!schedRes.error && schedRes.data) setExistingSchedules(schedRes.data);
        setLoadingData(false);
    };

    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        if (!formData.doctor_id) { setErrorMsg('Por favor seleccione un doctor.'); return; }
        if (selectedDates.length === 0) { setErrorMsg('Por favor seleccione al menos un día en el calendario.'); return; }
        if (formData.hora_inicio >= formData.hora_fin) { setErrorMsg('La hora de fin debe ser posterior a la de inicio.'); return; }
        if (formData.intervalo_minutos < 5 || formData.intervalo_minutos > 120) { setErrorMsg('El intervalo debe estar entre 5 y 120 min.'); return; }

        setLoadingSubmit(true);
        const records = [...selectedDates].sort().map(fecha => ({
            fecha_exacta: fecha, doctor_id: formData.doctor_id,
            hora_inicio: formData.hora_inicio, hora_fin: formData.hora_fin,
            intervalo_minutos: parseInt(formData.intervalo_minutos)
        }));

        const errors = [];
        for (const r of records) {
            const { error } = await supabase.from('horarios_diarios').insert([r]);
            if (error) {
                const lbl = dayjs(r.fecha_exacta).format('DD/MM/YYYY');
                errors.push(`${lbl}: ${(error.message?.includes('overlap') || error.message?.includes('solapamiento')) ? 'Horario solapado.' : error.message}`);
            }
        }

        setLoadingSubmit(false);
        const ok = records.length - errors.length;
        if (!errors.length) {
            onSuccess(`${ok} turno${ok > 1 ? 's' : ''} aperturado${ok > 1 ? 's' : ''} exitosamente.`);
        } else if (ok > 0) {
            setErrorMsg(`${ok} turno${ok > 1 ? 's guardados' : ' guardado'}. Errores:\n${errors.join('\n')}`);
        } else {
            setErrorMsg(`Error en todos los turnos:\n${errors.join('\n')}`);
        }
    };

    const isDark = theme.palette.mode === 'dark';
    const sectionBg = isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc';

    return (
        <Dialog
            open={open}
            onClose={!loadingSubmit ? onClose : undefined}
            maxWidth={false} fullWidth={false}
            PaperProps={{
                sx: {
                    width: 'auto', 
                    maxWidth: '95vw',
                    height: 'auto', 
                    maxHeight: '95vh',
                    borderRadius: 3,
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                    overflow: 'hidden', display: 'flex', flexDirection: 'column'
                }
            }}
        >
            <Box sx={{ bgcolor: PINK_MAIN, color: 'white', px: 3, py: 2.5, position: 'relative', flexShrink: 0 }}>
                <IconButton onClick={onClose} disabled={loadingSubmit}
                    sx={{ position: 'absolute', top: 10, right: 12, color: 'inherit', bgcolor: 'rgba(0,0,0,0.08)', '&:hover': { bgcolor: 'rgba(0,0,0,0.18)' } }}>
                    <CloseIcon />
                </IconButton>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pr: 5 }}>
                    <WatchLaterIcon sx={{ fontSize: '2rem', opacity: 0.9 }} />
                    <Box>
                        <Typography variant="h5" sx={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                            Agregar Turnos
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.8, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                            Apertura de Agenda
                        </Typography>
                    </Box>
                </Box>
            </Box>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    {loadingData ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minWidth: 600, p: 4, height: 400 }}>
                            <CircularProgress color="primary" />
                        </Box>
                    ) : (
                        <>
                            {/* LEFT PANEL */}
                            <Box sx={{
                                flexShrink: 0,
                                width: 'fit-content',
                                p: 2.5,
                                bgcolor: 'background.default',
                                display: 'flex', flexDirection: 'column',
                            }}>
                                <Box sx={{
                                    width: CAL_TOTAL_WIDTH,
                                    border: '1px solid', borderColor: PINK_PASTEL,
                                    borderRadius: 3, overflow: 'hidden', flexShrink: 0
                                }}>
                                    <MultiDayCalendar
                                        selectedDates={selectedDates}
                                        onChange={setSelectedDates}
                                        occupiedMap={occupiedMap}
                                        doctorColorMap={doctorColorMap}
                                        currentMonth={currentMonth}
                                        onMonthChange={setCurrentMonth}
                                    />

                                    {/* Legend strip - Centered and with "Dr./Dra. " prefix */}
                                    {legendDoctors.length > 0 && (
                                        <Box sx={{
                                            borderTop: '1px solid', borderColor: PINK_PASTEL,
                                            bgcolor: sectionBg,
                                            px: 1.5, py: 1,
                                            display: 'flex', flexWrap: 'wrap', 
                                            gap: 2, alignItems: 'center', 
                                            justifyContent: 'center' // Centered legend
                                        }}>
                                            {legendDoctors.map(doc => {
                                                const color = doctorColorMap[doc.id];
                                                return (
                                                    <Box key={doc.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color?.bg || '#94a3b8', flexShrink: 0, border: '1px solid rgba(0,0,0,0.09)' }} />
                                                        <Typography variant="caption" fontWeight={600} color="text.primary" sx={{ fontSize: '0.72rem' }}>
                                                            Dr./Dra. {doc.nombre_completo}
                                                        </Typography>
                                                    </Box>
                                                );
                                            })}
                                        </Box>
                                    )}
                                </Box>
                            </Box>

                            {/* RIGHT PANEL */}
                            <Box sx={{ minWidth: 400, flex: 1, p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                                {errorMsg && (
                                    <Box sx={{ p: 2, bgcolor: 'error.lighter', border: '1px solid', borderColor: 'error.light', borderRadius: 2 }}>
                                        <Typography variant="body2" color="error.dark" fontWeight="bold" sx={{ whiteSpace: 'pre-line' }}>{errorMsg}</Typography>
                                    </Box>
                                )}

                                <Box>
                                    <Typography variant="subtitle2" fontWeight={700} color="text.secondary"
                                        sx={{ mb: 1.5, textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.08em' }}>
                                        Doctor Asignado
                                    </Typography>
                                    <TextField select required fullWidth label="Seleccionar Doctor"
                                        name="doctor_id" value={formData.doctor_id} onChange={handleChange}
                                        disabled={loadingSubmit} variant="outlined"
                                        sx={{ 
                                            '& .MuiOutlinedInput-root': { 
                                                borderRadius: 2, 
                                                '&.Mui-focused fieldset': { borderColor: PINK_MAIN, borderWidth: 2 } 
                                            } 
                                        }}
                                    >
                                        {doctors.length === 0 && <MenuItem value="" disabled>No hay doctores activos</MenuItem>}
                                        {doctors.map(doc => {
                                            const color = doctorColorMap[doc.id];
                                            return (
                                                <MenuItem key={doc.id} value={doc.id}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color?.bg || '#94a3b8', flexShrink: 0 }} />
                                                        <Box>
                                                            <Typography variant="body2" fontWeight={700}>
                                                                Dr./Dra. {doc.nombre_completo}
                                                                {doc.es_principal && (
                                                                    <Typography component="span" variant="caption" sx={{ ml: 1, fontWeight: 600, color: PINK_MAIN }}>
                                                                        · Principal
                                                                    </Typography>
                                                                )}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">{doc.especialidad}</Typography>
                                                        </Box>
                                                    </Box>
                                                </MenuItem>
                                            );
                                        })}
                                    </TextField>
                                </Box>

                                <Box sx={{ p: 2.5, bgcolor: PINK_BABY, borderRadius: 2, border: '1px solid', borderColor: PINK_PASTEL }}>
                                    <Typography variant="subtitle2" fontWeight={700} color={PINK_CONTRAST}
                                        sx={{ mb: 2, textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.08em' }}>
                                        Configuración de Horario
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        <Box sx={{ display: 'flex', gap: 2 }}>
                                            <TextField required type="time" label="Hora de Inicio" name="hora_inicio"
                                                value={formData.hora_inicio} onChange={handleChange} disabled={loadingSubmit}
                                                InputLabelProps={{ shrink: true }} fullWidth
                                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: 'white' } }} />
                                            <TextField required type="time" label="Hora de Fin" name="hora_fin"
                                                value={formData.hora_fin} onChange={handleChange} disabled={loadingSubmit}
                                                InputLabelProps={{ shrink: true }} fullWidth
                                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: 'white' } }} />
                                        </Box>
                                        <TextField required type="number" label="Minutos por Cita" name="intervalo_minutos"
                                            value={formData.intervalo_minutos} onChange={handleChange} disabled={loadingSubmit}
                                            InputProps={{ inputProps: { min: 5, max: 120 } }} fullWidth
                                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: 'white' } }} />
                                    </Box>
                                </Box>

                                {selectedDates.length > 0 && formData.doctor_id && (
                                    <Box sx={{ p: 2, bgcolor: '#f0fdf4', border: '1px solid', borderColor: '#bbf7d0', borderRadius: 2 }}>
                                        <Typography variant="caption" fontWeight={700} color="#15803d" sx={{ display: 'block', mb: 0.5 }}>
                                            ✓ Resumen
                                        </Typography>
                                        <Typography variant="caption" color="#15803d">
                                            Se crearán <strong>{selectedDates.length}</strong> turno{selectedDates.length > 1 ? 's' : ''} de {formData.hora_inicio}–{formData.hora_fin} para <strong>Dr./Dra. {doctors.find(d => d.id === formData.doctor_id)?.nombre_completo}</strong>.
                                        </Typography>
                                    </Box>
                                )}

                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mt: 'auto', pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                                    <Button onClick={onClose} disabled={loadingSubmit || loadingData}
                                        variant="outlined" color="inherit"
                                        sx={{ fontWeight: 600, textTransform: 'none', borderRadius: 2 }}>
                                        Cancelar
                                    </Button>
                                    <Button type="submit" variant="contained" 
                                        disabled={loadingSubmit || loadingData || selectedDates.length === 0}
                                        sx={{
                                            bgcolor: PINK_MAIN, color: 'white',
                                            '&:hover': { bgcolor: PINK_CONTRAST },
                                            '&.Mui-disabled': { bgcolor: PINK_PASTEL, color: 'white' },
                                            fontWeight: 700, px: 3, textTransform: 'none', borderRadius: 2,
                                            boxShadow: 2
                                        }}
                                    >
                                        {loadingSubmit
                                            ? <CircularProgress size={24} color="inherit" />
                                            : `Aperturar ${selectedDates.length > 0 ? selectedDates.length : ''} turno${selectedDates.length > 1 ? 's' : ''}`
                                        }
                                    </Button>
                                </Box>
                            </Box>
                        </>
                    )}
                </Box>
            </form>
        </Dialog>
    );
};

export default ScheduleModal;
