import React, { useState, useEffect, useCallback } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import {
    Box, Typography, TextField, InputAdornment, Button,
    IconButton, Snackbar, Alert, CircularProgress, Tooltip,
    useTheme, useMediaQuery, Chip, List, ListItem, ListItemButton,
    ListItemText, Divider
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import VisibilityIcon from '@mui/icons-material/Visibility';
import BlockIcon from '@mui/icons-material/Block';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';

import { supabase } from '../supabaseClient';
import {
    fetchPrescriptions,
    fetchPrescriptionById,
    voidPrescription,
    deletePrescription
} from '../services/prescriptionService';
import PrescriptionModal from '../components/prescriptions/PrescriptionModal';
import PrescriptionViewModal from '../components/prescriptions/PrescriptionViewModal';
import ConfirmDialog from '../components/ConfirmDialog';

import { gridLocaleText, gridSlotProps } from '../components/dataGridDefaults';
import ListSkeleton from '../components/ListSkeleton';
// ---- Estado Badge ----
const EstadoBadge = ({ estado }) => {
    const isAnulada = estado === 'ANULADA';
    return (
        <Chip
            label={estado}
            size="small"
            sx={{
                bgcolor: isAnulada ? 'error.main' : 'var(--c-primary-border)',
                color: isAnulada ? 'white' : 'var(--c-primary-text)',
                fontWeight: 800,
                fontSize: '0.65rem',
                height: 22,
                px: 0.5,
                textTransform: 'uppercase'
            }}
        />
    );
};

// ---- Formato de fecha ----
const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr + (dateStr.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('es-PE', {
        day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Lima'
    });
};

const MedicalPrescriptions = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [prescriptions, setPrescriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedPrescription, setSelectedPrescription] = useState(null);
    const [loadingPrescription, setLoadingPrescription] = useState(false);

    // Confirm delete dialog
    const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null, numero: '' });

    // Snackbar
    const [snackbar, setSnackbar] = useState({ open: false, message: '', type: 'info' });

    const showSnackbar = (message, type = 'info') => {
        setSnackbar({ open: true, message, type });
        setTimeout(() => setSnackbar(s => ({ ...s, open: false })), 4000);
    };

    const loadPrescriptions = useCallback(async (isBackground = false) => {
        if (!isBackground) setLoading(true);
        const { data, error } = await fetchPrescriptions();
        if (data) {
            const normalized = data.map(r => ({
                ...r,
                _paciente_nombre: r.pacientes?.nombre_completo || r.paciente_nombre || '-',
            }));
            setPrescriptions(normalized);
        } else if (error) {
            console.error(error);
            showSnackbar('Error al cargar recetas', 'error');
        }
        if (!isBackground) setLoading(false);
    }, []);

    useEffect(() => {
        loadPrescriptions();
    }, [loadPrescriptions]);

    const handleViewPrescription = async (row) => {
        setLoadingPrescription(true);
        setIsViewModalOpen(true);
        const { data, error } = await fetchPrescriptionById(row.id);
        if (data) {
            setSelectedPrescription(data);
        } else {
            console.error(error);
            showSnackbar('Error al cargar el detalle de la receta', 'error');
            setIsViewModalOpen(false);
        }
        setLoadingPrescription(false);
    };

    const handleVoidPrescription = async (id) => {
        const { data: session } = await supabase.auth.getSession();
        const userId = session?.session?.user?.id || null;
        const { success, error } = await voidPrescription(id, userId);
        if (success) {
            showSnackbar('Receta anulada correctamente', 'success');
            setIsViewModalOpen(false);
            setSelectedPrescription(null);
            loadPrescriptions(true);
        } else {
            console.error(error);
            showSnackbar(error?.message || 'Error al anular la receta', 'error');
        }
    };

    const requestDeletePrescription = (id, numero) => {
        setConfirmDelete({ open: true, id, numero });
    };

    const handleDeletePrescription = async () => {
        const { id } = confirmDelete;
        setConfirmDelete({ open: false, id: null, numero: '' });
        const { success, numeroReceta, error } = await deletePrescription(id);
        if (success) {
            showSnackbar(`Receta ${numeroReceta} eliminada permanentemente`, 'success');
            setIsViewModalOpen(false);
            setSelectedPrescription(null);
            loadPrescriptions(true);
        } else {
            console.error(error);
            showSnackbar(error?.message || 'Error al eliminar la receta', 'error');
        }
    };

    const filteredPrescriptions = prescriptions.filter(r =>
        (r.numero_receta?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (r._paciente_nombre?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (r.paciente_dni || '').includes(searchTerm) ||
        (r.diagnostico?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (r.medico_nombre?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    const columns = [
        {
            field: 'numero_receta',
            headerName: 'N° Receta',
            width: 110,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, height: '100%' }}>
                    <Typography variant="body2" fontWeight={700} color="text.primary">
                        {params.value}
                    </Typography>
                </Box>
            )
        },
        {
            field: 'fecha',
            headerName: 'Fecha',
            width: 100,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <Typography variant="body2">{formatDate(params.value)}</Typography>
                </Box>
            )
        },
        {
            field: '_paciente_nombre',
            headerName: 'Paciente',
            flex: 1,
            minWidth: 140,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => (
                <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <Typography variant="body2" fontWeight={500}>{params.value}</Typography>
                    {params.row.paciente_dni && (
                        <Typography variant="caption" color="text.secondary">
                            DNI: {params.row.paciente_dni}
                        </Typography>
                    )}
                </Box>
            )
        },
        {
            field: 'diagnostico',
            headerName: 'Diagnóstico',
            flex: 1.5,
            minWidth: 150,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '100%'
                        }}
                    >
                        {params.value || '—'}
                    </Typography>
                </Box>
            )
        },
        {
            field: 'medico_nombre',
            headerName: 'Médico',
            flex: 1,
            minWidth: 130,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => (
                <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <Typography variant="body2" fontWeight={500}>{params.value || '-'}</Typography>
                    {params.row.medico_especialidad && (
                        <Typography variant="caption" color="text.secondary">
                            {params.row.medico_especialidad}
                        </Typography>
                    )}
                </Box>
            )
        },
        {
            field: 'estado',
            headerName: 'Estado',
            width: 110,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <EstadoBadge estado={params.value} />
                </Box>
            )
        },
        {
            field: 'actions',
            headerName: 'Acciones',
            width: 100,
            align: 'center',
            headerAlign: 'center',
            sortable: false,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0.5, height: '100%' }}>
                    <Tooltip title="Ver / Imprimir">
                        <IconButton
                            size="small"
                            color="primary"
                            onClick={(e) => { e.stopPropagation(); handleViewPrescription(params.row); }}
                        >
                            <VisibilityIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    {params.row.estado !== 'ANULADA' && (
                        <Tooltip title="Anular receta">
                            <IconButton
                                size="small"
                                color="error"
                                onClick={(e) => { e.stopPropagation(); handleVoidPrescription(params.row.id); }}
                            >
                                <BlockIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                    {params.row.estado === 'ANULADA' && (
                        <Tooltip title="Eliminar permanentemente">
                            <IconButton
                                size="small"
                                onClick={(e) => { e.stopPropagation(); requestDeletePrescription(params.row.id, params.row.numero_receta); }}
                                sx={{
                                    color: 'error.main',
                                    bgcolor: 'error.main',
                                    opacity: 0.12,
                                    '&:hover': { opacity: 1, color: 'white', bgcolor: 'error.main' },
                                    transition: 'all 0.2s',
                                }}
                            >
                                <DeleteForeverIcon fontSize="small" sx={{ color: 'error.main', '.MuiIconButton-root:hover &': { color: 'white' } }} />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>
            )
        }
    ];

    const handleRowClick = (params) => {
        handleViewPrescription(params.row);
    };

    return (
        <Box sx={{
            width: isMobile ? '100%' : '95%',
            mx: 'auto',
            height: 'calc(100vh - 48px)',
            display: 'flex',
            flexDirection: 'column',
            p: isMobile ? 1 : 3,
            gap: 3
        }}>
            {/* Header */}
            <Box sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                justifyContent: 'space-between',
                alignItems: { xs: 'center', md: 'center' },
                gap: 2, mb: 1
            }}>
                <Box sx={{ textAlign: isMobile ? 'center' : 'left' }}>
                    <Typography
                        variant={isMobile ? 'h5' : 'h3'}
                        sx={{ fontWeight: 800, color: 'text.primary' }}
                    >
                        Recetas Médicas
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Genera y gestiona recetas médicas con medicamentos del inventario o personalizados
                    </Typography>
                </Box>

                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    width: { xs: '100%', md: 'auto' },
                    px: isMobile ? 1 : 0
                }}>
                    <TextField
                        variant="outlined"
                        placeholder="Buscar receta..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        sx={{
                            flex: { xs: 1, md: 'none' },
                            width: { md: 340 },
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
                    />

                    {isMobile ? (
                        <IconButton
                            color="primary"
                            onClick={() => setIsCreateModalOpen(true)}
                            sx={{
                                bgcolor: 'primary.main',
                                color: 'var(--c-on-primary)',
                                width: 56, height: 56,
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
                            onClick={() => setIsCreateModalOpen(true)}
                            startIcon={<MedicalServicesIcon />}
                            sx={{
                                boxShadow: '0px 8px 16px rgba(var(--c-primary-rgb), 0.25)',
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                                height: '56px',
                                px: 3,
                            }}
                        >
                            Nueva Receta
                        </Button>
                    )}
                </Box>
            </Box>

            {/* Stats bar */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Chip
                    label={`${prescriptions.filter(r => r.estado === 'EMITIDA').length} emitidas`}
                    color="primary"
                    variant="outlined"
                    sx={{ fontWeight: 600 }}
                />

                {prescriptions.filter(r => r.estado === 'ANULADA').length > 0 && (
                    <Chip
                        label={`${prescriptions.filter(r => r.estado === 'ANULADA').length} anuladas`}
                        color="error"
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                    />
                )}
            </Box>

            {/* Content Area */}
            <Box sx={{
                flex: 1, width: '100%',
                bgcolor: 'background.paper',
                borderRadius: 4,
                overflow: 'hidden',
                position: 'relative'
            }}>
                {isMobile ? (
                    <Box sx={{ height: '100%', overflow: 'auto' }}>
                        <List sx={{ p: 0 }}>
                            {filteredPrescriptions.map((prescription, index) => (
                                <React.Fragment key={prescription.id}>
                                    <ListItem disablePadding>
                                        <ListItemButton
                                            onClick={() => handleViewPrescription(prescription)}
                                            sx={{
                                                py: 2,
                                                '&:hover': { bgcolor: 'action.hover' }
                                            }}
                                        >
                                            <ListItemText
                                                sx={{ textAlign: 'center' }}
                                                primary={
                                                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                                        <MedicalServicesIcon sx={{ fontSize: 18, color: 'var(--c-primary-text)' }} />
                                                        <Typography variant="subtitle1" fontWeight="800" color="primary.main">
                                                            {prescription.numero_receta}
                                                        </Typography>
                                                    </Box>
                                                }
                                                secondaryTypographyProps={{ component: 'div' }}
                                                secondary={
                                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.2, alignItems: 'center' }}>
                                                        <Typography variant="body2" fontWeight={600} color="text.primary">
                                                            {prescription._paciente_nombre}
                                                        </Typography>
                                                        <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {formatDate(prescription.fecha)}
                                                            </Typography>
                                                            <Typography variant="caption" fontWeight={700} color="text.secondary">
                                                                {prescription.diagnostico || '—'}
                                                            </Typography>
                                                        </Box>
                                                        <Box sx={{ mt: 1 }}>
                                                            <EstadoBadge estado={prescription.estado} />
                                                        </Box>
                                                    </Box>
                                                }
                                            />
                                        </ListItemButton>
                                    </ListItem>
                                    {index < filteredPrescriptions.length - 1 && <Divider />}
                                </React.Fragment>
                            ))}
                            {filteredPrescriptions.length === 0 && !loading && (
                                <Box sx={{ p: 4, textAlign: 'center' }}>
                                    <Typography color="text.secondary">No se encontraron recetas</Typography>
                                </Box>
                            )}
                            {loading && <ListSkeleton />}
                        </List>
                    </Box>
                ) : (
                    <DataGrid
                        rows={filteredPrescriptions}
                        columns={columns}
                        loading={loading}
                        initialState={{
                            pagination: { paginationModel: { pageSize: 20 } },
                            sorting: { sortModel: [{ field: 'fecha', sort: 'desc' }] },
                        }}
                        pageSizeOptions={[20, 50, 100]}
                        disableSelectionOnClick
                        onRowClick={handleRowClick}
                        localeText={gridLocaleText}
                        slotProps={gridSlotProps}
                        getRowClassName={(params) =>
                            params.row.estado === 'ANULADA' ? 'row-anulada' : ''
                        }
                        sx={{
                            border: 'none',
                            '& .MuiDataGrid-cell': {
                                color: theme.palette.mode === 'dark' ? '#cbd5e1' : undefined,
                            },
                            '& .MuiDataGrid-columnHeaders': {
                                backgroundColor: theme.palette.mode === 'dark' ? '#1e293b' : undefined,
                                color: theme.palette.mode === 'dark' ? '#cbd5e1' : undefined,
                                fontWeight: 'bold',
                            },
                            '& .row-anulada': {
                                opacity: 0.5,
                                textDecoration: 'line-through',
                            },
                        }}
                    />
                )}
            </Box>

            {/* Modal: Crear Receta */}
            <PrescriptionModal
                open={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSaved={(prescription) => {
                    showSnackbar(`Receta ${prescription.numero_receta} emitida correctamente`, 'success');
                    loadPrescriptions(true);
                }}
            />

            {/* Modal: Ver Receta */}
            <PrescriptionViewModal
                open={isViewModalOpen}
                onClose={() => {
                    setIsViewModalOpen(false);
                    setSelectedPrescription(null);
                }}
                prescription={loadingPrescription ? null : selectedPrescription}
                onVoid={handleVoidPrescription}
                onDelete={(id) => requestDeletePrescription(id, selectedPrescription?.numero_receta)}
            />

            {/* Diálogo de confirmación de eliminación */}
            <ConfirmDialog
                open={confirmDelete.open}
                title="¿Eliminar receta?"
                content={`Estás a punto de eliminar permanentemente la receta ${confirmDelete.numero}.\n\nEsta acción no se puede deshacer.`}
                confirmText="Sí, eliminar"
                cancelText="Cancelar"
                onConfirm={handleDeletePrescription}
                onCancel={() => setConfirmDelete({ open: false, id: null, numero: '' })}
            />

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar(s => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                sx={{ zIndex: 110 }}
            >
                <Alert
                    onClose={() => setSnackbar(s => ({ ...s, open: false }))}
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

export default MedicalPrescriptions;
