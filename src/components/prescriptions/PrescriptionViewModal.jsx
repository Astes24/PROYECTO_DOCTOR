import React, { useState, useEffect, useCallback } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Box, Button, Typography, IconButton, Divider,
    Chip, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, useTheme, Tooltip, useMediaQuery,
    CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PrintIcon from '@mui/icons-material/Print';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import BlockIcon from '@mui/icons-material/Block';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import MedicationIcon from '@mui/icons-material/Medication';
import PortraitIcon from '@mui/icons-material/Portrait';
import LandscapeIcon from '@mui/icons-material/Landscape';
import { getClinicInfo } from '../../services/clinicService';

// ---- Formato de fecha ----
const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr + (dateStr.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('es-PE', {
        day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Lima'
    });
};

// ---- Formato de Nombre Con Prefijo (Solo si es nombre de persona) ----
const formatDoctorName = (name) => {
    if (!name) return '-';
    if (name.includes('Dra.') || name.includes('DRA.') || name.toLowerCase().includes('consultorio')) return name;
    return `Dra. ${name}`;
};

// ---- Estado Badge (Sober Design) ----
const EstadoBadge = ({ estado }) => {
    const isAnulada = estado === 'ANULADA';
    return (
        <Chip
            label={isAnulada ? 'ANULADA' : 'EMITIDA'}
            size="small"
            sx={{
                bgcolor: isAnulada ? '#FEE2E2' : '#D1FAE5',
                color: isAnulada ? '#EF4444' : '#10B981',
                fontWeight: 800,
                fontSize: '0.7rem',
                letterSpacing: '0.05em',
                height: 22,
                px: 0.5
            }}
        />
    );
};

// ============================================
// MODAL VER RECETA MÉDICA (ESTILO SOBER)
// ============================================
const PrescriptionViewModal = ({ open, onClose, prescription, onVoid, onDelete }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [clinicInfo, setClinicInfo] = useState(null);
    const [loadingClinic, setLoadingClinic] = useState(false);
    const [showPdfInstructions, setShowPdfInstructions] = useState(false);
    const [orientation, setOrientation] = useState('landscape');

    const prx = prescription;

    // ---- Cargar info de clínica ----
    const loadClinic = useCallback(async () => {
        setLoadingClinic(true);
        const { data } = await getClinicInfo();
        if (data) setClinicInfo(data);
        setLoadingClinic(false);
    }, []);

    useEffect(() => {
        if (open) {
            loadClinic();
        }
    }, [open, loadClinic]);

    if (!open) return null;

    // ---- Lógica de Impresión (Copia fiel del Contenido del Modal) ----
    const handlePrint = () => {
        if (!prx) return;

        const win = window.open('', '_blank');
        const formattedDoctor = formatDoctorName(prx.medico_nombre);
        const clinicName = clinicInfo?.nombre_clinica || 'Violeta Mendoza';
        
        const content = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8" />
                <title>Receta Médica ${prx.numero_receta}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                        padding: 10mm; 
                        background: #FDFBFF;
                        color: #1e293b;
                    }
                    .modal-content-replica { 
                        background: #FDFBFF;
                        width: 100%;
                    }
                    
                    /* Header Sincronizado */
                    .header-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
                    .clinic-info h6 { font-size: 1.25rem; font-weight: 900; color: #FF80AB; text-transform: uppercase; letter-spacing: 0.05em; line-height: 1.2; margin-bottom: 10px; }
                    .clinic-info p { font-size: 0.875rem; color: #64748b; font-weight: 600; margin-bottom: 2px; }
                    .receipt-id { text-align: right; }
                    .receipt-id h4 { font-size: 2.125rem; font-weight: 900; color: #1e293b; letter-spacing: -0.025em; line-height: 1.1; text-transform: uppercase; margin-bottom: 10px; }
                    .receipt-id p { font-size: 1rem; color: #64748b; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }

                    /* Secciones Genéricas */
                    .section-title { font-size: 0.75rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px; display: block; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; }
                    
                    /* Grid de Información */
                    .info-row { display: flex; flex-wrap: wrap; gap: 32px; margin-bottom: 40px; margin-top: 12px; }
                    .info-field { min-width: 140px; display: flex; flex-direction: column; gap: 2px; }
                    .info-field label { font-size: 0.75rem; color: #94a3b8; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; }
                    .info-field span { font-size: 0.875rem; color: #1e293b; font-weight: 600; }
                    .info-field.bold span { font-weight: 800; }

                    /* Tabla de Medicamentos Sincronizada */
                    .med-container { 
                        background: white;
                        border-radius: 12px;
                        padding: 24px;
                        border: 1px solid #e2e8f0;
                        margin-bottom: 40px;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.02);
                    }
                    .med-table { width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
                    .med-table th { background: #FDFBFF; padding: 12px; text-align: left; font-size: 0.7rem; font-weight: 800; color: #64748b; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
                    .med-table td { padding: 12px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
                    .item-num { font-size: 0.85rem; font-weight: 700; color: #FF80AB; text-align: center; }
                    .med-name { font-size: 0.875rem; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
                    .med-badges { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 4px; align-items: center; }
                    .med-badge { background: rgba(255, 128, 171, 0.1); color: #FF80AB; font-size: 0.75rem; font-weight: 600; padding: 2px 8px; border-radius: 4px; }
                    .med-spec { font-size: 0.75rem; color: #64748b; font-weight: 500; }
                    .med-ind { font-size: 0.75rem; color: #64748b; font-weight: 500; font-style: italic; margin-top: 4px; display: block; }

                    /* Footer en 2 columnas */
                    .footer-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 20px; }
                    .footer-col { display: flex; flex-direction: column; gap: 12px; }
                    .obs-text { font-size: 0.875rem; color: #1e293b; font-weight: 500; white-space: pre-wrap; }
                    .empty-text { color: #94a3b8; font-style: italic; font-size: 0.875rem; }

                    @media print {
                        @page { size: A4 ${orientation}; margin: 0; }
                        body { -webkit-print-color-adjust: exact; padding: 10mm; }
                    }
                </style>
            </head>
            <body>
                <div class="modal-content-replica">
                    <!-- Header -->
                    <div class="header-top">
                        <div class="clinic-info">
                            <h6>${clinicName}</h6>
                            <p>${prx.medico_direccion || clinicInfo?.direccion || '-'}</p>
                            <p>Tel: ${clinicInfo?.telefono || '-'} · Email: ${clinicInfo?.email || '-'}</p>
                        </div>
                        <div class="receipt-id">
                            <h4>Receta Médica</h4>
                            <p>N°: ${prx.numero_receta} · ${formatDate(prx.fecha)}</p>
                        </div>
                    </div>

                    <!-- Médico Info -->
                    <span class="section-title">Información del Médico</span>
                    <div class="info-row">
                        <div class="info-field bold"><label>Médico</label><span>${formattedDoctor}</span></div>
                        <div class="info-field"><label>CMP</label><span>${prx.medico_cmp || '-'}</span></div>
                        <div class="info-field"><label>RNE</label><span>${prx.medico_rne || '-'}</span></div>
                        <div class="info-field"><label>Especialidad</label><span>${prx.medico_especialidad || '-'}</span></div>
                    </div>

                    <!-- Paciente Info -->
                    <span class="section-title">Información del Paciente</span>
                    <div class="info-row">
                        <div class="info-field bold"><label>Nombre Completo</label><span>${prx.paciente_nombre || '-'}</span></div>
                        <div class="info-field"><label>DNI</label><span>${prx.paciente_dni || '-'}</span></div>
                        <div class="info-field"><label>Edad</label><span>${prx.paciente_edad || '-'}</span></div>
                        <div class="info-field"><label>Fecha Emisión</label><span>${formatDate(prx.fecha)}</span></div>
                    </div>
                    ${prx.diagnostico ? `
                    <div class="info-row" style="margin-top: -20px;">
                        <div class="info-field"><label>Diagnóstico Clínico</label><span>${prx.diagnostico}</span></div>
                    </div>` : ''}

                    <!-- Medicamentos -->
                    <span class="section-title">Medicamentos Prescritos</span>
                    <div class="med-container">
                        <table class="med-table">
                            <thead>
                                <tr>
                                    <th style="width: 40px; text-align: center;">#</th>
                                    <th>DESCRIPCIÓN Y DOSIS</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${prx.items?.map((item, idx) => `
                                    <tr>
                                        <td><div class="item-num">${idx + 1}</div></td>
                                        <td>
                                            <div class="med-name">${item.medicamento} ${item.concentracion ? `(${item.concentracion})` : ''}</div>
                                            <div class="med-badges">
                                                ${item.dosis ? `<span class="med-badge">${item.dosis}</span>` : ''}
                                                ${item.frecuencia ? `<span class="med-spec">${item.frecuencia}</span>` : ''}
                                                ${item.duracion ? `<span class="med-spec">${item.duracion}</span>` : ''}
                                                ${item.via_administracion ? `<span class="med-spec">Vía: ${item.via_administracion}</span>` : ''}
                                            </div>
                                            ${item.indicaciones ? `<span class="med-ind">${item.indicaciones}</span>` : ''}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>

                    <!-- Footer -->
                    <div class="footer-layout">
                        <div class="footer-col">
                            <span class="section-title">Instrucciones Generales</span>
                            <div class="obs-text">${prx.observaciones || '<span class="empty-text">Sin observaciones registradas</span>'}</div>
                        </div>
                        <div class="footer-col">
                            <span class="section-title">Control Médico</span>
                            <div class="info-field bold">
                                <label>Próxima Cita</label>
                                <span>${formatDate(prx.proxima_cita) || '<span class="empty-text">No programada</span>'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;

        win.document.write(content);
        win.document.close();
        win.focus();
        
        setTimeout(() => {
            win.print();
            win.close();
        }, 500);
    };

    const handleConfirmSavePdf = () => {
        setShowPdfInstructions(false);
        handlePrint();
    };

    const loading = (open && !prx) || loadingClinic;

    return (
        <>
            {/* ---- Instrucciones PDF ---- */}
            <Dialog
                open={showPdfInstructions}
                onClose={() => setShowPdfInstructions(false)}
                PaperProps={{ sx: { borderRadius: 3, maxWidth: 400 } }}
            >
                <DialogTitle sx={{ fontWeight: 800, color: '#FF80AB', textAlign: 'center' }}>
                    Instrucciones de Descarga
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500, textAlign: 'center' }}>
                        En la nueva pestaña que se abrirá, selecciona la impresora de <strong>Guardar como PDF</strong> para descargar el archivo correctamente.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 0 }}>
                    <Button 
                        onClick={() => setShowPdfInstructions(false)} 
                        sx={{ color: 'text.secondary', fontWeight: 600 }}
                    >
                        Cancelar
                    </Button>
                    <Button 
                        onClick={handleConfirmSavePdf}
                        variant="contained"
                        autoFocus
                        sx={{ 
                            bgcolor: '#FF80AB', 
                            fontWeight: 800,
                            borderRadius: 2,
                            '&:hover': { bgcolor: '#F48FB1' }
                        }}
                    >
                        Continuar
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={open}
                onClose={onClose}
                maxWidth={false}
                fullWidth={false}
                PaperProps={{
                    sx: {
                        width: isMobile ? '95%' : '80%',
                        maxWidth: 'none',
                        height: '95vh',
                        maxHeight: '95vh',
                        borderRadius: 3,
                        overflow: 'hidden',
                        background: theme.palette.mode === 'dark' ? '#1e293b' : '#fff',
                    }
                }}
            >
                {/* ---- HEADER MODAL (NO IMPRESO) ---- */}
                <DialogTitle
                    sx={{
                        bgcolor: 'background.paper',
                        color: 'text.primary',
                        px: { xs: 3, sm: 4 },
                        py: 2,
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        flexShrink: 0,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                    }}
                >
                    <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        width: 40, 
                        height: 40, 
                        borderRadius: 2, 
                        bgcolor: '#FFF0F7', 
                        color: '#FF80AB',
                        flexShrink: 0
                    }}>
                        <MedicalServicesIcon sx={{ fontSize: 24 }} />
                    </Box>
                    
                    {prx && <EstadoBadge estado={prx.estado} />}

                    <IconButton 
                        onClick={onClose} 
                        sx={{ ml: 'auto', color: 'text.secondary', '&:hover': { bgcolor: '#FFF0F7', color: '#FF80AB' } }} 
                        size="small"
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>

                <DialogContent sx={{ pt: 10, pb: 4, px: 4, overflowY: 'auto', bgcolor: '#FDFBFF' }}>
                    
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                            <CircularProgress sx={{ color: '#FF80AB' }} />
                        </Box>
                    ) : prx ? (
                        <>
                            {/* Replica del contenido que ahora también es el de impresión */}
                            <Box sx={{ mb: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                                    <Typography variant="h6" sx={{ fontWeight: 900, color: '#FF80AB', textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1.2 }}>
                                        {clinicInfo?.nombre_clinica || 'Violeta Mendoza'}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                                        {prx.medico_direccion || clinicInfo?.direccion || 'Dirección de consulta'}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {clinicInfo?.telefono && `Tel: ${clinicInfo.telefono}`}
                                        {clinicInfo?.telefono && clinicInfo?.email && ' · '}
                                        {clinicInfo?.email && `Email: ${clinicInfo.email}`}
                                    </Typography>
                                </Box>

                                <Box sx={{ textAlign: 'right' }}>
                                    <Typography variant="h4" sx={{ fontWeight: 900, color: 'text.primary', letterSpacing: '-0.025em', lineHeight: 1.1, textTransform: 'uppercase' }}>
                                        Receta Médica
                                    </Typography>
                                    <Typography variant="subtitle1" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', mt: 0.5 }}>
                                        N°: {prx.numero_receta} · {formatDate(prx.fecha)}
                                    </Typography>
                                </Box>
                            </Box>

                            <Box sx={{ mb: 6 }}>
                                <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.disabled', letterSpacing: '0.1em' }}>
                                    Información del Médico
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 4, mt: 1.5, flexWrap: 'wrap' }}>
                                    <InfoField label="Médico" value={formatDoctorName(prx.medico_nombre) || '-'} bold />
                                    <InfoField label="CMP" value={prx.medico_cmp || '-'} />
                                    <InfoField label="RNE" value={prx.medico_rne || '-'} />
                                    <InfoField label="Especialidad" value={prx.medico_especialidad || '-'} />
                                </Box>
                            </Box>

                            <Box sx={{ mb: 6 }}>
                                <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.disabled', letterSpacing: '0.1em' }}>
                                    Información del Paciente
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 4, mt: 1.5, flexWrap: 'wrap' }}>
                                    <InfoField label="Nombre Completo" value={prx.paciente_nombre || '-'} bold />
                                    <InfoField label="DNI" value={prx.paciente_dni || '-'} />
                                    <InfoField label="Edad" value={prx.paciente_edad || '-'} />
                                    <InfoField label="Fecha Emisión" value={formatDate(prx.fecha)} />
                                </Box>
                                {prx.diagnostico && (
                                    <Box sx={{ mt: 3 }}>
                                        <InfoField label="Diagnóstico Clínico" value={prx.diagnostico} />
                                    </Box>
                                )}
                            </Box>

                            <Box sx={{ mb: 6 }}>
                                <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.disabled', letterSpacing: '0.1em', mb: 1.5, display: 'block' }}>
                                    Medicamentos Prescritos
                                </Typography>
                                <Box sx={{
                                    bgcolor: 'white',
                                    borderRadius: 3,
                                    p: 3,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                }}>
                                    <TableContainer component={Box} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow sx={{ bgcolor: '#FDFBFF' }}>
                                                    <TableCell align="center" sx={{ fontWeight: 800, fontSize: '0.7rem', color: 'text.secondary', width: 40 }}>#</TableCell>
                                                    <TableCell sx={{ fontWeight: 800, fontSize: '0.7rem', color: 'text.secondary' }}>DESCRIPCIÓN Y DOSIS</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {prx.items?.map((item, idx) => (
                                                    <TableRow key={item.id} sx={{ '&:hover': { bgcolor: 'rgba(255, 128, 171, 0.02)' } }}>
                                                        <TableCell align="center">
                                                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#FF80AB' }}>{idx + 1}</Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Box sx={{ py: 1 }}>
                                                                <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                                                                    {item.medicamento} {item.concentracion && `(${item.concentracion})`}
                                                                </Typography>
                                                                <Box sx={{ display: 'flex', gap: 1.5, mt: 0.5, flexWrap: 'wrap' }}>
                                                                    {item.dosis && (
                                                                        <Typography variant="caption" sx={{ bgcolor: 'rgba(255, 128, 171, 0.1)', color: '#FF80AB', px: 1, borderRadius: 1, fontWeight: 600 }}>
                                                                            {item.dosis}
                                                                        </Typography>
                                                                    )}
                                                                    {item.frecuencia && <Typography variant="caption" color="text.secondary">{item.frecuencia}</Typography>}
                                                                    {item.duracion && <Typography variant="caption" color="text.secondary">{item.duracion}</Typography>}
                                                                    {item.via_administracion && <Typography variant="caption" color="text.secondary">Vía: {item.via_administracion}</Typography>}
                                                                </Box>
                                                                {item.indicaciones && (
                                                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic', display: 'block', mt: 0.5 }}>
                                                                        {item.indicaciones}
                                                                    </Typography>
                                                                )}
                                                            </Box>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Box>
                            </Box>

                            <Box sx={{ mb: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 4 }}>
                                <Box>
                                    <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.disabled', letterSpacing: '0.1em' }}>
                                        Instrucciones Generales
                                    </Typography>
                                    <Box sx={{ mt: 1.5 }}>
                                        {prx.observaciones ? (
                                            <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500, whiteSpace: 'pre-wrap' }}>
                                                {prx.observaciones}
                                            </Typography>
                                        ) : (
                                            <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                                                Sin observaciones registradas
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>
                                
                                <Box>
                                    <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.disabled', letterSpacing: '0.1em' }}>
                                        Control Médico
                                    </Typography>
                                    <Box sx={{ mt: 1.5 }}>
                                        {prx.proxima_cita ? (
                                            <InfoField label="Próxima Cita" value={formatDate(prx.proxima_cita)} bold />
                                        ) : (
                                            <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                                                No programada
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>
                            </Box>
                        </>
                    ) : null}
                </DialogContent>

                <DialogActions sx={{ px: 4, py: 3, bgcolor: '#FDFBFF', borderTop: '1px solid', borderColor: 'divider', gap: 2 }}>
                    <Box sx={{ display: 'flex', gap: 1, flex: 1 }}>
                        {prx && prx.estado !== 'ANULADA' && (
                            <Button
                                variant="text" color="error" size="small"
                                startIcon={<BlockIcon />}
                                onClick={() => onVoid?.(prx.id)}
                                sx={{ fontWeight: 700, '&:hover': { bgcolor: 'error.main', color: 'white' } }}
                            >
                                Anular Receta
                            </Button>
                        )}
                        {prx && prx.estado === 'ANULADA' && (
                            <Button
                                variant="text" color="error" size="small"
                                startIcon={<DeleteForeverIcon />}
                                onClick={() => onDelete?.(prx.id)}
                                sx={{ fontWeight: 700, '&:hover': { bgcolor: 'error.main', color: 'white' } }}
                            >
                                Eliminar
                            </Button>
                        )}
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', ml: 2 }}>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.disabled', mr: 1 }}>ORIENTACIÓN:</Typography>
                        <Tooltip title="Vertical">
                            <IconButton 
                                size="small" 
                                onClick={() => setOrientation('portrait')}
                                sx={{ 
                                    bgcolor: orientation === 'portrait' ? '#FFF0F7' : 'transparent',
                                    color: orientation === 'portrait' ? '#FF80AB' : 'text.disabled',
                                    border: '1px solid',
                                    borderColor: orientation === 'portrait' ? '#FF80AB' : 'divider',
                                    '&:hover': { bgcolor: '#FFF0F7' }
                                }}
                            >
                                <PortraitIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Horizontal">
                            <IconButton 
                                size="small" 
                                onClick={() => setOrientation('landscape')}
                                sx={{ 
                                    bgcolor: orientation === 'landscape' ? '#FFF0F7' : 'transparent',
                                    color: orientation === 'landscape' ? '#FF80AB' : 'text.disabled',
                                    border: '1px solid',
                                    borderColor: orientation === 'landscape' ? '#FF80AB' : 'divider',
                                    '&:hover': { bgcolor: '#FFF0F7' }
                                }}
                            >
                                <LandscapeIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>

                    <Button 
                        onClick={onClose} 
                        variant="text" 
                        sx={{ color: 'text.secondary', fontWeight: 600 }}
                    >
                        Cerrar
                    </Button>
                    
                    {prx && (
                        <>
                            <Button
                                variant="outlined"
                                startIcon={<PictureAsPdfIcon />}
                                onClick={() => setShowPdfInstructions(true)}
                                sx={{
                                    px: 3,
                                    height: 48,
                                    borderRadius: 2,
                                    borderColor: '#FF80AB',
                                    color: '#FF80AB',
                                    fontWeight: 800,
                                    '&:hover': { borderColor: '#F48FB1', bgcolor: '#FFF0F7' },
                                }}
                            >
                                Descargar como PDF
                            </Button>
                            <Button
                                variant="contained"
                                onClick={handlePrint}
                                startIcon={<PrintIcon />}
                                sx={{
                                    px: 5,
                                    height: 48,
                                    borderRadius: 2,
                                    bgcolor: '#FF80AB',
                                    fontSize: '1rem',
                                    fontWeight: 800,
                                    boxShadow: '0 10px 20px rgba(255, 128, 171, 0.25)',
                                    '&:hover': { bgcolor: '#F48FB1', boxShadow: '0 12px 24px rgba(255, 128, 171, 0.35)' }
                                }}
                            >
                                Imprimir
                            </Button>
                        </>
                    )}
                </DialogActions>
            </Dialog>
        </>
    );
};

// HELPER Component for Info Fields
const InfoField = ({ label, value, bold }) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.2, minWidth: 140 }}>
        <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {label}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: bold ? 800 : 500 }}>
            {value}
        </Typography>
    </Box>
);

export default PrescriptionViewModal;
