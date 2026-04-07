import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { Box, Typography, IconButton, Tooltip, Chip, Button } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';

export const NotificationList = ({ notifications, onNotificationClick, onMarkAsRead, onDelete, selectedId }) => {
    if (notifications.length === 0) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-transparent">
                <Typography color="text.secondary">No hay notificaciones para este filtro.</Typography>
            </div>
        );
    }

    const sortedNotifications = [...notifications].sort((a, b) => {
        const URGENCY_TYPES = ['URGENCIA', 'EMERGENCIA', 'URGENTE', 'CRITICAL', 'CRÍTICO'];
        const msgA = a.mensaje?.toUpperCase() || '';
        const msgB = b.mensaje?.toUpperCase() || '';
        const isAUrgency = URGENCY_TYPES.includes(a.tipo?.trim().toUpperCase()) || msgA.includes('URGENCIA') || msgA.includes('EMERGENCIA');
        const isBUrgency = URGENCY_TYPES.includes(b.tipo?.trim().toUpperCase()) || msgB.includes('URGENCIA') || msgB.includes('EMERGENCIA');

        const aUnresUrg = isAUrgency && !a.completado;
        const bUnresUrg = isBUrgency && !b.completado;
        if (aUnresUrg && !bUnresUrg) return -1;
        if (!aUnresUrg && bUnresUrg) return 1;
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

    return (
        <Box sx={{ flex: 1, width: '100%', maxHeight: '100%', overflowY: 'auto' }}>
            {sortedNotifications.map((notif) => {
                const URGENCY_TYPES = ['URGENCIA', 'EMERGENCIA', 'URGENTE', 'CRITICAL', 'CRÍTICO'];
                const msgUpper = notif.mensaje?.toUpperCase() || '';
                const isUrgency = URGENCY_TYPES.includes(notif.tipo?.trim().toUpperCase()) || msgUpper.includes('URGENCIA') || msgUpper.includes('EMERGENCIA');
                const isUnresolvedUrgency = isUrgency && !notif.completado;
                const isSelected = selectedId === notif.id;
                const bgcolor = 'transparent';

                return (
                    <Box
                        key={notif.id}
                        onClick={() => onNotificationClick(notif)}
                        sx={{
                            position: 'relative',
                            p: 2,
                            borderBottom: '1px solid',
                            borderBottomColor: 'divider',
                            bgcolor: bgcolor,
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            transition: 'all 0.2s',
                            '&:hover': {
                                bgcolor: 'action.hover',
                            },
                            '&:hover .actions': {
                                opacity: 1
                            }
                        }}
                        className="group"
                    >
                        {/* Selected Indicator Bar */}
                        {isSelected && (
                            <Box sx={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                bottom: 0,
                                width: 4,
                                bgcolor: 'primary.main',
                                borderTopRightRadius: 4,
                                borderBottomRightRadius: 4,
                                zIndex: 2
                            }} />
                        )}

                        {/* Urgency Highlight Area (Limited to icon area) - Only for UNRESOLVED */}
                        {isUnresolvedUrgency && (
                            <Box sx={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                bottom: 0,
                                width: 56, // covers icon area
                                bgcolor: 'error.main',
                                opacity: 0.1,
                                zIndex: 0
                            }} />
                        )}

                        <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 2, alignItems: 'center', width: '100%', zIndex: 1 }}>
                            {/* Column 1: Icon */}
                            <Box sx={{
                                color: isUnresolvedUrgency ? '#000000' : (isUrgency ? 'error.main' : 'info.main'),
                                display: 'flex',
                                alignItems: 'center'
                            }}>
                                {isUrgency ? <ErrorOutlineIcon fontSize="medium" /> : <InfoOutlinedIcon fontSize="medium" />}
                            </Box>

                            {/* Column 2: Titles */}
                            <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, justifyContent: 'center' }}>
                                <Typography
                                    component="h3"
                                    variant="subtitle2"
                                    sx={{
                                        fontWeight: isUrgency ? 'bold' : '800',
                                        color: isUrgency ? 'error.dark' : (notif.leido ? 'text.secondary' : 'primary.main'),
                                    }}
                                >
                                    {isUrgency ? 'URGENCIA' : 'ALERTA'}
                                </Typography>
                                <Typography
                                    variant="caption"
                                    sx={{
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                        color: isUrgency ? '#7f1d1d' : (notif.leido ? 'text.disabled' : 'text.primary'),
                                        fontWeight: isUrgency ? '600' : 'inherit',
                                        lineHeight: 1.2,
                                        mt: 0.5
                                    }}
                                >
                                    {isUrgency
                                        ? "Paciente reporta emergencia/urgencia"
                                        : notif.mensaje.replace(/alerta bot:?\s*/i, '').trim()}
                                </Typography>
                            </Box>

                            {/* Column 3: Date/Time */}
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', position: 'relative', minWidth: 80 }}>
                                <Box className="date-time-col" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', transition: 'opacity 0.2s', opacity: 1 }}>
                                    <Typography variant="caption" sx={{ color: isUrgency ? '#7f1d1d' : 'text.primary', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                                        {new Date(notif.created_at).toLocaleDateString()}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: isUrgency ? '#991b1b' : 'text.secondary', whiteSpace: 'nowrap' }}>
                                        {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                    </Typography>
                                </Box>
                                <Box className="actions" sx={{ display: 'flex', gap: 0.5, opacity: 0, transition: 'opacity 0.2s', position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)' }}>
                                    {!notif.leido && (
                                        <Tooltip title="Marcar como leída">
                                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onMarkAsRead(notif.id); }} sx={{ bgcolor: 'background.paper', boxShadow: 1, '&:hover': { bgcolor: 'success.light', color: 'success.main' } }}>
                                                <CheckCircleOutlineIcon fontSize="small" color="success" />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                    <Tooltip title="Eliminar">
                                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDelete(notif.id); }} sx={{ bgcolor: 'background.paper', boxShadow: 1, '&:hover': { bgcolor: 'error.light', color: 'error.main' } }}>
                                            <DeleteOutlineIcon fontSize="small" color="error" />
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                            </Box>
                        </Box>
                    </Box>
                );
            })}
        </Box>
    );
};

export const NotificationDetail = ({ notification, onMarkAsCompleted, onMarkAsUncompleted, onClose }) => {
    const navigate = useNavigate();
    const [patientInfo, setPatientInfo] = useState(null);

    useEffect(() => {
        let isMounted = true;
        const fetchPatientDetails = async () => {
            if (!notification || !notification.telefono_paciente) {
                if (isMounted) setPatientInfo(null);
                return;
            }

            try {
                // Remove prefixes or spaces just in case
                const cleanPhone = notification.telefono_paciente.replace(/\D/g, '').slice(-9);

                const { data, error } = await supabase
                    .from('pacientes')
                    .select('nombre_completo, fecha_nacimiento, dni, telefono_principal')
                    .like('telefono_principal', `%${cleanPhone}%`) // Match roughly
                    .limit(1)
                    .single();

                if (error) throw error;
                if (isMounted && data) {
                    setPatientInfo(data);
                }
            } catch (error) {
                console.error("No se pudo obtener información extra del paciente:", error);
                if (isMounted) setPatientInfo(null);
            }
        };

        fetchPatientDetails();
        return () => { isMounted = false; };
    }, [notification?.telefono_paciente]);

    if (!notification) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-transparent">
                <InfoOutlinedIcon sx={{ fontSize: 60, mb: 2, opacity: 0.2, color: 'text.secondary' }} />
                <Typography variant="h6" fontWeight="bold" color="text.secondary">Selecciona una notificación</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Haz clic en un elemento de la lista para ver detalles.</Typography>
            </div>
        );
    }

    const URGENCY_TYPES = ['URGENCIA', 'EMERGENCIA', 'URGENTE', 'CRITICAL', 'CRÍTICO'];
    const msgUpper = notification.mensaje?.toUpperCase() || '';
    const isUrgency = URGENCY_TYPES.includes(notification.tipo?.trim().toUpperCase()) || msgUpper.includes('URGENCIA') || msgUpper.includes('EMERGENCIA');
    const cleanMessage = notification.mensaje.replace(/alerta bot:?\s*/i, '').trim();

    return (
        <Box sx={{ height: '100%', bgcolor: 'background.paper', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Detail Header */}
            <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: isUrgency ? 'error.light' : 'divider', bgcolor: isUrgency ? 'error.light' : 'transparent', opacity: isUrgency ? 0.95 : 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    {isUrgency ? <ErrorOutlineIcon sx={{ color: 'error.dark' }} fontSize="large" /> : <InfoOutlinedIcon color="info" fontSize="large" />}
                    <Box>
                        <Typography variant="h5" fontWeight="black" sx={{ color: isUrgency ? 'error.dark' : 'text.primary' }}>
                            {isUrgency ? 'Urgencia / Emergencia' : 'Alerta'}
                        </Typography>
                        <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 'bold', mt: 0.5 }}>
                            {isUrgency ? 'Atención Prioritaria Requerida' : 'Revisión de Consulta'}
                        </Typography>
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', mt: 2 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'action.disabled' }} />
                        Recibido: {new Date(notification.created_at).toLocaleString()}
                    </Typography>
                    {notification.completado ? (
                        <Chip label="Resuelto" size="small" color="success" sx={{ fontWeight: 'bold' }} />
                    ) : (
                        <Chip label="Pendiente" size="small" color={isUrgency ? "error" : "warning"} sx={{ fontWeight: 'bold' }} />
                    )}
                </Box>
            </Box>

            {/* Detail Body */}
            <Box sx={{ p: 3, flex: 1, overflowY: 'auto' }}>
                <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" sx={{ textTransform: 'uppercase', fontWeight: 700, color: 'text.secondary', display: 'block', mb: 1 }}>
                        Contexto del Paciente (Bot)
                    </Typography>
                    <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2, borderLeft: '4px solid', borderColor: 'divider', boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)' }}>
                        <Typography variant="body1" sx={{ whiteSpace: 'pre-line', color: 'text.primary', fontStyle: 'italic', fontSize: '1.05rem', lineHeight: 1.6 }}>
                            "{cleanMessage}"
                        </Typography>
                    </Box>
                </Box>

                {notification.telefono_paciente && (
                    <Box sx={{ mt: 4, p: 2, bgcolor: 'background.default', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="caption" sx={{ textTransform: 'uppercase', fontWeight: 700, color: 'text.secondary', display: 'block', mb: 2 }}>
                            Información del Paciente
                        </Typography>

                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                            <Box>
                                <Typography variant="caption" sx={{ textTransform: 'uppercase', fontWeight: 600, color: 'text.secondary', display: 'block' }}>Nombre Completo</Typography>
                                <Typography variant="body2" fontWeight="bold" color="text.primary">
                                    {patientInfo?.nombre_completo || 'No registrado'}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" sx={{ textTransform: 'uppercase', fontWeight: 600, color: 'text.secondary', display: 'block' }}>Documento / DNI</Typography>
                                <Typography variant="body2" fontWeight="bold" color="text.primary">
                                    {patientInfo?.dni || 'No registrado'}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" sx={{ textTransform: 'uppercase', fontWeight: 600, color: 'text.secondary', display: 'block' }}>Edad</Typography>
                                <Typography variant="body2" fontWeight="bold" color="text.primary">
                                    {(() => {
                                        if (!patientInfo?.fecha_nacimiento || patientInfo?.fecha_nacimiento === '-') return 'No registrada';
                                        try {
                                            const birthDate = new Date(patientInfo.fecha_nacimiento);
                                            const today = new Date();
                                            let age = today.getFullYear() - birthDate.getFullYear();
                                            const m = today.getMonth() - birthDate.getMonth();
                                            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                                                age--;
                                            }
                                            return `${age} años`;
                                        } catch (e) { return 'Desconocida'; }
                                    })()}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" sx={{ textTransform: 'uppercase', fontWeight: 600, color: 'text.secondary', display: 'block' }}>Teléfono de Contacto</Typography>
                                <Typography variant="body2" fontWeight="bold" color="primary.main">
                                    {notification.telefono_paciente}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                )}
            </Box>

            {/* Detail Actions */}
            <Box sx={{ p: 3, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'transparent', display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center', justifyContent: 'flex-end' }}>
                {notification.completado ? (
                    <Button
                        onClick={() => onMarkAsUncompleted(notification.id)}
                        color="warning"
                        variant="outlined"
                        sx={{ mr: 'auto', fontWeight: 'bold', textTransform: 'none', borderRadius: 2 }}
                    >
                        Reabrir (No completado)
                    </Button>
                ) : (
                    <Button
                        onClick={() => onMarkAsCompleted(notification.id)}
                        variant="contained"
                        sx={{ mr: 'auto', fontWeight: 'bold', textTransform: 'none', borderRadius: 2, bgcolor: isUrgency ? 'error.main' : 'primary.main', '&:hover': { bgcolor: isUrgency ? 'error.dark' : 'primary.dark' } }}
                    >
                        Marcar como Resuelto
                    </Button>
                )}

                {notification.telefono_paciente && (
                    <Button
                        startIcon={<WhatsAppIcon />}
                        variant="contained"
                        color="success"
                        onClick={() => {
                            if (onClose) onClose();
                            navigate(`/live-chat?phone=${notification.telefono_paciente.replace(/\D/g, '')}`);
                        }}
                        sx={{ fontWeight: 'bold', textTransform: 'none', borderRadius: 2 }}
                    >
                        Contactar WhatsApp
                    </Button>
                )}
            </Box>
        </Box>
    );
};
