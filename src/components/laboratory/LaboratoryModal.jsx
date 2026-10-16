import React, { useState, useEffect, useCallback } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Box, Button, TextField, Typography, IconButton, Tooltip,
    Divider, CircularProgress, List, ListItem,
    ListItemButton, ListItemText, ListItemAvatar, Avatar, InputAdornment,
    Table, TableBody, TableCell, TableContainer, TableHead,
    TableRow, Paper, Chip, Select, MenuItem, FormControl,
    InputLabel, useTheme, Collapse, Alert, useMediaQuery
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import BiotechIcon from '@mui/icons-material/Biotech';
import ScienceIcon from '@mui/icons-material/Science';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import SearchIcon from '@mui/icons-material/Search';
import EditNoteIcon from '@mui/icons-material/EditNote';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { supabase } from '../../supabaseClient';
import { createLaboratoryOrder } from '../../services/laboratoryService';
import { getClinicInfo } from '../../services/clinicService';

// ============================================
// MODAL AGENDA DE PACIENTES (REUTILIZADO)
// ============================================
const PatientPickerDialog = ({ open, onClose, onSelect }) => {
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (!open) return;
        setSearch('');
        setLoading(true);
        supabase
            .from('pacientes')
            .select('id, nombre_completo, dni, telefono_principal, fecha_nacimiento')
            .order('nombre_completo', { ascending: true })
            .then(({ data }) => {
                setPatients(data || []);
                setLoading(false);
            });
    }, [open]);

    const filtered = patients.filter(p =>
        (p.nombre_completo || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.dni || '').includes(search)
    );

    const calcEdad = (fechaNac) => {
        if (!fechaNac) return null;
        const hoy = new Date();
        const nac = new Date(fechaNac);
        let edad = hoy.getFullYear() - nac.getFullYear();
        const m = hoy.getMonth() - nac.getMonth();
        if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
        return edad;
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4, overflow: 'hidden' } }}>
            <DialogTitle sx={{ 
                bgcolor: 'background.paper', 
                color: 'text.primary', 
                fontWeight: 800, 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1.5,
                borderBottom: '1px solid',
                borderColor: 'divider',
                py: 2.5
            }}>
                <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    width: 36, 
                    height: 36, 
                    borderRadius: 1.5, 
                    bgcolor: '#FCF9F2', 
                    color: '#D4AF37' 
                }}>
                    <PeopleAltIcon sx={{ fontSize: 20 }} />
                </Box>
                Seleccionar Paciente
                <IconButton onClick={onClose} sx={{ ml: 'auto', color: 'text.secondary' }} size="small"><CloseIcon /></IconButton>
            </DialogTitle>
            <DialogContent sx={{ pt: 2.5, px: 2, pb: 0, bgcolor: '#FDFBFF' }}>
                <TextField
                    fullWidth
                    size="small"
                    placeholder="Buscar por nombre o DNI..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    autoFocus
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon fontSize="small" sx={{ color: '#D4AF37' }} />
                            </InputAdornment>
                        ),
                    }}
                    sx={{ 
                        mb: 2,
                        '& .MuiOutlinedInput-root': {
                            bgcolor: 'white',
                            '&:hover fieldset': { borderColor: '#F5F5DC' },
                            '&.Mui-focused fieldset': { borderColor: '#D4AF37' }
                        }
                    }}
                />
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                        <CircularProgress size={32} sx={{ color: '#D4AF37' }} />
                    </Box>
                ) : (
                    <List dense sx={{ maxHeight: 340, overflowY: 'auto', px: 0.5 }}>
                        {filtered.map(p => {
                            const edad = calcEdad(p.fecha_nacimiento);
                            return (
                                <ListItem key={p.id} disablePadding sx={{ mb: 0.5 }}>
                                    <ListItemButton
                                        onClick={() => { onSelect(p); onClose(); }}
                                        sx={{ 
                                            borderRadius: 2.5, 
                                            py: 1.2,
                                            '&:hover': { bgcolor: '#FCF9F2' } 
                                        }}
                                    >
                                        <ListItemAvatar>
                                            <Avatar sx={{ 
                                                bgcolor: '#D4AF37', 
                                                width: 36, 
                                                height: 36, 
                                                fontSize: '0.85rem',
                                                fontWeight: 700
                                            }}>
                                                {(p.nombre_completo || '?').charAt(0).toUpperCase()}
                                            </Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={p.nombre_completo}
                                            secondary={`DNI: ${p.dni || '-'}${edad !== null ? ` · ${edad} años` : ''}`}
                                            primaryTypographyProps={{ fontWeight: 700, fontSize: '0.85rem', color: 'text.primary' }}
                                            secondaryTypographyProps={{ fontSize: '0.75rem', fontWeight: 500 }}
                                        />
                                    </ListItemButton>
                                </ListItem>
                            );
                        })}
                    </List>
                )}
            </DialogContent>
            <DialogActions sx={{ pb: 3, px: 2.5, bgcolor: '#FDFBFF' }}>
                <Button onClick={onClose} variant="text" fullWidth sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    Cancelar
                </Button>
            </DialogActions>
        </Dialog>
    );
};

// ============================================
// FILA DE EXAMEN
// ============================================
const ExamRow = ({ item, index, onRemove }) => {
    return (
        <TableRow sx={{ '&:hover': { bgcolor: 'rgba(255, 128, 171, 0.02)' } }}>
            <TableCell align="center">
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#D4AF37' }}>
                    {index + 1}
                </Typography>
            </TableCell>
            <TableCell>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                        {item.examen}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                        {item.tipo_muestra && (
                            <Typography variant="caption" sx={{ bgcolor: 'rgba(212, 175, 55, 0.1)', color: '#D4AF37', px: 1, borderRadius: 1 }}>
                                Muestra: {item.tipo_muestra}
                            </Typography>
                        )}
                    </Box>
                    {item.indicaciones && (
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic', mt: 0.5 }}>
                            {item.indicaciones}
                        </Typography>
                    )}
                </Box>
            </TableCell>
            <TableCell align="center">
                <IconButton
                    size="small"
                    onClick={() => onRemove(item._uid)}
                    sx={{ color: 'error.light', '&:hover': { bgcolor: '#FFEBEE', color: 'error.main' } }}
                >
                    <DeleteIcon sx={{ fontSize: 18 }} />
                </IconButton>
            </TableCell>
        </TableRow>
    );
};

// ============================================
// MODAL PRINCIPAL DE CREACIÓN DE ORDEN LAB
// ============================================
const LaboratoryModal = ({ open, onClose, onSaved }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // ---- Estado del médico ----
    const [doctors, setDoctors] = useState([]);
    const [selectedDoctorId, setSelectedDoctorId] = useState('');
    const [medicoNombre, setMedicoNombre] = useState('');
    const [medicoCmp, setMedicoCmp] = useState('');
    const [medicoRne, setMedicoRne] = useState('');
    const [medicoEspecialidad, setMedicoEspecialidad] = useState('');
    const [clinicInfo, setClinicInfo] = useState(null);

    // ---- Cargar doctores ----
    const loadDoctors = useCallback(async () => {
        const { data } = await supabase
            .from('doctores')
            .select('id, nombre_completo, especialidad, cmp, rne, activo, es_principal')
            .eq('activo', true)
            .order('es_principal', { ascending: false });
        if (data && data.length > 0) {
            setDoctors(data);
            const principal = data.find(d => d.es_principal) || data[0];
            applyDoctor(principal);
        }
    }, []);

    const applyDoctor = (doc) => {
        if (!doc) return;
        setSelectedDoctorId(doc.id);
        const name = doc.nombre_completo || '';
        const prefixedName = name.startsWith('Dra.') ? name : `Dra. ${name}`;
        setMedicoNombre(prefixedName);
        setMedicoCmp(doc.cmp || '');
        setMedicoRne(doc.rne || '');
        setMedicoEspecialidad(doc.especialidad || '');
    };

    // ---- Datos paciente ----
    const [patientPickerOpen, setPatientPickerOpen] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [patientNombre, setPatientNombre] = useState('');
    const [patientDni, setPatientDni] = useState('');
    const [patientEdad, setPatientEdad] = useState('');

    // ---- Diagnóstico y fecha ----
    const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
    const [sospechaClinica, setSospechaClinica] = useState('');
    const [diagnostico, setDiagnostico] = useState('');

    // ---- Exámenes ----
    const [examNombre, setExamNombre] = useState('');
    const [examMuestra, setExamMuestra] = useState('');
    const [examIndicaciones, setExamIndicaciones] = useState('');
    const [orderItems, setOrderItems] = useState([]);
    
    // ---- Pie ----
    const [observaciones, setObservaciones] = useState('');

    // ---- Control UI ----
    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const loadClinic = useCallback(async () => {
        const { data } = await getClinicInfo();
        if (data) setClinicInfo(data);
    }, []);

    useEffect(() => {
        if (open) {
            loadDoctors();
            loadClinic();
        }
    }, [open, loadDoctors, loadClinic]);

    const handleClose = () => {
        setDoctors([]);
        setSelectedDoctorId('');
        setMedicoNombre(''); setMedicoCmp(''); setMedicoRne(''); 
        setMedicoEspecialidad('');
        setSelectedPatient(null); setPatientNombre(''); setPatientDni(''); setPatientEdad('');
        setFecha(new Date().toISOString().slice(0, 10));
        setSospechaClinica('');
        setDiagnostico('');
        clearExamForm();
        setOrderItems([]);
        setObservaciones('');
        setErrorMsg('');
        onClose();
    };

    const clearExamForm = () => {
        setExamNombre('');
        setExamMuestra('');
        setExamIndicaciones('');
    };

    const handleSelectPatient = (patient) => {
        setSelectedPatient(patient);
        setPatientNombre(patient.nombre_completo || '');
        setPatientDni(patient.dni || '');
        if (patient.fecha_nacimiento) {
            const hoy = new Date();
            const nac = new Date(patient.fecha_nacimiento);
            let edad = hoy.getFullYear() - nac.getFullYear();
            const m = hoy.getMonth() - nac.getMonth();
            if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
            setPatientEdad(`${edad} años`);
        }
    };

    const handleAddExam = () => {
        const nombre = examNombre.trim();
        if (!nombre) return;
        const newItem = {
            _uid: `exam-${Date.now()}-${Math.random()}`,
            examen: nombre,
            tipo_muestra: examMuestra.trim() || null,
            indicaciones: examIndicaciones.trim() || null,
        };
        setOrderItems(prev => [...prev, newItem]);
        clearExamForm();
    };

    const handleRemoveExam = (uid) => {
        setOrderItems(prev => prev.filter(i => i._uid !== uid));
    };

    const handleSave = async () => {
        setErrorMsg('');
        if (orderItems.length === 0) {
            setErrorMsg('Debes agregar al menos un examen.');
            return;
        }
        setSaving(true);
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id || null;
        const header = {
            fecha,
            medico_nombre: medicoNombre.trim(),
            medico_cmp: medicoCmp.trim() || null,
            medico_rne: medicoRne.trim() || null,
            medico_especialidad: medicoEspecialidad.trim() || null,
            medico_direccion: clinicInfo?.direccion || null,
            paciente_id: selectedPatient?.id || null,
            paciente_nombre: patientNombre.trim() || null,
            paciente_dni: patientDni.trim() || null,
            paciente_edad: patientEdad.trim() || null,
            sospecha_clinica: sospechaClinica.trim() || null,
            diagnostico: diagnostico.trim() || null,
            observaciones: observaciones.trim() || null,
        };
        const { data, error } = await createLaboratoryOrder(header, orderItems, userId);
        setSaving(false);
        if (error) {
            setErrorMsg('Error al guardar la orden de laboratorio.');
            return;
        }
        onSaved?.(data);
        handleClose();
    };

    const canSave = orderItems.length > 0 && medicoNombre.trim() && !saving;

    return (
        <>
            <Dialog
                open={open}
                onClose={handleClose}
                maxWidth={false}
                fullWidth={false}
                PaperProps={{
                    sx: {
                        width: isMobile ? '95%' : '80%',
                        maxWidth: 'none',
                        height: '95vh',
                        maxHeight: '95vh',
                        borderRadius: 3,
                        overflow: 'hidden',
                        background: theme.palette.mode === 'dark' ? '#1e293b' : '#fff',
                    }
                }}
            >
                {/* ---- HEADER ---- */}
                <DialogTitle
                    sx={{
                        bgcolor: 'background.paper',
                        color: 'text.primary',
                        px: { xs: 3, sm: 4 },
                        py: 2,
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        flexShrink: 0,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                    }}
                >
                    <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        width: 40, 
                        height: 40, 
                        borderRadius: 2, 
                        bgcolor: '#FCF9F2', 
                        color: '#D4AF37',
                        flexShrink: 0
                    }}>
                        <ScienceIcon sx={{ fontSize: 24 }} />
                    </Box>
                    
                    <Chip
                        label="LABORATORIO"
                        size="small"
                        sx={{
                            bgcolor: '#F5F5DC',
                            color: '#D4AF37',
                            fontWeight: 800,
                            fontSize: '0.75rem',
                            height: 24,
                            px: 1,
                            textTransform: 'uppercase'
                        }}
                    />

                    <IconButton 
                        onClick={handleClose} 
                        sx={{ ml: 'auto', color: 'text.secondary', '&:hover': { bgcolor: '#FCF9F2', color: '#D4AF37' } }} 
                        size="small"
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>

                <DialogContent sx={{ pt: 10, pb: 4, px: 4, overflowY: 'auto', bgcolor: '#FDFBFF' }}>
                    
                    {errorMsg && (
                        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{errorMsg}</Alert>
                    )}

                    {/* Clinic Info + Header Header */}
                    <Box sx={{ mb: 3.5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                            <Typography variant="h6" sx={{ fontWeight: 900, color: '#D4AF37', textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1.2 }}>
                                {clinicInfo?.nombre_clinica || 'Clínica Salud'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                                {clinicInfo?.direccion || 'Cargando dirección...'}
                            </Typography>
                        </Box>

                        <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="h4" sx={{ fontWeight: 900, color: 'text.primary', letterSpacing: '-0.025em', lineHeight: 1.1, textTransform: 'uppercase' }}>
                                Orden de Laboratorio
                            </Typography>
                            <Typography variant="subtitle1" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', mt: 0.5 }}>
                                Fecha: {new Date(fecha + 'T12:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </Typography>
                        </Box>
                    </Box>

                    {/* Información del Médico */}
                    <Box sx={{ mb: 4 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                            <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.disabled', letterSpacing: '0.1em' }}>
                                Información del Médico
                            </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1.5fr 1fr 1fr 1.5fr' }, gap: 2 }}>
                                {doctors.length > 0 ? (
                                    <FormControl size="small" fullWidth>
                                        <InputLabel>Seleccionar Médico</InputLabel>
                                        <Select
                                            value={selectedDoctorId}
                                            label="Seleccionar Médico"
                                            onChange={(e) => {
                                                const doc = doctors.find(d => d.id === e.target.value);
                                                applyDoctor(doc);
                                            }}
                                        >
                                            {doctors.map(d => (
                                                <MenuItem key={d.id} value={d.id}>
                                                    Dra. {d.nombre_completo}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                ) : (
                                    <TextField label="Nombre del Médico" value={medicoNombre} onChange={e => setMedicoNombre(e.target.value)} size="small" fullWidth />
                                )}
                                <TextField label="CMP" value={medicoCmp} onChange={e => setMedicoCmp(e.target.value)} size="small" fullWidth />
                                <TextField label="RNE" value={medicoRne} onChange={e => setMedicoRne(e.target.value)} size="small" fullWidth />
                                <TextField label="Especialidad" value={medicoEspecialidad} onChange={e => setMedicoEspecialidad(e.target.value)} size="small" fullWidth />
                            </Box>
                    </Box>

                    {/* Información del Paciente */}
                    <Box sx={{ mb: 6 }}>
                        <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.disabled', letterSpacing: '0.1em' }}>
                            Información del Paciente
                        </Typography>

                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 150px 100px 50px' }, gap: 2, mt: 1.5 }}>
                            <TextField
                                label="Nombre Completo"
                                placeholder="Nombre del paciente"
                                value={patientNombre}
                                onChange={e => {
                                    setPatientNombre(e.target.value);
                                    if (!e.target.value) setSelectedPatient(null);
                                }}
                                fullWidth
                                size="small"
                                InputProps={{
                                    startAdornment: selectedPatient && (
                                        <InputAdornment position="start">
                                            <CheckCircleIcon sx={{ fontSize: 18, color: '#20C997' }} />
                                        </InputAdornment>
                                    )
                                }}
                            />
                            <TextField label="DNI" placeholder="DNI" value={patientDni} onChange={e => setPatientDni(e.target.value)} size="small" fullWidth />
                            <TextField label="Edad" placeholder="Edad" value={patientEdad} onChange={e => setPatientEdad(e.target.value)} size="small" fullWidth />
                            <Tooltip title="Buscar en pacientes">
                                <Button
                                    variant="outlined"
                                    onClick={() => setPatientPickerOpen(true)}
                                    sx={{
                                        minWidth: 48, width: 48, height: 40, p: 0,
                                        borderRadius: 2,
                                        borderColor: '#F5F5DC',
                                        color: '#D4AF37',
                                        '&:hover': { bgcolor: '#FCF9F2', borderColor: '#D4AF37' }
                                    }}
                                >
                                    <PeopleAltIcon fontSize="small" />
                                </Button>
                            </Tooltip>
                        </Box>

                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '180px 1fr 1fr' }, gap: 2, mt: 2.5 }}>
                            <TextField
                                label="Fecha Emisión"
                                type="date"
                                value={fecha}
                                onChange={e => setFecha(e.target.value)}
                                size="small"
                                InputLabelProps={{ shrink: true }}
                            />
                            <TextField
                                label="Sospecha Clínica"
                                value={sospechaClinica}
                                onChange={e => setSospechaClinica(e.target.value)}
                                fullWidth
                                size="small"
                                placeholder="Ej: Anemia, Infección urinaria..."
                            />
                            <TextField
                                label="Diagnóstico"
                                value={diagnostico}
                                onChange={e => setDiagnostico(e.target.value)}
                                fullWidth
                                size="small"
                                placeholder="Diagnostico confirmado o presuntivo..."
                            />
                        </Box>
                    </Box>

                    {/* SECCIÓN AGREGAR EXÁMENES */}
                    <Box sx={{
                        bgcolor: 'white',
                        borderRadius: 3,
                        p: 3,
                        border: '1px solid',
                        borderColor: 'divider',
                        mb: 4,
                        transition: 'all 0.2s',
                        '&:focus-within': { borderColor: '#F5F5DC', boxShadow: '0 4px 12px rgba(212, 175, 55, 0.08)' }
                    }}>
                        <Typography variant="subtitle2" fontWeight={800} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <ScienceIcon sx={{ fontSize: 18, color: '#D4AF37' }} /> Agregar Examen / Prueba
                        </Typography>

                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1.5fr 1fr 2fr auto' }, gap: 2, alignItems: 'center' }}>
                            <TextField 
                                label="Nombre del Examen" 
                                placeholder="Ej: Hemograma Completo" 
                                value={examNombre} 
                                onChange={e => setExamNombre(e.target.value)} 
                                size="small" 
                            />
                            <TextField 
                                label="Tipo de Muestra" 
                                placeholder="Ej: Sangre, Orina" 
                                value={examMuestra} 
                                onChange={e => setExamMuestra(e.target.value)} 
                                size="small" 
                            />
                            <TextField 
                                label="Indicaciones del Item" 
                                placeholder="Ej: Ayuno 8h" 
                                value={examIndicaciones} 
                                onChange={e => setExamIndicaciones(e.target.value)} 
                                size="small" 
                            />
                            <Button
                                variant="contained"
                                onClick={handleAddExam}
                                disabled={!examNombre.trim()}
                                sx={{ 
                                    borderRadius: 2, 
                                    bgcolor: '#D4AF37', 
                                    '&:hover': { bgcolor: '#B8860B' },
                                    height: 40
                                }}
                            >
                                Agregar
                            </Button>
                        </Box>
                    </Box>

                    {/* TABLA DE ÍTEMS */}
                    <Box sx={{
                        bgcolor: 'white',
                        borderRadius: 3,
                        p: 3,
                        border: '1px solid',
                        borderColor: 'divider',
                        mb: 2
                    }}>
                        <Typography variant="subtitle2" fontWeight={800} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5, color: 'text.primary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <ScienceIcon sx={{ fontSize: 18, color: '#D4AF37' }} /> Exámenes Solicitados
                        </Typography>

                        {orderItems.length === 0 ? (
                            <Box sx={{ py: 6, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 2, bgcolor: '#FAFAFA' }}>
                                <Typography variant="body2" color="text.disabled">No hay exámenes registrados aún.</Typography>
                            </Box>
                        ) : (
                            <TableContainer component={Box} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: '#FDFBFF' }}>
                                            <TableCell align="center" sx={{ fontWeight: 800, fontSize: '0.7rem', color: 'text.secondary', width: 40 }}>#</TableCell>
                                            <TableCell sx={{ fontWeight: 800, fontSize: '0.7rem', color: 'text.secondary' }}>EXAMEN / INDICACIONES</TableCell>
                                            <TableCell align="center" sx={{ width: 40 }}></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {orderItems.map((item, idx) => (
                                            <ExamRow
                                                key={item._uid}
                                                item={item}
                                                index={idx}
                                                onRemove={handleRemoveExam}
                                            />
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}

                        <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.disabled', letterSpacing: '0.1em' }}>
                                Instrucciones de Preparación / Observaciones
                            </Typography>
                            <TextField
                                label="Instrucciones Generales"
                                value={observaciones}
                                onChange={e => setObservaciones(e.target.value)}
                                fullWidth multiline rows={3} size="small"
                                placeholder="Indicaciones para el laboratorio o preparación del paciente..."
                            />
                        </Box>
                    </Box>
                </DialogContent>

                <DialogActions sx={{ px: 4, py: 3, bgcolor: '#FDFBFF', borderTop: '1px solid', borderColor: 'divider', gap: 2 }}>
                    <Button 
                        onClick={handleClose} 
                        variant="text" 
                        disabled={saving}
                        sx={{ color: 'text.secondary', fontWeight: 600 }}
                    >
                        Descartar
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSave}
                        disabled={!canSave}
                        startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <CheckCircleIcon />}
                        sx={{
                            px: 5,
                            height: 48,
                            borderRadius: 2,
                            bgcolor: '#D4AF37',
                            fontSize: '1rem',
                            fontWeight: 800,
                            boxShadow: '0 10px 20px rgba(212, 175, 55, 0.25)',
                            '&:hover': { bgcolor: '#B8860B', boxShadow: '0 12px 24px rgba(212, 175, 55, 0.35)' },
                            '&:disabled': { opacity: 0.5 }
                        }}
                    >
                        {saving ? 'Guardando...' : 'Guardar Orden'}
                    </Button>
                </DialogActions>
            </Dialog>

            <PatientPickerDialog
                open={patientPickerOpen}
                onClose={() => setPatientPickerOpen(false)}
                onSelect={handleSelectPatient}
            />
        </>
    );
};

export default LaboratoryModal;
