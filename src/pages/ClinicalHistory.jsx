import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { DataGrid } from '@mui/x-data-grid';
import { esES } from '@mui/x-data-grid/locales';
import { supabase } from '../supabaseClient';
import { Box, Typography, TextField, InputAdornment, Dialog, Snackbar, Alert } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useTheme, useMediaQuery, List, ListItem, ListItemButton, ListItemText, Divider, CircularProgress } from '@mui/material';
import HistoriaClinicaEditor from '../components/HistoriaClinicaEditor';

const capitalizeWords = (str) => {
    if (!str) return '';
    return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const formatDate = (dateString) => {
    if (!dateString) return 'Nunca editado';
    const date = new Date(dateString);
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strTime = hours.toString().padStart(2, '0') + ':' + minutes + ' ' + ampm;

    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    return `${strTime} - ${day}/${month}/${year}`;
};

const ClinicalHistory = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Editor Dialog State
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', type: 'info' });

    const showSnackbar = (msg, type) => {
        setSnackbar({ open: true, message: msg, type });
    };

    const location = useLocation();
    
    // Guardar el highlight ID si se pasó
    const [highlightEntryId, setHighlightEntryId] = useState(null);

    useEffect(() => {
        if (location.state?.openPatient) {
            setSelectedPatient(location.state.openPatient);
            if (location.state?.scrollToEntryId) {
                setHighlightEntryId(location.state.scrollToEntryId);
            }
            setIsDialogOpen(true);
            // Limpiar estado
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    useEffect(() => {
        const fetchPatients = async (isBackground = false) => {
            if (!isBackground) setLoading(true);
            try {
                // 1. Fetch Patients
                const { data: patientsData, error: patientsError } = await supabase
                    .from('pacientes')
                    .select('id, dni, nombre_completo, fecha_nacimiento, telefono_principal, email, descripcion, fecha_modificacion');

                if (patientsError) throw patientsError;

                // 2. Fetch latest history date for each patient. (Group by isn't standard in basic supabase-js, so we fetch all or just use a view. For small-medium sets, fetching all latest is ok, or we fetch the latest explicitly).
                // Actually, an easier way is to fetch the highest created_at per patient.
                // To keep it simple, we fetch all history dates and reduce them.
                const { data: historyData, error: historyError } = await supabase
                    .from('historial_clinico')
                    .select('dni_paciente, created_at');

                if (historyError) throw historyError;

                const latestHistoryMap = {};
                historyData.forEach(item => {
                    const currentLatest = latestHistoryMap[item.dni_paciente];
                    const itemDate = new Date(item.created_at).getTime();
                    if (!currentLatest || itemDate > currentLatest) {
                        latestHistoryMap[item.dni_paciente] = itemDate;
                    }
                });

                const processedData = patientsData.map(patient => {
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

                    const lastHistoryTime = latestHistoryMap[patient.dni];
                    const ultima_edicion_real = lastHistoryTime ? new Date(lastHistoryTime).toISOString() : null;

                    return {
                        id: patient.id,
                        dni: patient.dni || '-',
                        nombre_completo: patient.nombre_completo || 'Sin nombre',
                        edad: edadVal,
                        fecha_nacimiento: patient.fecha_nacimiento || '-',
                        telefono_principal: patient.telefono_principal || '-',
                        email: patient.email || '-',
                        descripcion: patient.descripcion || '',
                        fecha_modificacion: patient.fecha_modificacion,
                        ultima_historia: ultima_edicion_real
                    };
                });

                // Sort by last specific history edit date (most recent first)
                processedData.sort((a, b) => {
                    const dateA = a.ultima_historia ? new Date(a.ultima_historia).getTime() : 0;
                    const dateB = b.ultima_historia ? new Date(b.ultima_historia).getTime() : 0;
                    return dateB - dateA;
                });

                setPatients(processedData);
            } catch (error) {
                console.error('Error fetching patients for clinical history:', error);
            } finally {
                if (!isBackground) setLoading(false);
            }
        };

        fetchPatients(false);

        let debounceTimer;

        // Listen for changes in both tables
        const channel = supabase.channel('public:clinical_history_view')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pacientes' }, () => {
                if (debounceTimer) clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => fetchPatients(true), 500);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'historial_clinico' }, () => {
                if (debounceTimer) clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => fetchPatients(true), 500);
            })
            .subscribe();

        return () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            supabase.removeChannel(channel);
        };
    }, []);

    const handleRowClick = (params) => {
        setSelectedPatient(params.row);
        setIsDialogOpen(true);
    };

    // Saving is now handled internally by HistoriaClinicaEditor

    const columns = [
        {
            field: 'nombre_completo',
            headerName: 'Nombre del Paciente',
            minWidth: 250,
            flex: 1,
            align: 'center',
            headerAlign: 'center',
            valueGetter: (value) => capitalizeWords(value),
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {params.value}
                    </Typography>
                </Box>
            )
        },
        {
            field: 'edad',
            headerName: 'Edad',
            width: 120,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
                    <Typography variant="body2">
                        {params.value}
                    </Typography>
                </Box>
            )
        },
        {
            field: 'ultima_historia',
            headerName: 'Última Historia Clínica',
            width: 250,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>
                    <Typography variant="body2" sx={{ color: params.value ? 'text.primary' : 'text.disabled' }}>
                        {formatDate(params.value)}
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
                    Historial Clínico
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
                        placeholder="Buscar paciente..."
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
                                                            <strong>Última editada:</strong> {formatDate(patient.ultima_historia)}
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
                                <Typography color="text.secondary">No se encontraron historiales</Typography>
                            </Box>
                        )}
                        {loading && (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                                <CircularProgress />
                            </Box>
                        )}
                    </Box>
                ) : (
                    <DataGrid
                        rows={filteredPatients}
                        columns={columns}
                        loading={loading}
                        initialState={{
                            pagination: { paginationModel: { pageSize: 15 } },
                        }}
                        pageSizeOptions={[15, 30, 50]}
                        disableSelectionOnClick
                        onRowClick={handleRowClick}
                        localeText={esES.components.MuiDataGrid.defaultProps.localeText}
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

            {/* Historia Clínica Editor Dialog */}
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
                    <HistoriaClinicaEditor
                        dniPaciente={selectedPatient.dni}
                        nombreCompleto={selectedPatient.nombre_completo}
                        fechaNacimiento={selectedPatient.fecha_nacimiento}
                        onClose={() => setIsDialogOpen(false)}
                        highlightEntryId={highlightEntryId}
                    />
                )}
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

export default ClinicalHistory;
