import React, { useState, useRef, useCallback, useEffect } from 'react';
import { marked } from 'marked';
import TurndownService from 'turndown';
import {
    Box, Typography, IconButton, Button, Tooltip, Divider, Fab, useTheme, Chip, Paper, Dialog, CircularProgress, LinearProgress, Menu, MenuItem
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import TitleIcon from '@mui/icons-material/Title';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import AddIcon from '@mui/icons-material/Add';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AdsClickIcon from '@mui/icons-material/AdsClick';
import DownloadIcon from '@mui/icons-material/Download';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { supabase } from '../supabaseClient';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import DocumentViewerDialog from './DocumentViewerDialog';

import { useToast } from './ToastProvider';
// ─── Configure marked ──────────────────────────────────────
marked.setOptions({ breaks: true, gfm: true });
const turndownService = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-', codeBlockStyle: 'fenced' });

// ─── Helpers ───────────────────────────────────────────────
export const obtenerUrlPrivada = async (ruta) => {
    const { data, error } = await supabase
        .storage
        .from('historial_adjuntos')
        .createSignedUrl(ruta, 60);
    if (error) {
        console.error("Error al obtener URL del archivo:", error);
        return null;
    }
    return data.signedUrl;
};

const calculateAge = (fechaNacimiento) => {
    if (!fechaNacimiento || fechaNacimiento === '-') return null;
    try {
        const birthDate = new Date(fechaNacimiento);
        if (isNaN(birthDate.getTime())) return null;
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
        return age;
    } catch (e) { return null; }
};

const formatDate12h = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm} - ${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
};

const formatDateText = (dateString) => {
    if (!dateString) return '';
    return format(new Date(dateString), "d 'de' MMMM, yyyy - h:mm a", { locale: es });
};

// ─── Toolbar Button ────────────────────────────────────────
export const ToolbarButton = ({ icon, tooltip, onClick, active = false }) => {
    const theme = useTheme();
    return (
        <Tooltip title={tooltip} arrow>
            <IconButton
                size="small"
                onMouseDown={(e) => { e.preventDefault(); onClick(); }}
                sx={{
                    borderRadius: 1.5, width: 36, height: 36,
                    color: active ? 'primary.main' : 'text.secondary',
                    bgcolor: active ? (theme.palette.mode === 'dark' ? 'rgba(2, 136, 209, 0.15)' : 'primary.light') : 'transparent',
                    '&:hover': { bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', color: 'primary.main' },
                    transition: 'all 0.15s ease',
                }}
            >
                {icon}
            </IconButton>
        </Tooltip>
    );
};

// ─── Shared Content Styles ─────────────────────────────────
export const getContentStyles = (theme) => ({
    '& h1': { fontSize: '1.6rem', fontWeight: 800, color: 'text.primary', mt: 3, mb: 1.5, pb: 1, borderBottom: '2px solid', borderColor: 'divider' },
    '& h2': { fontSize: '1.3rem', fontWeight: 700, color: 'text.primary', mt: 2.5, mb: 1 },
    '& h3': { fontSize: '1.1rem', fontWeight: 600, color: 'text.primary', mt: 2, mb: 0.5 },
    '& p': { fontSize: '0.95rem', lineHeight: 1.8, color: 'text.primary', mb: 1.5 },
    '& strong': { fontWeight: 700, color: theme.palette.mode === 'dark' ? '#f1f5f9' : '#0f172a' },
    '& em': { fontStyle: 'italic', color: theme.palette.mode === 'dark' ? '#94a3b8' : '#475569' },
    '& blockquote': {
        borderLeft: '4px solid', borderColor: 'primary.main',
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(2, 136, 209, 0.08)' : 'rgba(2, 136, 209, 0.05)',
        mx: 0, my: 2, py: 1.5, px: 2.5, borderRadius: '0 8px 8px 0',
        '& p': { mb: 0, color: theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b' },
    },
    '& ul': {
        pl: 4, mb: 2, listStyleType: 'disc', listStylePosition: 'outside',
        '& li': { fontSize: '0.95rem', lineHeight: 1.8, color: 'text.primary', mb: 0.5, display: 'list-item', '&::marker': { color: 'primary.main', fontSize: '1.2em' } },
    },
    '& ol': {
        pl: 4, mb: 2, listStyleType: 'decimal', listStylePosition: 'outside',
        '& li': { fontSize: '0.95rem', lineHeight: 1.8, color: 'text.primary', mb: 0.5, display: 'list-item', '&::marker': { color: 'primary.main', fontWeight: 700 } },
    },
});

// ═══════════════════════════════════════════════════════════
// WYSIWYG ENTRY EDITOR COMPONENT
// ═══════════════════════════════════════════════════════════
export const EntryEditor = ({ initialText = '', initialAttachments = [], onSave, onCancel, disableSign = false, fullHeight = false, placeholder = 'Escribe aquí la historia clínica...', hideAttachments = false }) => {
    const theme = useTheme();
    const editorRef = useRef(null);
    const fileInputRef = useRef(null);
    const [attachments, setAttachments] = useState(initialAttachments || []);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const html = initialText ? marked.parse(initialText) : '';
        if (editorRef.current) {
            editorRef.current.innerHTML = html;
            editorRef.current.focus();
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(editorRef.current);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
        }
    }, [initialText]);

    const execFormat = useCallback((command, value = null) => {
        document.execCommand(command, false, value);
        if (editorRef.current) editorRef.current.focus();
    }, []);

    const toggleBlockFormat = (tag) => {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        let node = sel.anchorNode;
        let current = '';
        while (node && node !== editorRef.current) {
            if (node.nodeType === 1) {
                const t = node.tagName.toLowerCase();
                if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'blockquote', 'div'].includes(t)) { current = t; break; }
            }
            node = node.parentNode;
        }
        if (current === tag) execFormat('formatBlock', 'p');
        else execFormat('formatBlock', tag);
    };

    const handleKeyDown = (e) => {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'b') { e.preventDefault(); execFormat('bold'); }
            else if (e.key === 'i') { e.preventDefault(); execFormat('italic'); }
        }
    };

    const handleGetMarkdownAndSave = async (locked) => {
        setIsSaving(true);
        const html = editorRef.current.innerHTML;
        let md = '';
        if (html && html.trim() && html !== '<br>' && html !== '<div><br></div>') {
            md = turndownService.turndown(html);
        }
        await onSave(md, locked, attachments); // Pass locked status and attachments
        setIsSaving(false);
    };

    return (
        <Box sx={{ position: 'relative', border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden', bgcolor: 'background.paper', display: 'flex', flexDirection: 'column', ...(fullHeight && { height: '100%' }) }}>
            {isSaving && <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }} />}
            <Box sx={{ display: 'flex', flexShrink: 0, alignItems: 'center', gap: 0.5, px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider', flexWrap: 'wrap', bgcolor: theme.palette.mode === 'dark' ? '#1e293b' : '#f8fafc', pointerEvents: isSaving ? 'none' : 'auto', opacity: isSaving ? 0.7 : 1 }}>
                <ToolbarButton icon={<UndoIcon fontSize="small" />} tooltip="Deshacer (Ctrl+Z)" onClick={() => execFormat('undo')} />
                <ToolbarButton icon={<RedoIcon fontSize="small" />} tooltip="Rehacer (Ctrl+Y)" onClick={() => execFormat('redo')} />
                <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.5 }} />
                <ToolbarButton icon={<FormatBoldIcon fontSize="small" />} tooltip="Negrita (Ctrl+B)" onClick={() => execFormat('bold')} />
                <ToolbarButton icon={<FormatItalicIcon fontSize="small" />} tooltip="Cursiva (Ctrl+I)" onClick={() => execFormat('italic')} />
                <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.5 }} />
                <ToolbarButton icon={<TitleIcon fontSize="small" />} tooltip="Título H1" onClick={() => toggleBlockFormat('h1')} />
                <ToolbarButton icon={<Box sx={{ display: 'flex', alignItems: 'center', position: 'relative' }}><TitleIcon sx={{ fontSize: 16 }} /><Typography sx={{ fontSize: 9, fontWeight: 900, position: 'absolute', bottom: -2, right: -4, lineHeight: 1 }}>2</Typography></Box>} tooltip="Título H2" onClick={() => toggleBlockFormat('h2')} />
                <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.5 }} />
                <ToolbarButton icon={<FormatQuoteIcon fontSize="small" />} tooltip="Cita" onClick={() => toggleBlockFormat('blockquote')} />
                <ToolbarButton icon={<FormatListBulletedIcon fontSize="small" />} tooltip="Lista con viñetas" onClick={() => execFormat('insertUnorderedList')} />
                <ToolbarButton icon={<FormatListNumberedIcon fontSize="small" />} tooltip="Lista numerada" onClick={() => execFormat('insertOrderedList')} />
                {!hideAttachments && (
                    <>
                        <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.5 }} />
                        <ToolbarButton icon={
                            <Box component="span" sx={{ display: 'flex' }}>
                                <AttachFileIcon fontSize="small" />
                                <input type="file" multiple ref={fileInputRef} style={{ display: 'none' }} onChange={(e) => {
                                    const files = Array.from(e.target.files).map(f => ({ isNew: true, file: f, nombre: f.name }));
                                    setAttachments(prev => [...prev, ...files]);
                                    e.target.value = null; // Clear so it registers the same file again if needed
                                }} />
                            </Box>
                        } tooltip="Adjuntar Archivos" onClick={() => fileInputRef.current?.click()} />
                    </>
                )}
            </Box>

            <Box
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onKeyDown={handleKeyDown}
                sx={{
                    p: 3, outline: 'none', cursor: 'text', ...getContentStyles(theme),
                    minHeight: fullHeight ? '100px' : '200px',
                    '&:empty::before': { content: `"${placeholder}"`, color: '#94a3b8', fontStyle: 'italic', pointerEvents: 'none' },
                    ...(fullHeight && { flex: 1, overflowY: 'auto' })
                }}
            />

            {!hideAttachments && attachments.length > 0 && (
                <Box sx={{ p: 2, borderTop: '1px dashed', borderColor: 'divider', bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.1)' : '#f8fafc' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', mb: 1, display: 'block' }}>Archivos adjuntos ({attachments.length}):</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {attachments.map((att, idx) => (
                            <Chip
                                key={idx}
                                icon={<InsertDriveFileIcon />}
                                label={att.nombre}
                                onDelete={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                                size="small"
                                color="primary"
                                variant={att.isNew ? "outlined" : "filled"}
                            />
                        ))}
                    </Box>
                </Box>
            )}

            <Box sx={{ display: 'flex', flexShrink: 0, justifyContent: 'flex-end', flexWrap: 'wrap', gap: 2, p: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: theme.palette.mode === 'dark' ? '#1e293b' : '#f8fafc' }}>
                <Button variant="outlined" color="inherit" onClick={onCancel} disabled={isSaving}>Cancelar</Button>
                {/* Nota: el usuario indicó que estado_cerrado = FALSE es "Guardar" (borrador), y estado_cerrado = TRUE es "Guardar y Firmar" */}
                {!disableSign && (
                    <Button variant="contained" disabled={isSaving} sx={{ bgcolor: isSaving ? 'action.disabledBackground' : '#fb7185', color: isSaving ? 'action.disabled' : '#fff', '&:hover': { bgcolor: '#f43f5e' } }} startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <LockIcon />} onClick={() => handleGetMarkdownAndSave(true)} title="Nadie más podrá modificar esto una vez firmado.">
                        {isSaving ? 'Guardando...' : 'Guardar y Firmar'}
                    </Button>
                )}
                <Button variant="contained" color="primary" disabled={isSaving} startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />} onClick={() => handleGetMarkdownAndSave(false)} title="Guardar cambios sin cerrar la nota.">
                    {isSaving ? 'Guardando...' : 'Guardar'}
                </Button>
            </Box>
        </Box>
    );
};


// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT (HISTORIAL CLINICO MANAGER)
// ═══════════════════════════════════════════════════════════
const HistoriaClinicaEditor = ({ dniPaciente, nombreCompleto, fechaNacimiento, embedded = false, onClose, highlightEntryId }) => {
    const toast = useToast();
    const theme = useTheme();
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingEntryId, setEditingEntryId] = useState(null); // null = not editing. 'NEW' = create mode. id = edit mode.

    // Plantillas menu state
    const [anchorEl, setAnchorEl] = useState(null);
    const [plantillas, setPlantillas] = useState([]);
    const [selectedTemplateText, setSelectedTemplateText] = useState("");

    // Dialog for global files
    const [globalFilesOpen, setGlobalFilesOpen] = useState(false);
    const allFiles = entries.flatMap(e => (e.archivos || []).map(a => ({ ...a, fecha: e.created_at, entrada_id: e.id })));

    // Viewer state
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerUrl, setViewerUrl] = useState(null);
    const [viewerFile, setViewerFile] = useState(null);
    const [viewerLoading, setViewerLoading] = useState(false);

    const handleViewFile = async (archivo) => {
        setViewerFile(archivo);
        setViewerUrl(null);
        setViewerOpen(true);
        setViewerLoading(true);
        const url = await obtenerUrlPrivada(archivo.ruta);
        setViewerUrl(url);
        setViewerLoading(false);
    };

    // Fetch plantillas on load
    useEffect(() => {
        const fetchPlantillas = async () => {
            const { data } = await supabase.from('plantillas').select('*').eq('tipo', 'historia_clinica').order('nombre');
            if (data) setPlantillas(data);
        };
        fetchPlantillas();
    }, []);

    const handleNewClick = (event) => {
        if (plantillas.length > 0) {
            setAnchorEl(event.currentTarget);
        } else {
            handleCreateNuevo(''); // Si no hay plantillas, crear vacía directo
        }
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleCreateNuevo = (plantillaTexto = '') => {
        setSelectedTemplateText(plantillaTexto);
        setEditingEntryId('NEW');
        handleMenuClose();
    };

    const age = calculateAge(fechaNacimiento);
    const capitalizedName = nombreCompleto ? nombreCompleto.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Paciente';

    const fetchEntries = useCallback(async () => {
        if (!dniPaciente) return;
        try {
            const { data, error } = await supabase
                .from('historial_clinico')
                .select('*')
                .eq('dni_paciente', dniPaciente)
                .order('created_at', { ascending: false });
            if (error) throw error;
            setEntries(data || []);
        } catch (err) {
            console.error("Error fetching historial_clinico:", err);
        } finally {
            setLoading(false);
        }
    }, [dniPaciente]);

    useEffect(() => {
        if (!dniPaciente) {
            setLoading(false);
            return;
        }

        fetchEntries();

        // Realtime subscription for the entries of this patient
        const channel = supabase.channel(`historial_${dniPaciente}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'historial_clinico', filter: `dni_paciente=eq.${dniPaciente}` }, () => {
                fetchEntries();
            }).subscribe();

        return () => supabase.removeChannel(channel);
    }, [dniPaciente, fetchEntries]);

    useEffect(() => {
        if (highlightEntryId && entries.length > 0) {
            const timer = setTimeout(() => {
                const element = document.getElementById(`entry-${highlightEntryId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });

                    const card = element.querySelector('.MuiPaper-root') || element;
                    card.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
                    card.style.transform = 'scale(1.02)';
                    element.style.zIndex = '100';
                    card.style.boxShadow = theme.palette.mode === 'dark' 
                        ? '0 20px 40px -10px rgba(0,0,0,0.8), 0 0 20px rgba(3,169,244,0.4) inset' 
                        : '0 20px 40px -10px rgba(0,0,0,0.2), 0 0 20px rgba(3,169,244,0.2) inset';
                    card.style.borderColor = theme.palette.mode === 'dark' ? '#03a9f4' : '#03a9f4';

                    setTimeout(() => {
                        card.style.transform = 'scale(1)';
                        card.style.boxShadow = '';
                        card.style.borderColor = 'divider';
                        setTimeout(() => {
                            element.style.zIndex = '';
                        }, 600);
                    }, 2000);
                }
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [highlightEntryId, entries, theme.palette.mode]);

    const handleSaveEntry = async (text, estado_cerrado, attachments = []) => {
        if (!dniPaciente) return;
        setLoading(true);
        try {
            // Subir nuevos archivos a private bucket
            const newArchivos = [];
            for (const att of attachments) {
                if (att.isNew) {
                    const uniqueName = Date.now() + '_' + att.file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
                    const ruta = `${dniPaciente}/${uniqueName}`;
                    const { error: uploadError } = await supabase.storage.from('historial_adjuntos').upload(ruta, att.file);
                    if (uploadError) {
                        console.error('Error uploading file:', uploadError);
                        toast(`No se pudo subir ${att.nombre}: ${uploadError.message}`, 'error');
                        continue;
                    }
                    newArchivos.push({ nombre: att.nombre, ruta: ruta, tipo: att.file.type });
                } else {
                    newArchivos.push(att); // conservar archivos existentes
                }
            }

            if (editingEntryId === 'NEW') {
                const { error } = await supabase.from('historial_clinico').insert({
                    dni_paciente: dniPaciente,
                    historia: text,
                    archivos: newArchivos,
                    estado_cerrado: estado_cerrado
                });
                if (error) throw error;
            } else {
                const { error } = await supabase.from('historial_clinico').update({
                    historia: text,
                    archivos: newArchivos,
                    estado_cerrado: estado_cerrado
                }).eq('id', editingEntryId);
                if (error) throw error;
            }
            await fetchEntries(); // FORZAR recarga inmediata del historial tras éxito
            setEditingEntryId(null);
        } catch (err) {
            console.error(err);
            toast("Error al guardar la entrada: " + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden' }}>
            {/* Header */}
            {!embedded && (
                <Box sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', px: { xs: 3, sm: 4 }, py: 3, position: 'relative', flexShrink: 0 }}>
                    <IconButton onClick={onClose} sx={{ position: 'absolute', top: 12, right: 12, color: 'inherit', bgcolor: 'rgba(0,0,0,0.08)', '&:hover': { bgcolor: 'rgba(0,0,0,0.15)' } }} title="Cerrar"><CloseIcon /></IconButton>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 1.5, pr: 6 }}>
                        <Typography variant="h4" sx={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.025em', lineHeight: 1.1, fontSize: { xs: '1.6rem', sm: capitalizedName.length > 28 ? '1.8rem' : '2.2rem' } }}>{capitalizedName}</Typography>
                        {age !== null && <Typography variant="h5" sx={{ fontWeight: 500, opacity: 0.8, fontSize: { xs: '1.1rem', sm: '1.3rem' }, whiteSpace: 'nowrap' }}>({age} años)</Typography>}
                    </Box>
                    <Typography variant="subtitle2" sx={{ mt: 1, opacity: 0.7, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                        Historial Clínico
                    </Typography>
                </Box>
            )}

            {/* List and Actions */}
            <Box sx={{ flex: 1, overflowY: 'auto', bgcolor: 'background.default', p: { xs: 2, sm: 4 } }}>
                {!dniPaciente ? (
                    <Typography align="center" color="text.secondary" sx={{ mt: 4 }}>DNI del paciente no disponible para cargar el historial.</Typography>
                ) : loading && entries.length === 0 ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 900, mx: 'auto', position: 'relative' }}>
                        {/* Header actions */}
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', position: 'sticky', top: 0, zIndex: 10, gap: 2 }}>
                            {editingEntryId === null && (
                                <>
                                    {allFiles.length > 0 && (
                                        <Button
                                            variant="contained"
                                            startIcon={<FolderSpecialIcon />}
                                            onClick={() => setGlobalFilesOpen(true)}
                                            sx={{
                                                bgcolor: '#03a9f4',
                                                color: '#fff',
                                                '&:hover': { bgcolor: '#0288d1' },
                                                boxShadow: 2,
                                                fontWeight: 'bold',
                                                textTransform: 'none',
                                                borderRadius: 2
                                            }}
                                        >
                                            Ver {allFiles.length} Archivos
                                        </Button>
                                    )}
                                    <Button variant="contained" aria-controls="plantillas-menu" aria-haspopup="true" startIcon={<AddIcon />} onClick={handleNewClick} sx={{ boxShadow: 2 }}>Nueva Entrada</Button>
                                    <Menu
                                        id="plantillas-menu"
                                        anchorEl={anchorEl}
                                        open={Boolean(anchorEl)}
                                        onClose={handleMenuClose}
                                        PaperProps={{ sx: { mt: 1, minWidth: 200, boxShadow: 3, borderRadius: 3 } }}
                                        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                                        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                                    >
                                        <MenuItem onClick={() => handleCreateNuevo('')} sx={{ fontWeight: 'bold', color: 'primary.main', py: 1.5, display: 'flex', justifyContent: 'center' }}>
                                            <AddIcon sx={{ mr: 1, fontSize: 20 }} /> Historia Clínica en Blanco
                                        </MenuItem>
                                        {plantillas.length > 0 && <Divider />}
                                        {plantillas.map(p => (
                                            <MenuItem key={p.id} onClick={() => handleCreateNuevo(p.contenido)} sx={{ fontWeight: 'bold', color: 'primary.main', py: 1.5, display: 'flex', justifyContent: 'center' }}>
                                                {p.nombre}
                                            </MenuItem>
                                        ))}
                                    </Menu>
                                </>
                            )}
                        </Box>

                        {/* New Entry Editor */}
                        {editingEntryId === 'NEW' && (
                            <Box sx={{ animation: 'fadeIn 0.3s ease-in-out' }}>
                                <Typography variant="subtitle2" color="primary" sx={{ mb: 1, ml: 1, fontWeight: 'bold' }}>CREANDO NUEVA ENTRADA</Typography>
                                <EntryEditor initialText={selectedTemplateText} onSave={(text, estado_cerrado, atts) => handleSaveEntry(text, estado_cerrado, atts)} onCancel={() => setEditingEntryId(null)} />
                            </Box>
                        )}

                        {/* Entries List */}
                        {entries.length === 0 && editingEntryId !== 'NEW' ? (
                            <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'transparent', border: '1px dashed', borderColor: 'divider', borderRadius: 3 }}>
                                <Typography color="text.secondary">No hay registros clínicos en el historial de este paciente.</Typography>
                            </Paper>
                        ) : (
                            entries.map(entry => (
                                <Box key={entry.id} id={`entry-${entry.id}`}>
                                    {editingEntryId === entry.id ? (
                                        <Box sx={{ animation: 'fadeIn 0.3s ease-in-out' }}>
                                            <Typography variant="subtitle2" color="primary" sx={{ mb: 1, ml: 1, fontWeight: 'bold' }}>EDITANDO ENTRADA</Typography>
                                            <EntryEditor initialText={entry.historia} initialAttachments={entry.archivos || []} onSave={(text, estado_cerrado, atts) => handleSaveEntry(text, estado_cerrado, atts)} onCancel={() => setEditingEntryId(null)} />
                                        </Box>
                                    ) : (
                                        <Paper sx={{ display: 'flex', flexDirection: 'column', border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
                                            <Box sx={{ px: 3, py: 1.5, bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>{formatDateText(entry.created_at)}</Typography>
                                                    {/* false = Abierto (Guardar), true = Firmado (Cerrado) */}
                                                    {!entry.estado_cerrado ? (
                                                        <Chip label="Se puede editar" size="small" icon={<LockOpenIcon sx={{ fontSize: 16 }} />} sx={{ bgcolor: '#03a9f4', color: '#fff', fontWeight: 'bold' }} />
                                                    ) : (
                                                        <Chip label="Firmado (Cerrado)" size="small" icon={<LockIcon sx={{ fontSize: 16 }} />} sx={{ bgcolor: '#fb7185', color: '#fff', fontWeight: 'bold' }} />
                                                    )}
                                                </Box>
                                                {/* Only show Edit button if it's open (estado_cerrado = false means unlocked) */}
                                                {!entry.estado_cerrado && (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, opacity: 0.8 }}>
                                                            Editado el: {formatDateText(entry.fecha_modificacion || entry.created_at)}
                                                        </Typography>
                                                        <Button size="small" startIcon={<EditIcon />} onClick={() => setEditingEntryId(entry.id)}>Editar</Button>
                                                    </Box>
                                                )}
                                            </Box>
                                            <Box sx={{ p: 3, ...getContentStyles(theme) }} dangerouslySetInnerHTML={{ __html: entry.historia ? marked.parse(entry.historia) : '' }} />

                                            {/* Vista de Archivos Adjuntos */}
                                            {entry.archivos && entry.archivos.length > 0 && (
                                                <Box sx={{ borderTop: '1px dashed', borderColor: 'divider', p: 2, bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.1)' : '#f8fafc' }}>
                                                    <Typography variant="caption" sx={{ fontWeight: 'bold', mb: 1.5, display: 'block', color: 'text.secondary' }}>Archivos Adjuntos ({entry.archivos.length})</Typography>
                                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                                                        {entry.archivos.map((archivo, idx) => (
                                                            <Chip
                                                                key={idx}
                                                                icon={<VisibilityIcon sx={{ fontSize: 18 }} />}
                                                                label={archivo.nombre}
                                                                variant="outlined"
                                                                color="primary"
                                                                onClick={() => handleViewFile(archivo)}
                                                                sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'primary.light', color: 'primary.contrastText', borderColor: 'primary.main' } }}
                                                            />
                                                        ))}
                                                    </Box>
                                                </Box>
                                            )}
                                        </Paper>
                                    )}
                                </Box>
                            ))
                        )}
                    </Box>
                )}
            </Box>

            {/* Dialog de Archivos Globales */}
            <Dialog open={globalFilesOpen} onClose={() => setGlobalFilesOpen(false)} maxWidth="sm" fullWidth>
                <Box sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                            <FolderSpecialIcon color="primary" /> Archivos Registrados del Paciente
                        </Typography>
                        <IconButton onClick={() => setGlobalFilesOpen(false)}><CloseIcon /></IconButton>
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    {allFiles.length === 0 ? (
                        <Typography color="text.secondary" align="center" sx={{ py: 4 }}>No hay archivos adjuntos para este paciente.</Typography>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 400, overflowY: 'auto', pr: 1 }}>
                            {allFiles.map((archivo, idx) => (
                                <Paper key={idx} elevation={0} sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid', borderColor: 'divider', borderRadius: 2, '&:hover': { bgcolor: 'action.hover' } }}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', mr: 2 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={archivo.nombre}>{archivo.nombre}</Typography>
                                        <Typography variant="caption" color="text.secondary">Añadido el: {formatDateText(archivo.fecha)}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <Tooltip title="Ir a la Historia Clínica">
                                            <IconButton size="small" onClick={() => {
                                                setGlobalFilesOpen(false);
                                                // Wait a bit for the Dialog to start closing animation
                                                setTimeout(() => {
                                                    const element = document.getElementById(`entry-${archivo.entrada_id}`);
                                                    if (element) {
                                                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });

                                                        // --- EFECTO OPCIÓN 4: ELEVACIÓN 3D + RESALTADO (CORREGIDO BORDES) ---
                                                        const card = element.querySelector('.MuiPaper-root') || element;
                                                        card.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
                                                        card.style.transform = 'scale(1.02)';
                                                        element.style.zIndex = '100'; // El zIndex se mantiene en el padre
                                                        card.style.boxShadow = theme.palette.mode === 'dark'
                                                            ? '0 20px 40px rgba(0,0,0,0.6), 0 0 20px rgba(3, 169, 244, 0.4)'
                                                            : '0 20px 40px rgba(0,0,0,0.15), 0 0 20px rgba(3, 169, 244, 0.3)';
                                                        card.style.backgroundColor = theme.palette.mode === 'dark' ? 'rgba(3, 169, 244, 0.15)' : '#f0faff';

                                                        setTimeout(() => {
                                                            card.style.transform = 'scale(1)';
                                                            card.style.boxShadow = 'none';
                                                            card.style.backgroundColor = 'transparent';
                                                            setTimeout(() => { element.style.zIndex = 'auto'; }, 600);
                                                        }, 3500);
                                                    }
                                                }, 150);
                                            }} sx={{ bgcolor: '#e1f5fe', color: '#01579b', '&:hover': { bgcolor: '#01579b', color: '#fff' } }}>
                                                <AdsClickIcon />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Visualizar Documento">
                                            <IconButton size="small" color="primary" onClick={() => handleViewFile(archivo)} sx={{ bgcolor: 'primary.light', color: 'primary.main', '&:hover': { bgcolor: 'primary.main', color: '#fff' } }}>
                                                <VisibilityIcon />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </Paper>
                            ))}
                        </Box>
                    )}
                </Box>
            </Dialog>

            {/* Dialog de Visualización de Archivos reubicado a componente externo */}
            <DocumentViewerDialog
                open={viewerOpen}
                onClose={() => setViewerOpen(false)}
                file={viewerFile}
                url={viewerUrl}
                loading={viewerLoading}
            />

        </Box>
    );
};

export default HistoriaClinicaEditor;
