import React, { useState, useEffect } from 'react';
import {
    Box, Typography, IconButton, Tooltip, Divider, Dialog, CircularProgress, Button
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import DownloadIcon from '@mui/icons-material/Download';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const formatDateText = (dateString) => {
    if (!dateString) return '';
    return format(new Date(dateString), "d 'de' MMMM, yyyy - h:mm a", { locale: es });
};

const DocumentViewerDialog = ({
    open,
    onClose,
    file,
    url,
    loading
}) => {
    const [viewerFull, setViewerFull] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    // Reset state when opening a new file
    useEffect(() => {
        if (open) {
            setViewerFull(false);
            setZoom(1);
            setPosition({ x: 0, y: 0 });
        }
    }, [open, file]);

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

    return (
        <Dialog
            open={open}
            onClose={onClose}
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
                        <Typography
                            variant="subtitle1"
                            title={file?.nombre}
                            sx={{
                                fontWeight: 'bold',
                                whiteSpace: 'nowrap',
                                textOverflow: 'ellipsis',
                                overflow: 'hidden',
                                lineHeight: 1.2
                            }}
                        >
                            {file?.nombre || 'Archivo'}
                        </Typography>
                        {file?.fecha && (
                            <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                                Subido el {formatDateText(file.fecha)}
                            </Typography>
                        )}
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
                    {url && (
                        <>
                            <Tooltip title="Descargar">
                                <IconButton size="small" component="a" href={url} download={file?.nombre} sx={{ bgcolor: 'action.hover' }}>
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
                        </>
                    )}
                    <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.5 }} />
                    {(file?.tipo?.startsWith('image/') || file?.nombre?.match(/\.(jpg|jpeg|png|gif|webp)$/i)) && url && (
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
                    <IconButton size="small" onClick={onClose} sx={{ bgcolor: 'error.light', color: 'error.main', '&:hover': { bgcolor: 'error.main', color: '#fff' } }}>
                        <CloseIcon />
                    </IconButton>
                </Box>
            </Box>

            <Box sx={{ flex: 1, position: 'relative', bgcolor: '#1e293b', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                {loading ? (
                    <Box sx={{ color: '#fff', textAlign: 'center' }}>
                        <CircularProgress color="inherit" />
                        <Typography sx={{ mt: 2, opacity: 0.8 }}>Cargando previsualización...</Typography>
                    </Box>
                ) : url ? (
                    <>
                        {(file?.tipo?.startsWith('image/') || file?.nombre?.match(/\.(jpg|jpeg|png|gif|webp)$/i)) ? (
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
                                    alt={file?.nombre}
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
                        ) : (file?.tipo === 'application/pdf' || file?.nombre?.toLowerCase().endsWith('.pdf')) ? (
                            <iframe
                                src={url}
                                title={file?.nombre}
                                style={{
                                    width: viewerFull ? '100%' : '50%',
                                    minWidth: viewerFull ? '100%' : '600px',
                                    height: '100%',
                                    border: 'none',
                                    backgroundColor: '#fff',
                                    transition: 'all 0.3s ease-in-out'
                                }}
                            />
                        ) : (
                            <Box sx={{ textAlign: 'center', color: '#fff', p: 4 }}>
                                <InsertDriveFileIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
                                <Typography variant="h6">Previsualización no disponible</Typography>
                                <Typography variant="body2" sx={{ opacity: 0.7, mb: 3 }}>
                                    Este tipo de archivo no se puede mostrar directamente.
                                </Typography>
                                <Button variant="contained" component="a" href={url} download={file?.nombre} startIcon={<DownloadIcon />}>
                                    Descargar para ver
                                </Button>
                            </Box>
                        )}
                    </>
                ) : (
                    <Typography color="error">No se pudo cargar el archivo.</Typography>
                )}
            </Box>
        </Dialog>
    );
};

export default DocumentViewerDialog;
