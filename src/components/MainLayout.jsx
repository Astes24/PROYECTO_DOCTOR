import React, { useState, useContext, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
    Box,
    Drawer,
    AppBar,
    Toolbar,
    List,
    Typography,
    Divider,
    IconButton,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    useTheme,
    useMediaQuery,
    Avatar,
    Tooltip,
    Badge,
    Menu,
    MenuItem,
    Chip,
    Snackbar,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    CircularProgress
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import ForumIcon from '@mui/icons-material/Forum';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import SettingsIcon from '@mui/icons-material/Settings';
import PeopleIcon from '@mui/icons-material/People';
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial';
import InventoryIcon from '@mui/icons-material/Inventory';
import ReceiptIcon from '@mui/icons-material/Receipt';
import MedicationIcon from '@mui/icons-material/Medication';
import ScienceIcon from '@mui/icons-material/Science';
import PaletteIcon from '@mui/icons-material/Palette';
import CheckIcon from '@mui/icons-material/Check';
import { ColorModeContext, PaletteContext } from '../App';
import { PALETTES } from '../theme/palettes';
import { supabase } from '../supabaseClient';
import { NotificationDetail } from './notifications/NotificationSplitView';

import ClinicLogo from './ClinicLogo';
const drawerWidth = 280;

const MainLayout = () => {
    const theme = useTheme();
    const colorMode = useContext(ColorModeContext);
    const { palette, setPalette } = useContext(PaletteContext);
    const [anchorElPalette, setAnchorElPalette] = useState(null);
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [mobileOpen, setMobileOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Notifications State
    const [notifications, setNotifications] = useState([]);
    const [anchorElNotifications, setAnchorElNotifications] = useState(null);
    const [notificationSnackbar, setNotificationSnackbar] = useState({ open: false, message: '' });
    const [manualCount, setManualCount] = useState(0);

    // Fetch manual chat count for sidebar indicator
    useEffect(() => {
        const fetchManualCount = async () => {
            try {
                const { count, error } = await supabase
                    .from('estado_bot')
                    .select('*', { count: 'exact', head: true })
                    .eq('bot_activo', false);

                if (!error) {
                    setManualCount(count || 0);
                }
            } catch (err) {
                console.error('Error fetching manual count:', err);
            }
        };

        fetchManualCount();

        // Subscribe to ALL changes in estado_bot to keep the count perfectly synced
        // Using a unique channel name to avoid conflicts
        const channelId = `manual_count_${Math.random().toString(36).substring(7)}`;
        const channel = supabase
            .channel(channelId)
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'estado_bot' },
                () => {
                    fetchManualCount();
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    // Initial fetch after subscription to ensure sync
                    fetchManualCount();
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Notification Dialog State
    const [selectedNotification, setSelectedNotification] = useState(null);
    const [isNotificationDialogOpen, setIsNotificationDialogOpen] = useState(false);

    // Profile & Security State
    const [anchorElProfile, setAnchorElProfile] = useState(null);
    // Initialize tightly from localStorage to avoid visual flicker (session dropping visually)
    const [userInitial, setUserInitial] = useState(localStorage.getItem('userInitial') || 'U');
    const [userName, setUserName] = useState(localStorage.getItem('userName') || '');
    const [userEmail, setUserEmail] = useState(localStorage.getItem('userEmail') || '');
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);

    // Contraseñas
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');

    const [passwordLoading, setPasswordLoading] = useState(false);

    // Estado de Red (Online / Offline)
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    // ==========================================
    // NETWORK GUARDIAN (OFFLINE/ONLINE)
    // ==========================================
    useEffect(() => {
        const handleOffline = () => {
            console.warn("Conexión perdida. UI Bloqueada.");
            setIsOffline(true);
        };

        const handleOnline = () => {
            console.log("Conexión recuperada. Reconectando...");
            setIsOffline(false);

            setTimeout(() => {
                window.location.reload();
            }, 1500);
        };

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, []);

    // Load initial notifications and subscribe, and request browser notification permission
    // NOTE: Regular function (NOT useCallback) to match the stable pattern from Notifications.jsx
    const fetchNotifications = async () => {
        try {
            const { data, error } = await supabase
                .from('notificaciones')
                .select('*')
                .eq('leido', false)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            if (data) setNotifications(data);
        } catch (err) {
            console.error('Error fetching unread notifications in MainLayout:', err);
        }
    };

    // Stable refs so stale closures in useEffect([]) can always call the LATEST functions
    const fetchNotificationsRef = React.useRef(fetchNotifications);
    const setSnackbarRef = React.useRef(setNotificationSnackbar);
    React.useEffect(() => {
        fetchNotificationsRef.current = fetchNotifications;
        setSnackbarRef.current = setNotificationSnackbar;
    });

    // ==========================================
    // GUARDIÁN DE RUTAS - SESIÓN Y ROLES
    // ==========================================
    useEffect(() => {
        let isMounted = true;

        async function initDashboardGuardian() {
            // 1. Verificar si existe la sesión en Supabase
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (!isMounted) return;

            if (sessionError || !session) {
                navigate('/login', { replace: true });
                return;
            }

            const email = session.user.email;
            setUserEmail(email);
            localStorage.setItem('userEmail', email);

            // 2. Obtener el rol y nombre consultando a usuarios_panel
            const { data: userData, error: userError } = await supabase
                .from('usuarios_panel')
                .select('rol, nombre_completo')
                .eq('id', session.user.id)
                .single();

            if (!isMounted) return;

            if (userError || !userData) {
                console.error("Error validando el rol:", userError);
                navigate('/login', { replace: true });
                return;
            }

            // 3. Guardar en localStorage para validar permisos visuales luego
            window.userRole = userData.rol;
            localStorage.setItem('user_rol', userData.rol);

            // Mostrar el nombre e inicial en el avatar superior y guardarlo para no perderlo al recargar
            if (userData.nombre_completo) {
                const name = userData.nombre_completo;
                const initial = name.charAt(0).toUpperCase();
                setUserName(name);
                setUserInitial(initial);
                localStorage.setItem('userName', name);
                localStorage.setItem('userInitial', initial);
            }
        }

        initDashboardGuardian();

        // Subscribe to auth changes to refresh dependencies
        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                fetchNotifications();
            }
        });

        return () => {
            isMounted = false;
            authSubscription.unsubscribe();
        };
    }, [navigate, fetchNotifications]);

    // Refresh when the user returns to the tab
    useEffect(() => {
        const handleFocus = () => fetchNotificationsRef.current();
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, []); // [] = created once, never recreated

    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        fetchNotificationsRef.current();

        // Canal dinámico para evitar conflictos de nombres
        const channelId = `notif_sync_${Math.random().toString(36).substring(7)}`;

        const subscription = supabase
            .channel(channelId)
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'notificaciones' },
                (payload) => {
                    console.log('Realtime DB Change detected:', payload.eventType);

                    if (payload.eventType === 'INSERT') {
                        const newNotif = payload.new;
                        setNotifications(prev => {
                            if (prev.some(n => n.id === newNotif.id)) return prev;
                            return [newNotif, ...prev].slice(0, 50);
                        });

                        if (!newNotif.leido) {
                            const msgUpper = newNotif.mensaje?.toUpperCase() || '';
                            const isUrgency = ['URGENCIA', 'EMERGENCIA', 'URGENTE', 'CRITICAL', 'CRÍTICO'].includes(newNotif.tipo?.trim().toUpperCase()) ||
                                msgUpper.includes('URGENCIA') || msgUpper.includes('EMERGENCIA');

                            // Use ref to avoid stale closure issue with deps: []
                            setSnackbarRef.current({
                                open: true,
                                message: `Nueva ${isUrgency ? 'ALERTA CRÍTICA' : 'alerta'}: ${newNotif.mensaje?.substring(0, 60)}...`
                            });

                            if ('Notification' in window && Notification.permission === 'granted') {
                                new Notification(isUrgency ? '⚠️ EMERGENCIA MÉDICA' : '🔔 Nueva Notificación', {
                                    body: newNotif.mensaje?.replace(/alerta bot:?\s*/i, '').trim() || 'Tienes una nueva notificación.',
                                    icon: '/logo-clinica.svg'
                                });
                            }
                        }
                    } else if (payload.eventType === 'UPDATE') {
                        setNotifications(prev => prev.map(n => n.id === payload.new.id ? { ...n, ...payload.new } : n));
                    } else if (payload.eventType === 'DELETE') {
                        setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
                    }
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('Realtime notification subscription: ACTIVE');
                } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                    console.warn('Realtime subscription closed/errored.');
                }
            });

        return () => { supabase.removeChannel(subscription); };
    }, []); // [] = created ONCE, never recreated - matches Notifications.jsx pattern


    const handleNotificationClick = (event) => {
        setAnchorElNotifications(event.currentTarget);
    };

    const handleNotificationClose = () => {
        setAnchorElNotifications(null);
    };

    const handleMarkAsRead = async (id) => {
        // Optimistic update: mark as read in state
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, leido: true } : n));

        const { error } = await supabase
            .from('notificaciones')
            .update({ leido: true })
            .eq('id', id);

        if (error) {
            console.error('Error marking as read:', error);
        }

        // Close menu if no more unread notifications
        if (notifications.filter(n => !n.leido && n.id !== id).length === 0) {
            handleNotificationClose();
        }
    };

    const handleNotificationItemClick = (notif) => {
        handleMarkAsRead(notif.id);
        setSelectedNotification(notif);
        setIsNotificationDialogOpen(true);
        handleNotificationClose();
    };

    const handleMarkAllAsRead = async () => {
        // Optimistic: Filter only unread
        const unreadIds = notifications.filter(n => !n.leido).map(n => n.id);
        if (unreadIds.length === 0) return;

        setNotifications(prev => prev.map(n => ({ ...n, leido: true })));
        handleNotificationClose();

        await supabase
            .from('notificaciones')
            .update({ leido: true })
            .in('id', unreadIds);
    };

    const handleMarkAsCompleted = async (id) => {
        // Optimistic UI update
        setSelectedNotification(prev => prev?.id === id ? { ...prev, completado: true } : prev);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, completado: true } : n));

        const { error } = await supabase
            .from('notificaciones')
            .update({ completado: true })
            .eq('id', id);

        if (error) {
            console.error('Error marking as completed:', error);
            setNotificationSnackbar({ open: true, message: 'Error al completar' });
            fetchNotifications();
        } else {
            setNotificationSnackbar({ open: true, message: 'Marcado como completado' });
        }
    };

    const handleMarkAsUncompleted = async (id) => {
        setSelectedNotification(prev => prev?.id === id ? { ...prev, completado: false } : prev);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, completado: false } : n));

        const { error } = await supabase
            .from('notificaciones')
            .update({ completado: false })
            .eq('id', id);

        if (error) {
            console.error('Error marking as uncompleted:', error);
            setNotificationSnackbar({ open: true, message: 'Error al desmarcar' });
            fetchNotifications();
        } else {
            setNotificationSnackbar({ open: true, message: 'Notificación marcada como pendiente' });
        }
    };

    // --- Profile & Security Handlers ---
    const handleProfileClick = (event) => {
        setAnchorElProfile(event.currentTarget);
    };

    const handleProfileClose = () => {
        setAnchorElProfile(null);
    };

    const handleLogout = async () => {
        handleProfileClose();
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userName');
        localStorage.removeItem('userInitial');
        localStorage.removeItem('user_rol');
        await supabase.auth.signOut();
        navigate('/login', { replace: true });
    };

    const handleChangePasswordSubmit = async () => {
        if (!currentPassword) {
            setNotificationSnackbar({ open: true, message: 'Ingresa tu contraseña actual.' });
            return;
        }
        if (!newPassword || newPassword.length < 6) {
            setNotificationSnackbar({ open: true, message: 'La nueva contraseña debe tener al menos 6 caracteres.' });
            return;
        }
        if (newPassword !== confirmNewPassword) {
            setNotificationSnackbar({ open: true, message: 'Las nuevas contraseñas no coinciden.' });
            return;
        }

        setPasswordLoading(true);

        // 1. Validar la contraseña actual simulando un "reingreso"
        const { error: verifyError } = await supabase.auth.signInWithPassword({
            email: userEmail,
            password: currentPassword
        });

        if (verifyError) {
            setPasswordLoading(false);
            setNotificationSnackbar({ open: true, message: 'La contraseña actual es incorrecta.' });
            return;
        }

        // 2. Si es correcta, procedemos a actualizarla
        const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
        setPasswordLoading(false);

        if (updateError) {
            setNotificationSnackbar({ open: true, message: 'Error al cambiar la contraseña.' });
        } else {
            setNotificationSnackbar({ open: true, message: 'Contraseña actualizada exitosamente.' });
            setIsPasswordDialogOpen(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
        }
    };

    const menuItems = [
        { text: 'Inicio', icon: <DashboardIcon />, path: '/' },
        { text: 'Citas', icon: <CalendarMonthIcon />, path: '/appointments' },
        { text: 'Pacientes', icon: <PeopleIcon />, path: '/patients' },
        { text: 'Historial Clínico', icon: <MedicalServicesIcon />, path: '/clinical-history' },
        { text: 'Documentos', icon: <FolderSpecialIcon />, path: '/documents' },
        { text: 'Inventario', icon: <InventoryIcon />, path: '/inventory' },
        { text: 'Boletas', icon: <ReceiptIcon />, path: '/sales-receipts' },
        { text: 'Recetas', icon: <MedicationIcon />, path: '/prescriptions' },
        { text: 'Laboratorio', icon: <ScienceIcon />, path: '/laboratory' },
        { text: 'Live Chat', icon: <ForumIcon />, path: '/live-chat' },
        { text: 'Notificaciones', icon: <NotificationsNoneIcon />, path: '/notifications' }
    ];

    const drawer = (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, px: 2, minHeight: 80, gap: 2 }}>
                <Box sx={{
                    width: '14vh', height: '14vh', minWidth: 90, minHeight: 90, maxWidth: 120, maxHeight: 120,
                    borderRadius: '50%',
                    border: '4px solid',
                    borderColor: theme.palette.mode === 'dark' ? 'divider' : 'rgba(255, 255, 255, 0.4)',
                    backgroundColor: theme.palette.mode === 'dark' ? 'background.paper' : 'rgba(255, 255, 255, 0.4)',
                    overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                    <ClinicLogo style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </Box>
                <Box sx={{ width: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'text.primary' }}>
                    <svg viewBox="0 0 310 16" style={{ width: '100%', height: 'auto', maxWidth: '200px' }}>
                        <text x="155" y="13" textAnchor="middle" fill="currentColor" style={{ fontWeight: 700, letterSpacing: '-0.025em', fontSize: '13px' }}>PANEL ADMINISTRATIVO</text>
                    </svg>
                    <svg viewBox="0 0 310 26" style={{ width: '100%', height: 'auto', maxWidth: '200px', marginTop: '4px' }}>
                        <text x="155" y="22" textAnchor="middle" fill="currentColor" style={{ fontWeight: 900, letterSpacing: '-0.025em', fontSize: '23px' }}>CLÍNICA SALUD</text>
                    </svg>
                </Box>
            </Box>
            <Divider />
            <List sx={{
                flexGrow: 1,
                px: 2,
                py: 2,
                overflowY: 'auto',
                overflowX: 'hidden',
                '&::-webkit-scrollbar': {
                    width: '4px',
                },
                '&::-webkit-scrollbar-track': {
                    background: 'transparent',
                },
                '&::-webkit-scrollbar-thumb': {
                    background: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                    borderRadius: '4px',
                },
                '&::-webkit-scrollbar-thumb:hover': {
                    background: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
                }
            }}>
                {menuItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
                            <ListItemButton
                                onClick={() => {
                                    navigate(item.path);
                                    if (isMobile) setMobileOpen(false);
                                }}
                                selected={isActive}
                                sx={{
                                    borderRadius: 2,
                                    justifyContent: 'center',
                                    '&.Mui-selected': {
                                        backgroundColor: theme.palette.mode === 'light' ? theme.palette.primary.light + '20' : 'rgba(2, 136, 209, 0.2)',
                                        color: theme.palette.primary.main,
                                        '&:hover': {
                                            backgroundColor: theme.palette.mode === 'light' ? theme.palette.primary.light + '30' : 'rgba(2, 136, 209, 0.3)',
                                        },
                                        '& .MuiListItemIcon-root': {
                                            color: theme.palette.primary.main,
                                        },
                                    },
                                    '&:hover': {
                                        backgroundColor: theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.05)',
                                    }
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', width: '160px' }}>
                                    <ListItemIcon sx={{ minWidth: 40, color: isActive ? theme.palette.primary.main : 'inherit' }}>
                                        {item.text === 'Live Chat' && manualCount > 0 ? (
                                            <Badge
                                                badgeContent={manualCount}
                                                color="error"
                                                overlap="circular"
                                                sx={{ '& .MuiBadge-badge': { fontSize: '0.65rem', height: 16, minWidth: 16 } }}
                                            >
                                                {item.icon}
                                            </Badge>
                                        ) : item.icon}
                                    </ListItemIcon>
                                    <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: isActive ? 600 : 400 }} sx={{ m: 0 }} />
                                    {item.text === 'Live Chat' && manualCount > 0 && (
                                        <SupportAgentIcon sx={{ fontSize: 16, ml: 1, color: '#FF6B6B', opacity: 0.8 }} />
                                    )}
                                </Box>
                            </ListItemButton>
                        </ListItem>
                    )
                })}
            </List>

            <Divider />
            {/* Opciones de la parte inferior */}
            <Box sx={{ p: 2, pb: 0 }}>
                <List disablePadding>
                    <ListItem disablePadding sx={{ mb: 1 }}>
                        <ListItemButton
                            onClick={handleProfileClick}
                            sx={{
                                borderRadius: 2,
                                justifyContent: 'center',
                                '&:hover': {
                                    backgroundColor: theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.05)',
                                }
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', width: '160px' }}>
                                <ListItemIcon sx={{ minWidth: 40 }}>
                                    <Avatar sx={{ width: 24, height: 24, bgcolor: theme.palette.primary.main, color: theme.palette.primary.contrastText, fontWeight: 'bold', fontSize: '0.875rem' }}>
                                        {userInitial}
                                    </Avatar>
                                </ListItemIcon>
                                <ListItemText primary={userName ? userName.split(' ')[0] : 'Usuario'} primaryTypographyProps={{ fontWeight: 600 }} sx={{ m: 0 }} />
                            </Box>
                        </ListItemButton>
                    </ListItem>
                </List>
                <List disablePadding>
                    <ListItem disablePadding sx={{ mb: 1 }}>
                        <ListItemButton
                            onClick={() => {
                                navigate('/settings');
                                if (isMobile) setMobileOpen(false);
                            }}
                            selected={location.pathname === '/settings'}
                            sx={{
                                borderRadius: 2,
                                justifyContent: 'center',
                                '&.Mui-selected': {
                                    backgroundColor: theme.palette.mode === 'light' ? theme.palette.primary.light + '20' : 'rgba(2, 136, 209, 0.2)',
                                    color: theme.palette.primary.main,
                                    '&:hover': {
                                        backgroundColor: theme.palette.mode === 'light' ? theme.palette.primary.light + '30' : 'rgba(2, 136, 209, 0.3)',
                                    },
                                    '& .MuiListItemIcon-root': {
                                        color: theme.palette.primary.main,
                                    },
                                },
                                '&:hover': {
                                    backgroundColor: theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.05)',
                                }
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', width: '160px' }}>
                                <ListItemIcon sx={{ minWidth: 40, color: location.pathname === '/settings' ? theme.palette.primary.main : 'inherit' }}>
                                    <SettingsIcon />
                                </ListItemIcon>
                                <ListItemText primary="Configuración" primaryTypographyProps={{ fontWeight: location.pathname === '/settings' ? 600 : 400 }} sx={{ m: 0 }} />
                            </Box>
                        </ListItemButton>
                    </ListItem>
                </List>
            </Box>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex' }}>
            <IconButton
                aria-label="open drawer"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ position: 'fixed', top: 16, left: 16, zIndex: 1200, display: { md: 'none' }, bgcolor: 'background.paper', boxShadow: 2, '&:hover': { bgcolor: 'background.default' } }}
            >
                <MenuIcon />
            </IconButton>

            <Tooltip title="Paleta de colores">
                <IconButton
                    size="large"
                    aria-label="Cambiar paleta de colores"
                    sx={{ position: 'fixed', top: 16, right: 88, zIndex: 1200, display: { xs: 'none', md: 'inline-flex' }, bgcolor: 'background.paper', boxShadow: 2, '&:hover': { bgcolor: 'background.default' } }}
                    onClick={(e) => setAnchorElPalette(e.currentTarget)}
                >
                    <PaletteIcon sx={{ color: 'var(--c-primary-text)' }} />
                </IconButton>
            </Tooltip>
            <Menu
                anchorEl={anchorElPalette}
                open={Boolean(anchorElPalette)}
                onClose={() => setAnchorElPalette(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{ paper: { sx: { mt: 1, borderRadius: 3, minWidth: 200 } } }}
            >
                <Typography variant="caption" sx={{ px: 2, py: 1, display: 'block', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Paleta de colores
                </Typography>
                {Object.entries(PALETTES).map(([key, p]) => (
                    <MenuItem
                        key={key}
                        selected={palette === key}
                        onClick={() => { setPalette(key); setAnchorElPalette(null); }}
                        sx={{ gap: 1.5, py: 1.2 }}
                    >
                        <Box sx={{ width: 22, height: 22, borderRadius: '50%', bgcolor: p.primary, border: '3px solid', borderColor: p.soft, boxShadow: 1 }} />
                        <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }}>{p.label}</Typography>
                        {palette === key && <CheckIcon fontSize="small" sx={{ color: 'var(--c-primary-text)' }} />}
                    </MenuItem>
                ))}
            </Menu>

            <Tooltip title="Notificaciones">
                <IconButton
                    size="large"
                    sx={{ position: 'fixed', top: 16, right: 24, zIndex: 1200, bgcolor: 'background.paper', boxShadow: 2, '&:hover': { bgcolor: 'background.default' } }}
                    onClick={handleNotificationClick}
                >
                    <Badge badgeContent={notifications.filter(n => !n.leido).length} color="error">
                        <NotificationsNoneIcon color="primary" />
                    </Badge>
                </IconButton>
            </Tooltip>

            <Menu
                anchorEl={anchorElNotifications}
                open={Boolean(anchorElNotifications)}
                onClose={handleNotificationClose}
                PaperProps={{
                    elevation: 0,
                    sx: {
                        overflow: 'visible',
                        filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                        mt: 1.5,
                        width: 320,
                        maxHeight: 400,
                    },
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
                <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle1" fontWeight="bold">Notificaciones</Typography>
                    {notifications.some(n => !n.leido) && (
                        <Tooltip title="Marcar todas como leídas">
                            <IconButton size="small" onClick={handleMarkAllAsRead} sx={{ color: 'var(--c-primary-text)' }}>
                                <DoneAllIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>
                <Divider />
                {notifications.filter(n => !n.leido).length === 0 ? (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">No tienes notificaciones sin leer.</Typography>
                    </Box>
                ) : (
                    notifications.filter(n => !n.leido)
                        .sort((a, b) => {
                            const URGENCY_TYPES = ['URGENCIA', 'EMERGENCIA', 'URGENTE', 'EMERGENCY', 'URGENCY', 'CRITICAL', 'CRÍTICO'];
                            const msgA = a.mensaje?.toUpperCase() || '';
                            const msgB = b.mensaje?.toUpperCase() || '';
                            const isAUrgency = URGENCY_TYPES.includes(a.tipo?.trim().toUpperCase()) || msgA.includes('URGENCIA') || msgA.includes('EMERGENCIA');
                            const isBUrgency = URGENCY_TYPES.includes(b.tipo?.trim().toUpperCase()) || msgB.includes('URGENCIA') || msgB.includes('EMERGENCIA');

                            // Priority 1: Unresolved Urgency/Emergency
                            const aUnresUrg = isAUrgency && !a.completado;
                            const bUnresUrg = isBUrgency && !b.completado;
                            if (aUnresUrg && !bUnresUrg) return -1;
                            if (!aUnresUrg && bUnresUrg) return 1;

                            // Priority 2: Unread
                            if (!a.leido && b.leido) return -1;
                            if (a.leido && !b.leido) return 1;

                            // Priority 3: Resolved Urgency
                            if (isAUrgency && !isBUrgency) return -1;
                            if (!isAUrgency && isBUrgency) return 1;

                            // Fallback: Date
                            return new Date(b.created_at || 0) - new Date(a.created_at || 0);
                        })
                        .slice(0, 10)
                        .map((notif) => {
                            const URGENCY_TYPES = ['URGENCIA', 'EMERGENCIA', 'URGENTE', 'EMERGENCY', 'URGENCY', 'CRITICAL', 'CRÍTICO'];
                            const msgUpper = notif.mensaje?.toUpperCase() || '';
                            const isUrgency = URGENCY_TYPES.includes(notif.tipo?.trim().toUpperCase()) || msgUpper.includes('URGENCIA') || msgUpper.includes('EMERGENCIA');
                            const isUnresolvedUrgency = isUrgency && !notif.completado;
                            const message = (notif.mensaje || '').replace(/alerta bot:?\s*/i, '').trim();

                            return (
                                <MenuItem
                                    key={notif.id}
                                    onClick={() => handleNotificationItemClick(notif)}
                                    sx={{
                                        py: 1.5,
                                        px: 2,
                                        whiteSpace: 'normal',
                                        borderBottom: '1px solid',
                                        borderBottomColor: 'divider',
                                        display: 'block',
                                        position: 'relative',
                                        transition: 'all 0.2s',
                                        opacity: notif.leido ? 0.6 : 1,
                                        bgcolor: notif.leido ? 'transparent' : 'action.hover',
                                        '&:hover': { bgcolor: 'action.hover', opacity: 1 }
                                    }}
                                >
                                    {isUnresolvedUrgency && (
                                        <Box sx={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 48, bgcolor: 'error.main', opacity: 0.1, zIndex: 0 }} />
                                    )}
                                    <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 1.5, alignItems: 'center', width: '100%', zIndex: 1 }}>
                                        {/* Column 1: Icon */}
                                        <Box sx={{ color: isUnresolvedUrgency ? '#000000' : (isUrgency ? 'error.main' : 'info.main'), display: 'flex', alignItems: 'center' }}>
                                            {isUrgency ? <ErrorOutlineIcon fontSize="small" /> : <InfoOutlinedIcon fontSize="small" />}
                                        </Box>

                                        {/* Column 2: Titles */}
                                        <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, justifyContent: 'center' }}>
                                            <Typography variant="body2" fontWeight="800" sx={{ color: isUrgency ? 'error.dark' : 'primary.main', fontSize: '0.75rem', lineHeight: 1 }}>
                                                {isUrgency ? 'URGENCIA' : 'ALERTA'}
                                            </Typography>
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2, // Allow 2 lines for urgent/important messages
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden',
                                                    color: isUrgency ? '#7f1d1d' : 'text.primary',
                                                    fontWeight: (isUrgency || !notif.leido) ? '600' : 'inherit',
                                                    lineHeight: 1.2,
                                                    mt: 0.25,
                                                    fontSize: '0.7rem'
                                                }}
                                            >
                                                {message || (isUrgency ? "Emergencia/Urgencia reportada" : "Nueva notificación")}
                                            </Typography>
                                        </Box>

                                        {/* Column 3: Time */}
                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', minWidth: 55 }}>
                                            <Typography variant="caption" sx={{ color: isUrgency ? '#7f1d1d' : 'text.secondary', fontWeight: 'bold', fontSize: '0.65rem' }}>
                                                {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                            </Typography>
                                            {!notif.leido && (
                                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main', mt: 0.5 }} />
                                            )}
                                        </Box>
                                    </Box>
                                </MenuItem>
                            );
                        })
                )}
                <Divider />
                <Box sx={{ p: 1, textAlign: 'center' }}>
                    <ListItemButton
                        onClick={() => {
                            handleNotificationClose();
                            navigate('/notifications');
                        }}
                        sx={{ justifyContent: 'center', borderRadius: 1, color: 'var(--c-primary-text)', py: 1 }}
                    >
                        <Typography variant="button" sx={{ textTransform: 'capitalize', fontWeight: 600, fontSize: '0.875rem' }}>
                            Ver todas
                        </Typography>
                    </ListItemButton>
                </Box>
            </Menu>

            {/* Botón de perfil movido al sidebar */}

            {/* Menú de Perfil Desplegable */}
            <Menu
                anchorEl={anchorElProfile}
                open={Boolean(anchorElProfile)}
                onClose={handleProfileClose}
                PaperProps={{
                    elevation: 0,
                    sx: {
                        overflow: 'visible',
                        filter: 'drop-shadow(0px -2px 8px rgba(0,0,0,0.32))',
                        mb: 1.5,
                        minWidth: 200,
                    },
                }}
                transformOrigin={{ horizontal: 'left', vertical: 'bottom' }}
                anchorOrigin={{ horizontal: 'left', vertical: 'top' }}
            >
                <Box sx={{ px: 2, py: 1.5 }}>
                    <Typography variant="subtitle2" fontWeight="bold">{userName || 'Usuario'}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                        {window.userRole === 'ADMIN' ? 'Administrador' : 'Asistente'}
                    </Typography>
                </Box>
                <Divider />
                <MenuItem onClick={() => { handleProfileClose(); setIsPasswordDialogOpen(true); }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>Cambiar Contraseña</Typography>
                </MenuItem>
                <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>Cerrar Sesión</Typography>
                </MenuItem>
            </Menu>
            {/* AppBar Removido */}

            <Box
                component="nav"
                sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
                aria-label="mailbox folders"
            >
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{
                        keepMounted: true,
                    }}
                    sx={{
                        display: { xs: 'block', md: 'none' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                    }}
                >
                    {drawer}
                </Drawer>
                <Drawer
                    variant="permanent"
                    sx={{
                        display: { xs: 'none', md: 'block' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: 'none', boxShadow: theme.shadows[4] },
                    }}
                    open
                >
                    {drawer}
                </Drawer>
            </Box>
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: isMobile ? 0 : 3,
                    width: { md: `calc(100% - ${drawerWidth}px)` },
                    minHeight: '100dvh',
                    bgcolor: 'background.default',
                    overflowX: 'hidden', // Prevent horizontal scroll on main container
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                <Outlet />
            </Box>

            {/* Global Notification Toast */}
            <Snackbar
                open={notificationSnackbar.open}
                autoHideDuration={6000}
                onClose={() => setNotificationSnackbar({ ...notificationSnackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={() => setNotificationSnackbar({ ...notificationSnackbar, open: false })}
                    severity="info"
                    sx={{ width: '100%', bgcolor: '#1A1812', color: '#FFFFFF', '& .MuiAlert-icon': { color: 'var(--c-primary-text)' }, borderRadius: 3 }}
                >
                    {notificationSnackbar.message}
                </Alert>
            </Snackbar>

            {/* Notification Details Dialog */}
            <Dialog
                open={isNotificationDialogOpen}
                onClose={() => setIsNotificationDialogOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: { borderRadius: 3, overflow: 'hidden' }
                }}
            >
                {selectedNotification && (
                    <NotificationDetail
                        notification={selectedNotification}
                        onMarkAsCompleted={handleMarkAsCompleted}
                        onMarkAsUncompleted={handleMarkAsUncompleted}
                        onClose={() => setIsNotificationDialogOpen(false)}
                    />
                )}
            </Dialog>

            {/* Change Password Dialog */}
            <Dialog
                open={isPasswordDialogOpen}
                onClose={() => setIsPasswordDialogOpen(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: 'bold', color: 'var(--c-primary-text)' }}>Mi Seguridad</DialogTitle>
                <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Por seguridad, ingresa tu contraseña actual antes de establecer una nueva. (Mínimo 6 caracteres).
                    </Typography>

                    <TextField
                        autoFocus
                        label="Contraseña Actual"
                        type="password"
                        fullWidth
                        variant="outlined"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                    />

                    <TextField
                        label="Nueva Contraseña"
                        type="password"
                        fullWidth
                        variant="outlined"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                    />

                    <TextField
                        label="Confirmar Nueva Contraseña"
                        type="password"
                        fullWidth
                        variant="outlined"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        error={newPassword !== '' && confirmNewPassword !== '' && newPassword !== confirmNewPassword}
                        helperText={newPassword !== '' && confirmNewPassword !== '' && newPassword !== confirmNewPassword ? 'Las contraseñas no coinciden' : ''}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => {
                        setIsPasswordDialogOpen(false);
                        setCurrentPassword('');
                        setNewPassword('');
                        setConfirmNewPassword('');
                    }} color="inherit">
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleChangePasswordSubmit}
                        variant="contained"
                        color="primary"
                        disabled={passwordLoading}
                    >
                        {passwordLoading ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* =========================================
                OVERLAY DE BLOQUEO OFFLINE (Z-INDEX ALTO)
                ========================================= */}
            {isOffline && (
                <Box
                    sx={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        bgcolor: 'rgba(0, 0, 0, 0.75)',
                        zIndex: 9999, // Asegura que bloquee TODOS los menús, diálogos o tablas
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'auto', // Evita que los clicks traspasen
                        color: 'white',
                        backdropFilter: 'blur(5px)'
                    }}
                >
                    <ErrorOutlineIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
                    <Typography variant="h4" fontWeight="bold" gutterBottom align="center">
                        Conexión Perdida
                    </Typography>
                    <Typography variant="body1" sx={{ textAlign: 'center', maxWidth: 500, mb: 4, px: 2, color: '#e2e8f0', fontWeight: 500 }}>
                        Bloqueando acciones para evitar conflictos con el bot médico. Reconectando...
                    </Typography>
                    <CircularProgress color="primary" />
                </Box>
            )}

            {/* =========================================
                BANNER MOMENTÁNEO DE NOTIFICACIONES
                ========================================= */}
            <Snackbar
                open={notificationSnackbar.open}
                autoHideDuration={notificationSnackbar.message?.includes('CRÍTICA') ? 8000 : 5000}
                onClose={() => setNotificationSnackbar({ open: false, message: '' })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                sx={{ zIndex: 9000 }}
            >
                <Alert
                    onClose={() => setNotificationSnackbar({ open: false, message: '' })}
                    severity={notificationSnackbar.message?.includes('CRÍTICA') ? 'error' : 'info'}
                    variant="filled"
                    sx={{ width: '100%', borderRadius: 3, boxShadow: 3, fontWeight: 'bold' }}
                >
                    {notificationSnackbar.message}
                </Alert>
            </Snackbar>

            {/* Versión del Sistema */}
            <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                    position: 'fixed',
                    bottom: 16,
                    right: 24,
                    zIndex: 1000,
                    pointerEvents: 'none',
                    userSelect: 'none'
                }}
            >
                v1.7.0
            </Typography>
        </Box>
    );
};

export default MainLayout;
