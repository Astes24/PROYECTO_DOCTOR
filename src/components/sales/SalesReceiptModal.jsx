import React, { useState, useEffect, useCallback } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Box, Button, TextField, Typography, IconButton, Tooltip,
    Divider, Autocomplete, CircularProgress, List, ListItem,
    ListItemButton, ListItemText, ListItemAvatar, Avatar, InputAdornment,
    Table, TableBody, TableCell, TableContainer, TableHead,
    TableRow, Paper, Chip, useTheme, useMediaQuery
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import SearchIcon from '@mui/icons-material/Search';
import InventoryIcon from '@mui/icons-material/Inventory';
import MiscellaneousServicesIcon from '@mui/icons-material/MiscellaneousServices';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { supabase } from '../../supabaseClient';
import { fetchInventoryItems } from '../../services/inventoryService';
import { createSalesReceipt } from '../../services/salesReceiptService';

// ---- Formatters ----
const formatCurrency = (value) =>
    `S/. ${Number(value || 0).toFixed(2)}`;

// ============================================
// MODAL AGENDA DE PACIENTES (reutiliza patrón de Appointments.jsx)
// ============================================
const PatientPickerDialog = ({ open, onClose, onSelect }) => {
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (!open) return;
        setLoading(true);
        supabase
            .from('pacientes')
            .select('id, nombre_completo, dni, telefono_principal')
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
                    bgcolor: 'var(--c-surface)', 
                    color: 'var(--c-primary-text)' 
                }}>
                    <PeopleAltIcon sx={{ fontSize: 20 }} />
                </Box>
                Seleccionar Paciente
                <IconButton onClick={onClose} sx={{ ml: 'auto', color: 'text.secondary' }} size="small"><CloseIcon /></IconButton>
            </DialogTitle>
            <DialogContent sx={{ pt: 2.5, px: 2, pb: 0, bgcolor: 'var(--c-surface)' }}>
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
                                <SearchIcon fontSize="small" sx={{ color: 'var(--c-primary-text)' }} />
                            </InputAdornment>
                        ),
                    }}
                    sx={{ 
                        mb: 2,
                        '& .MuiOutlinedInput-root': {
                            bgcolor: 'white',
                            '&:hover fieldset': { borderColor: 'var(--c-primary-border)' },
                            '&.Mui-focused fieldset': { borderColor: 'var(--c-primary)' }
                        }
                    }}
                />
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                        <CircularProgress size={32} sx={{ color: 'var(--c-primary-text)' }} />
                    </Box>
                ) : (
                    <List dense sx={{ maxHeight: 340, overflowY: 'auto', px: 0.5 }}>
                        {filtered.length === 0 && (
                            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 5, fontStyle: 'italic' }}>
                                No se encontraron pacientes
                            </Typography>
                        )}
                        {filtered.map(p => (
                            <ListItem
                                key={p.id}
                                disablePadding
                                sx={{ mb: 0.5 }}
                            >
                                <ListItemButton
                                    onClick={() => { onSelect(p); onClose(); }}
                                    sx={{ 
                                        borderRadius: 2.5, 
                                        py: 1.2,
                                        '&:hover': { bgcolor: 'var(--c-surface)' } 
                                    }}
                                >
                                    <ListItemAvatar>
                                        <Avatar sx={{ 
                                            bgcolor: 'var(--c-primary)', // Gold from theme
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
                                        secondary={`DNI: ${p.dni || '-'}`}
                                        primaryTypographyProps={{ fontWeight: 700, fontSize: '0.85rem', color: 'text.primary' }}
                                        secondaryTypographyProps={{ fontSize: '0.75rem', fontWeight: 500 }}
                                    />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                )}
            </DialogContent>
            <DialogActions sx={{ pb: 3, px: 2.5, bgcolor: 'var(--c-surface)' }}>
                <Button 
                    onClick={onClose} 
                    variant="text" 
                    fullWidth 
                    sx={{ color: 'text.secondary', fontWeight: 600 }}
                >
                    Cancelar
                </Button>
            </DialogActions>
        </Dialog>
    );
};

// ============================================
// MODAL PRINCIPAL DE CREACIÓN DE BOLETA
// ============================================
const SalesReceiptModal = ({ open, onClose, onSaved }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // ---- Estado del paciente ----
    const [patientPickerOpen, setPatientPickerOpen] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [patientNombre, setPatientNombre] = useState('');
    const [patientDni, setPatientDni] = useState('');

    // ---- Inventario ----
    const [inventoryItems, setInventoryItems] = useState([]);
    const [loadingInventory, setLoadingInventory] = useState(false);
    const [selectedInventoryItem, setSelectedInventoryItem] = useState(null);
    const [inventoryQty, setInventoryQty] = useState(1);

    // ---- Servicio manual ----
    const [serviceDesc, setServiceDesc] = useState('');
    const [serviceQty, setServiceQty] = useState(1);
    const [servicePrice, setServicePrice] = useState('');

    // ---- Lista de ítems de la boleta ----
    const [receiptItems, setReceiptItems] = useState([]);

    // ---- Datos adicionales ----
    const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
    const [notas, setNotas] = useState('');

    // ---- Estado de guardado ----
    const [saving, setSaving] = useState(false);
    const [clinicInfo, setClinicInfo] = useState(null);

    // ---- Cargar inventario y clinicInfo ----
    const loadInventory = useCallback(async () => {
        setLoadingInventory(true);
        const { data } = await fetchInventoryItems();
        setInventoryItems(data || []);
        setLoadingInventory(false);
    }, []);

    useEffect(() => {
        const loadClinic = async () => {
            const { data } = await supabase.from('clinic_info').select('*').eq('id', 1).single();
            if (data) setClinicInfo(data);
        };
        if (open) {
            loadInventory();
            loadClinic();
        }
    }, [open, loadInventory]);

    // ---- Reset al cerrar ----
    const handleClose = () => {
        setSelectedPatient(null);
        setPatientNombre('');
        setPatientDni('');
        setSelectedInventoryItem(null);
        setInventoryQty(1);
        setServiceDesc('');
        setServiceQty(1);
        setServicePrice('');
        setReceiptItems([]);
        setFecha(new Date().toISOString().slice(0, 10));
        setNotas('');
        setClinicInfo(null);
        onClose();
    };

    // ---- Seleccionar paciente desde agenda ----
    const handleSelectPatient = (patient) => {
        setSelectedPatient(patient);
        setPatientNombre(patient.nombre_completo || '');
        setPatientDni(patient.dni || '');
    };

    // ---- Agregar ítem de inventario ----
    const handleAddInventoryItem = () => {
        if (!selectedInventoryItem) return;

        const maxStock = selectedInventoryItem.stock_actual || 0;
        if (maxStock <= 0) return; // Sin stock, bloquear

        const qty = Math.min(parseInt(inventoryQty, 10) || 1, maxStock);
        const price = parseFloat(selectedInventoryItem.precio_venta) || 0;
        const subtotal = qty * price;
        const newItem = {
            id: `inv-${selectedInventoryItem.id}-${Date.now()}`,
            tipo: 'INVENTARIO',
            inventory_item_id: selectedInventoryItem.id,
            descripcion: selectedInventoryItem.nombre,
            cantidad: qty,
            precio_unitario: price,
            subtotal,
            _ref: selectedInventoryItem,
        };
        setReceiptItems(prev => [...prev, newItem]);
        setSelectedInventoryItem(null);
        setInventoryQty(1);
    };

    // ---- Agregar ítem de servicio manual ----
    const handleAddServiceItem = () => {
        if (!serviceDesc.trim() || !servicePrice) return;
        const qty = parseFloat(serviceQty) || 1;
        const price = parseFloat(servicePrice) || 0;
        const subtotal = qty * price;
        const newItem = {
            id: `svc-${Date.now()}`,
            tipo: 'SERVICIO',
            inventory_item_id: null,
            descripcion: serviceDesc.trim(),
            cantidad: qty,
            precio_unitario: price,
            subtotal,
        };
        setReceiptItems(prev => [...prev, newItem]);
        setServiceDesc('');
        setServiceQty(1);
        setServicePrice('');
    };

    // ---- Eliminar ítem ----
    const handleRemoveItem = (itemId) => {
        setReceiptItems(prev => prev.filter(i => i.id !== itemId));
    };

    // ---- Calcular total ----
    const total = receiptItems.reduce((acc, item) => acc + (item.subtotal || 0), 0);

    // ---- Emitir boleta ----
    const handleEmitir = async () => {
        if (receiptItems.length === 0) return;
        setSaving(true);

        const { data: session } = await supabase.auth.getSession();
        const userId = session?.session?.user?.id || null;

        const header = {
            fecha: new Date(fecha + 'T12:00:00').toISOString(),
            paciente_id: selectedPatient?.id || null,
            paciente_nombre: patientNombre || null,
            paciente_dni: patientDni || null,
            notas: notas || null,
        };

        const { data, error } = await createSalesReceipt(header, receiptItems, userId);
        setSaving(false);

        if (error) {
            console.error('Error emitiendo boleta:', error);
            return;
        }

        onSaved?.(data);
        handleClose();
    };

    const canEmit = receiptItems.length > 0 && !saving;

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
                {/* ---- HEADER: Sólo Estado y Cerrar ---- */}
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
                        bgcolor: 'var(--c-surface)', 
                        color: 'var(--c-primary-text)',
                        flexShrink: 0
                    }}>
                        <ReceiptIcon sx={{ fontSize: 24 }} />
                    </Box>
                    
                    <Chip
                        label="NUEVA"
                        size="small"
                        sx={{
                            bgcolor: 'var(--c-primary-soft)',
                            color: 'var(--c-primary-text)',
                            fontWeight: 800,
                            fontSize: '0.75rem',
                            height: 24,
                            px: 1,
                            textTransform: 'uppercase'
                        }}
                    />

                    <IconButton 
                        onClick={handleClose} 
                        sx={{ ml: 'auto', color: 'text.secondary', '&:hover': { bgcolor: 'var(--c-surface)', color: 'var(--c-primary-text)' } }} 
                        size="small"
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>

                <DialogContent sx={{ pt: 10, pb: 4, px: 4, overflowY: 'auto', bgcolor: 'var(--c-surface)' }}>

                    {/* 2. Datos del consultorio + Identificación a la derecha */}
                    <Box sx={{ mb: 3.5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                            <Typography variant="h6" sx={{ fontWeight: 900, color: 'var(--c-primary-text)', textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1.2 }}>
                                {clinicInfo?.nombre_clinica || 'Clínica Salud'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                                {clinicInfo?.direccion || 'Cargando dirección...'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {clinicInfo?.telefono && `Tel: ${clinicInfo.telefono}`}
                                {clinicInfo?.telefono && clinicInfo?.email && ' · '}
                                {clinicInfo?.email && `Email: ${clinicInfo.email}`}
                            </Typography>
                        </Box>

                        <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="h4" sx={{ fontWeight: 900, color: 'text.primary', letterSpacing: '-0.025em', lineHeight: 1.1, textTransform: 'uppercase' }}>
                                Nueva Boleta
                            </Typography>
                            <Typography variant="subtitle1" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', mt: 0.5 }}>
                                Fecha: {new Date(fecha + 'T12:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </Typography>
                        </Box>
                    </Box>

                    {/* 3. Información del Cliente (Sin tarjeta) */}
                    <Box sx={{ mb: 6 }}>
                        <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.disabled', letterSpacing: '0.1em' }}>
                            Información del Cliente
                        </Typography>

                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 150px 50px' }, gap: 2, mt: 1.5 }}>
                            <TextField
                                label="Nombre Completo"
                                placeholder="Ingrese el nombre completo"
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
                            <TextField
                                label="DNI"
                                placeholder="DNI"
                                value={patientDni}
                                onChange={e => setPatientDni(e.target.value)}
                                size="small"
                                fullWidth
                            />
                            <Tooltip title="Buscar en pacientes">
                                <Button
                                    variant="outlined"
                                    onClick={() => setPatientPickerOpen(true)}
                                    sx={{
                                        minWidth: 48, width: 48, height: 40, p: 0,
                                        borderRadius: 2,
                                        borderColor: 'var(--c-primary-border)',
                                        color: 'var(--c-primary-text)',
                                        '&:hover': { bgcolor: 'var(--c-surface)', borderColor: 'var(--c-primary)' }
                                    }}
                                >
                                    <PeopleAltIcon fontSize="small" />
                                </Button>
                            </Tooltip>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 2, mt: 2.5 }}>
                            <TextField
                                label="Fecha Emisión"
                                type="date"
                                value={fecha}
                                onChange={e => setFecha(e.target.value)}
                                size="small"
                                sx={{ width: 180, flexShrink: 0 }}
                                InputLabelProps={{ shrink: true }}
                            />
                            <TextField
                                label="Notas u observaciones"
                                value={notas}
                                onChange={e => setNotas(e.target.value)}
                                fullWidth
                                size="small"
                                placeholder="Opcional..."
                            />
                        </Box>
                    </Box>

                    {/* ===== SECCIÓN 4: AGREGAR ÍTEMS ===== */}
                    <Box sx={{ display: 'flex', gap: 3, mb: 4, flexDirection: { xs: 'column', sm: 'row' } }}>

                        {/* -- Sub-sección A: Desde Inventario -- */}
                        <Box sx={{
                            flex: 1,
                            bgcolor: 'white',
                            borderRadius: 3,
                            p: 3,
                            border: '1px solid',
                            borderColor: 'divider',
                            transition: 'all 0.2s',
                            '&:focus-within': { borderColor: 'var(--c-primary-border)', boxShadow: '0 4px 12px rgba(var(--c-primary-rgb), 0.08)' }
                        }}>
                            <Typography variant="subtitle2" fontWeight={800} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                <InventoryIcon sx={{ fontSize: 18, color: 'var(--c-primary-text)' }} /> Insumos / Productos
                            </Typography>

                            <Autocomplete
                                options={inventoryItems}
                                getOptionLabel={opt => `${opt.nombre} (Stock: ${opt.stock_actual})`}
                                value={selectedInventoryItem}
                                onChange={(_, val) => {
                                    setSelectedInventoryItem(val);
                                    setInventoryQty(1);
                                }}
                                loading={loadingInventory}
                                size="small"
                                noOptionsText="Sin resultados"
                                renderInput={params => (
                                    <TextField
                                        {...params}
                                        label="Buscar en inventario..."
                                        InputProps={{
                                            ...params.InputProps,
                                            endAdornment: (
                                                <>
                                                    {loadingInventory && <CircularProgress size={16} />}
                                                    {params.InputProps.endAdornment}
                                                </>
                                            ),
                                        }}
                                    />
                                )}
                                renderOption={(props, option) => (
                                    <Box component="li" {...props} key={option.id} sx={{ px: '16px !important', py: '10px !important', borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none' } }}>
                                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                            <Typography variant="body2" fontWeight={700}>{option.nombre}</Typography>
                                            <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                                                <Chip label={`Stock: ${option.stock_actual}`} size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: option.stock_actual > 0 ? '#E3F2FD' : '#FFEBEE', color: option.stock_actual > 0 ? '#1976D2' : '#C62828' }} />
                                                <Typography variant="caption" color="primary.main" fontWeight={700}>{formatCurrency(option.precio_venta)}</Typography>
                                            </Box>
                                        </Box>
                                    </Box>
                                )}
                                sx={{ mb: 2.5 }}
                            />

                            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                                <TextField
                                    label="Cantidad"
                                    type="number"
                                    value={inventoryQty}
                                    onChange={e => {
                                        const maxStock = selectedInventoryItem?.stock_actual || 1;
                                        const val = Math.max(1, Math.min(parseInt(e.target.value, 10) || 1, maxStock));
                                        setInventoryQty(val);
                                    }}
                                    size="small"
                                    sx={{ width: 90 }}
                                />
                                <Box sx={{ flex: 1 }}>
                                    {selectedInventoryItem && (selectedInventoryItem.stock_actual || 0) > 0 && (
                                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                            Subtotal: {formatCurrency((inventoryQty || 0) * (selectedInventoryItem.precio_venta || 0))}
                                        </Typography>
                                    )}
                                </Box>
                                <Button
                                    variant="contained"
                                    size="small"
                                    onClick={handleAddInventoryItem}
                                    disabled={!selectedInventoryItem || (selectedInventoryItem?.stock_actual || 0) <= 0}
                                    sx={{ 
                                        borderRadius: 2, 
                                        bgcolor: 'var(--c-primary)', 
                                        '&:hover': { bgcolor: 'var(--c-primary-hover)' },
                                        height: 40
                                    }}
                                >
                                    Agregar
                                </Button>
                            </Box>
                        </Box>

                        {/* -- Sub-sección B: Servicio Manual -- */}
                        <Box sx={{
                            flex: 1,
                            bgcolor: 'white',
                            borderRadius: 3,
                            p: 3,
                            border: '1px solid',
                            borderColor: 'divider',
                            transition: 'all 0.2s',
                            '&:focus-within': { borderColor: 'var(--c-primary-border)', boxShadow: '0 4px 12px rgba(var(--c-primary-rgb), 0.08)' }
                        }}>
                            <Typography variant="subtitle2" fontWeight={800} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                <MiscellaneousServicesIcon sx={{ fontSize: 18, color: '#20C997' }} /> Servicios / Tratamientos
                            </Typography>

                            <TextField
                                label="Descripción del servicio"
                                value={serviceDesc}
                                onChange={e => setServiceDesc(e.target.value)}
                                fullWidth
                                size="small"
                                sx={{ mb: 2.5 }}
                                placeholder="Ej: Consulta pediátrica..."
                            />

                            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                                <TextField
                                    label="Cant."
                                    type="number"
                                    value={serviceQty}
                                    onChange={e => setServiceQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                    size="small"
                                    sx={{ width: 70 }}
                                />
                                <TextField
                                    label="Precio S/."
                                    type="number"
                                    value={servicePrice}
                                    onChange={e => setServicePrice(e.target.value)}
                                    size="small"
                                    sx={{ flex: 1 }}
                                    placeholder="0.00"
                                />
                                <Button
                                    variant="contained"
                                    size="small"
                                    onClick={handleAddServiceItem}
                                    disabled={!serviceDesc.trim() || !servicePrice}
                                    sx={{ 
                                        borderRadius: 2, 
                                        bgcolor: 'var(--c-primary)', 
                                        '&:hover': { bgcolor: 'var(--c-primary-hover)' },
                                        height: 40
                                    }}
                                >
                                    Agregar
                                </Button>
                            </Box>
                        </Box>
                    </Box>

                    {/* ===== SECCIÓN 5: TABLA DE ÍTEMS ===== */}
                    <Box sx={{
                        bgcolor: 'white',
                        borderRadius: 3,
                        p: 3,
                        border: '1px solid',
                        borderColor: 'divider',
                        mb: 2
                    }}>
                        <Typography variant="subtitle2" fontWeight={800} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5, color: 'text.primary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <ReceiptIcon sx={{ fontSize: 18, color: 'var(--c-primary-text)' }} /> Detalle del Pedido
                        </Typography>

                        {receiptItems.length === 0 ? (
                            <Box sx={{
                                py: 6, textAlign: 'center', border: '1px dashed',
                                borderColor: 'divider', borderRadius: 2, bgcolor: '#FAFAFA'
                            }}>
                                <Typography variant="body2" color="text.disabled">No hay ítems registrados en esta boleta.</Typography>
                            </Box>
                        ) : (
                            <TableContainer component={Box} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: 'var(--c-surface)' }}>
                                            <TableCell align="center" sx={{ fontWeight: 800, fontSize: '0.7rem', color: 'text.secondary' }}>TIPO</TableCell>
                                            <TableCell sx={{ fontWeight: 800, fontSize: '0.7rem', color: 'text.secondary' }}>DESCRIPCIÓN</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 800, fontSize: '0.7rem', color: 'text.secondary' }}>CANT.</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 800, fontSize: '0.7rem', color: 'text.secondary' }}>P. UNIT.</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 800, fontSize: '0.7rem', color: 'text.secondary' }}>SUBTOTAL</TableCell>
                                            <TableCell align="center" sx={{ width: 40 }}></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {receiptItems.map((item, idx) => (
                                            <TableRow
                                                key={item.id}
                                                sx={{ '&:hover': { bgcolor: 'rgba(var(--c-primary-rgb), 0.02)' } }}
                                            >
                                                <TableCell align="center">
                                                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }}>
                                                        {item.tipo === 'INVENTARIO' ? 'PRODUCTO' : 'SERVICIO'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{item.descripcion}</Typography>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Typography variant="body2">{item.cantidad}</Typography>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Typography variant="body2">{formatCurrency(item.precio_unitario)}</Typography>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Typography variant="body2" sx={{ fontWeight: 800 }}>{formatCurrency(item.subtotal)}</Typography>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleRemoveItem(item.id)}
                                                        sx={{ color: 'error.light', '&:hover': { bgcolor: '#FFEBEE', color: 'error.main' } }}
                                                    >
                                                        <DeleteIcon sx={{ fontSize: 18 }} />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}

                        {/* Footer: Text on Left, Total on Right */}
                        {receiptItems.length > 0 && (
                            <Box sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-end',
                                mt: 1.5,
                                pr: 2,
                                pb: 3,
                                borderTop: '1px solid',
                                borderColor: 'rgba(var(--c-primary-rgb), 0.1)',
                                pt: 3
                            }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, pb: 1 }}>
                                    Gracias por su preferencia
                                </Typography>
                                
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.5 }}>
                                        TOTAL A PAGAR (S/.)
                                    </Typography>
                                    <Typography variant="h2" sx={{ 
                                        fontWeight: 900, 
                                        color: 'text.primary', 
                                        letterSpacing: '-0.02em',
                                        fontSize: '3rem',
                                        lineHeight: 1
                                    }}>
                                        {formatCurrency(total)}
                                    </Typography>
                                    <Box sx={{ width: 100, height: 4, bgcolor: 'var(--c-primary)', borderRadius: 1, mt: 1 }} />
                                </Box>
                            </Box>
                        )}
                    </Box>
                </DialogContent>

                <DialogActions sx={{ px: 4, py: 3, bgcolor: 'var(--c-surface)', borderTop: '1px solid', borderColor: 'divider', gap: 2 }}>
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
                        onClick={handleEmitir}
                        disabled={!canEmit}
                        startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <CheckCircleIcon />}
                        sx={{
                            px: 5,
                            height: 48,
                            borderRadius: 2,
                            bgcolor: 'var(--c-primary)',
                            fontSize: '1rem',
                            fontWeight: 800,
                            boxShadow: '0 10px 20px rgba(var(--c-primary-rgb), 0.25)',
                            '&:hover': { bgcolor: 'var(--c-primary-hover)', boxShadow: '0 12px 24px rgba(var(--c-primary-rgb), 0.35)' },
                            '&:disabled': { opacity: 0.5 }
                        }}
                    >
                        {saving ? 'Procesando...' : 'Confirmar Emisión'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Agenda de pacientes */}
            <PatientPickerDialog
                open={patientPickerOpen}
                onClose={() => setPatientPickerOpen(false)}
                onSelect={handleSelectPatient}
            />
        </>
    );
};

export default SalesReceiptModal;
