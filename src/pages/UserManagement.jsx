import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Box, Typography, Paper, Alert, Snackbar, TextField, Button, MenuItem, CircularProgress, Tabs, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import GroupIcon from '@mui/icons-material/Group';

const UserManagement = () => {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('RECEPCION');
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState(0);
    const [usuariosList, setUsuariosList] = useState([]);
    const [loadingUsuarios, setLoadingUsuarios] = useState(false);

    // Estados para notificaciones
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    const fetchUsuarios = async () => {
        setLoadingUsuarios(true);
        const { data, error } = await supabase
            .from('usuarios_panel')
            .select('id, nombre_completo, email, rol, created_at')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setUsuariosList(data);
        }
        setLoadingUsuarios(false);
    };

    React.useEffect(() => {
        if (activeTab === 1) {
            fetchUsuarios();
        }
    }, [activeTab]);

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    const ofuscarCorreo = (correo) => {
        if (!correo) return '';
        const partes = correo.split('@');
        if (partes.length !== 2) return correo;
        const nombreCorreo = partes[0];
        const dominio = partes[1];

        let ofuscado = nombreCorreo;
        if (nombreCorreo.length > 5) {
            ofuscado = nombreCorreo.substring(0, 5) + '***';
        } else if (nombreCorreo.length > 2) {
            ofuscado = nombreCorreo.substring(0, 2) + '***';
        } else {
            ofuscado = nombreCorreo.substring(0, 1) + '***';
        }
        return `${ofuscado}@${dominio}`;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Obtener el token de la sesión actual (Administrador logueado)
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError || !session) {
                throw new Error("No hay una sesión activa. Por favor, vuelva a iniciar sesión.");
            }

            const token = session.access_token;
            const backendUrl = import.meta.env.VITE_BACKEND_URL;

            if (!backendUrl) {
                console.warn("Advertencia: VITE_BACKEND_URL no está definido en el archivo .env");
            }

            // 2. Ejecutar la llamada fetch al backend de creación de usuarios
            const requestUrl = `${backendUrl || ''}/api/create-user`;

            const response = await fetch(requestUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    nombre: fullName,
                    email: email,
                    password: password,
                    rol: role
                })
            });

            // 3. Manejo de la respuesta HTTP
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || errorData.detail || errorData.error || `Error del servidor: ${response.status} (${response.statusText})`);
            }

            // 4. Éxito: Limpiar formulario y notificar
            setFullName('');
            setEmail('');
            setPassword('');
            setRole('RECEPCION'); // Default según esquema PostgreSQL provisto anteriormente

            setSnackbar({
                open: true,
                message: 'Usuario creado exitosamente.',
                severity: 'success'
            });

        } catch (error) {
            console.error('Error al crear usuario:', error);
            setSnackbar({
                open: true,
                message: error.message || 'Hubo un error al crear la cuenta. Intente nuevamente.',
                severity: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', mx: 'auto', mt: 1 }}>


            <Paper
                elevation={0}
                sx={{
                    flex: 1,
                    width: '100%',
                    bgcolor: 'background.paper', // Fallback
                    backdropFilter: 'blur(16px)',
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: 3,
                    borderRadius: 4,
                    p: { xs: 3, md: 5 },
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                {/* Elementos decorativos estilo Médico de fondo */}
                <Box sx={{ position: 'absolute', top: -64, right: -64, width: 192, height: 192, bgcolor: 'primary.light', borderRadius: '50%', opacity: 0.1, pointerEvents: 'none' }} />
                <Box sx={{ position: 'absolute', bottom: -64, left: -64, width: 128, height: 128, bgcolor: 'secondary.light', borderRadius: '50%', opacity: 0.2, pointerEvents: 'none' }} />

                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                    <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ minHeight: 48 }}>
                        <Tab label="Registrar Acceso" icon={<PersonAddAlt1Icon fontSize="small" />} iconPosition="start" sx={{ minHeight: 48, fontWeight: 'bold', textTransform: 'none' }} />
                        <Tab label="Ver Usuarios" icon={<GroupIcon fontSize="small" />} iconPosition="start" sx={{ minHeight: 48, fontWeight: 'bold', textTransform: 'none' }} />
                    </Tabs>
                </Box>

                <Box sx={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {activeTab === 0 && (
                        <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 672, display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3 }}>
                                {/* Campo Nombre */}
                                <TextField
                                    label="Nombre Completo"
                                    required
                                    fullWidth
                                    variant="outlined"
                                    placeholder="Clínica Salud"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    InputLabelProps={{ shrink: true }}
                                />

                                {/* Campo Email */}
                                <TextField
                                    label="Correo electrónico"
                                    type="email"
                                    required
                                    fullWidth
                                    variant="outlined"
                                    placeholder="medico@clinica.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    InputLabelProps={{ shrink: true }}
                                />

                                {/* Campo Contraseña Temporal */}
                                <TextField
                                    label="Contraseña Temporal"
                                    type="password"
                                    required
                                    fullWidth
                                    variant="outlined"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    inputProps={{ minLength: 6 }}
                                    InputLabelProps={{ shrink: true }}
                                />

                                {/* Campo Rol */}
                                <TextField
                                    label="Rol de Acceso"
                                    select
                                    required
                                    fullWidth
                                    variant="outlined"
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    InputLabelProps={{ shrink: true }}
                                >
                                    <MenuItem value="ADMIN">ADMIN (Panel de Control Total)</MenuItem>
                                    <MenuItem value="RECEPCION">RECEPCIÓN (Estándar)</MenuItem>
                                </TextField>
                            </Box>

                            {/* Submit Handler */}
                            <Box sx={{ mt: 'auto', pt: 4, display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid', borderColor: 'divider' }}>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    color="primary"
                                    disabled={loading}
                                    sx={{ px: 4, py: 1.5, borderRadius: 2, fontWeight: 'bold' }}
                                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PersonAddAlt1Icon />}
                                >
                                    {loading ? 'Creando Usuario...' : 'Registrar Usuario'}
                                </Button>
                            </Box>
                        </Box>
                    )}

                    {activeTab === 1 && (
                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <TableContainer sx={{ maxHeight: '100%', overflowY: 'auto' }}>
                                <Table stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold', bgcolor: 'transparent', borderBottom: '2px solid', borderColor: 'divider' }}>Nombre</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', bgcolor: 'transparent', borderBottom: '2px solid', borderColor: 'divider' }}>Correo</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', bgcolor: 'transparent', borderBottom: '2px solid', borderColor: 'divider' }}>Rol</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {loadingUsuarios ? (
                                            <TableRow>
                                                <TableCell colSpan={3} align="center" sx={{ py: 3 }}><CircularProgress size={30} /></TableCell>
                                            </TableRow>
                                        ) : usuariosList.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={3} align="center" sx={{ py: 3, color: 'text.secondary' }}>No hay usuarios registrados</TableCell>
                                            </TableRow>
                                        ) : (
                                            usuariosList.map((usuario) => (
                                                <TableRow key={usuario.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                                    <TableCell sx={{ py: 2 }}>{usuario.nombre_completo}</TableCell>
                                                    <TableCell sx={{ py: 2, color: 'text.secondary' }}>{ofuscarCorreo(usuario.email)}</TableCell>
                                                    <TableCell sx={{ py: 2 }}>
                                                        <Box sx={{
                                                            display: 'inline-block',
                                                            px: 1.5,
                                                            py: 0.5,
                                                            borderRadius: 5,
                                                            fontSize: '0.75rem',
                                                            fontWeight: 'bold',
                                                            bgcolor: usuario.rol === 'ADMIN' ? 'error.light' : 'primary.light',
                                                            color: usuario.rol === 'ADMIN' ? 'error.dark' : 'primary.dark',
                                                        }}>
                                                            {usuario.rol}
                                                        </Box>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                    )}
                </Box>
            </Paper>

            {/* Notificaciones (Snackbar de Material UI) */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%', boxShadow: 3 }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default UserManagement;
