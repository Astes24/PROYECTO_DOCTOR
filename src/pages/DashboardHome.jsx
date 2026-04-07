import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AssignmentLateIcon from '@mui/icons-material/AssignmentLate';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import { supabase } from '../supabaseClient';
import { formatDate } from '../services/appointmentUtils';
import { addDays } from 'date-fns';
import { Box, Card, CardActionArea, Typography, Skeleton } from '@mui/material';

const DashboardHome = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        pending: 0,
        confirmed: 0,
        confirmedToday: 0,
        confirmedTomorrow: 0,
        notificationsPending: 0,
        notificationsCompleted: 0,
        urgenciesPending: 0,
        botAppointments: 0,
        manualAppointments: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async (isBackground = false) => {
            if (!isBackground) setLoading(true);
            const today = formatDate(new Date());

            // Pending (Future/Today)
            const { count: pendingCount } = await supabase
                .from('citas')
                .select('*', { count: 'exact', head: true })
                .eq('estado', 'PENDIENTE')
                .gte('fecha', today);

            // Confirmed Today
            const { count: confirmedTodayCount } = await supabase
                .from('citas')
                .select('*', { count: 'exact', head: true })
                .eq('estado', 'CONFIRMADA')
                .eq('fecha', today);

            // Confirmed Tomorrow
            const tomorrow = formatDate(addDays(new Date(), 1));
            const { count: confirmedTomorrowCount } = await supabase
                .from('citas')
                .select('*', { count: 'exact', head: true })
                .eq('estado', 'CONFIRMADA')
                .eq('fecha', tomorrow);

            // Notifications pending to resolve
            const { count: notifPendingCount } = await supabase
                .from('notificaciones')
                .select('*', { count: 'exact', head: true })
                .eq('completado', false)
                .in('tipo', ['ALERTA']); // Count only regular alerts

            // Urgencies pending
            const { count: urgenciesPendingCount } = await supabase
                .from('notificaciones')
                .select('*', { count: 'exact', head: true })
                .eq('completado', false)
                .in('tipo', ['URGENCIA', 'EMERGENCIA']);

            // Notifications resolved
            const { count: notifCompletedCount } = await supabase
                .from('notificaciones')
                .select('*', { count: 'exact', head: true })
                .eq('completado', true);

            // Bot Appointments (Total historical or pending/confirmed?)
            // We assume it's pending/confirmed for now to be relevant
            const { count: botCount } = await supabase
                .from('citas')
                .select('*', { count: 'exact', head: true })
                .eq('origen', 'BOT')
                .neq('estado', 'CANCELADA');

            // Manual Appointments
            const { count: manualCount } = await supabase
                .from('citas')
                .select('*', { count: 'exact', head: true })
                .eq('origen', 'MANUAL')
                .neq('estado', 'CANCELADA');

            setStats({
                pending: pendingCount || 0,
                confirmed: (confirmedTodayCount || 0) + (confirmedTomorrowCount || 0),
                confirmedToday: confirmedTodayCount || 0,
                confirmedTomorrow: confirmedTomorrowCount || 0,
                notificationsPending: notifPendingCount || 0,
                notificationsCompleted: notifCompletedCount || 0,
                urgenciesPending: urgenciesPendingCount || 0,
                botAppointments: botCount || 0,
                manualAppointments: manualCount || 0
            });
            if (!isBackground) setLoading(false);
        };

        fetchStats(false);

        let debounceTimer;

        const triggerFetch = () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => fetchStats(true), 500);
        };

        const citasSubscription = supabase
            .channel('public:citas_dashboard')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'citas' }, triggerFetch)
            .subscribe();

        const notifSubscription = supabase
            .channel('public:notificaciones_dashboard')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'notificaciones' }, triggerFetch)
            .subscribe();

        return () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            supabase.removeChannel(citasSubscription);
            supabase.removeChannel(notifSubscription);
        };
    }, []);

    const defaultIconSx = {
        fontSize: 64,
        mb: 2,
        transition: 'transform 0.3s ease-in-out',
        '.MuiCardActionArea-root:hover &': { transform: 'scale(1.1)' }
    };

    const dashboardItems = [
        {
            title: 'Citas por Confirmar',
            value: stats.pending,
            icon: <AccessTimeIcon sx={{ ...defaultIconSx, color: '#D97706' }} />,
            description: 'Citas programadas que requieren confirmación.',
            path: '/appointments?filter=PENDIENTE',
            valueColor: '#D97706'
        },
        {
            title: 'Citas Confirmadas',
            isDateSplitCard: true,
            icon: <CheckCircleOutlineIcon sx={{ ...defaultIconSx, color: '#0D9488' }} />,
            description: 'Citas confirmadas para hoy y mañana.',
            path: '/appointments?filter=CONFIRMADA',
            valueColor: '#0D9488'
        },
        {
            title: 'Origen de las Citas',
            isSplitCard: true,
            icon: <CalendarMonthIcon sx={{ ...defaultIconSx, color: 'primary.main' }} />,
            description: 'Total de citas programadas por IA vs manual.',
            path: '/appointments'
        },
        {
            title: 'Alertas por Resolver',
            value: stats.notificationsPending,
            icon: <AssignmentLateIcon sx={{ ...defaultIconSx, color: '#EA580C' }} />,
            description: 'Notificaciones que requieren atención y seguimiento.',
            path: '/notifications?filter=uncompleted',
            valueColor: '#EA580C'
        },
        {
            title: 'Urgencias por Resolver',
            value: stats.urgenciesPending,
            icon: <ReportProblemIcon sx={{ ...defaultIconSx, color: 'error.main' }} />,
            description: 'Casos urgentes que requieren atención inmediata.',
            path: '/notifications?filter=emergencies_uncompleted',
            valueColor: 'error.main'
        },
        {
            title: 'Alertas Resueltas',
            value: stats.notificationsCompleted,
            icon: <TaskAltIcon sx={{ ...defaultIconSx, color: '#2563EB' }} />,
            description: 'Notificaciones que ya han sido gestionadas.',
            path: '/notifications',
            valueColor: '#2563EB'
        },
    ];

    return (
        <Box sx={{ width: '95%', mx: 'auto', height: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column', p: 3, gap: 3, bgcolor: 'transparent', overflow: 'hidden' }}>
            <Box sx={{ textAlign: 'center', mb: { xs: 1, lg: 3 }, flexShrink: 0 }}>
                <Typography variant="h3" sx={{ fontWeight: 800, mb: 1, color: 'text.primary', fontSize: { xs: '1.8rem', md: '2.5rem', lg: '3rem' } }}>
                    Bienvenido al Panel de <span style={{ color: '#D4AF37' }}>Golden Clinic</span>
                </Typography>
            </Box>

            <Box sx={{ flex: 1, overflowY: 'auto', width: '100%', pb: 3, px: 1 }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8 max-w-6xl mx-auto items-stretch place-content-center">
                    {dashboardItems.map((item, index) => (
                        loading ? (
                            <Skeleton
                                key={`skeleton-${index}`}
                                variant="rectangular"
                                height={220}
                                sx={{ borderRadius: '16px' }}
                            />
                        ) : (
                            <Card
                                key={item.title}
                                sx={{
                                    height: '100%',
                                    minHeight: { xs: 200, md: 220, lg: 240 },
                                    display: 'flex',
                                    flexDirection: 'column',
                                    transition: 'all 0.3s ease-in-out',
                                    '&:hover': { transform: 'translateY(-4px)' }
                                }}
                            >
                                <CardActionArea
                                    onClick={() => navigate(item.path)}
                                    sx={{ height: '100%', flex: 1, p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
                                >
                                    {item.icon}

                                    {item.isDateSplitCard ? (
                                        <Box sx={{ display: 'flex', gap: 3, mb: 1, alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                                            <Box
                                                onMouseDown={(e) => { e.stopPropagation(); }}
                                                onClick={(e) => { e.stopPropagation(); navigate('/appointments?filter=CONFIRMADA&dateFilter=HOY'); }}
                                                sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', px: 2, py: 1, borderRadius: 2, transition: 'background-color 0.2s', '&:hover': { bgcolor: 'action.hover' } }}
                                            >
                                                <Typography sx={{ fontSize: '2.5rem', fontWeight: 800, color: '#0D9488', lineHeight: 1 }}>{stats.confirmedToday}</Typography>
                                                <Typography variant="overline" sx={{ fontWeight: 700, color: 'text.secondary', lineHeight: 1, mt: 0.5 }}>Hoy</Typography>
                                            </Box>
                                            <Box sx={{ width: '2px', height: 40, bgcolor: 'divider' }} />
                                            <Box
                                                onMouseDown={(e) => { e.stopPropagation(); }}
                                                onClick={(e) => { e.stopPropagation(); navigate('/appointments?filter=CONFIRMADA&dateFilter=MANANA'); }}
                                                sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', px: 2, py: 1, borderRadius: 2, transition: 'background-color 0.2s', '&:hover': { bgcolor: 'action.hover' } }}
                                            >
                                                <Typography sx={{ fontSize: '2.5rem', fontWeight: 800, color: '#0D9488', lineHeight: 1 }}>{stats.confirmedTomorrow}</Typography>
                                                <Typography variant="overline" sx={{ fontWeight: 700, color: 'text.secondary', lineHeight: 1, mt: 0.5 }}>Mañana</Typography>
                                            </Box>
                                        </Box>
                                    ) : item.isSplitCard ? (
                                        <Box sx={{ display: 'flex', gap: 3, mb: 1, alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                <Typography sx={{ fontSize: '2.5rem', fontWeight: 800, color: 'primary.main', lineHeight: 1 }}>{stats.botAppointments}</Typography>
                                                <Typography variant="overline" sx={{ fontWeight: 700, color: 'text.secondary', lineHeight: 1, mt: 0.5 }}>Por BOT</Typography>
                                            </Box>
                                            <Box sx={{ width: '2px', height: 40, bgcolor: 'divider' }} />
                                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                <Typography sx={{ fontSize: '2.5rem', fontWeight: 800, color: '#3B82F6', lineHeight: 1 }}>{stats.manualAppointments}</Typography>
                                                <Typography variant="overline" sx={{ fontWeight: 700, color: 'text.secondary', lineHeight: 1, mt: 0.5 }}>Manual</Typography>
                                            </Box>
                                        </Box>
                                    ) : (
                                        <Typography sx={{ fontSize: '2.5rem', fontWeight: 800, mb: 1, color: item.valueColor, lineHeight: 1 }}>
                                            {item.value}
                                        </Typography>
                                    )}

                                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, textAlign: 'center', mt: 1 }}>
                                        {item.title}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                                        {item.description}
                                    </Typography>
                                </CardActionArea>
                            </Card>
                        )
                    ))}
                </div>
            </Box>
        </Box>
    );
};

export default DashboardHome;
