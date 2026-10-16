import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    Box,
    Typography,
    TextField,
    InputAdornment,
    IconButton,
    Avatar,
    Switch,
    CircularProgress,
    Snackbar,
    Alert,
    Tooltip,
    Chip,
    Badge,
    useTheme,
    useMediaQuery,
    Drawer,
    Divider,
    Fade,
    Zoom,
    Dialog,
    Paper,
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import SearchIcon from '@mui/icons-material/Search';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import PersonIcon from '@mui/icons-material/Person';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import DownloadIcon from '@mui/icons-material/Download';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CloseIcon from '@mui/icons-material/Close';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import useLiveChat from '../hooks/useLiveChat';
import { supabase } from '../supabaseClient';

// ─── Helpers ─────────────────────────────────────────────
const capitalizeWords = (str) => {
    if (!str) return '';
    return str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
};

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Hoy';
    if (date.toDateString() === yesterday.toDateString()) return 'Ayer';
    return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
};

const truncate = (str, maxLen = 45) => {
    if (!str) return '';
    return str.length > maxLen ? str.substring(0, maxLen) + '…' : str;
};

// Helper to format WhatsApp-style text (*bold*, _italic_, ~strike~)
const parseWhatsAppFormat = (text) => {
    if (!text) return null;

    // Regular expressions for bold, italic, and strikethrough
    // Bold: *text* -> <b>text</b>
    // Italic: _text_ -> <i>text</i>
    // Strikethrough: ~text~ -> <del>text</del>

    // We split the text by these markers while keeping the markers to identify parts
    const parts = text.split(/(\*.*?\*|_.*?_|~.*?~)/g);

    return parts.map((part, index) => {
        if (part.startsWith('*') && part.endsWith('*')) {
            return <strong key={index}>{part.slice(1, -1)}</strong>;
        }
        if (part.startsWith('_') && part.endsWith('_')) {
            return <em key={index}>{part.slice(1, -1)}</em>;
        }
        if (part.startsWith('~') && part.endsWith('~')) {
            return <del key={index}>{part.slice(1, -1)}</del>;
        }
        return part;
    });
};

// Group messages by date for date separators
const groupMessagesByDate = (messages) => {
    const groups = [];
    let lastDate = null;
    messages.forEach(msg => {
        const msgDate = new Date(msg.created_at).toDateString();
        if (msgDate !== lastDate) {
            groups.push({ type: 'date', date: msg.created_at });
            lastDate = msgDate;
        }
        groups.push({ type: 'message', ...msg });
    });
    return groups;
};


// ═══════════════════════════════════════════════════════════
//  CONTACT LIST ITEM
// ═══════════════════════════════════════════════════════════
const ContactItem = ({ contact, isSelected, onClick, theme }) => {
    return (
        <Box
            onClick={onClick}
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 2,
                py: 1.5,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                bgcolor: isSelected
                    ? (theme.palette.mode === 'dark' ? 'rgba(var(--c-primary-rgb), 0.12)' : 'rgba(var(--c-primary-rgb), 0.08)')
                    : 'transparent',
                borderLeft: isSelected ? '3px solid' : '3px solid transparent',
                borderLeftColor: isSelected ? 'primary.main' : 'transparent',
                '&:hover': {
                    bgcolor: isSelected
                        ? (theme.palette.mode === 'dark' ? 'rgba(var(--c-primary-rgb), 0.15)' : 'rgba(var(--c-primary-rgb), 0.1)')
                        : (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'),
                },
            }}
        >
            <Badge
                overlap="circular"
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                badgeContent={
                    contact.botActive
                        ? <SmartToyIcon sx={{ fontSize: 12, color: '#20C997' }} />
                        : <SupportAgentIcon sx={{ fontSize: 12, color: '#FF6B6B' }} />
                }
                sx={{
                    '& .MuiBadge-badge': {
                        bgcolor: theme.palette.background.paper,
                        border: '2px solid',
                        borderColor: theme.palette.background.paper,
                        borderRadius: '50%',
                        p: 0.1,
                        minWidth: 18,
                        height: 18,
                    }
                }}
            >
                <Avatar
                    sx={{
                        width: 44,
                        height: 44,
                        bgcolor: isSelected ? 'primary.main' : (theme.palette.mode === 'dark' ? '#374151' : 'var(--c-primary-soft)'),
                        color: isSelected ? 'primary.contrastText' : 'primary.main',
                        fontSize: '1rem',
                        fontWeight: 700,
                    }}
                >
                    {contact.name?.charAt(0)?.toUpperCase() || '?'}
                </Avatar>
            </Badge>

            <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography
                        variant="body2"
                        sx={{
                            fontWeight: isSelected ? 700 : 600,
                            color: 'text.primary',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: 150,
                            fontSize: '0.85rem',
                        }}
                    >
                        {capitalizeWords(contact.name)}
                    </Typography>
                    <Typography
                        variant="caption"
                        sx={{ color: 'text.secondary', fontSize: '0.7rem', flexShrink: 0 }}
                    >
                        {formatTime(contact.lastMessageTime)}
                    </Typography>
                </Box>
                <Typography
                    variant="caption"
                    sx={{
                        color: 'text.secondary',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: '0.75rem',
                        lineHeight: 1.3,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5
                    }}
                >
                    {contact.lastMessageRole === 'model' && (
                        <SmartToyIcon sx={{ fontSize: 13, opacity: 0.7 }} />
                    )}
                    {contact.lastMessageRole === 'manual' && (
                        <SupportAgentIcon sx={{ fontSize: 13, opacity: 0.7 }} />
                    )}
                    {contact.lastMessageType === 'image' && <span style={{ marginRight: 4 }}>📷 Foto</span>}
                    {contact.lastMessageType === 'video' && <span style={{ marginRight: 4 }}>🎥 Video</span>}
                    {contact.lastMessageType === 'document' && <span style={{ marginRight: 4 }}>📄 Documento</span>}
                    {truncate(contact.lastMessage || '', 40)}
                </Typography>
            </Box>
        </Box>
    );
};

// ═══════════════════════════════════════════════════════════
//  MEDIA RENDERER
// ═══════════════════════════════════════════════════════════
const MediaRenderer = ({ msg }) => {
    const [url, setUrl] = useState(null);
    const [loading, setLoading] = useState(true);

    // Viewer State
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerFull, setViewerFull] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 4));
    const handleZoomOut = () => {
        setZoom(prev => {
            const next = Math.max(prev - 0.25, 0.5);
            if (next === 1) setPosition({ x: 0, y: 0 });
            return next;
        });
    };
    const handleResetZoom = () => {
        setZoom(1);
        setPosition({ x: 0, y: 0 });
    };

    const handleMouseDown = (e) => {
        if (zoom <= 1) return;
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = (e) => {
        if (!isDragging || zoom <= 1) return;
        setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    };

    const handleMouseUp = () => setIsDragging(false);

    useEffect(() => {
        const fetchUrl = async () => {
            // If it's a direct public link (e.g., promotional flyer sent by bot)
            if (msg?.metadatos?.media_url_publica) {
                setUrl(msg.metadatos.media_url_publica);
                setLoading(false);
                return;
            }

            if (!msg?.metadatos?.media_path) {
                setLoading(false);
                return;
            }
            try {
                // Since chats_adjuntos is private, we request a signed URL.
                const { data, error } = await supabase.storage
                    .from('chats_adjuntos')
                    .createSignedUrl(msg.metadatos.media_path, 3600);
                if (error) throw error;
                setUrl(data?.signedUrl);
            } catch (err) {
                console.error("Error fetching media url:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchUrl();
    }, [msg]);

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress size={20} /></Box>;
    }

    if (!url) {
        return <Typography variant="caption" color="text.secondary">Multimedio no disponible</Typography>;
    }

    if (msg.tipo_mensaje === 'video') {
        return (
            <Box sx={{ mt: 1, mb: 1, borderRadius: 2, overflow: 'hidden', display: 'flex' }}>
                <video src={url} controls style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '8px' }} />
            </Box>
        );
    }

    const isImage = msg.tipo_mensaje === 'image';
    const isDocument = msg.tipo_mensaje === 'document';

    const renderViewerDialog = () => (
        <Dialog
            open={viewerOpen}
            onClose={() => setViewerOpen(false)}
            maxWidth={viewerFull ? false : "lg"}
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: viewerFull ? 0 : 4,
                    height: viewerFull ? '100vh' : '90vh',
                    width: viewerFull ? '100vw' : 'auto',
                    maxWidth: viewerFull ? '100vw' : 'lg',
                    m: viewerFull ? 0 : 2,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    transition: 'all 0.3s ease-in-out'
                }
            }}
        >
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, overflow: 'hidden', flex: 1 }}>
                    <InsertDriveFileIcon color="primary" sx={{ flexShrink: 0 }} />
                    <Box sx={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', lineHeight: 1.2 }}>
                            {msg.tipo_mensaje === 'image' ? 'Imagen de Chat' : msg.tipo_mensaje === 'video' ? 'Video de Chat' : 'Documento de Chat'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                            {formatDate(msg.created_at)}
                        </Typography>
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
                    <Tooltip title="Descargar">
                        <IconButton size="small" component="a" href={url} download sx={{ bgcolor: 'action.hover' }}>
                            <DownloadIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Abrir en pestaña nueva">
                        <IconButton size="small" onClick={() => window.open(url, '_blank')} sx={{ bgcolor: 'action.hover' }}>
                            <OpenInNewIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={viewerFull ? "Reducir" : "Expandir a toda la pantalla"}>
                        <IconButton size="small" onClick={() => setViewerFull(!viewerFull)} sx={{ bgcolor: viewerFull ? 'primary.main' : 'action.hover', color: viewerFull ? '#fff' : 'inherit', '&:hover': { bgcolor: viewerFull ? 'primary.dark' : 'action.selected' } }}>
                            {viewerFull ? <FullscreenExitIcon /> : <FullscreenIcon />}
                        </IconButton>
                    </Tooltip>
                    <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.5 }} />
                    {isImage && (
                        <Box sx={{ display: 'flex', gap: 0.5, bgcolor: 'action.hover', borderRadius: 2, p: 0.5 }}>
                            <Tooltip title="Alejar">
                                <IconButton size="small" onClick={handleZoomOut} disabled={zoom <= 0.5}><ZoomOutIcon fontSize="small" /></IconButton>
                            </Tooltip>
                            <Box sx={{ display: 'flex', alignItems: 'center', px: 1 }}>
                                <Typography variant="caption" sx={{ fontWeight: 'bold', minWidth: 35, textAlign: 'center' }}>
                                    {Math.round(zoom * 100)}%
                                </Typography>
                            </Box>
                            <Tooltip title="Acercar">
                                <IconButton size="small" onClick={handleZoomIn} disabled={zoom >= 4}><ZoomInIcon fontSize="small" /></IconButton>
                            </Tooltip>
                            <Tooltip title="Restablecer">
                                <IconButton size="small" onClick={handleResetZoom}><RestartAltIcon fontSize="small" /></IconButton>
                            </Tooltip>
                        </Box>
                    )}
                    <IconButton size="small" onClick={() => setViewerOpen(false)} sx={{ bgcolor: 'error.light', color: 'error.main', '&:hover': { bgcolor: 'error.main', color: '#fff' } }}>
                        <CloseIcon />
                    </IconButton>
                </Box>
            </Box>

            <Box sx={{ flex: 1, position: 'relative', bgcolor: '#1e293b', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                {isImage ? (
                    <Box
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        sx={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                            overflow: 'hidden',
                            userSelect: 'none',
                            touchAction: 'none'
                        }}
                    >
                        <Box
                            component="img"
                            src={url}
                            alt="Chat attachment"
                            onDragStart={(e) => e.preventDefault()}
                            draggable={false}
                            sx={{
                                maxWidth: '100%',
                                maxHeight: '100%',
                                objectFit: 'contain',
                                boxShadow: zoom > 1 ? 0 : 10,
                                borderRadius: 1,
                                transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                                transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                                cursor: zoom > 1 ? 'inherit' : 'default'
                            }}
                        />
                    </Box>
                ) : (
                    <iframe
                        src={url}
                        title="Documento"
                        style={{
                            width: viewerFull ? '100%' : '50%',
                            minWidth: viewerFull ? '100%' : '600px',
                            height: '100%',
                            border: 'none',
                            backgroundColor: '#fff',
                            transition: 'all 0.3s ease-in-out'
                        }}
                    />
                )}
            </Box>
        </Dialog>
    );

    return (
        <React.Fragment>
            <Box sx={{ mt: 1, mb: 1, borderRadius: 2, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {isImage ? (
                    <img
                        src={url}
                        alt="chat media"
                        style={{ maxWidth: '100%', maxHeight: '250px', borderRadius: '8px', cursor: 'zoom-in', objectFit: 'cover' }}
                        onClick={() => {
                            setZoom(1);
                            setPosition({ x: 0, y: 0 });
                            setViewerOpen(true);
                        }}
                    />
                ) : (
                    <Paper
                        variant="outlined"
                        onClick={() => setViewerOpen(true)}
                        sx={{
                            p: 1.5,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            cursor: 'pointer',
                            bgcolor: 'rgba(0,0,0,0.03)',
                            '&:hover': { bgcolor: 'rgba(0,0,0,0.06)' },
                            borderRadius: 2,
                            border: '1px solid rgba(0,0,0,0.1)',
                            width: 'fit-content',
                            maxWidth: '100%'
                        }}
                    >
                        <InsertDriveFileIcon color="primary" />
                        <Box sx={{ overflow: 'hidden' }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                                {msg.metadatos?.filename || 'Documento'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Haga clic para ver
                            </Typography>
                        </Box>
                    </Paper>
                )}
            </Box>
            {renderViewerDialog()}
        </React.Fragment>
    );
};

// ═══════════════════════════════════════════════════════════
//  CHAT BUBBLE
// ═══════════════════════════════════════════════════════════
const ChatBubble = ({ msg, theme }) => {
    const isBot = msg.rol === 'model';
    const isManual = msg.rol === 'manual';
    const isUser = msg.rol === 'user';
    const isOutgoing = isBot || isManual;

    return (
        <Fade in timeout={300}>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: isOutgoing ? 'flex-end' : 'flex-start',
                    px: 2,
                    mb: 0.8,
                }}
            >
                <Box
                    sx={{
                        maxWidth: '70%',
                        minWidth: 80,
                        px: 2,
                        py: 1,
                        borderRadius: isOutgoing
                            ? '16px 16px 4px 16px'
                            : '16px 16px 16px 4px',
                        bgcolor: isBot
                            ? (theme.palette.mode === 'dark' ? '#1B5E20' : '#DCF8C6')
                            : isManual
                                ? (theme.palette.mode === 'dark' ? '#0D47A1' : '#E3F2FD')
                                : (theme.palette.mode === 'dark' ? '#2d2d2d' : '#FFFFFF'),
                        color: isBot
                            ? (theme.palette.mode === 'dark' ? '#E8F5E9' : '#1B3A1B')
                            : isManual
                                ? (theme.palette.mode === 'dark' ? '#E3F2FD' : '#0D47A1')
                                : 'text.primary',
                        boxShadow: theme.palette.mode === 'dark'
                            ? '0 1px 3px rgba(0,0,0,0.3)'
                            : '0 1px 3px rgba(0,0,0,0.08)',
                        border: isBot
                            ? 'none'
                            : `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                        position: 'relative',
                    }}
                >
                    {(msg.tipo_mensaje === 'image' || msg.tipo_mensaje === 'video' || msg.tipo_mensaje === 'document') && (
                        <MediaRenderer msg={msg} />
                    )}
                    {msg.contenido && (
                        <Typography
                            variant="body2"
                            sx={{
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                fontSize: '0.875rem',
                                lineHeight: 1.5,
                            }}
                        >
                            {parseWhatsAppFormat(msg.contenido)}
                        </Typography>
                    )}
                    <Typography
                        variant="caption"
                        sx={{
                            display: 'block',
                            textAlign: 'right',
                            mt: 0.3,
                            fontSize: '0.65rem',
                            color: isOutgoing
                                ? (theme.palette.mode === 'dark' ? 'rgba(232, 245, 233, 0.6)' : 'rgba(0, 0, 0, 0.45)')
                                : 'text.secondary',
                            opacity: 0.8,
                        }}
                    >
                        {formatTime(msg.created_at)}
                    </Typography>
                </Box>
            </Box>
        </Fade>
    );
};

// ═══════════════════════════════════════════════════════════
//  DATE SEPARATOR
// ═══════════════════════════════════════════════════════════
const DateSeparator = ({ dateStr }) => (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 1.5 }}>
        <Chip
            label={formatDate(dateStr)}
            size="small"
            sx={{
                fontSize: '0.7rem',
                fontWeight: 600,
                bgcolor: 'rgba(0,0,0,0.06)',
                color: 'text.secondary',
                height: 24,
            }}
        />
    </Box>
);


// ═══════════════════════════════════════════════════════════
//  EMPTY STATE
// ═══════════════════════════════════════════════════════════
const EmptyState = () => (
    <Box
        sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            opacity: 0.4,
            userSelect: 'none',
        }}
    >
        <ChatBubbleOutlineIcon sx={{ fontSize: 80, color: 'text.secondary' }} />
        <Typography variant="h6" color="text.secondary" fontWeight={600}>
            Selecciona un chat
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center" maxWidth={300}>
            Elige un paciente de la lista para ver sus mensajes y gestionar la conversación.
        </Typography>
    </Box>
);


// ═══════════════════════════════════════════════════════════
//  MAIN COMPONENT: LiveChat
// ═══════════════════════════════════════════════════════════
const LiveChat = () => {
    const theme = useTheme();
    const location = useLocation();
    const navigate = useNavigate();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [searchTerm, setSearchTerm] = useState('');
    const [messageInput, setMessageInput] = useState('');
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
    const [selectedAttachment, setSelectedAttachment] = useState(null);

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const contentWrapperRef = useRef(null);
    const isAtBottomRef = useRef(true);
    const lockBottomRef = useRef(false);
    const [showScrollBottom, setShowScrollBottom] = useState(false);

    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        const diff = scrollHeight - scrollTop - clientHeight;

        // Saber si estamos pegados al fondo (damos 150px de tolerancia)
        isAtBottomRef.current = diff < 150;

        const isScrolledUp = diff > 300;
        setShowScrollBottom(isScrolledUp);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const {
        contacts,
        messages,
        selectedPhone,
        loadingContacts,
        loadingMessages,
        sendingMessage,
        togglingBot,
        error,
        setError,
        selectChat,
        toggleBot,
        sendMessage,
        sendMediaMessage,
        selectedContact,
        showAllContacts,
        setShowAllContacts,
        hasMoreMessages,
        loadFullHistory,
        manualCount,
    } = useLiveChat();

    // Mantenemos al usuario en el fondo si el contenedor del chat crece (ej: una imagen terminó de cargar)
    useEffect(() => {
        const wrapper = contentWrapperRef.current;
        if (!wrapper) return;

        const resizeObserver = new ResizeObserver(() => {
            // Si el usuario estaba al final, o estamos en el periodo de "anclaje inicial", forzamos el scroll
            if (isAtBottomRef.current || lockBottomRef.current) {
                requestAnimationFrame(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
                });
            }
        });

        resizeObserver.observe(wrapper);
        return () => resizeObserver.disconnect();
    }, [selectedPhone, loadingMessages]); // Se re-conecta cuando cambia el chat o termina de cargar

    // Check for phone number in URL to open chat directly
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const phoneFromUrl = params.get('phone');

        if (phoneFromUrl) {
            // Wait for contacts to be loaded first
            if (!loadingContacts) {
                const contactExists = contacts.find(c => c.phone === phoneFromUrl);

                // If we haven't fetched all contacts, and the contact doesn't seem to be in the recent list
                if (!contactExists && !showAllContacts) {
                    setShowAllContacts(true);
                } else if (selectedPhone !== phoneFromUrl) {
                    selectChat(phoneFromUrl);
                    // Clear the phone parameter from URL so it doesn't force re-selection
                    navigate('/live-chat', { replace: true });
                } else if (selectedPhone === phoneFromUrl) {
                    // It's already selected, just clean URL
                    navigate('/live-chat', { replace: true });
                }
            }
        }
    }, [location.search, contacts, loadingContacts, showAllContacts, selectedPhone, selectChat, setShowAllContacts, navigate]);

    // Scroll al último mensaje de forma directa al cargar o recibir mensajes
    useEffect(() => {
        if (!loadingMessages && messagesEndRef.current && selectedPhone) {
            // Activamos el "anclaje magnético" durante 2 segundos para compensar carga de multimedia
            isAtBottomRef.current = true;
            lockBottomRef.current = true;

            const lockTimer = setTimeout(() => {
                lockBottomRef.current = false;
            }, 2500);

            const scrollToBottomInstant = () => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
            };

            scrollToBottomInstant();
            const t1 = setTimeout(scrollToBottomInstant, 100);
            const t2 = setTimeout(scrollToBottomInstant, 400);
            const t3 = setTimeout(scrollToBottomInstant, 800);

            return () => {
                clearTimeout(lockTimer);
                clearTimeout(t1);
                clearTimeout(t2);
                clearTimeout(t3);
            };
        } else {
            // Si deseleccionamos o empezamos a cargar otro, quitamos el lock
            lockBottomRef.current = false;
        }
    }, [messages, loadingMessages, selectedPhone]);

    // Show errors as snackbar
    useEffect(() => {
        if (error) {
            setSnackbar({ open: true, message: error, severity: 'error' });
            setError(null);
        }
    }, [error, setError]);

    // Filter contacts by search
    const filteredContacts = useMemo(() => {
        if (!searchTerm.trim()) return contacts;
        const lower = searchTerm.toLowerCase();
        return contacts.filter(c =>
            c.name?.toLowerCase().includes(lower) ||
            c.phone?.includes(lower) ||
            c.dni?.includes(lower)
        );
    }, [contacts, searchTerm]);

    // ─── Handlers ────────────────────────────────────────────
    const handleSelectChat = (phone) => {
        selectChat(phone);
        if (isMobile) setMobileDrawerOpen(false);
        setMessageInput('');
    };

    const handleSendMessage = async () => {
        if ((!messageInput.trim() && !selectedAttachment) || !selectedPhone || sendingMessage) return;
        const text = messageInput;
        const file = selectedAttachment;

        setMessageInput('');
        setSelectedAttachment(null);
        if (fileInputRef.current) fileInputRef.current.value = '';

        try {
            if (file) {
                await sendMediaMessage(selectedPhone, file, text);
            } else {
                await sendMessage(selectedPhone, text);
            }
        } catch {
            setMessageInput(text); // Restore on failure
            setSelectedAttachment(file);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleToggleBot = () => {
        if (!selectedContact || togglingBot) return;

        // Verificar límite de 24 horas de WhatsApp (solo restringe pasar a modo Manual, no de regreso a Bot)
        if (selectedContact.botActive && selectedContact.lastMessageTime) {
            const lastMsgDate = new Date(selectedContact.lastMessageTime);
            const now = new Date();
            const diffHours = (now - lastMsgDate) / (1000 * 60 * 60);

            if (diffHours >= 24) {
                setSnackbar({
                    open: true,
                    message: 'Acción bloqueada: El último mensaje del paciente fue hace más de 24 horas. WhatsApp no permite iniciar chats libres fuera de este marco base.',
                    severity: 'warning'
                });
                return;
            }
        }

        toggleBot(selectedContact.phone, selectedContact.botActive);
    };

    // Build grouped messages with date separators
    const groupedMessages = useMemo(() => groupMessagesByDate(messages), [messages]);

    const isBotActive = selectedContact?.botActive ?? true;

    // ─── Sidebar Content ─────────────────────────────────────
    const sidebarContent = (
        <Box
            sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: 'background.paper',
                borderRight: isMobile ? 'none' : `1px solid ${theme.palette.divider}`,
                borderRadius: isMobile ? 0 : '16px 0 0 16px',
                overflow: 'hidden',
            }}
        >
            {/* Sidebar Header */}
            <Box
                sx={{
                    px: 2.5,
                    py: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(var(--c-primary-rgb), 0.05)' : 'rgba(var(--c-primary-rgb), 0.03)',
                }}
            >
                <WhatsAppIcon sx={{ color: '#25D366', fontSize: 28 }} />
                <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }}>
                    Conversaciones
                </Typography>
                <Chip
                    label={contacts.length}
                    size="small"
                    sx={{
                        fontWeight: 700,
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        height: 24,
                        fontSize: '0.75rem',
                    }}
                />
            </Box>

            {/* Search */}
            <Box sx={{ px: 2, py: 1.5 }}>
                <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Buscar paciente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    size="small"
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon color="action" sx={{ fontSize: 20 }} />
                            </InputAdornment>
                        ),
                    }}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            borderRadius: 3,
                            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                            height: 40,
                        }
                    }}
                />
            </Box>

            {/* Contact List */}
            <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                {loadingContacts ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                        <CircularProgress size={32} sx={{ color: 'var(--c-primary-text)' }} />
                    </Box>
                ) : filteredContacts.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 6, px: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                            {searchTerm ? 'No se encontraron pacientes' : 'No hay conversaciones'}
                        </Typography>
                    </Box>
                ) : (
                    <>
                        {filteredContacts.map(contact => (
                            <ContactItem
                                key={contact.phone}
                                contact={contact}
                                isSelected={contact.phone === selectedPhone}
                                onClick={() => handleSelectChat(contact.phone)}
                                theme={theme}
                            />
                        ))}

                        {!showAllContacts && (
                            <Box sx={{ p: 2, textAlign: 'center' }}>
                                <Typography
                                    variant="caption"
                                    color="primary"
                                    sx={{ cursor: 'pointer', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}
                                    onClick={() => setShowAllContacts(true)}
                                >
                                    Cargar chats más antiguos
                                </Typography>
                            </Box>
                        )}
                    </>
                )}
            </Box>
        </Box>
    );


    return (
        <Box
            sx={{
                width: isMobile ? '100%' : '95%',
                mx: 'auto',
                height: isMobile ? '100dvh' : 'calc(100vh - 48px)', // Use dvh for mobile to handle bars/keyboard
                display: 'flex',
                flexDirection: 'column',
                p: isMobile ? 0 : 3,
                gap: isMobile ? 0 : 3,
                bgcolor: 'transparent',
                overflow: isMobile ? 'hidden' : 'visible' // Prevent outer scroll on mobile
            }}
        >
            {/* Header */}
            <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: isMobile ? 'center' : 'flex-start',
                gap: 2,
                mb: isMobile ? 0.5 : 2,
                px: isMobile ? 2 : 0,
                pt: isMobile ? 7 : 0, // Extra padding to clear floating buttons (Menu/Notifications)
                position: 'relative',
                flexShrink: 0
            }}>
                <Typography variant={isMobile ? "h6" : "h3"} sx={{
                    fontWeight: 800,
                    color: 'text.primary',
                    textAlign: isMobile ? 'center' : 'left'
                }}>
                    Live Chat
                </Typography>
                <Chip
                    icon={<WhatsAppIcon sx={{ fontSize: 16 }} />}
                    label="WhatsApp"
                    size="small"
                    sx={{
                        bgcolor: '#25D36620',
                        color: '#25D366',
                        fontWeight: 600,
                        border: '1px solid #25D36640',
                        '& .MuiChip-icon': { color: '#25D366' },
                        display: isMobile ? 'none' : 'flex' // Ocultar chip en móvil para centralizar mejor el título
                    }}
                />
            </Box>

            {/* Main Layout: Sidebar + Chat */}
            <Box
                sx={{
                    flex: 1,
                    display: 'flex',
                    bgcolor: 'background.paper',
                    borderRadius: isMobile ? 0 : 4,
                    overflow: 'hidden',
                    boxShadow: isMobile ? 'none' : theme.shadows[2],
                    minHeight: 0,
                }}
            >
                {/* ─── Sidebar ─── */}
                {(!isMobile || !selectedPhone) && (
                    <Box sx={{ width: isMobile ? '100%' : 340, height: '100%' }}>
                        {sidebarContent}
                    </Box>
                )}

                {/* ─── Chat Area ─── */}
                {(!isMobile || selectedPhone) && (
                    <Box
                        sx={{
                            flex: 1,
                            display: selectedPhone ? 'flex' : (isMobile ? 'none' : 'flex'),
                            flexDirection: 'column',
                            minWidth: 0,
                            bgcolor: theme.palette.mode === 'dark' ? '#1a1a2e' : 'var(--c-primary-soft)',
                            position: 'relative',
                        }}
                    >
                        {selectedPhone && selectedContact ? (
                            <>
                                {/* ── Chat Header ── */}
                                <Box
                                    sx={{
                                        px: isMobile ? 1.5 : 2.5,
                                        py: 1.5,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: isMobile ? 1 : 2,
                                        borderBottom: `1px solid ${theme.palette.divider}`,
                                        bgcolor: theme.palette.mode === 'dark'
                                            ? 'rgba(var(--c-primary-rgb), 0.04)'
                                            : 'rgba(255, 255, 255, 0.8)',
                                        backdropFilter: 'blur(10px)',
                                        minHeight: 65,
                                    }}
                                >
                                    {/* Mobile back button */}
                                    {isMobile && (
                                        <IconButton
                                            size="small"
                                            onClick={() => selectChat(null)}
                                        >
                                            <ArrowBackIcon />
                                        </IconButton>
                                    )}

                                    {/* Avatar */}
                                    <Avatar
                                        sx={{
                                            width: 42,
                                            height: 42,
                                            bgcolor: 'primary.main',
                                            color: 'primary.contrastText',
                                            fontWeight: 700,
                                        }}
                                    >
                                        {selectedContact.name?.charAt(0)?.toUpperCase() || '?'}
                                    </Avatar>

                                    {/* Name + Phone */}
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography
                                            variant="subtitle1"
                                            sx={{
                                                fontWeight: 700,
                                                lineHeight: 1.2,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {capitalizeWords(selectedContact.name)}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                            {selectedContact.phone} · DNI: {selectedContact.dni}
                                        </Typography>
                                    </Box>

                                    {/* Bot Toggle */}
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: isMobile ? 0.5 : 1,
                                            px: isMobile ? 1 : 2,
                                            py: 0.75,
                                            borderRadius: 3,
                                            bgcolor: isBotActive
                                                ? (theme.palette.mode === 'dark' ? 'rgba(32, 201, 151, 0.1)' : 'rgba(32, 201, 151, 0.08)')
                                                : (theme.palette.mode === 'dark' ? 'rgba(255, 107, 107, 0.1)' : 'rgba(255, 107, 107, 0.08)'),
                                            border: '1px solid',
                                            borderColor: isBotActive ? 'rgba(32, 201, 151, 0.3)' : 'rgba(255, 107, 107, 0.3)',
                                            transition: 'all 0.3s ease',
                                        }}
                                    >
                                        {isBotActive ? (
                                            <SmartToyIcon sx={{ fontSize: 20, color: '#20C997' }} />
                                        ) : (
                                            <SupportAgentIcon sx={{ fontSize: 20, color: '#FF6B6B' }} />
                                        )}
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                fontWeight: 700,
                                                fontSize: '0.75rem',
                                                color: isBotActive ? '#20C997' : '#FF6B6B',
                                                whiteSpace: 'nowrap',
                                                display: isMobile ? 'none' : 'block'
                                            }}
                                        >
                                            {isBotActive ? '🤖 Bot Activo' : '🙍‍♀️ Control Humano'}
                                        </Typography>
                                        <Tooltip
                                            title={isBotActive ? 'Desactivar IA para tomar control manual' : 'Reactivar la IA'}
                                            arrow
                                        >
                                            <Switch
                                                checked={isBotActive}
                                                onChange={handleToggleBot}
                                                disabled={togglingBot}
                                                size="small"
                                                sx={{
                                                    '& .MuiSwitch-switchBase.Mui-checked': {
                                                        color: '#20C997',
                                                        '&:hover': { bgcolor: 'rgba(32, 201, 151, 0.08)' },
                                                    },
                                                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                                        bgcolor: '#20C997',
                                                    },
                                                    '& .MuiSwitch-track': {
                                                        bgcolor: '#FF6B6B',
                                                        opacity: 0.6,
                                                    },
                                                }}
                                            />
                                        </Tooltip>
                                    </Box>
                                </Box>

                                {/* ── Messages Area ── */}
                                <Box
                                    ref={scrollContainerRef}
                                    onScroll={handleScroll}
                                    sx={{
                                        flex: 1,
                                        overflowY: 'auto',
                                        overflowX: 'hidden',
                                        py: 2,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        // Subtle chat pattern background
                                        backgroundImage: theme.palette.mode === 'dark'
                                            ? 'none'
                                            : 'radial-gradient(circle at 20% 50%, rgba(var(--c-primary-rgb),0.02) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(182,240,254,0.03) 0%, transparent 50%)',
                                    }}
                                >
                                    {loadingMessages ? (
                                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                                            <CircularProgress size={36} sx={{ color: 'var(--c-primary-text)' }} />
                                        </Box>
                                    ) : (
                                        <Box ref={contentWrapperRef} sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                            {hasMoreMessages && (
                                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                                                    <Typography
                                                        variant="caption"
                                                        color="primary"
                                                        sx={{ cursor: 'pointer', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}
                                                        onClick={loadFullHistory}
                                                    >
                                                        Cargar historial completo
                                                    </Typography>
                                                </Box>
                                            )}
                                            {groupedMessages.map((item, idx) => {
                                                if (item.type === 'date') {
                                                    return <DateSeparator key={`date-${idx}`} dateStr={item.date} />;
                                                }
                                                return <ChatBubble key={item.id || idx} msg={item} theme={theme} />;
                                            })}
                                            <div ref={messagesEndRef} />
                                        </Box>
                                    )}
                                </Box>

                                {/* Scroll to bottom button */}
                                <Zoom in={showScrollBottom}>
                                    <IconButton
                                        onClick={scrollToBottom}
                                        sx={{
                                            position: 'absolute',
                                            // Posicionarlo dinámicamente sobre el área de entrada
                                            bottom: isBotActive ? 150 : 100,
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            bgcolor: 'primary.main',
                                            color: 'var(--c-on-primary)',
                                            boxShadow: 4,
                                            '&:hover': {
                                                bgcolor: 'primary.dark',
                                                transform: 'translateX(-50%) scale(1.1)',
                                            },
                                            zIndex: 10,
                                            transition: 'all 0.2s ease',
                                        }}
                                    >
                                        <KeyboardArrowDownIcon />
                                    </IconButton>
                                </Zoom>

                                {/* ── Input Area ── */}
                                <Box
                                    sx={{
                                        px: 2,
                                        py: 1.5,
                                        borderTop: `1px solid ${theme.palette.divider}`,
                                        bgcolor: theme.palette.mode === 'dark'
                                            ? 'rgba(255,255,255,0.02)'
                                            : 'rgba(255,255,255,0.85)',
                                        backdropFilter: 'blur(10px)',
                                    }}
                                >
                                    {/* Warning when bot is active */}
                                    {isBotActive && (
                                        <Fade in>
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1,
                                                    px: 2,
                                                    py: 1,
                                                    mb: 1,
                                                    borderRadius: 2,
                                                    bgcolor: theme.palette.mode === 'dark'
                                                        ? 'rgba(255, 152, 0, 0.1)'
                                                        : 'rgba(255, 152, 0, 0.06)',
                                                    border: '1px solid rgba(255, 152, 0, 0.2)',
                                                }}
                                            >
                                                <SmartToyIcon sx={{ fontSize: 18, color: '#FF9800' }} />
                                                <Typography variant="caption" sx={{ color: '#FF9800', fontWeight: 600, fontSize: '0.75rem' }}>
                                                    El bot está atendiendo este chat. Desactívalo para escribir manualmente.
                                                </Typography>
                                            </Box>
                                        </Fade>
                                    )}

                                    {selectedAttachment && (
                                        <Box sx={{ mb: 1, p: 1, bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <InsertDriveFileIcon color="primary" fontSize="small" />
                                            <Typography variant="caption" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                                                {selectedAttachment.name}
                                            </Typography>
                                            <IconButton size="small" onClick={() => {
                                                setSelectedAttachment(null);
                                                if (fileInputRef.current) fileInputRef.current.value = '';
                                            }}>
                                                <CloseIcon fontSize="small" />
                                            </IconButton>
                                        </Box>
                                    )}

                                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            style={{ display: 'none' }}
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    setSelectedAttachment(e.target.files[0]);
                                                }
                                            }}
                                        />
                                        <Tooltip title={isBotActive ? 'Desactiva el bot primero' : 'Adjuntar archivo'} arrow>
                                            <span>
                                                <IconButton
                                                    onClick={() => fileInputRef.current?.click()}
                                                    disabled={isBotActive || sendingMessage}
                                                    sx={{
                                                        color: 'text.secondary',
                                                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
                                                        borderRadius: 3,
                                                        width: 48,
                                                        height: 48,
                                                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                                                    }}
                                                >
                                                    <AttachFileIcon />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                        <TextField
                                            variant="outlined"
                                            multiline
                                            maxRows={4}
                                            placeholder={isBotActive ? (isMobile ? 'IA activa...' : 'Desactiva el bot primero...') : 'Escribe...'}
                                            value={messageInput}
                                            onChange={(e) => setMessageInput(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            disabled={isBotActive || sendingMessage}
                                            sx={{
                                                flex: 1,
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: 3,
                                                    bgcolor: theme.palette.mode === 'dark'
                                                        ? 'rgba(255,255,255,0.05)'
                                                        : '#FFFFFF',
                                                },
                                                opacity: isBotActive ? 0.5 : 1,
                                                transition: 'opacity 0.3s ease',
                                            }}
                                        />
                                        <Tooltip title={isBotActive ? 'Desactiva el bot primero' : 'Enviar mensaje'} arrow>
                                            <span> {/* span wraps disabled button for tooltip */}
                                                <IconButton
                                                    onClick={handleSendMessage}
                                                    disabled={isBotActive || (!messageInput.trim() && !selectedAttachment) || sendingMessage}
                                                    sx={{
                                                        bgcolor: 'primary.main',
                                                        color: 'primary.contrastText',
                                                        borderRadius: 3,
                                                        width: 48,
                                                        height: 48,
                                                        transition: 'all 0.2s ease',
                                                        '&:hover': {
                                                            bgcolor: 'primary.dark',
                                                            transform: 'scale(1.05)',
                                                        },
                                                        '&:disabled': {
                                                            bgcolor: 'action.disabledBackground',
                                                            color: 'action.disabled',
                                                        },
                                                    }}
                                                >
                                                    {sendingMessage ? (
                                                        <CircularProgress size={22} sx={{ color: 'inherit' }} />
                                                    ) : (
                                                        <SendIcon sx={{ fontSize: 22 }} />
                                                    )}
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                    </Box>
                                </Box>
                            </>
                        ) : (
                            <EmptyState />
                        )}
                    </Box>
                )}
            </Box>

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={5000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    severity={snackbar.severity}
                    sx={{
                        width: '100%',
                        borderRadius: 3,
                        boxShadow: 3,
                        bgcolor: snackbar.severity === 'error' ? undefined : '#1F2937',
                        color: snackbar.severity === 'error' ? undefined : '#FFFFFF',
                        '& .MuiAlert-icon': {
                            color: snackbar.severity === 'error' ? undefined : '#B6F0FE'
                        },
                    }}
                    variant={snackbar.severity === 'error' ? 'filled' : 'standard'}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default LiveChat;
