import React, { useState, useEffect } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { supabase } from '../supabaseClient';
import { Box, Typography, TextField, InputAdornment, useTheme, useMediaQuery, List, ListItem, ListItemButton, ListItemText, Divider, Dialog, CircularProgress } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PatientDocumentsPanel from '../components/PatientDocumentsPanel';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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

const Documents = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    useEffect(() => {
        const fetchPatientsAndDocuments = async () => {
            setLoading(true);
            try {
                // 1. Fetch patients
                const { data: patientsData, error: patientsError } = await supabase
                    .from('pacientes')
                    .select('id, dni, nombre_completo, fecha_nacimiento, telefono_principal');

                if (patientsError) throw patientsError;

                // 2. Fetch historial_clinico elements tracking their files
                // Fetching only entries that might have files
                const { data: historialData } = await supabase
                    .from('historial_clinico')
                    .select('dni_paciente, archivos, created_at');

                // 3. Fetch from new table documentos_pacientes
                const { data: documentosData, error: docsError } = await supabase
                    .from('documentos_pacientes')
                    .select('dni_paciente, created_at');
                
                if (docsError && docsError.code !== '42P01') {
                    console.error("Error al consultar documentos_pacientes:", docsError);
                }

                // Map results to patient by DNI
                const statsMap = {}; // { [dni]: { total: 0, latest: null } }
                patientsData.forEach(p => {
                    if (p.dni) {
                        statsMap[p.dni] = { total: 0, latest: null };
                    }
                });

                // Process historial
                if (historialData) {
                    historialData.forEach(entry => {
                        if (entry.dni_paciente && entry.archivos && Array.isArray(entry.archivos) && entry.archivos.length > 0) {
                            if (!statsMap[entry.dni_paciente]) {
                                statsMap[entry.dni_paciente] = { total: 0, latest: null };
                            }
                            
                            statsMap[entry.dni_paciente].total += entry.archivos.length;
                            
                            const entryDate = new Date(entry.created_at);
                            if (!statsMap[entry.dni_paciente].latest || entryDate > statsMap[entry.dni_paciente].latest) {
                                statsMap[entry.dni_paciente].latest = entryDate;
                            }
                        }
                    });
                }

                // Process documentos_pacientes
                if (documentosData) {
                    documentosData.forEach(doc => {
                        if (doc.dni_paciente) {
                            if (!statsMap[doc.dni_paciente]) {
                                statsMap[doc.dni_paciente] = { total: 0, latest: null };
                            }
                            
                            statsMap[doc.dni_paciente].total += 1;
                            
                            const docDate = new Date(doc.created_at);
                            if (!statsMap[doc.dni_paciente].latest || docDate > statsMap[doc.dni_paciente].latest) {
                                statsMap[doc.dni_paciente].latest = docDate;
                            }
                        }
                    });
                }

                // Transform the final list for the data grid
                const processedData = patientsData.map(patient => {
                    const stats = statsMap[patient.dni] || { total: 0, latest: null };
                    return {
                        ...patient,
                        total_archivos: stats.total,
                        ultimo_archivo: stats.latest ? stats.latest.toISOString() : null
                    };
                });

                setPatients(processedData);
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPatientsAndDocuments();

        // Optional realtime to reload upon new file inserted in documentos_pacientes
        let debounceTimer;
        const reloadData = () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => fetchPatientsAndDocuments(), 500);
        };

        const channel = supabase.channel('documentos_view')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'documentos_pacientes' }, reloadData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'historial_clinico' }, reloadData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pacientes' }, reloadData)
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

    const columns = [
        { field: 'dni', headerName: 'DNI/CE', width: 130, align: 'center', headerAlign: 'center' },
        {
            field: 'nombre_completo',
            headerName: 'Nombre Completo',
            minWidth: 250,
            flex: 1,
            align: 'center',
            headerAlign: 'center',
            valueGetter: (value) => capitalizeWords(value)
        },
        { field: 'telefono_principal', headerName: 'Teléfono', width: 130, align: 'center', headerAlign: 'center' },
        {
            field: 'total_archivos',
            headerName: 'Archivos Subidos',
            width: 150,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: params.value > 0 ? '#0D9488' : 'text.disabled' }}>
                        {params.value > 0 ? params.value : 'Ninguno'}
                    </Typography>
                </Box>
            )
        },
        {
            field: 'ultimo_archivo',
            headerName: 'Último Archivo',
            width: 180,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>
                    <Typography variant="body2" sx={{ color: params.value ? 'text.primary' : 'text.disabled' }}>
                        {formatDateDayMonthYear(params.value)}
                    </Typography>
                </Box>
            )
        }
    ];

    const filteredPatients = patients.filter(p =>
        p.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.dni && p.dni.includes(searchTerm))
    );

    return (
        <Box sx={{ width: isMobile ? '100%' : '95%', mx: 'auto', height: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column', p: isMobile ? 1 : 3, gap: 3, bgcolor: 'transparent' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'center', md: 'center' }, gap: 2, mb: 1 }}>
                <Typography variant={isMobile ? "h5" : "h3"} sx={{ fontWeight: 800, color: 'text.primary', textAlign: isMobile ? 'center' : 'left' }}>
                    Documentos
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: { xs: '100%', md: 'auto' }, px: isMobile ? 1 : 0 }}>
                    <TextField
                        variant="outlined"
                        placeholder="Buscar paciente (Nombre o DNI)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        sx={{
                            flex: 1,
                            width: { md: 320 },
                            bgcolor: 'background.paper',
                            borderRadius: 1,
                            '& .MuiOutlinedInput-root': { borderRadius: isMobile ? 3 : 1 }
                        }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon color="action" fontSize="small" />
                                </InputAdornment>
                            ),
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
                                            sx={{ py: 2, '&:hover': { bgcolor: 'action.hover' } }}
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
                                                            <strong>Total Archivos:</strong> {patient.total_archivos}
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary">
                                                            <strong>Última Subida:</strong> {formatDateDayMonthYear(patient.ultimo_archivo)}
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
                                <Typography color="text.secondary">No se encontraron pacientes.</Typography>
                            </Box>
                        )}
                        {loading && <ListSkeleton />}
                    </Box>
                ) : (
                    <DataGrid
                        rows={filteredPatients}
                        columns={columns}
                        loading={loading}
                        initialState={{ pagination: { paginationModel: { pageSize: 15 } } }}
                        pageSizeOptions={[15, 30, 50]}
                        disableSelectionOnClick
                        onRowClick={handleRowClick}
                        localeText={gridLocaleText}
                        slotProps={gridSlotProps}
                        sx={{
                            border: 'none',
                            '& .MuiDataGrid-cell': { color: (theme) => theme.palette.mode === 'dark' ? '#cbd5e1' : undefined },
                            '& .MuiDataGrid-columnHeaders': {
                                backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#1e293b' : undefined,
                                color: (theme) => theme.palette.mode === 'dark' ? '#cbd5e1' : undefined,
                                fontWeight: 'bold'
                            }
                        }}
                    />
                )}
            </Box>

            {/* Modal Pop-up de Documentos */}
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
                    <PatientDocumentsPanel
                        patient={selectedPatient}
                        onClose={() => setIsDialogOpen(false)}
                    />
                )}
            </Dialog>
        </Box>
    );
};

export default Documents;
