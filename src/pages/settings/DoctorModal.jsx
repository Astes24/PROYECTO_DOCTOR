import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Box, CircularProgress, FormControlLabel, Switch, Divider, IconButton, Typography, Alert } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import BadgeIcon from '@mui/icons-material/Badge';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';

const GOLD = '#D4AF37';
const GOLD_LIGHT = '#FCF9F2';
const GOLD_BORDER = '#F5F5DC';

const fieldSx = {
    '& .MuiOutlinedInput-root': {
        borderRadius: 3,
        '&.Mui-focused fieldset': { borderColor: GOLD }
    },
    '& label.Mui-focused': { color: GOLD }
};

const DoctorModal = ({ open, onClose, doctor, onSuccess }) => {
    const [formData, setFormData] = useState({
        nombre_completo: '',
        especialidad: '',
        cmp: '',
        rne: '',
        dni: '',
        es_principal: false,
        activo: true
    });
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        if (open) {
            if (doctor) {
                setFormData({
                    nombre_completo: doctor.nombre_completo || '',
                    especialidad: doctor.especialidad || '',
                    cmp: doctor.cmp || '',
                    rne: doctor.rne || '',
                    dni: doctor.dni || '',
                    es_principal: doctor.es_principal || false,
                    activo: doctor.activo !== undefined ? doctor.activo : true
                });
            } else {
                setFormData({
                    nombre_completo: '',
                    especialidad: '',
                    cmp: '',
                    rne: '',
                    dni: '',
                    es_principal: false,
                    activo: true
                });
            }
            setErrorMsg('');
        }
    }, [open, doctor]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSwitchChange = (name) => (event) => {
        setFormData(prev => ({ ...prev, [name]: event.target.checked }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setLoading(true);

        try {
            if (!formData.nombre_completo.trim()) {
                throw new Error('El nombre completo es obligatorio.');
            }

            const payload = {
                nombre_completo: formData.nombre_completo.trim(),
                especialidad: formData.especialidad.trim() || null,
                cmp: formData.cmp.trim() || null,
                rne: formData.rne.trim() || null,
                dni: formData.dni.trim() || null,
                es_principal: formData.es_principal,
                activo: formData.activo,
            };

            if (doctor && doctor.id) {
                const { error } = await supabase.from('doctores').update(payload).eq('id', doctor.id);
                if (error) throw error;
                onSuccess('Dra. actualizada exitosamente.');
            } else {
                const { error } = await supabase.from('doctores').insert([payload]);
                if (error) throw error;
                onSuccess('Dra. registrada exitosamente.');
            }
        } catch (error) {
            console.error('Error in doctor modal:', error);
            setErrorMsg(error.message || 'Error al guardar los datos.');
        } finally {
            setLoading(false);
        }
    };

    const isEditMode = Boolean(doctor && doctor.id);

    const SectionLabel = ({ icon, text }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            {icon}
            <Typography variant="caption" color={GOLD} fontWeight={800} sx={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {text}
            </Typography>
        </Box>
    );

    return (
        <Dialog
            open={open}
            onClose={!loading ? onClose : undefined}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    maxHeight: '95vh',
                    borderRadius: '16px',
                    boxShadow: '0 25px 50px -12px rgba(212, 175, 55, 0.25)',
                    border: '1px solid',
                    borderColor: GOLD_BORDER
                }
            }}
        >
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', bgcolor: GOLD_LIGHT, borderBottom: '1px solid', borderColor: GOLD_BORDER }}>
                <PersonIcon sx={{ color: GOLD, mr: 1 }} />
                <Typography variant="h6" fontWeight={900} sx={{ color: 'text.primary', textTransform: 'uppercase', fontSize: '1rem' }}>
                    {isEditMode ? 'Editar Doctora' : 'Agregar Doctora'}
                </Typography>
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    disabled={loading}
                    sx={{ position: 'absolute', right: 8, top: 8, color: GOLD, '&:hover': { bgcolor: 'rgba(212,175,55,0.05)' } }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <DialogContent dividers sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5, overflowY: 'auto' }}>

                    {errorMsg && (
                        <Alert severity="error" sx={{ borderRadius: 2 }}>{errorMsg}</Alert>
                    )}

                    {/* ── IDENTIDAD PERSONAL ── */}
                    <SectionLabel icon={<PersonIcon sx={{ fontSize: 16, color: GOLD }} />} text="Identidad Personal" />

                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <TextField
                            required
                            label="Nombre Completo"
                            name="nombre_completo"
                            value={formData.nombre_completo}
                            onChange={handleChange}
                            disabled={loading}
                            placeholder="Ej. Golden Clinic"
                            InputLabelProps={{ shrink: true }}
                            sx={{ ...fieldSx, flex: '2 1 220px' }}
                        />
                        <TextField
                            label="DNI del Médico"
                            name="dni"
                            value={formData.dni}
                            onChange={handleChange}
                            disabled={loading}
                            placeholder="Ej. 45678901"
                            InputLabelProps={{ shrink: true }}
                            inputProps={{ maxLength: 15 }}
                            sx={{ ...fieldSx, flex: '1 1 140px' }}
                        />
                    </Box>

                    <TextField
                        label="Especialidad"
                        name="especialidad"
                        value={formData.especialidad}
                        onChange={handleChange}
                        disabled={loading}
                        placeholder="Ej. Ginecología y Obstetricia"
                        InputLabelProps={{ shrink: true }}
                        sx={fieldSx}
                        fullWidth
                    />

                    <Divider sx={{ borderColor: GOLD_BORDER }} />

                    {/* ── COLEGIATURA MÉDICA PERUANA ── */}
                    <SectionLabel icon={<BadgeIcon sx={{ fontSize: 16, color: GOLD }} />} text="Colegiatura Médica (Perú)" />

                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <Box sx={{ flex: '1 1 160px' }}>
                            <TextField
                                label="CMP — Colegio Médico del Perú"
                                name="cmp"
                                value={formData.cmp}
                                onChange={handleChange}
                                disabled={loading}
                                placeholder="Ej. 123456"
                                InputLabelProps={{ shrink: true }}
                                inputProps={{ maxLength: 20 }}
                                sx={{
                                    width: '100%',
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 3,
                                        '&.Mui-focused fieldset': { borderColor: GOLD, borderWidth: 2 },
                                        '& fieldset': { borderColor: '#D4AF37', borderWidth: 1.5 }
                                    },
                                    '& label.Mui-focused': { color: GOLD }
                                }}
                                helperText="Número de habilitación para prescribir recetas"
                                FormHelperTextProps={{ sx: { color: GOLD, fontWeight: 600, fontSize: '0.72rem' } }}
                            />
                        </Box>
                        <TextField
                            label="RNE — Reg. Nac. Especialistas"
                            name="rne"
                            value={formData.rne}
                            onChange={handleChange}
                            disabled={loading}
                            placeholder="Ej. 78901"
                            InputLabelProps={{ shrink: true }}
                            inputProps={{ maxLength: 20 }}
                            helperText="Solo si tiene especialidad (SINAREME)"
                            sx={{ ...fieldSx, flex: '1 1 160px' }}
                        />
                    </Box>

                    <Divider sx={{ borderColor: GOLD_BORDER }} />

                    {/* ── CONFIGURACIONES ── */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Typography variant="caption" color={GOLD} fontWeight={800} sx={{ textTransform: 'uppercase' }}>
                            Configuraciones Adicionales
                        </Typography>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={formData.es_principal}
                                    onChange={handleSwitchChange('es_principal')}
                                    name="es_principal"
                                    sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: GOLD }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: GOLD } }}
                                />
                            }
                            label="Doctora Principal de la Clínica"
                            disabled={loading}
                            sx={{ '& .MuiFormControlLabel-label': { fontWeight: 600, fontSize: '0.9rem' } }}
                        />
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={formData.activo}
                                    onChange={handleSwitchChange('activo')}
                                    name="activo"
                                    sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#059669' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#059669' } }}
                                />
                            }
                            label="Estado Activo (Puede recibir citas)"
                            disabled={loading}
                            sx={{ '& .MuiFormControlLabel-label': { fontWeight: 600, fontSize: '0.9rem' } }}
                        />
                    </Box>

                </DialogContent>

                <DialogActions sx={{ p: 3, bgcolor: GOLD_LIGHT, borderTop: '1px solid', borderColor: GOLD_BORDER }}>
                    <Button onClick={onClose} disabled={loading} color="inherit" sx={{ fontWeight: 700, textTransform: 'none', px: 2 }}>
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={loading}
                        sx={{
                            bgcolor: GOLD,
                            color: 'white',
                            '&:hover': { bgcolor: '#B8860B' },
                            fontWeight: 800,
                            px: 4,
                            py: 1,
                            borderRadius: 3,
                            textTransform: 'none',
                            boxShadow: '0 4px 12px rgba(212, 175, 55, 0.3)'
                        }}
                    >
                        {loading ? <CircularProgress size={24} color="inherit" /> : 'Guardar Datos'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

export default DoctorModal;
