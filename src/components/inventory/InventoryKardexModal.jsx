import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Typography, IconButton, Box, Divider,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Paper, TextField, MenuItem, CircularProgress, Chip,
    useMediaQuery, useTheme
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import AutorenewIcon from '@mui/icons-material/Autorenew';

import { supabase } from '../../supabaseClient';
import { fetchInventoryMovements, registerInventoryMovement } from '../../services/inventoryService';

import { useToast } from '../ToastProvider';
const TIPO_MOVIMIENTO = [
    { value: 'INGRESO', label: 'Ingresar Stock', color: 'success', icon: <AddCircleOutlineIcon /> },
    { value: 'EGRESO', label: 'Retirar Stock', color: 'error', icon: <RemoveCircleOutlineIcon /> },
    { value: 'AJUSTE', label: 'Ajustar Total', color: 'warning', icon: <AutorenewIcon /> }
];

const InventoryKardexModal = ({ open, onClose, item, onSaved }) => {
    const toast = useToast();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [movements, setMovements] = useState([]);
    const [loadingRecords, setLoadingRecords] = useState(true);
    const [saving, setSaving] = useState(false);

    // Formulario de nuevo movimiento
    const [showForm, setShowForm] = useState(false);
    const [newMovement, setNewMovement] = useState({
        tipo: 'INGRESO',
        cantidad: '',
        motivo: ''
    });

    useEffect(() => {
        if (open && item) {
            loadMovements();
            setShowForm(false);
            setNewMovement({ tipo: 'INGRESO', cantidad: '', motivo: '' });
        }
    }, [open, item]);

    const loadMovements = async () => {
        setLoadingRecords(true);
        const { data } = await fetchInventoryMovements(item.id);
        if (data) {
            setMovements(data);
        }
        setLoadingRecords(false);
    };

    // Subscripción a cambios tipo realtime para el Kárdex activo
    useEffect(() => {
        if (!open || !item) return;

        let debounceTimer;
        const subscription = supabase
            .channel(`kardex_${item.id}`)
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'inventory_movements',
                filter: `item_id=eq.${item.id}`
            }, () => {
                if (debounceTimer) clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => loadMovements(), 300);
            })
            .subscribe();

        return () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            supabase.removeChannel(subscription);
        };
    }, [open, item]);

    const handleMovementChange = (e) => {
        const { name, value } = e.target;
        setNewMovement(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveMovement = async (e) => {
        e.preventDefault();
        if (!newMovement.cantidad || parseFloat(newMovement.cantidad) <= 0) {
            toast("La cantidad debe ser mayor a 0", 'warning');
            return;
        }

        setSaving(true);

        const { data: { user } } = await supabase.auth.getUser();

        const payload = {
            item_id: item.id,
            tipo: newMovement.tipo,
            cantidad: parseFloat(newMovement.cantidad),
            motivo: newMovement.motivo,
            usuario_id: user?.id || null
        };

        const { error } = await registerInventoryMovement(payload);
        
        setSaving(false);
        if (!error) {
            setShowForm(false);
            setNewMovement({ tipo: 'INGRESO', cantidad: '', motivo: '' });
            onSaved(); // trigger reload at parent list
        } else {
            toast('Error guardando movimiento: ' + error.message, 'error');
        }
    };

    const getTipoChip = (tipo) => {
        const config = TIPO_MOVIMIENTO.find(t => t.value === tipo) || TIPO_MOVIMIENTO[0];
        return <Chip size="small" label={tipo} color={config.color} variant="outlined" />;
    };

    const currentStockColor = item?.stock_actual <= item?.stock_minimo ? 'error.main' : 'success.main';

    return (
        <Dialog 
            open={open} 
            onClose={onClose} 
            maxWidth="md" 
            fullWidth
            PaperProps={{ sx: { borderRadius: 3, height: '85vh', maxHeight: 800 } }}
        >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', p: 2, pb: 1, bgcolor: 'background.default' }}>
                <Box>
                    <Typography variant="h6" fontWeight="bold">Historial de Kárdex</Typography>
                    <Typography variant="body2" color="text.secondary">
                        {item?.nombre} (SKU: {item?.sku || 'N/A'})
                    </Typography>
                </Box>
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            
            <Divider />

            <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', bgcolor: 'background.paper', overflow: 'hidden' }}>
                {/* Header Info Banner */}
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: theme.palette.mode === 'dark' ? '#1e293b' : '#f8fafc' }}>
                    <Box>
                        <Typography variant="body2" color="text.secondary">Stock Actual (Lógico)</Typography>
                        <Typography variant="h4" fontWeight="bold" sx={{ color: currentStockColor }}>
                            {item?.stock_actual} <Typography component="span" variant="body1">{item?.unidad_medida}</Typography>
                        </Typography>
                    </Box>
                    <Button 
                        variant={showForm ? "outlined" : "contained"} 
                        color="primary" 
                        onClick={() => setShowForm(!showForm)}
                        sx={{ borderRadius: 2 }}
                    >
                        {showForm ? 'Cancelar Registro' : 'Registrar Movimiento'}
                    </Button>
                </Box>
                
                <Divider />

                {/* Formulario Dinámico */}
                {showForm && (
                    <Box component="form" onSubmit={handleSaveMovement} sx={{ p: 2, bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)', borderBottom: 1, borderColor: 'divider' }}>
                        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Registrar Operación Entrante/Saliente</Typography>
                        <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 2, mt: 2 }}>
                            <TextField
                                select
                                label="Clase de Movimiento"
                                name="tipo"
                                value={newMovement.tipo}
                                onChange={handleMovementChange}
                                required
                                sx={{ minWidth: 150 }}
                            >
                                {TIPO_MOVIMIENTO.map(t => (
                                    <MenuItem key={t.value} value={t.value}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            {React.cloneElement(t.icon, { color: t.color, fontSize: 'small' })}
                                            {t.label}
                                        </Box>
                                    </MenuItem>
                                ))}
                            </TextField>

                            <TextField
                                label={newMovement.tipo === 'AJUSTE' ? 'Stock Real Total' : 'Cantidad a afectar'}
                                type="number"
                                name="cantidad"
                                value={newMovement.cantidad}
                                onChange={handleMovementChange}
                                required
                                sx={{ width: 140 }}
                                InputProps={{
                                    inputProps: { min: 0, step: "0.01" }
                                }}
                            />

                            <TextField
                                label="Motivo (Recepción, Venta, Caducidad...)"
                                name="motivo"
                                value={newMovement.motivo}
                                onChange={handleMovementChange}
                                required
                                sx={{ flex: 1 }}
                            />

                            <Button 
                                type="submit" 
                                variant="contained" 
                                color="secondary" 
                                disabled={saving}
                                sx={{ minWidth: 120, height: 56 }}
                            >
                                {saving ? <CircularProgress size={24} color="inherit" /> : 'Confirmar'}
                            </Button>
                        </Box>
                    </Box>
                )}

                {/* Tabla de Registros */}
                <Box sx={{ flex: 1, overflow: 'auto', p: 0 }}>
                    <TableContainer>
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell align="center">Fecha y Hora</TableCell>
                                    <TableCell align="center">Tipo</TableCell>
                                    <TableCell align="center">Cantidad</TableCell>
                                    <TableCell align="center">Motivo</TableCell>
                                    <TableCell align="center">Registrado Por</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loadingRecords ? (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                                            <CircularProgress />
                                        </TableCell>
                                    </TableRow>
                                ) : movements.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                            No hay movimientos registrados para este insumo.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    movements.map((row) => {
                                        const isAjuste = row.tipo === 'AJUSTE';
                                        const isIngreso = row.tipo === 'INGRESO';
                                        const date = new Date(row.created_at);
                                        return (
                                            <TableRow key={row.id} hover>
                                                <TableCell align="center" sx={{ fontSize: '0.8rem' }}>
                                                    {date.toLocaleDateString('es-ES')} <Typography component="span" variant="caption" color="text.secondary">{date.toLocaleTimeString('es-ES')}</Typography>
                                                </TableCell>
                                                <TableCell align="center">{getTipoChip(row.tipo)}</TableCell>
                                                <TableCell align="center" sx={{ fontWeight: 'bold', color: isAjuste ? 'warning.main' : isIngreso ? 'success.main' : 'error.main' }}>
                                                    {isAjuste ? '=' : isIngreso ? '+' : '-'}{row.cantidad}
                                                </TableCell>
                                                <TableCell align="center" sx={{ fontSize: '0.8rem', maxWidth: 250, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {row.motivo}
                                                </TableCell>
                                                <TableCell align="center" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                                                    {row.usuarios_panel?.nombre_completo || 'Sistema / Desconocido'}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            </DialogContent>
            
            <DialogActions sx={{ p: 2, bgcolor: 'background.default' }}>
                <Button onClick={onClose} variant="outlined" color="inherit">
                    Cerrar Panel
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default InventoryKardexModal;
