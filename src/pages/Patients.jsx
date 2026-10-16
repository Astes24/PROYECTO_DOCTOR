import React, { useState, useEffect } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { supabase } from '../supabaseClient';
import { Dialog, Box, Typography, TextField, InputAdornment, Button, DialogTitle, DialogContent, DialogActions, IconButton, Snackbar, Alert, CircularProgress } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { useTheme, useMediaQuery, List, ListItem, ListItemButton, ListItemText, Divider, Paper } from '@mui/material';
import PatientDetailsPanel from '../components/PatientDetailsPanel';

import { gridLocaleText, gridSlotProps } from '../components/dataGridDefaults';
import ListSkeleton from '../components/ListSkeleton';
const capitalizeWords = (str) => {
    if (!str) return '';
    return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const formatDateDayMonthYear = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

// Status badge helper for appointments
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

const Patients = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    // En laptops (< 1536px) se oculta "Fecha Creación" para que la tabla entre sin scroll horizontal;
    // el usuario puede volver a mostrarla desde el menú de columnas
    const isCompactTable = useMediaQuery(theme.breakpoints.down('xl'));
    const [userColumnVisibility, setUserColumnVisibility] = useState({});
    const columnVisibilityModel = { created_at: !isCompactTable, ...userColumnVisibility };

    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // New Patient Modal State
    const [isNewPatientDialogOpen, setIsNewPatientDialogOpen] = useState(false);
    const [newPatientData, setNewPatientData] = useState({
        dni: '',
        nombre: '',
        fecha_nacimiento: '',
        telefono: '',
        email: ''
    });
    const [savingPatient, setSavingPatient] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', type: 'info' });

    const showSnackbar = (msg, type) => {
        setSnackbar({ open: true, message: msg, type });
        setTimeout(() => setSnackbar({ ...snackbar, open: false }), 4000);
    };

    const handleRegisterPatient = async (e) => {
        e.preventDefault();
        setSavingPatient(true);
        try {
            const { error: patientError } = await supabase
                .from('pacientes')
                .upsert({
                    dni: newPatientData.dni,
                    nombre_completo: newPatientData.nombre,
                    fecha_nacimiento: newPatientData.fecha_nacimiento || null,
                    telefono_principal: newPatientData.telefono,
                    email: newPatientData.email || null
                }, { onConflict: 'dni' })
                .select()
                .single();

            if (patientError) throw patientError;

            showSnackbar('Paciente registrado correctamente', 'success');
            setIsNewPatientDialogOpen(false);
            setNewPatientData({ dni: '', nombre: '', fecha_nacimiento: '', telefono: '', email: '' });
        } catch (err) {
            console.error(err);
            showSnackbar('Error al registrar paciente: ' + err.message, 'error');
        } finally {
            setSavingPatient(false);
        }
    };

    useEffect(() => {
        const fetchPatients = async (isBackground = false) => {
            if (!isBackground) setLoading(true);
            try {
                // Fetch patients along with their appointments to calculate statistics
                const [patientsRs, notifsRs] = await Promise.all([
                    supabase.from('pacientes').select(`
                        id,
                        dni,
                        nombre_completo,
                        fecha_nacimiento,
                        telefono_principal,
                        email,
                        created_at,
                        citas ( estado )
                    `),
                    supabase.from('notificaciones')
                        .select('telefono_paciente, tipo, leido, completado')
                        .or('leido.eq.false,completado.eq.false')
                ]);

                if (patientsRs.error) throw patientsRs.error;

                const notifsMap = {};
                if (notifsRs.data) {
                    notifsRs.data.forEach(n => {
                        if (!n.telefono_paciente) return;
                        const phone = n.telefono_paciente.replace(/\D/g, '').slice(-9);
                        if (!notifsMap[phone]) notifsMap[phone] = { porVer: 0, urgencias: 0 };

                        if (!n.leido) notifsMap[phone].porVer++;
                        if (n.tipo === 'URGENCIA' && !n.completado) notifsMap[phone].urgencias++;
                    });
                }

                // Process data to count appointments and calculate age
                const processedData = patientsRs.data.map(patient => {
                    let confirmadas = 0;
                    let canceladas = 0;
                    let pospuestas = 0;
                    let pendientes = 0;

                    if (patient.citas) {
                        patient.citas.forEach(cita => {
                            if (cita.estado === 'CONFIRMADA' || cita.estado === 'REALIZADA') {
                                confirmadas++;
                            } else if (cita.estado === 'CANCELADA') {
                                canceladas++;
                            } else if (cita.estado === 'POSPUESTA') {
                                pospuestas++;
                            } else if (cita.estado === 'PENDIENTE') {
                                pendientes++;
                            }
                        });
                    }

                    const phone = patient.telefono_principal ? patient.telefono_principal.replace(/\D/g, '').slice(-9) : null;
                    const stats = (phone && notifsMap[phone]) || { porVer: 0, urgencias: 0 };

                    let edadVal = '-';
                    if (patient.fecha_nacimiento && patient.fecha_nacimiento !== '-') {
                        try {
                            const birthDate = new Date(patient.fecha_nacimiento);
                            const today = new Date();
                            if (!isNaN(birthDate.getTime())) {
                                let age = today.getFullYear() - birthDate.getFullYear();
                                const m = today.getMonth() - birthDate.getMonth();
                                if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                                    age--;
                                }
                                edadVal = age.toString();
                            }
                        } catch (e) { }
                    }

                    return {
                        id: patient.id,
                        dni: patient.dni || '-',
                        nombre_completo: patient.nombre_completo || 'Sin nombre',
                        edad: edadVal,
                        fecha_nacimiento: patient.fecha_nacimiento || '-', // keep for the modal
                        telefono_principal: patient.telefono_principal || '-',
                        email: patient.email || '-', // keep for the modal
                        confirmadas,
                        pendientes,
                        canceladas,
                        pospuestas,
                        notifs_por_ver: stats.porVer,
                        created_at: patient.created_at
                    };
                });

                setPatients(processedData);
            } catch (error) {
                console.error('Error fetching patients:', error);
            } finally {
                if (!isBackground) setLoading(false);
            }
        };

        fetchPatients(false);

        let debounceTimer;

        const pacientesSubscription = supabase
            .channel('public:pacientes_page')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pacientes' }, () => {
                if (debounceTimer) clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => fetchPatients(true), 500);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'citas' }, () => {
                if (debounceTimer) clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => fetchPatients(true), 500);
            })
            .subscribe();

        return () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            supabase.removeChannel(pacientesSubscription);
        };
    }, []);

    const handleRowClick = (params) => {
        setSelectedPatient(params.row);
        setIsDialogOpen(true);
    };

    const columns = [
        { field: 'dni', headerName: 'DNI/CE', width: 110, align: 'center', headerAlign: 'center' },
        {
            field: 'nombre_completo',
            headerName: 'Nombre Completo',
            minWidth: 200,
            flex: 1,
            align: 'center',
            headerAlign: 'center',
            valueGetter: (value) => capitalizeWords(value)
        },
        { field: 'edad', headerName: 'Edad', width: 70, align: 'center', headerAlign: 'center' },
        { field: 'telefono_principal', headerName: 'Teléfono', width: 120, align: 'center', headerAlign: 'center' },
        {
            field: 'created_at',
            headerName: 'Fecha Creación',
            width: 135,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>
                    <Typography variant="body2">
                        {formatDateDayMonthYear(params.value)}
                    </Typography>
                </Box>
            )
        },
        {
            field: 'confirmadas',
            headerName: 'Confirmadas',
            width: 110,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#0D9488' }}>
                        {params.value}
                    </Typography>
                </Box>
            )
        },
        {
            field: 'pendientes',
            headerName: 'Pendientes',
            width: 105,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#D97706' }}>
                        {params.value}
                    </Typography>
                </Box>
            )
        },
        {
            field: 'notifs_por_ver',
            headerName: 'Notifs. por ver',
            width: 125,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: params.value > 0 ? '#2563EB' : 'text.disabled' }}>
                        {params.value}
                    </Typography>
                </Box>
            )
        }
    ];
    const filteredPatients = patients.filter(p =>
        p.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Box sx={{ width: isMobile ? '100%' : '95%', mx: 'auto', height: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column', p: isMobile ? 1 : 3, gap: 3, bgcolor: 'transparent' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'center', md: 'center' }, gap: 2, mb: 1 }}>
                <Typography variant={isMobile ? "h5" : "h3"} sx={{ fontWeight: 800, color: 'text.primary', textAlign: isMobile ? 'center' : 'left' }}>
                    Pacientes
                </Typography>

                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    width: { xs: '100%', md: 'auto' },
                    px: isMobile ? 1 : 0
                }}>
                    <TextField
                        variant="outlined"
                        placeholder="Buscar por nombre..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        sx={{
                            flex: { xs: 1, md: 'none' },
                            width: { md: 320 },
                            bgcolor: 'background.paper',
                            borderRadius: 1,
                            '& .MuiOutlinedInput-root': {
                                borderRadius: isMobile ? 3 : 1
                            }
                        }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon color="action" fontSize="small" />
                                </InputAdornment>
                            ),
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.target.blur();
                            }
                        }}
                    />
                    {isMobile ? (
                        <IconButton
                            color="primary"
                            onClick={() => {
                                setNewPatientData({ dni: '', nombre: '', fecha_nacimiento: '', telefono: '', email: '' });
                                setIsNewPatientDialogOpen(true);
                            }}
                            sx={{
                                bgcolor: 'primary.main',
                                color: 'var(--c-on-primary)',
                                width: 56,
                                height: 56,
                                borderRadius: 3,
                                boxShadow: '0px 8px 16px rgba(var(--c-primary-rgb), 0.4)',
                                '&:hover': { bgcolor: 'primary.dark' }
                            }}
                        >
                            <AddIcon />
                        </IconButton>
                    ) : (
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={() => {
                                setNewPatientData({ dni: '', nombre: '', fecha_nacimiento: '', telefono: '', email: '' });
                                setIsNewPatientDialogOpen(true);
                            }}
                            startIcon={<AddIcon />}
                            sx={{ boxShadow: '0px 8px 16px rgba(var(--c-primary-rgb), 0.25)', whiteSpace: 'nowrap', height: '56px' }}
                        >
                            Registrar paciente
                        </Button>
                    )}
                </Box>
            </Box>

            {/* Content Area */}
            <Box sx={{ flex: 1, width: '100%', bgcolor: 'background.paper', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                {isMobile ? (
                    <Box sx={{ height: '100%', overflow: 'auto' }}>
                        <List sx={{ p: 0 }}>
                            {filteredPatients.map((patient, index) => (
                                <React.Fragment key={patient.id}>
                                    <ListItem disablePadding>
                                        <ListItemButton
                                            onClick={() => handleRowClick({ row: patient })}
                                            sx={{
                                                py: 2,
                                                '&:hover': { bgcolor: 'action.hover' }
                                            }}
                                        >
                                            <ListItemText
                                                sx={{ textAlign: 'center' }}
                                                primary={
                                                    <Typography variant="subtitle1" fontWeight="800" color="text.primary">
                                                        {capitalizeWords(patient.nombre_completo)}
                                                    </Typography>
                                                }
                                                secondaryTypographyProps={{ component: 'div' }}
                                                secondary={
                                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.2, alignItems: 'center' }}>
                                                        <Typography variant="body2" color="text.secondary">
                                                            <strong>DNI:</strong> {patient.dni}
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary">
                                                            <strong>Edad:</strong> {patient.edad} años
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary">
                                                            <strong>Tel:</strong> {patient.telefono_principal}
                                                        </Typography>
                                                    </Box>
                                                }
                                            />
                                        </ListItemButton>
                                    </ListItem>
                                    {index < filteredPatients.length - 1 && <Divider />}
                                </React.Fragment>
                            ))}
                        </List>
                        {filteredPatients.length === 0 && !loading && (
                            <Box sx={{ p: 4, textAlign: 'center' }}>
                                <Typography color="text.secondary">No se encontraron pacientes</Typography>
                            </Box>
                        )}
                        {loading && <ListSkeleton />}
                    </Box>
                ) : (
                    <DataGrid
                        rows={filteredPatients}
                        columns={columns}
                        loading={loading}
                        columnVisibilityModel={columnVisibilityModel}
                        onColumnVisibilityModelChange={setUserColumnVisibility}
                        initialState={{
                            pagination: { paginationModel: { pageSize: 15 } },
                        }}
                        pageSizeOptions={[15, 30, 50]}
                        disableSelectionOnClick
                        onRowClick={handleRowClick}
                        localeText={gridLocaleText}
                        slotProps={gridSlotProps}
                        sx={{
                            border: 'none',
                            '& .MuiDataGrid-cell': {
                                color: (theme) => theme.palette.mode === 'dark' ? '#cbd5e1' : undefined
                            },
                            '& .MuiDataGrid-columnHeaders': {
                                backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#1e293b' : undefined,
                                color: (theme) => theme.palette.mode === 'dark' ? '#cbd5e1' : undefined,
                                fontWeight: 'bold'
                            }
                        }}
                    />
                )}
            </Box>

            {/* Modal Detalles del Paciente */}
            <Dialog
                open={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                maxWidth={false}
                fullWidth={false}
                PaperProps={{
                    sx: { width: isMobile ? '95%' : '80%', maxWidth: 'none', borderRadius: 3, overflow: 'hidden', height: '95vh', maxHeight: '95vh' }
                }}
            >
                {selectedPatient && (
                    <PatientDetailsPanel
                        patientId={selectedPatient.id}
                        baseInfo={selectedPatient}
                        onClose={() => setIsDialogOpen(false)}
                    />
                )}
            </Dialog>

            {/* Modal Nuevo Paciente */}
            <Dialog
                open={isNewPatientDialogOpen}
                onClose={() => setIsNewPatientDialogOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3 } }}
            >
                <DialogTitle sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
                    <Typography variant="h6" fontWeight="bold">Nuevo Paciente</Typography>
                    <IconButton onClick={() => setIsNewPatientDialogOpen(false)} sx={{ color: 'inherit' }}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>

                <form onSubmit={handleRegisterPatient}>
                    <DialogContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <TextField
                            label="DNI/CE"
                            required
                            fullWidth
                            placeholder="Ingrese DNI/CE"
                            value={newPatientData.dni}
                            onChange={e => {
                                const val = e.target.value.replace(/\D/g, '').slice(0, 15);
                                setNewPatientData({ ...newPatientData, dni: val });
                            }}
                            autoFocus
                        />

                        <TextField
                            label="Nombre Completo"
                            required
                            fullWidth
                            value={newPatientData.nombre}
                            onChange={e => setNewPatientData({ ...newPatientData, nombre: e.target.value.toUpperCase() })}
                        />

                        <TextField
                            label="Fecha de Nacimiento"
                            type="date"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={newPatientData.fecha_nacimiento}
                            onChange={e => setNewPatientData({ ...newPatientData, fecha_nacimiento: e.target.value })}
                        />

                        <TextField
                            label="Teléfono Principal"
                            type="tel"
                            required
                            fullWidth
                            value={newPatientData.telefono}
                            onChange={e => setNewPatientData({ ...newPatientData, telefono: e.target.value })}
                        />

                        <TextField
                            label="Correo Electrónico (Opcional)"
                            type="email"
                            fullWidth
                            value={newPatientData.email}
                            onChange={e => setNewPatientData({ ...newPatientData, email: e.target.value })}
                        />
                    </DialogContent>

                    <DialogActions sx={{ p: 3, pt: 0 }}>
                        <Button
                            onClick={() => setIsNewPatientDialogOpen(false)}
                            color="inherit"
                            sx={{ color: 'text.secondary' }}
                            disabled={savingPatient}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            sx={{ boxShadow: 2 }}
                            disabled={savingPatient}
                            startIcon={savingPatient && <CircularProgress size={20} color="inherit" />}
                        >
                            Registrar paciente
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

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
        </Box>
    );
};

export default Patients;
