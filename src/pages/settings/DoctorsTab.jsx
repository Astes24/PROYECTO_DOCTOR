import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Box, Button, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Chip, CircularProgress, Snackbar, Alert } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DoctorModal from './DoctorModal';

const DoctorsTab = () => {
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    const fetchDoctors = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('doctores')
            .select('*')
            .order('es_principal', { ascending: false })
            .order('nombre_completo', { ascending: true });

        if (error) {
            console.error('Error fetching doctors:', error);
            showSnackbar('Error al cargar doctores', 'error');
        } else {
            setDoctors(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchDoctors();

        // Optional realtime subscription
        const subscription = supabase
            .channel('doctores_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'doctores' }, (payload) => {
                fetchDoctors();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    const showSnackbar = (message, severity = 'success') => {
        setSnackbar({ open: true, message, severity });
    };

    const handleCloseSnackbar = () => {
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    const handleOpenModal = (doctor = null) => {
        setSelectedDoctor(doctor);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setSelectedDoctor(null);
    };

    const handleSaveSuccess = (message) => {
        handleCloseModal();
        showSnackbar(message, 'success');
        fetchDoctors();
    };

    const toggleDoctorStatus = async (doctor) => {
        const { error } = await supabase
            .from('doctores')
            .update({ activo: !doctor.activo })
            .eq('id', doctor.id);

        if (error) {
            console.error('Error updating status:', error);
            showSnackbar('Error al actualizar estado', 'error');
        } else {
            showSnackbar(`Dr.(a) Dra. ${doctor.nombre_completo} ${!doctor.activo ? 'activado' : 'desactivado'}`);
            fetchDoctors();
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', py: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" fontWeight="900" sx={{ color: 'text.primary', textTransform: 'uppercase' }}>Listado de Doctores</Typography>
                <Button 
                    variant="contained" 
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenModal()}
                    sx={{ 
                        bgcolor: '#db2777', 
                        color: 'white',
                        '&:hover': { bgcolor: '#be185d' },
                        borderRadius: 2,
                        textTransform: 'none',
                        px: 3,
                        fontWeight: 700,
                        boxShadow: '0 4px 12px rgba(219, 39, 119, 0.3)'
                    }}
                >
                    Agregar Dr.(a)
                </Button>
            </Box>

            <TableContainer sx={{ flex: 1, overflowY: 'auto', borderRadius: 4, border: '1px solid', borderColor: '#fbcfe8', bgcolor: 'white' }}>
                <Table stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell align="center" sx={{ fontWeight: 800, bgcolor: '#fdf2f8', color: '#db2777', borderBottom: '2px solid', borderColor: '#fbcfe8', textTransform: 'uppercase', fontSize: '0.75rem' }}>Nombre</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 800, bgcolor: '#fdf2f8', color: '#db2777', borderBottom: '2px solid', borderColor: '#fbcfe8', textTransform: 'uppercase', fontSize: '0.75rem' }}>Especialidad</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 800, bgcolor: '#fdf2f8', color: '#db2777', borderBottom: '2px solid', borderColor: '#fbcfe8', textTransform: 'uppercase', fontSize: '0.75rem' }}>CMP / RNE</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 800, bgcolor: '#fdf2f8', color: '#db2777', borderBottom: '2px solid', borderColor: '#fbcfe8', textTransform: 'uppercase', fontSize: '0.75rem' }}>Tipo</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 800, bgcolor: '#fdf2f8', color: '#db2777', borderBottom: '2px solid', borderColor: '#fbcfe8', textTransform: 'uppercase', fontSize: '0.75rem' }}>Estado</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 800, bgcolor: '#fdf2f8', color: '#db2777', borderBottom: '2px solid', borderColor: '#fbcfe8', textTransform: 'uppercase', fontSize: '0.75rem' }}>Acciones</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading && doctors.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                    <CircularProgress size={30} sx={{ color: '#db2777' }} />
                                </TableCell>
                            </TableRow>
                        ) : doctors.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                    No hay doctores registrados.
                                </TableCell>
                            </TableRow>
                        ) : (
                            doctors.map((doctor) => (
                                <TableRow key={doctor.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 }, transition: 'background-color 0.2s' }}>
                                    <TableCell align="center" sx={{ fontWeight: 700, color: 'text.primary' }}>Dra. {doctor.nombre_completo}</TableCell>
                                    <TableCell align="center" sx={{ color: 'text.secondary' }}>{doctor.especialidad || '—'}</TableCell>
                                    <TableCell align="center">
                                        {doctor.cmp ? (
                                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.3 }}>
                                                <Chip label={`CMP ${doctor.cmp}`} size="small" sx={{ bgcolor: '#fce7f3', color: '#9d174d', fontWeight: 700, fontSize: '0.7rem', height: 20 }} />
                                                {doctor.rne && (
                                                    <Chip label={`RNE ${doctor.rne}`} size="small" variant="outlined" sx={{ color: '#db2777', borderColor: '#fbcfe8', fontSize: '0.65rem', height: 18 }} />
                                                )}
                                            </Box>
                                        ) : (
                                            <Typography variant="caption" color="text.disabled">Sin registro</Typography>
                                        )}
                                    </TableCell>
                                    <TableCell align="center">
                                        {doctor.es_principal && (
                                            <Chip label="Principal" size="small" variant="outlined" sx={{ color: '#db2777', borderColor: '#db2777', fontWeight: 'bold', borderWidth: 1.5 }} />
                                        )}
                                    </TableCell>
                                    <TableCell align="center">
                                        <Chip
                                            label={doctor.activo ? 'Activo' : 'Inactivo'}
                                            size="small"
                                            onClick={() => toggleDoctorStatus(doctor)}
                                            sx={{
                                                bgcolor: doctor.activo ? 'success.light' : 'error.light',
                                                color: doctor.activo ? 'success.dark' : 'error.dark',
                                                fontWeight: 'bold',
                                                mr: 1,
                                                cursor: 'pointer',
                                                '&:hover': { opacity: 0.8 },
                                                transition: 'all 0.2s'
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        <IconButton size="small" onClick={() => handleOpenModal(doctor)} sx={{ color: '#0284c7', '&:hover': { bgcolor: 'rgba(2, 132, 199, 0.1)' } }}>
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {modalOpen && (
                <DoctorModal 
                    open={modalOpen} 
                    onClose={handleCloseModal} 
                    doctor={selectedDoctor} 
                    onSuccess={handleSaveSuccess} 
                />
            )}

            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%', boxShadow: 4, borderRadius: 2 }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default DoctorsTab;
