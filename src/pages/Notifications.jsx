import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import {
    Box,
    Typography,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Chip,
    Paper,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    useTheme,
    useMediaQuery
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CloseIcon from '@mui/icons-material/Close';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { NotificationList, NotificationDetail } from '../components/notifications/NotificationSplitView';
import ConfirmDialog from '../components/ConfirmDialog';

const Notifications = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedNotification, setSelectedNotification] = useState(null);
    const [confirmDeleteDialog, setConfirmDeleteDialog] = useState({ open: false, id: null });
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [filter, setFilter] = useState('all');
    const [notificationPermission, setNotificationPermission] = useState(
        'Notification' in window ? Notification.permission : 'denied'
    );

    const handleRequestNotificationPermission = () => {
        if ('Notification' in window) {
            Notification.requestPermission().then(permission => {
                setNotificationPermission(permission);
            });
        }
    };

    const fetchNotifications = async (isBackground = false) => {
        if (!isBackground) setLoading(true);
        const { data, error } = await supabase
            .from('notificaciones')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching notifications:', error);
        } else {
            const fetchedData = data || [];
            setNotifications(fetchedData);
            // Sync the detail panel if the selected notification was updated externally
            setSelectedNotification(prev => {
                if (!prev) return null;
                const updated = fetchedData.find(n => n.id === prev.id);
                return updated || prev;
            });
        }
        if (!isBackground) setLoading(false);
    };

    const location = useLocation();

    useEffect(() => {
        const query = new URLSearchParams(location.search);
        const filterParam = query.get('filter');
        if (filterParam) setFilter(filterParam);
    }, [location.search]);

    useEffect(() => {
        fetchNotifications(false);

        let debounceTimer;

        const subscription = supabase
            .channel('public:notificaciones_page')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'notificaciones' }, () => {
                if (debounceTimer) clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => fetchNotifications(true), 500);
            })
            .subscribe();

        return () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            supabase.removeChannel(subscription);
        };
    }, []);

    const markAsRead = async (id) => {
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, leido: true } : n));

        await supabase
            .from('notificaciones')
            .update({ leido: true })
            .eq('id', id);
    };

    const confirmDelete = (id) => {
        setConfirmDeleteDialog({ open: true, id });
    };

    const deleteNotification = async () => {
        const id = confirmDeleteDialog.id;
        setConfirmDeleteDialog({ open: false, id: null });
        if (!id) return;

        const previousNotifications = [...notifications];
        setNotifications(prev => prev.filter(n => n.id !== id));

        const { error } = await supabase
            .from('notificaciones')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error al intentar eliminar:', error);
            setNotifications(previousNotifications);
            alert('Hubo un error al eliminar la notificación de la base de datos.');
        }
    };

    const markAllRead = async () => {
        const unreadIds = notifications.filter(n => !n.leido).map(n => n.id);
        if (unreadIds.length === 0) return;

        setNotifications(prev => prev.map(n => ({ ...n, leido: true })));
        await supabase
            .from('notificaciones')
            .update({ leido: true })
            .in('id', unreadIds);
    };

    const handleMarkAsCompleted = async (id) => {
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, completado: true } : n));
        setSelectedNotification(prev => ({ ...prev, completado: true }));

        const { error } = await supabase
            .from('notificaciones')
            .update({ completado: true })
            .eq('id', id);

        if (error) console.error('Error marking as completed:', error);
    };

    const handleMarkAsUncompleted = async (id) => {
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, completado: false } : n));
        setSelectedNotification(prev => ({ ...prev, completado: false }));

        const { error } = await supabase
            .from('notificaciones')
            .update({ completado: false })
            .eq('id', id);

        if (error) console.error('Error unmarking as completed:', error);
    };

    const handleNotificationClick = (notif) => {
        if (!notif.leido) {
            markAsRead(notif.id);
        }
        setSelectedNotification(notif);
        if (isMobile) {
            setIsDialogOpen(true);
        }
    };

    if (loading && notifications.length === 0) {
        return <div className="p-8 text-center text-text-secondary">Cargando notificaciones...</div>;
    }

    const filteredNotifications = notifications.filter(notif => {
        if (filter === 'unread') return !notif.leido;
        if (filter === 'uncompleted') return !notif.completado;
        if (filter === 'emergencies_uncompleted') return !notif.completado && ['URGENCIA', 'EMERGENCIA'].includes(notif.tipo);
        return true; // 'all'
    });

    const filterButtonClass = (currentFilter) => {
        const isSelected = filter === currentFilter;
        if (currentFilter === 'emergencies_uncompleted') {
            return `px-4 py-1.5 rounded-lg border text-sm font-medium transition-colors ${isSelected
                ? 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-600 dark:text-red-400'
                : 'bg-transparent border-slate-300 dark:border-slate-700 text-text-secondary hover:bg-red-50/50 dark:hover:bg-red-900/10 hover:text-red-600'
                }`;
        }
        return `
            px-4 py-1.5 rounded-lg border text-sm font-medium transition-colors bg-transparent
            ${isSelected
                ? 'border-primary text-primary dark:text-primary-light bg-primary/10 dark:bg-primary-900/20'
                : 'border-slate-300 dark:border-slate-700 text-text-secondary hover:bg-slate-50 dark:hover:bg-slate-800'}
        `;
    };

    return (
        <div className={`${isMobile ? 'w-full p-2' : 'w-[95%] p-6'} mx-auto h-[calc(100vh-48px)] flex flex-col gap-6 pb-2`}>
            <div className={`flex ${isMobile ? 'flex-col items-center gap-2' : 'justify-between items-center'} mb-6 flex-shrink-0`}>
                <div className="w-full text-center">
                    <h1 className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-extrabold text-text-primary ${isMobile ? 'text-center' : ''}`}>
                        Centro de Notificaciones
                    </h1>
                </div>
                {notifications.some(n => !n.leido) && (
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={markAllRead}
                        startIcon={<MarkEmailReadIcon />}
                        sx={{
                            borderRadius: '12px',
                            px: 3,
                            py: 1,
                            fontWeight: 'bold',
                            textTransform: 'none',
                            boxShadow: '0px 8px 20px rgba(206, 130, 255, 0.25)',
                            '&:hover': {
                                boxShadow: '0px 10px 25px rgba(206, 130, 255, 0.4)',
                                transform: 'translateY(-1px)'
                            }
                        }}
                    >
                        Marcar todas como leídas
                    </Button>
                )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 flex-shrink-0">
                <div className="flex gap-3 overflow-x-auto pb-2 flex-grow">
                    <button
                        onClick={() => setFilter('all')}
                        className={filterButtonClass('all')}
                    >
                        Todas
                    </button>
                    <button
                        onClick={() => setFilter('unread')}
                        className={filterButtonClass('unread')}
                    >
                        No leídas
                    </button>
                    <button
                        onClick={() => setFilter('uncompleted')}
                        className={filterButtonClass('uncompleted')}
                    >
                        No completadas
                    </button>
                    <button
                        onClick={() => setFilter('emergencies_uncompleted')}
                        className={filterButtonClass('emergencies_uncompleted')}
                    >
                        Emergencias no atendidas
                    </button>
                </div>

                <div className="flex flex-shrink-0 pb-2">
                    <button
                        onClick={handleRequestNotificationPermission}
                        disabled={notificationPermission === 'granted'}
                        className={`px-4 py-1.5 rounded-lg border text-sm font-medium transition-colors flex items-center gap-2 ${notificationPermission === 'granted'
                            ? 'bg-white dark:bg-white border-green-500 text-green-600 dark:text-green-600 opacity-90 cursor-default shadow-sm'
                            : 'bg-transparent border-primary text-primary hover:bg-primary/10 dark:text-primary-light'
                            }`}
                    >
                        {notificationPermission === 'granted' && <CheckCircleOutlineIcon fontSize="small" />}
                        {notificationPermission === 'granted'
                            ? 'Notificaciones en dispositivo activadas'
                            : 'Activar las notificaciones en este dispositivo'}
                    </button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row mt-2 flex-1 min-h-0 bg-surface rounded-2xl overflow-hidden shadow-sm">
                {/* Left Panel: List */}
                <div className={`${isMobile ? 'w-full' : 'w-5/12 lg:w-4/12'} flex-shrink-0 h-full overflow-hidden flex flex-col bg-surface`}>
                    <NotificationList
                        notifications={filteredNotifications}
                        onNotificationClick={handleNotificationClick}
                        onMarkAsRead={markAsRead}
                        onDelete={confirmDelete}
                        selectedId={selectedNotification?.id}
                    />
                </div>

                {/* Right Panel: Detail (Only on Desktop) */}
                {!isMobile && (
                    <div className="w-full md:w-7/12 lg:w-8/12 flex-shrink-0 h-full overflow-hidden bg-surface">
                        <NotificationDetail
                            notification={selectedNotification}
                            onMarkAsCompleted={handleMarkAsCompleted}
                            onMarkAsUncompleted={handleMarkAsUncompleted}
                        />
                    </div>
                )}
            </div>

            {/* Notification Detail Dialog (Only on Mobile) */}
            {isMobile && (
                <Dialog
                    open={isDialogOpen}
                    onClose={() => setIsDialogOpen(false)}
                    fullWidth
                    maxWidth="sm"
                    PaperProps={{
                        sx: { borderRadius: 3, m: 2, maxHeight: '90vh' }
                    }}
                >
                    <DialogTitle sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6" fontWeight="bold">Detalles de Notificación</Typography>
                        <IconButton onClick={() => setIsDialogOpen(false)}>
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent sx={{ p: 0 }}>
                        <NotificationDetail
                            notification={selectedNotification}
                            onMarkAsCompleted={handleMarkAsCompleted}
                            onMarkAsUncompleted={handleMarkAsUncompleted}
                            onClose={() => setIsDialogOpen(false)}
                        />
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={() => setIsDialogOpen(false)} variant="contained" fullWidth>
                            Cerrar
                        </Button>
                    </DialogActions>
                </Dialog>
            )}

            <ConfirmDialog
                open={confirmDeleteDialog.open}
                title="Eliminar Notificación"
                content="¿Estás seguro de que deseas eliminar esta notificación?"
                onConfirm={deleteNotification}
                onCancel={() => setConfirmDeleteDialog({ open: false, id: null })}
                confirmText="Sí, eliminar"
            />
        </div>
    );
};

export default Notifications;
