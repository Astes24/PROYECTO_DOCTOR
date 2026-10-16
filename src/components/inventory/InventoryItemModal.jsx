import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, Box, Typography, IconButton,
    Grid, Divider, CircularProgress, MenuItem
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { saveInventoryItem } from '../../services/inventoryService';

import { useToast } from '../ToastProvider';
const categoriasComunes = [
    'Medicamentos',
    'Material Médico Estéril',
    'Insumos de Limpieza',
    'Equipos Médicos',
    'Papelería y Oficina',
    'Otros'
];

const unidadesComunes = [
    'Unidades',
    'Cajas',
    'Blísters',
    'Mililitros (ml)',
    'Litros (L)',
    'Gramos (g)',
    'Kilogramos (kg)',
    'Metros (m)',
    'Pares'
];

const initialData = {
    nombre: '',
    descripcion: '',
    sku: '',
    categoria: '',
    unidad_medida: '',
    stock_minimo: 0,
    stock_maximo: '',
    lote: '',
    fecha_vencimiento: '',
    registro_sanitario: '',
    principio_activo: '',
    proveedor: '',
    costo_compra: 0,
    precio_venta: 0
};

const InventoryItemModal = ({ open, onClose, itemData, onSaved }) => {
    const toast = useToast();
    const [formData, setFormData] = useState(initialData);
    const [loading, setLoading] = useState(false);
    const isEdit = !!itemData;

    useEffect(() => {
        if (open) {
            if (itemData) {
                // Populate data for editing
                setFormData({
                    ...initialData,
                    ...itemData,
                    fecha_vencimiento: itemData.fecha_vencimiento ? itemData.fecha_vencimiento.split('T')[0] : ''
                });
            } else {
                setFormData(initialData);
            }
        }
    }, [open, itemData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);

        const dataToSave = {
            ...formData,
            stock_minimo: parseFloat(formData.stock_minimo) || 0,
            stock_maximo: formData.stock_maximo ? parseFloat(formData.stock_maximo) : null,
            costo_compra: parseFloat(formData.costo_compra) || 0,
            precio_venta: parseFloat(formData.precio_venta) || 0,
            // Only set stock_actual on creation, Kardex manages updates
            ...(isEdit ? {} : { stock_actual: 0 })
        };

        const { data, error } = await saveInventoryItem(dataToSave);

        setLoading(false);
        if (!error && data) {
            onSaved();
            onClose();
        } else {
            toast('Error guardando el ítem: ' + error?.message, 'error');
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{ sx: { borderRadius: 3 } }}
        >
            <DialogTitle sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
                <Typography variant="h6" fontWeight="bold">
                    {isEdit ? 'Editar Producto / Insumo' : 'Nuevo Producto / Insumo'}
                </Typography>
                <IconButton onClick={onClose} sx={{ color: 'inherit' }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <form onSubmit={handleSave}>
                <DialogContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {/* Seccion 1: Identificación Básica */}
                    <Box>
                        <Typography variant="subtitle2" color="var(--c-primary-text)" fontWeight="bold" gutterBottom>1. IDENTIFICACIÓN BÁSICA</Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={8}>
                                <TextField
                                    label="Nombre del Producto"
                                    name="nombre"
                                    value={formData.nombre}
                                    onChange={handleChange}
                                    required
                                    fullWidth
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    label="Código / SKU"
                                    name="sku"
                                    value={formData.sku || ''}
                                    onChange={handleChange}
                                    fullWidth
                                    placeholder="Ej. MAT-001"
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    label="Descripción Corta"
                                    name="descripcion"
                                    value={formData.descripcion || ''}
                                    onChange={handleChange}
                                    multiline
                                    rows={2}
                                    fullWidth
                                />
                            </Grid>
                        </Grid>
                    </Box>

                    {/* Seccion 2: Clasificación y Stock */}
                    <Box>
                        <Typography variant="subtitle2" color="var(--c-primary-text)" fontWeight="bold" gutterBottom>2. CLASIFICACIÓN Y STOCK</Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6} md={3}>
                                <TextField
                                    select
                                    label="Categoría"
                                    name="categoria"
                                    value={formData.categoria}
                                    onChange={handleChange}
                                    required
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                    SelectProps={{ displayEmpty: true }}
                                >
                                    <MenuItem value=""><em>Seleccione...</em></MenuItem>
                                    {categoriasComunes.map(cat => (
                                        <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <TextField
                                    select
                                    label="Unidad de Medida"
                                    name="unidad_medida"
                                    value={formData.unidad_medida}
                                    onChange={handleChange}
                                    required
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                    SelectProps={{ displayEmpty: true }}
                                >
                                    <MenuItem value=""><em>Seleccione...</em></MenuItem>
                                    {unidadesComunes.map(um => (
                                        <MenuItem key={um} value={um}>{um}</MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <TextField
                                    label="Stock Mínimo (Alerta)"
                                    type="number"
                                    name="stock_minimo"
                                    value={formData.stock_minimo}
                                    onChange={handleChange}
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                    helperText="Alerta de escasez"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <TextField
                                    label="Stock Máximo"
                                    type="number"
                                    name="stock_maximo"
                                    value={formData.stock_maximo}
                                    onChange={handleChange}
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                    helperText="Cantidad ideal"
                                />
                            </Grid>
                        </Grid>
                    </Box>

                    {/* Seccion 3: Datos Médicos */}
                    <Box>
                        <Typography variant="subtitle2" color="var(--c-primary-text)" fontWeight="bold" gutterBottom>3. DATOS MÉDICOS (Opcional)</Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Principio Activo"
                                    name="principio_activo"
                                    value={formData.principio_activo || ''}
                                    onChange={handleChange}
                                    fullWidth
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Registro Sanitario"
                                    name="registro_sanitario"
                                    value={formData.registro_sanitario || ''}
                                    onChange={handleChange}
                                    fullWidth
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="N° de Lote Principal"
                                    name="lote"
                                    value={formData.lote || ''}
                                    onChange={handleChange}
                                    fullWidth
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Fecha de Vencimiento"
                                    type="date"
                                    name="fecha_vencimiento"
                                    value={formData.fecha_vencimiento || ''}
                                    onChange={handleChange}
                                    InputLabelProps={{ shrink: true }}
                                    fullWidth
                                />
                            </Grid>
                        </Grid>
                    </Box>

                    {/* Seccion 4: Datos Comerciales */}
                    <Box>
                        <Typography variant="subtitle2" color="var(--c-primary-text)" fontWeight="bold" gutterBottom>4. DATOS COMERCIALES (Opcional)</Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={12}>
                                <TextField
                                    label="Proveedor (Nombre / Razón Social)"
                                    name="proveedor"
                                    value={formData.proveedor || ''}
                                    onChange={handleChange}
                                    fullWidth
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Costo de Compra"
                                    type="number"
                                    name="costo_compra"
                                    value={formData.costo_compra}
                                    onChange={handleChange}
                                    fullWidth
                                    InputProps={{ startAdornment: <Typography sx={{ mr: 1, color: 'text.secondary' }}>S/</Typography> }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Precio de Venta"
                                    type="number"
                                    name="precio_venta"
                                    value={formData.precio_venta}
                                    onChange={handleChange}
                                    fullWidth
                                    InputProps={{ startAdornment: <Typography sx={{ mr: 1, color: 'text.secondary' }}>S/</Typography> }}
                                />
                            </Grid>
                        </Grid>
                    </Box>
                </DialogContent>

                <DialogActions sx={{ p: 3, pt: 0 }}>
                    <Button onClick={onClose} disabled={loading} color="inherit">
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        disabled={loading}
                        startIcon={loading && <CircularProgress size={20} color="inherit" />}
                    >
                        {isEdit ? 'Guardar Cambios' : 'Crear Producto'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

export default InventoryItemModal;
