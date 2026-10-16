import React from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Box, Button, IconButton, Typography, Divider, Chip,
    Table, TableBody, TableCell, TableContainer, TableHead,
    TableRow, Paper, useTheme, useMediaQuery, Tooltip
} from '@mui/material';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PrintIcon from '@mui/icons-material/Print';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import BlockIcon from '@mui/icons-material/Block';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import PortraitIcon from '@mui/icons-material/Portrait';
import LandscapeIcon from '@mui/icons-material/Landscape';
import { supabase } from '../../supabaseClient';

import { paletteStyleBlock } from '../../theme/palettes';
const formatCurrency = (value) =>
    `S/. ${Number(value || 0).toFixed(2)}`;

const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-PE', {
        day: '2-digit', month: 'long', year: 'numeric',
        timeZone: 'America/Lima'
    });
};

const SalesReceiptViewModal = ({ open, onClose, receipt, onVoid, onDelete }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [clinicInfo, setClinicInfo] = React.useState(null);
    const [showPdfInstructions, setShowPdfInstructions] = React.useState(false);
    const [orientation, setOrientation] = React.useState('landscape');

    React.useEffect(() => {
        const loadClinic = async () => {
            const { data } = await supabase.from('clinic_info').select('*').eq('id', 1).single();
            if (data) setClinicInfo(data);
        };
        if (open) loadClinic();
    }, [open]);

    if (!receipt) return null;

    const isVoided = receipt.estado === 'ANULADA';
    const items = receipt.items || [];

    const handlePrint = () => {
        const printContent = document.getElementById('boleta-print-area');
        if (!printContent) return;

        const win = window.open('', '_blank');
        win.document.write(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8" />
                <title>Boleta ${receipt.numero_boleta}</title>
                <style>
                    ${paletteStyleBlock()}
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Arial', sans-serif; font-size: 12px; color: #111; padding: 24px; }
                    .header-container { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid var(--c-primary); padding-bottom: 16px; margin-bottom: 24px; }
                    .clinic-info h1 { font-size: 18px; font-weight: 900; color: var(--c-primary-text); text-transform: uppercase; margin-bottom: 4px; }
                    .clinic-info p { font-size: 11px; color: #444; margin-bottom: 2px; }
                    .receipt-id { text-align: right; }
                    .receipt-id h2 { font-size: 22px; font-weight: 900; color: #111; text-transform: uppercase; margin-bottom: 4px; }
                    .receipt-id p { font-size: 11px; font-weight: 700; color: #666; text-transform: uppercase; }
                    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
                    .info-item label { display: block; font-size: 10px; font-weight: 800; color: #888; text-transform: uppercase; margin-bottom: 4px; }
                    .info-item span { font-size: 12px; font-weight: 600; color: #111; }
                    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
                    th { background: var(--c-surface); padding: 10px 8px; text-align: left; font-weight: 800; border-bottom: 2px solid #eee; text-transform: uppercase; font-size: 10px; color: #666; }
                    td { padding: 10px 8px; border-bottom: 1px solid #eee; font-size: 11px; }
                    .total-section { margin-top: 24px; display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #eee; pt: 16px; }
                    .total-amount { text-align: right; }
                    .total-amount label { display: block; font-size: 10px; font-weight: 800; color: #888; margin-bottom: 4px; }
                    .total-amount span { font-size: 24px; font-weight: 900; color: #111; }
                    .footer { margin-top: 32px; color: #666; font-size: 10px; font-style: italic; }
                    .anulada-badge { text-align: center; font-size: 32px; font-weight: 900; color: #EF4444; border: 4px solid #EF4444; padding: 8px 24px; display: inline-block; border-radius: 8px; transform: rotate(-15deg); margin: 16px auto; width: 100%; }
                    @media print {
                        @page { 
                            size: A5 ${orientation}; 
                            margin: 0; 
                        }
                        body { 
                            padding: 12mm; 
                            -webkit-print-color-adjust: exact;
                        }
                    }
                </style>
            </head>
            <body>
                ${isVoided ? '<div style="text-align:center"><span class="anulada-badge">ANULADA</span></div>' : ''}
                
                <div class="header-container">
                    <div class="clinic-info">
                        <h1>${clinicInfo?.nombre_clinica || 'Consultorio Médico'}</h1>
                        <p>${clinicInfo?.direccion || '-'}</p>
                        <p>${clinicInfo?.telefono ? `Tel: ${clinicInfo.telefono}` : ''} ${clinicInfo?.email ? ` · Email: ${clinicInfo.email}` : ''}</p>
                    </div>
                    <div class="receipt-id">
                        <h2>${receipt.numero_boleta}</h2>
                        <p>Fecha: ${formatDate(receipt.fecha)}</p>
                    </div>
                </div>

                <div class="info-grid">
                    <div class="info-item">
                        <label>Nombre Completo</label>
                        <span>${receipt.paciente_nombre || '-'}</span>
                    </div>
                    <div class="info-item">
                        <label>Documento (DNI)</label>
                        <span>${receipt.paciente_dni || '-'}</span>
                    </div>
                    ${receipt.notas ? `
                    <div class="info-item" style="grid-column: 1 / -1; margin-top: 8px;">
                        <label>Observaciones / Notas</label>
                        <span>${receipt.notas}</span>
                    </div>` : ''}
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Descripción</th>
                            <th style="text-align:center">Cant.</th>
                            <th style="text-align:right">P. Unitario</th>
                            <th style="text-align:right">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map(item => `
                            <tr>
                                <td>${item.descripcion}</td>
                                <td style="text-align:center">${item.cantidad}</td>
                                <td style="text-align:right">${formatCurrency(item.precio_unitario)}</td>
                                <td style="text-align:right"><strong>${formatCurrency(item.subtotal)}</strong></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="total-section">
                    <div class="footer">
                        <p>Gracias por su preferencia</p>
                    </div>
                    <div class="total-amount">
                        <label>TOTAL A PAGAR (S/.)</label>
                        <span>${formatCurrency(receipt.total)}</span>
                    </div>
                </div>
            </body>
            </html>
        `);
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

    return (
        <>
            <Dialog
                open={showPdfInstructions}
                onClose={() => setShowPdfInstructions(false)}
                PaperProps={{ sx: { borderRadius: 3, maxWidth: 400 } }}
            >
                <DialogTitle sx={{ fontWeight: 800, color: 'var(--c-primary-text)', textAlign: 'center' }}>
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
                            bgcolor: 'var(--c-primary)', 
                            fontWeight: 800,
                            borderRadius: 2,
                            '&:hover': { bgcolor: 'var(--c-primary-hover)' }
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
                    background: theme.palette.mode === 'dark' ? '#1e293b' : '#fff',
                    position: 'relative',
                    overflow: 'hidden'
                }
            }}
        >
            {/* Marca de agua ANULADA */}
            {isVoided && (
                <Box sx={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    pointerEvents: 'none', zIndex: 10, transform: 'rotate(-20deg)',
                }}>
                    <Typography sx={{
                        fontSize: '5rem', fontWeight: 900, color: 'error.main',
                        opacity: 0.08, letterSpacing: 8, userSelect: 'none',
                        border: '8px solid', borderColor: 'error.main', px: 3, py: 1, borderRadius: 2
                    }}>
                        ANULADA
                    </Typography>
                </Box>
            )}

            {/* Header: Sólo Botón de Estado y Cerrar */}
            <DialogTitle
                sx={{
                    bgcolor: isVoided ? '#FFF5F5' : 'background.paper',
                    color: isVoided ? 'error.main' : 'text.primary',
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
                    bgcolor: isVoided ? '#FEE2E2' : 'var(--c-primary-soft)',
                    color: isVoided ? 'error.main' : 'var(--c-primary-text)',
                    flexShrink: 0
                }}>
                    <ReceiptIcon sx={{ fontSize: 24 }} />
                </Box>

                <Chip
                    label={receipt.estado}
                    size="small"
                    sx={{
                        bgcolor: isVoided ? 'error.main' : 'var(--c-primary-border)',
                        color: isVoided ? 'white' : 'var(--c-primary-text)',
                        fontWeight: 800,
                        fontSize: '0.75rem',
                        height: 24,
                        px: 1,
                        textTransform: 'uppercase'
                    }}
                />

                <IconButton
                    onClick={onClose}
                    sx={{
                        ml: 'auto',
                        color: 'text.secondary',
                        '&:hover': { bgcolor: 'var(--c-primary-soft)', color: 'var(--c-primary-text)' }
                    }}
                    size="small"
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent id="boleta-print-area" sx={{ pt: 10, px: 4, pb: 4, bgcolor: 'var(--c-surface)' }}>

                {/* 2. Datos del consultorio + Numero y Fecha a la derecha */}
                <Box sx={{ mb: 3.5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                        <Typography variant="h6" sx={{ fontWeight: 900, color: 'var(--c-primary-text)', textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1.2 }}>
                            {clinicInfo?.nombre_clinica || 'Consultorio Médico'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                            {clinicInfo?.direccion || 'Cargando dirección...'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {clinicInfo?.telefono && `Tel: ${clinicInfo.telefono}`}
                            {clinicInfo?.telefono && clinicInfo?.email && ' · '}
                            {clinicInfo?.email && `Email: ${clinicInfo.email}`}
                        </Typography>
                    </Box>

                    <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="h4" sx={{ fontWeight: 900, color: 'text.primary', letterSpacing: '-0.025em', lineHeight: 1.1 }}>
                            {receipt.numero_boleta}
                        </Typography>
                        <Typography variant="subtitle1" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', mt: 0.5 }}>
                            Fecha de Emisión: {formatDate(receipt.fecha)}
                        </Typography>
                    </Box>
                </Box>

                {/* 3. Informacion del paciente (Sin tarjeta) */}
                <Box sx={{ mb: 6 }}>
                    <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.disabled', letterSpacing: '0.1em' }}>
                        Información del Cliente
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 4, mt: 1 }}>
                        <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem', display: 'block', mb: 0.5 }}>NOMBRE COMPLETO</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 800, color: 'text.primary' }}>{receipt.paciente_nombre || '-'}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem', display: 'block', mb: 0.5 }}>DOCUMENTO (DNI)</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 800, color: 'text.primary' }}>{receipt.paciente_dni || '-'}</Typography>
                        </Box>
                        {receipt.notas && (
                            <Box sx={{ gridColumn: '1 / -1' }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem', display: 'block', mb: 0.5 }}>OBSERVACIONES / NOTAS</Typography>
                                <Typography variant="body2" sx={{ fontStyle: 'italic', fontWeight: 500 }}>{receipt.notas}</Typography>
                            </Box>
                        )}
                    </Box>
                </Box>

                {/* 4. Tarjeta con la lista de productos y servicios */}
                <Box sx={{
                    bgcolor: 'white',
                    borderRadius: 4,
                    border: '1px solid',
                    borderColor: 'divider',
                    overflow: 'hidden',
                    mb: 2,
                    boxShadow: '0 4px 15px rgba(0,0,0,0.02)'
                }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'var(--c-surface)' }}>
                                <TableCell align="center" sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'text.secondary', py: 2 }}>TIPO</TableCell>
                                <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'text.secondary', py: 2 }}>DESCRIPCIÓN</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'text.secondary', py: 2 }}>CANT.</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'text.secondary', py: 2 }}>P. UNIT.</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'text.secondary', py: 2 }}>SUBTOTAL</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {items.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center">
                                        <Typography variant="body2" color="text.disabled" sx={{ py: 6 }}>
                                            Sin ítems registrados
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                items.map((item) => (
                                    <TableRow
                                        key={item.id}
                                        sx={{ '&:hover': { bgcolor: 'rgba(var(--c-primary-rgb), 0.02)' } }}
                                    >
                                        <TableCell align="center" sx={{ py: 1.5 }}>
                                            <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.primary' }}>
                                                {item.tipo === 'INVENTARIO' ? 'PROD.' : 'SERV.'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell sx={{ py: 1.5 }}>
                                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.descripcion}</Typography>
                                        </TableCell>
                                        <TableCell align="center" sx={{ py: 1.5 }}>
                                            <Typography variant="body2" fontWeight={600}>{item.cantidad}</Typography>
                                        </TableCell>
                                        <TableCell align="center" sx={{ py: 1.5 }}>
                                            <Typography variant="body2">{formatCurrency(item.precio_unitario)}</Typography>
                                        </TableCell>
                                        <TableCell align="center" sx={{ py: 1.5 }}>
                                            <Typography variant="body2" sx={{ fontWeight: 900 }}>{formatCurrency(item.subtotal)}</Typography>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </Box>

                {/* 5. El monto y el mensaje de despedida tal cual está ahora */}
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                    mt: 1.5,
                    pr: 2,
                    pb: 3,
                    borderTop: '1px solid',
                    borderColor: 'rgba(var(--c-primary-rgb), 0.1)',
                    pt: 3
                }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, pb: 1 }}>
                        Gracias por su preferencia
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.5 }}>
                            TOTAL COMPROBANTE (S/.)
                        </Typography>
                        <Typography variant="h2" sx={{
                            fontWeight: 900,
                            color: isVoided ? 'error.main' : 'text.primary',
                            letterSpacing: '-0.02em',
                            fontSize: '3rem',
                            lineHeight: 1
                        }}>
                            {formatCurrency(receipt.total)}
                        </Typography>
                        <Box sx={{ width: 100, height: 4, bgcolor: isVoided ? 'error.light' : 'var(--c-primary)', borderRadius: 1, mt: 1 }} />
                    </Box>
                </Box>
            </DialogContent>

            <DialogActions sx={{ px: 4, py: 3, bgcolor: 'var(--c-surface)', borderTop: '1px solid', borderColor: 'divider', gap: 2 }}>
                {!isVoided && onVoid && (
                    <Button
                        variant="outlined"
                        color="error"
                        startIcon={<BlockIcon />}
                        onClick={() => onVoid(receipt.id)}
                        sx={{ borderRadius: 2, height: 44 }}
                    >
                        Anular Boleta
                    </Button>
                )}
                {isVoided && onDelete && (
                    <Button
                        variant="contained"
                        color="error"
                        startIcon={<DeleteForeverIcon />}
                        onClick={() => onDelete(receipt.id)}
                        sx={{ borderRadius: 2, fontWeight: 700, height: 44 }}
                    >
                        Eliminar Totalmente
                    </Button>
                )}
                <Box sx={{ flex: 1 }} />
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mr: 2 }}>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.disabled', mr: 1 }}>ORIENTACIÓN:</Typography>
                    <Tooltip title="Vertical">
                        <IconButton 
                            size="small" 
                            onClick={() => setOrientation('portrait')}
                            sx={{ 
                                bgcolor: orientation === 'portrait' ? 'var(--c-primary-soft)' : 'transparent',
                                color: orientation === 'portrait' ? 'var(--c-primary-text)' : 'text.disabled',
                                border: '1px solid',
                                borderColor: orientation === 'portrait' ? 'var(--c-primary)' : 'divider',
                                '&:hover': { bgcolor: 'var(--c-primary-soft)' }
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
                                bgcolor: orientation === 'landscape' ? 'var(--c-primary-soft)' : 'transparent',
                                color: orientation === 'landscape' ? 'var(--c-primary-text)' : 'text.disabled',
                                border: '1px solid',
                                borderColor: orientation === 'landscape' ? 'var(--c-primary)' : 'divider',
                                '&:hover': { bgcolor: 'var(--c-primary-soft)' }
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
                <Button
                    variant="outlined"
                    startIcon={<PictureAsPdfIcon />}
                    onClick={() => setShowPdfInstructions(true)}
                    sx={{
                        px: 3,
                        height: 44,
                        borderRadius: 2,
                        borderColor: 'var(--c-primary)',
                        color: 'var(--c-primary-text)',
                        fontWeight: 800,
                        '&:hover': { borderColor: 'var(--c-primary-border)', bgcolor: 'var(--c-primary-soft)' },
                    }}
                >
                    Guardar como PDF
                </Button>
                <Button
                    variant="contained"
                    startIcon={<PrintIcon />}
                    onClick={handlePrint}
                    sx={{
                        px: 4,
                        height: 44,
                        borderRadius: 2,
                        bgcolor: 'var(--c-primary)',
                        fontWeight: 800,
                        boxShadow: '0 8px 16px rgba(var(--c-primary-rgb), 0.2)',
                        '&:hover': { bgcolor: 'var(--c-primary-hover)', boxShadow: '0 10px 20px rgba(var(--c-primary-rgb), 0.3)' },
                    }}
                >
                    Imprimir
                </Button>
            </DialogActions>
        </Dialog>
        </>
    );
};

export default SalesReceiptViewModal;
