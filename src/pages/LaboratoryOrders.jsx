import React, { useState, useEffect, useCallback } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { esES } from '@mui/x-data-grid/locales';
import {
    Box, Typography, TextField, InputAdornment, Button,
    IconButton, Snackbar, Alert, CircularProgress, Tooltip,
    useTheme, useMediaQuery, Chip, List, ListItem, ListItemButton,
    ListItemText, Divider
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import ScienceIcon from '@mui/icons-material/Science';
import VisibilityIcon from '@mui/icons-material/Visibility';
import BlockIcon from '@mui/icons-material/Block';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';

import { supabase } from '../supabaseClient';
import {
    fetchLaboratoryOrders,
    fetchLaboratoryOrderById,
    voidLaboratoryOrder,
    deleteLaboratoryOrder
} from '../services/laboratoryService';
import LaboratoryModal from '../components/laboratory/LaboratoryModal';
import LaboratoryViewModal from '../components/laboratory/LaboratoryViewModal';
import ConfirmDialog from '../components/ConfirmDialog';

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

const LaboratoryOrders = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [loadingOrder, setLoadingOrder] = useState(false);

    // Confirm delete dialog
    const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null, numero: '' });

    // Snackbar
    const [snackbar, setSnackbar] = useState({ open: false, message: '', type: 'info' });

    const showSnackbar = (message, type = 'info') => {
        setSnackbar({ open: true, message, type });
        setTimeout(() => setSnackbar(s => ({ ...s, open: false })), 4000);
    };

    const loadOrders = useCallback(async (isBackground = false) => {
        if (!isBackground) setLoading(true);
        const { data, error } = await fetchLaboratoryOrders();
        if (data) {
            const normalized = data.map(o => ({
                ...o,
                _paciente_nombre: o.pacientes?.nombre_completo || o.paciente_nombre || '-',
            }));
            setOrders(normalized);
        } else if (error) {
            console.error(error);
            showSnackbar('Error al cargar órdenes de laboratorio', 'error');
        }
        if (!isBackground) setLoading(false);
    }, []);

    useEffect(() => {
        loadOrders();
    }, [loadOrders]);

    const handleViewOrder = async (row) => {
        setLoadingOrder(true);
        setIsViewModalOpen(true);
        const { data, error } = await fetchLaboratoryOrderById(row.id);
        if (data) {
            setSelectedOrder(data);
        } else {
            console.error(error);
            showSnackbar('Error al cargar el detalle de la orden', 'error');
            setIsViewModalOpen(false);
        }
        setLoadingOrder(false);
    };

    const handleVoidOrder = async (id) => {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id || null;
        const { success, error } = await voidLaboratoryOrder(id, userId);
        if (success) {
            showSnackbar('Orden anulada correctamente', 'success');
            setIsViewModalOpen(false);
            setSelectedOrder(null);
            loadOrders(true);
        } else {
            console.error(error);
            showSnackbar(error?.message || 'Error al anular la orden', 'error');
        }
    };

    const requestDeleteOrder = (id, numero) => {
        setConfirmDelete({ open: true, id, numero });
    };

    const handleDeleteOrder = async () => {
        const { id } = confirmDelete;
        setConfirmDelete({ open: false, id: null, numero: '' });
        const { success, numeroOrden, error } = await deleteLaboratoryOrder(id);
        if (success) {
            showSnackbar(`Orden ${numeroOrden} eliminada permanentemente`, 'success');
            setIsViewModalOpen(false);
            setSelectedOrder(null);
            loadOrders(true);
        } else {
            console.error(error);
            showSnackbar(error?.message || 'Error al eliminar la orden', 'error');
        }
    };

    const filteredOrders = orders.filter(o =>
        (o.numero_orden?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (o._paciente_nombre?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (o.paciente_dni || '').includes(searchTerm) ||
        (o.sospecha_clinica?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (o.medico_nombre?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    const columns = [
        {
            field: 'numero_orden',
            headerName: 'N° Orden',
            width: 150,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
                    <Typography variant="body2" fontWeight={700} color="text.primary">
                        {params.value}
                    </Typography>
                </Box>
            )
        },
        {
            field: 'fecha',
            headerName: 'Fecha',
            width: 120,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
                    <Typography variant="body2">{formatDate(params.value)}</Typography>
                </Box>
            )
        },
        {
            field: '_paciente_nombre',
            headerName: 'Paciente',
            flex: 1,
            minWidth: 160,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
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
            field: 'sospecha_clinica',
            headerName: 'Sospecha Clínica',
            flex: 1.5,
            minWidth: 180,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}
                    >
                        {params.value || '—'}
                    </Typography>
                </Box>
            )
        },
        {
            field: 'medico_nombre',
            headerName: 'Médico',
            width: 180,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
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
            width: 130,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
                    <EstadoBadge estado={params.value} />
                </Box>
            )
        },
        {
            field: 'actions',
            headerName: 'Acciones',
            width: 150,
            align: 'center',
            headerAlign: 'center',
            sortable: false,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
                    <Tooltip title="Ver / Imprimir">
                        <IconButton
                            size="small"
                            color="primary"
                            onClick={(e) => { e.stopPropagation(); handleViewOrder(params.row); }}
                        >
                            <VisibilityIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    {params.row.estado !== 'ANULADA' && (
                        <Tooltip title="Anular orden">
                            <IconButton
                                size="small"
                                color="error"
                                onClick={(e) => { e.stopPropagation(); handleVoidOrder(params.row.id); }}
                            >
                                <BlockIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                    {params.row.estado === 'ANULADA' && (
                        <Tooltip title="Eliminar permanentemente">
                            <IconButton
                                size="small"
                                onClick={(e) => { e.stopPropagation(); requestDeleteOrder(params.row.id, params.row.numero_orden); }}
                                sx={{
                                    color: 'error.main',
                                    bgcolor: 'error.main',
                                    opacity: 0.12,
                                    '&:hover': { opacity: 1, color: 'white', bgcolor: 'error.main' },
                                    transition: 'all 0.2s',
                                }}
                            >
                                <DeleteForeverIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>
            )
        }
    ];

    const handleRowClick = (params) => {
        handleViewOrder(params.row);
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
                alignItems: 'center',
                gap: 2, mb: 1
            }}>
                <Box sx={{ textAlign: isMobile ? 'center' : 'left' }}>
                    <Typography
                        variant={isMobile ? 'h5' : 'h3'}
                        sx={{ fontWeight: 800, color: 'text.primary' }}
                    >
                        Órdenes de Laboratorio
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Gestión de órdenes de exámenes médicos y pruebas de laboratorio
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
                        placeholder="Buscar orden..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        sx={{
                            flex: { xs: 1, md: 'none' },
                            width: { md: 340 },
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
                            startIcon={<ScienceIcon />}
                            sx={{
                                boxShadow: '0px 8px 16px rgba(var(--c-primary-rgb), 0.25)',
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                                height: '56px',
                                px: 3,
                            }}
                        >
                            Nueva Orden
                        </Button>
                    )}
                </Box>
            </Box>

            {/* Stats bar */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Chip
                    label={`${orders.filter(o => o.estado === 'EMITIDA').length} emitidas`}
                    color="primary"
                    variant="outlined"
                    sx={{ fontWeight: 600 }}
                />
                {orders.filter(o => o.estado === 'ANULADA').length > 0 && (
                    <Chip
                        label={`${orders.filter(o => o.estado === 'ANULADA').length} anuladas`}
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
                            {filteredOrders.map((order, index) => (
                                <React.Fragment key={order.id}>
                                    <ListItem disablePadding>
                                        <ListItemButton
                                            onClick={() => handleViewOrder(order)}
                                            sx={{ py: 2, '&:hover': { bgcolor: 'action.hover' } }}
                                        >
                                            <ListItemText
                                                sx={{ textAlign: 'center' }}
                                                primary={
                                                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                                        <ScienceIcon sx={{ fontSize: 18, color: 'var(--c-primary-text)' }} />
                                                        <Typography variant="subtitle1" fontWeight="800" color="primary.main">
                                                            {order.numero_orden}
                                                        </Typography>
                                                    </Box>
                                                }
                                                secondaryTypographyProps={{ component: 'div' }}
                                                secondary={
                                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.2, alignItems: 'center' }}>
                                                        <Typography variant="body2" fontWeight={600} color="text.primary">
                                                            {order._paciente_nombre}
                                                        </Typography>
                                                        <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {formatDate(order.fecha)}
                                                            </Typography>
                                                            <Typography variant="caption" fontWeight={700} color="text.secondary">
                                                                {order.sospecha_clinica || '—'}
                                                            </Typography>
                                                        </Box>
                                                        <Box sx={{ mt: 1 }}>
                                                            <EstadoBadge estado={order.estado} />
                                                        </Box>
                                                    </Box>
                                                }
                                            />
                                        </ListItemButton>
                                    </ListItem>
                                    {index < filteredOrders.length - 1 && <Divider />}
                                </React.Fragment>
                            ))}
                            {filteredOrders.length === 0 && !loading && (
                                <Box sx={{ p: 4, textAlign: 'center' }}>
                                    <Typography color="text.secondary">No se encontraron órdenes</Typography>
                                </Box>
                            )}
                            {loading && (
                                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                                    <CircularProgress />
                                </Box>
                            )}
                        </List>
                    </Box>
                ) : (
                    <DataGrid
                        rows={filteredOrders}
                        columns={columns}
                        loading={loading}
                        initialState={{
                            pagination: { paginationModel: { pageSize: 20 } },
                            sorting: { sortModel: [{ field: 'fecha', sort: 'desc' }] },
                        }}
                        pageSizeOptions={[20, 50, 100]}
                        disableSelectionOnClick
                        onRowClick={handleRowClick}
                        localeText={esES.components.MuiDataGrid.defaultProps.localeText}
                        getRowClassName={(params) =>
                            params.row.estado === 'ANULADA' ? 'row-anulada' : ''
                        }
                        sx={{
                            border: 'none',
                            '& .row-anulada': {
                                opacity: 0.5,
                                textDecoration: 'line-through',
                            },
                        }}
                    />
                )}
            </Box>

            {/* Modal: Crear Orden */}
            <LaboratoryModal
                open={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSaved={(order) => {
                    showSnackbar(`Orden ${order.numero_orden} emitida correctamente`, 'success');
                    loadOrders(true);
                }}
            />

            {/* Modal: Ver Orden */}
            <LaboratoryViewModal
                open={isViewModalOpen}
                onClose={() => {
                    setIsViewModalOpen(false);
                    setSelectedOrder(null);
                }}
                order={loadingOrder ? null : selectedOrder}
                onVoid={handleVoidOrder}
                onDelete={(id) => requestDeleteOrder(id, selectedOrder?.numero_orden)}
            />

            {/* Confirmación eliminación */}
            <ConfirmDialog
                open={confirmDelete.open}
                title="¿Eliminar orden?"
                content={`Estás a punto de eliminar permanentemente la orden ${confirmDelete.numero}.\n\nEsta acción no se puede deshacer.`}
                confirmText="Sí, eliminar"
                cancelText="Cancelar"
                onConfirm={handleDeleteOrder}
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

export default LaboratoryOrders;
