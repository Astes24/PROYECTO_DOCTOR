import React, { useState, useEffect } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { esES } from '@mui/x-data-grid/locales';
import { 
    Box, Typography, TextField, InputAdornment, Button, 
    IconButton, Snackbar, Alert, CircularProgress, Tooltip,
    useTheme, useMediaQuery, Chip
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import HistoryIcon from '@mui/icons-material/History';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

import { supabase } from '../supabaseClient';
import { fetchInventoryItems } from '../services/inventoryService';
import InventoryItemModal from '../components/inventory/InventoryItemModal';
import InventoryKardexModal from '../components/inventory/InventoryKardexModal';

// Badge Component for Stock Status
const StockStatusBadge = ({ stock, minStock }) => {
    let color = 'success';
    let label = 'Óptimo';
    
    if (stock <= 0) {
        color = 'error';
        label = 'Agotado';
    } else if (stock <= minStock) {
        color = 'warning';
        label = 'Bajo Stock';
    }

    return (
        <Chip 
            label={label} 
            color={color} 
            size="small" 
            variant="filled"
            sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}
        />
    );
};

const Inventory = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modals state
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [selectedItemToEdit, setSelectedItemToEdit] = useState(null);
    const [isKardexModalOpen, setIsKardexModalOpen] = useState(false);
    const [selectedItemForKardex, setSelectedItemForKardex] = useState(null);

    // Snackbar state
    const [snackbar, setSnackbar] = useState({ open: false, message: '', type: 'info' });

    const showSnackbar = (msg, type) => {
        setSnackbar({ open: true, message: msg, type });
        setTimeout(() => setSnackbar({ ...snackbar, open: false }), 4000);
    };

    const loadItems = async (isBackground = false) => {
        if (!isBackground) setLoading(true);
        const { data, error } = await fetchInventoryItems();
        if (data) {
            setItems(data);
        } else if (error) {
            console.error(error);
            showSnackbar('Error al cargar inventario', 'error');
        }
        if (!isBackground) setLoading(false);
    };

    useEffect(() => {
        loadItems();

        // Realtime Subscription
        let debounceTimer;
        const subscription = supabase
            .channel('public:inventory_items')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, () => {
                if (debounceTimer) clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => loadItems(true), 500);
            })
            .subscribe();

        return () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            supabase.removeChannel(subscription);
        };
    }, []);

    const handleCreateNew = () => {
        setSelectedItemToEdit(null);
        setIsItemModalOpen(true);
    };

    const handleEditItem = (item) => {
        setSelectedItemToEdit(item);
        setIsItemModalOpen(true);
    };

    const handleOpenKardex = (item) => {
        setSelectedItemForKardex(item);
        setIsKardexModalOpen(true);
    };

    const columns = [
        { 
            field: 'sku', 
            headerName: 'Código / SKU', 
            width: 120, 
            align: 'center', 
            headerAlign: 'center',
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                    <Typography variant="body2">{params.value || '-'}</Typography>
                </Box>
            )
        },
        {
            field: 'nombre',
            headerName: 'Producto',
            minWidth: 200,
            flex: 1,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', width: '100%' }}>
                    <Typography variant="body2" fontWeight="bold">{params.value}</Typography>
                    <Typography variant="caption" color="text.secondary">
                        {params.row.categoria} | {params.row.unidad_medida}
                    </Typography>
                </Box>
            )
        },
        { 
            field: 'stock_actual', 
            headerName: 'Stock', 
            width: 100, 
            align: 'center', 
            headerAlign: 'center',
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                    <Typography variant="body2" fontWeight="bold" sx={{ 
                        color: params.value <= params.row.stock_minimo ? (params.value <= 0 ? 'error.main' : 'warning.main') : 'success.main'
                    }}>
                        {Number(params.value).toLocaleString('es-ES')}
                    </Typography>
                </Box>
            )
        },
        {
            field: 'status',
            headerName: 'Estado',
            width: 120,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                    <StockStatusBadge stock={params.row.stock_actual} minStock={params.row.stock_minimo} />
                </Box>
            )
        },
        { 
            field: 'fecha_vencimiento', 
            headerName: 'Vencimiento', 
            width: 120, 
            align: 'center', 
            headerAlign: 'center',
            renderCell: (params) => {
                if (!params.value) return (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                        <Typography variant="body2">-</Typography>
                    </Box>
                );
                const isExpiring = new Date(params.value) < new Date(new Date().setMonth(new Date().getMonth() + 2));
                return (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', gap: 0.5, height: '100%' }}>
                        {isExpiring && <WarningAmberIcon color="error" fontSize="small" />}
                        <Typography variant="body2" sx={{ color: isExpiring ? 'error.main' : 'inherit' }}>
                            {new Date(params.value).toLocaleDateString('es-ES')}
                        </Typography>
                    </Box>
                )
            }
        },
        {
            field: 'actions',
            headerName: 'Acciones',
            width: 150,
            align: 'center',
            headerAlign: 'center',
            sortable: false,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, width: '100%', alignItems: 'center', height: '100%' }}>
                    <Tooltip title="Kárdex (Movimientos)">
                        <IconButton size="small" color="primary" onClick={(e) => { e.stopPropagation(); handleOpenKardex(params.row); }}>
                            <HistoryIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Editar Producto">
                        <IconButton size="small" color="info" onClick={(e) => { e.stopPropagation(); handleEditItem(params.row); }}>
                            <EditIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            )
        }
    ];

    const filteredItems = items.filter(item =>
        (item.nombre?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (item.sku?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (item.categoria?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    return (
        <Box sx={{ width: isMobile ? '100%' : '95%', mx: 'auto', height: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column', p: isMobile ? 1 : 3, gap: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'center', md: 'center' }, gap: 2, mb: 1 }}>
                <Typography variant={isMobile ? "h5" : "h3"} sx={{ fontWeight: 800, color: 'text.primary', textAlign: isMobile ? 'center' : 'left' }}>
                    Inventario
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: { xs: '100%', md: 'auto' } }}>
                    <TextField
                        variant="outlined"
                        placeholder="Buscar por código, nombre o categoría..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        sx={{
                            flex: { xs: 1, md: 'none' },
                            width: { md: 360 },
                            bgcolor: 'background.paper',
                            borderRadius: 1
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
                            onClick={handleCreateNew}
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
                            onClick={handleCreateNew}
                            startIcon={<AddIcon />}
                            sx={{ boxShadow: '0px 8px 16px rgba(var(--c-primary-rgb), 0.25)', whiteSpace: 'nowrap', height: '56px' }}
                        >
                            Nuevo Producto
                        </Button>
                    )}
                </Box>
            </Box>

            {/* Content Area */}
            <Box sx={{ flex: 1, width: '100%', bgcolor: 'background.paper', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                <DataGrid
                    rows={filteredItems}
                    columns={columns}
                    loading={loading}
                    initialState={{
                        pagination: { paginationModel: { pageSize: 15 } },
                    }}
                    pageSizeOptions={[15, 30, 50]}
                    disableSelectionOnClick
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
            </Box>

            {/* Modals */}
            <InventoryItemModal 
                open={isItemModalOpen} 
                onClose={() => setIsItemModalOpen(false)} 
                itemData={selectedItemToEdit}
                onSaved={() => {
                    loadItems();
                    showSnackbar(selectedItemToEdit ? 'Producto actualizado' : 'Producto agregado con éxito', 'success');
                }}
            />

            {selectedItemForKardex && (
                <InventoryKardexModal
                    open={isKardexModalOpen}
                    onClose={() => setIsKardexModalOpen(false)}
                    item={selectedItemForKardex}
                    onSaved={() => {
                        loadItems(); // Refresh stock in background
                        showSnackbar('Movimiento registrado correctamente', 'success');
                    }}
                />
            )}

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

export default Inventory;
