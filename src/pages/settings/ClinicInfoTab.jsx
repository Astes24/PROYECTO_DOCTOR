import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, CircularProgress, Alert, Paper, Grid, Divider } from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import SaveIcon from '@mui/icons-material/Save';
import PhoneIcon from '@mui/icons-material/Phone';
import MapIcon from '@mui/icons-material/Map';
import { getClinicInfo, updateClinicInfo } from '../../services/clinicService';

const PINK = '#db2777';
const PINK_LIGHT = '#fdf2f8';
const PINK_BORDER = '#fbcfe8';

const ClinicInfoTab = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [formData, setFormData] = useState({
        nombre_clinica: '',
        direccion: '',
        telefono: '',
        email: '',
        web: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const { data, error } = await getClinicInfo();
        if (data) {
            setFormData({
                nombre_clinica: data.nombre_clinica || '',
                direccion: data.direccion || '',
                telefono: data.telefono || '',
                email: data.email || '',
                web: data.web || ''
            });
        }
        if (error) setErrorMsg('Error al cargar la información del consultorio.');
        setLoading(false);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setSuccess(false);
        setErrorMsg('');

        const { error } = await updateClinicInfo(formData);
        if (error) {
            setErrorMsg('Error al actualizar los datos.');
        } else {
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        }
        setSaving(false);
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress sx={{ color: PINK }} />
            </Box>
        );
    }

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto', p: 1 }}>
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <BusinessIcon sx={{ fontSize: 40, color: PINK }} />
                <Box>
                    <Typography variant="h5" fontWeight={800} color="text.primary">
                        Información del Consultorio
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Configura los datos que aparecerán automáticamente en tus recetas médicas.
                    </Typography>
                </Box>
            </Box>

            {success && (
                <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
                    ¡Información actualizada correctamente!
                </Alert>
            )}

            {errorMsg && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                    {errorMsg}
                </Alert>
            )}

            <Paper variant="outlined" sx={{ p: 4, borderRadius: 4, borderColor: PINK_BORDER, bgcolor: 'background.paper', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                <form onSubmit={handleSubmit}>
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <Typography variant="subtitle2" color={PINK} fontWeight={700} sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                Datos del Establecimiento
                            </Typography>
                            <TextField
                                fullWidth
                                label="Nombre de la Clínica / Consultorio"
                                name="nombre_clinica"
                                value={formData.nombre_clinica}
                                onChange={handleChange}
                                placeholder="Ej: Centro Ginecológico Especializado"
                                variant="outlined"
                                sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                                InputProps={{
                                    startAdornment: <BusinessIcon sx={{ mr: 1, color: 'text.disabled', fontSize: 20 }} />,
                                }}
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <Divider sx={{ mb: 1, borderColor: PINK_LIGHT }} />
                        </Grid>

                        <Grid item xs={12} md={8}>
                            <TextField
                                fullWidth
                                label="Dirección del Consultorio"
                                name="direccion"
                                value={formData.direccion}
                                onChange={handleChange}
                                placeholder="Ej: Av. Arequipa 1234, Oficina 501, Miraflores, Lima"
                                multiline
                                rows={3}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                                InputProps={{
                                    startAdornment: <MapIcon sx={{ mr: 1, mt: 1, color: 'text.disabled', fontSize: 20, alignSelf: 'flex-start' }} />,
                                }}
                                helperText="Esta dirección aparecerá en el membrete de todas tus recetas."
                            />
                        </Grid>

                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth
                                label="Teléfono de Contacto"
                                name="telefono"
                                value={formData.telefono}
                                onChange={handleChange}
                                placeholder="Ej: 999 888 777"
                                sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                                InputProps={{
                                    startAdornment: <PhoneIcon sx={{ mr: 1, color: 'text.disabled', fontSize: 20 }} />,
                                }}
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <Typography variant="subtitle2" color="text.secondary" fontWeight={700} sx={{ mb: 1, mt: 1 }}>
                                Canales Digitales (Opcional)
                            </Typography>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Email"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="ejemplo@clinica.com"
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Sitio Web"
                                name="web"
                                value={formData.web}
                                onChange={handleChange}
                                placeholder="www.tuclinica.com"
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                            />
                        </Grid>

                        <Grid item xs={12} sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                            <Button
                                type="submit"
                                variant="contained"
                                disabled={saving}
                                startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                                sx={{
                                    bgcolor: PINK,
                                    '&:hover': { bgcolor: '#be185d' },
                                    borderRadius: 3,
                                    px: 4,
                                    py: 1.5,
                                    fontWeight: 800,
                                    textTransform: 'none',
                                    boxShadow: '0 8px 16px rgba(219, 39, 119, 0.2)'
                                }}
                            >
                                {saving ? 'Guardando...' : 'Guardar Configuración'}
                            </Button>
                        </Grid>
                    </Grid>
                </form>
            </Paper>
        </Box>
    );
};

export default ClinicInfoTab;
