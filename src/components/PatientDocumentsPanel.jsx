import React, { useState, useEffect, useRef } from 'react';
import {
    Box, Typography, IconButton, Button, Dialog, CircularProgress,
    List, ListItem, ListItemIcon, ListItemText, Chip, Divider, Paper, useTheme, Tooltip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import EditIcon from '@mui/icons-material/Edit';
import DescriptionIcon from '@mui/icons-material/Description';
import KeyboardReturnIcon from '@mui/icons-material/KeyboardReturn';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { supabase } from '../supabaseClient';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import DocumentViewerDialog from './DocumentViewerDialog';
import { EntryEditor } from './HistoriaClinicaEditor';
import { useNavigate } from 'react-router-dom';
import { TextField, InputAdornment } from '@mui/material';

const formatDateText = (dateString) => {
    if (!dateString) return '';
    return format(new Date(dateString), "d 'de' MMMM, yyyy - h:mm a", { locale: es });
};

const truncateFilename = (filename, maxLength = 35) => {
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1 || lastDotIndex === 0) {
        return filename.length > maxLength ? filename.substring(0, maxLength) + '...' : filename;
    }
    
    const baseName = filename.substring(0, lastDotIndex);
    const ext = filename.substring(lastDotIndex);
    
    if (baseName.length > maxLength) {
        return baseName.substring(0, maxLength) + '...' + ext;
    }
    return filename;
};

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

const PatientDocumentsPanel = ({ patient, onClose, embedded = false }) => {
    const theme = useTheme();
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    // Viewer state
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerUrl, setViewerUrl] = useState(null);
    const [viewerFile, setViewerFile] = useState(null);
    const [viewerLoading, setViewerLoading] = useState(false);

    const navigate = useNavigate();

    // Description Dialog State
    const [descOpen, setDescOpen] = useState(false);
    const [descDoc, setDescDoc] = useState(null);
    const [descName, setDescName] = useState('');
    const [descExt, setDescExt] = useState('');
    const [descSaving, setDescSaving] = useState(false);

    // Delete Confirmation State
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [docToDelete, setDocToDelete] = useState(null);

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            // 1. Fetch from historial_clinico
            const { data: historialData } = await supabase
                .from('historial_clinico')
                .select('id, archivos, created_at, estado_cerrado')
                .eq('dni_paciente', patient.dni);

            let historialDocs = [];
            if (historialData) {
                historialData.forEach(entry => {
                    if (entry.archivos && Array.isArray(entry.archivos)) {
                        entry.archivos.forEach(arch => {
                            historialDocs.push({
                                id: `hist_${entry.id}_${arch.nombre}`,
                                entrada_id: entry.id,
                                nombre: arch.nombre,
                                ruta: arch.ruta,
                                tipo: arch.tipo,
                                created_at: entry.created_at, // Use entry's creation date
                                origen: 'historia_clinica',
                                firmado: entry.estado_cerrado || false
                            });
                        });
                    }
                });
            }

            // 2. Fetch from documentos_pacientes
            let menuDocs = [];
            const { data: menuData, error: menuError } = await supabase
                .from('documentos_pacientes')
                .select('*')
                .eq('dni_paciente', patient.dni)
                .order('created_at', { ascending: false });
                
            if (!menuError && menuData) {
                menuDocs = menuData.map(doc => ({
                    ...doc,
                    origen: 'documentos'
                }));
            } else if (menuError && menuError.code === '42P01') {
                console.warn("Tabla documentos_pacientes aún no existe. Ignorando.");
            }

            // Combine and sort by date descending
            const combined = [...historialDocs, ...menuDocs].sort((a, b) => 
                new Date(b.created_at) - new Date(a.created_at)
            );

            setDocuments(combined);
        } catch (error) {
            console.error("Error fetching documents:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (patient && patient.dni) {
            fetchDocuments();

            let debounceTimer;
            const reloadFiles = () => {
                if (debounceTimer) clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => fetchDocuments(), 500);
            };

            const channel = supabase.channel(`docs_panel_${patient.dni}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'documentos_pacientes', filter: `dni_paciente=eq.${patient.dni}` }, reloadFiles)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'historial_clinico', filter: `dni_paciente=eq.${patient.dni}` }, reloadFiles)
                .subscribe();

            return () => {
                if (debounceTimer) clearTimeout(debounceTimer);
                supabase.removeChannel(channel);
            };
        }
    }, [patient]);

    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setUploading(true);
        try {
            for (const file of files) {
                const uniqueName = Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
                // Save under a 'documentos' folder to distinguish from clinical history attachments if wanted
                const ruta = `${patient.dni}/documentos/${uniqueName}`;

                const { error: uploadError } = await supabase.storage
                    .from('historial_adjuntos')
                    .upload(ruta, file);

                if (uploadError) {
                    console.error('Error uploading file:', uploadError);
                    alert(`No se pudo subir ${file.name}: ${uploadError.message}`);
                    continue;
                }

                // Call DB insert
                const { error: dbError } = await supabase
                    .from('documentos_pacientes')
                    .insert({
                        dni_paciente: patient.dni,
                        nombre: file.name,
                        ruta: ruta,
                        tipo: file.type,
                        origen: 'documentos'
                    });

                if (dbError) {
                    console.error('Error inserting document record:', dbError);
                    alert(`El archivo ${file.name} se subió pero no se pudo registrar en la base de datos.`);
                }
            }
            // Refresh list
            await fetchDocuments();
        } catch (error) {
            console.error("Error general subiendo archivos:", error);
            alert("Error al procesar la subida de archivos.");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = null; // reset input
        }
    };

    const handleViewDocument = async (doc) => {
        setViewerFile({ nombre: doc.nombre, tipo: doc.tipo, fecha: doc.created_at });
        setViewerUrl(null);
        setViewerOpen(true);
        setViewerLoading(true);
        const url = await obtenerUrlPrivada(doc.ruta);
        setViewerUrl(url);
        setViewerLoading(false);
    };

    const handleGoToHC = (doc) => {
        onClose();
        navigate('/clinical-history', { state: { openPatient: patient, scrollToEntryId: doc.entrada_id } });
    };

    const handleOpenDesc = (doc) => {
        setDescDoc(doc);
        const lastDotIndex = doc.nombre.lastIndexOf('.');
        if (lastDotIndex > 0) {
            setDescName(doc.nombre.substring(0, lastDotIndex));
            setDescExt(doc.nombre.substring(lastDotIndex));
        } else {
            setDescName(doc.nombre);
            setDescExt('');
        }
        setDescOpen(true);
    };

    const handleSaveDesc = async (nuevoMarkdown) => {
        if (!descDoc) return;
        setDescSaving(true);
        const fullName = descName + descExt;
        try {
            if (descDoc.origen === 'documentos') {
                const { error } = await supabase
                    .from('documentos_pacientes')
                    .update({ descripcion: nuevoMarkdown || '', nombre: fullName })
                    .eq('id', descDoc.id);
                if (error) throw error;
            } else {
                // origen === 'historia_clinica'
                const { data: entry, error: fetchErr } = await supabase
                    .from('historial_clinico')
                    .select('archivos')
                    .eq('id', descDoc.entrada_id)
                    .single();
                if (fetchErr) throw fetchErr;
                
                if (entry && entry.archivos) {
                    const newArchivos = entry.archivos.map(a => 
                        a.ruta === descDoc.ruta ? { ...a, nombre: fullName } : a
                    );
                    const { error: updErr } = await supabase
                        .from('historial_clinico')
                        .update({ archivos: newArchivos })
                        .eq('id', descDoc.entrada_id);
                    if (updErr) throw updErr;
                }
            }
            setDescOpen(false);
            await fetchDocuments();
        } catch (err) {
            console.error(err);
            alert("Error al guardar la descripción o nombre");
        } finally {
            setDescSaving(false);
        }
    };

    const handleDeleteClick = (doc) => {
        setDocToDelete(doc);
        setDeleteConfirmOpen(true);
    };

    const executeDelete = async () => {
        if (!docToDelete) return;
        setDeleteConfirmOpen(false);
        const doc = docToDelete;
        
        try {
            if (doc.origen === 'documentos') {
                await supabase.from('documentos_pacientes').delete().eq('id', doc.id);
                await supabase.storage.from('historial_adjuntos').remove([doc.ruta]);
            } else {
                // origen === 'historia_clinica'
                const { data: entry, error: fetchErr } = await supabase
                    .from('historial_clinico')
                    .select('archivos')
                    .eq('id', doc.entrada_id)
                    .single();
                if (fetchErr) throw fetchErr;
                
                if (entry && entry.archivos) {
                    const newArchivos = entry.archivos.filter(a => a.ruta !== doc.ruta);
                    await supabase
                        .from('historial_clinico')
                        .update({ archivos: newArchivos })
                        .eq('id', doc.entrada_id);
                }
                await supabase.storage.from('historial_adjuntos').remove([doc.ruta]);
            }
            await fetchDocuments();
        } catch (err) {
            console.error(err);
            alert("Ocurrió un error al eliminar.");
        }
    };

    const getOriginStyle = (origen) => {
        if (origen === 'documentos') {
            return {
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(3, 169, 244, 0.15)' : '#e1f5fe', // Celeste
                color: theme.palette.mode === 'dark' ? '#81d4fa' : '#0288d1',
                borderColor: theme.palette.mode === 'dark' ? 'rgba(3, 169, 244, 0.3)' : '#81d4fa',
                icon: <FolderSpecialIcon fontSize="small" />
            };
        } else {
            return {
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(233, 30, 99, 0.15)' : '#fce4ec',
                color: theme.palette.mode === 'dark' ? '#f48fb1' : '#c2185b',
                borderColor: theme.palette.mode === 'dark' ? 'rgba(233, 30, 99, 0.3)' : '#f48fb1',
                icon: <MedicalServicesIcon fontSize="small" />
            };
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', bgcolor: 'background.default' }}>
            {/* Header */}
            {!embedded && (
                <Box sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', px: { xs: 3, sm: 4 }, py: 3, position: 'relative', flexShrink: 0 }}>
                    <IconButton onClick={onClose} sx={{ position: 'absolute', top: 12, right: 12, color: 'inherit', bgcolor: 'rgba(0,0,0,0.08)', '&:hover': { bgcolor: 'rgba(0,0,0,0.15)' } }} title="Cerrar">
                        <CloseIcon />
                    </IconButton>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 1.5, pr: 6 }}>
                        <Typography variant="h4" sx={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.025em', lineHeight: 1.1, fontSize: { xs: '1.6rem', sm: '2.2rem' } }}>
                            {patient.nombre_completo || 'Paciente'}
                        </Typography>
                    </Box>
                    <Typography variant="subtitle2" sx={{ mt: 1, opacity: 0.7, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                        Gestor de Documentos
                    </Typography>
                </Box>
            )}

            {/* Scrollable Area with sticky button */}
            <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 2, sm: 4 }, bgcolor: 'background.default' }}>
                <Box sx={{ maxWidth: 900, mx: 'auto', display: 'flex', flexDirection: 'column' }}>
                    
                    {/* Floating Sticky Actions */}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', position: 'sticky', top: 0, zIndex: 10, mb: 2 }}>
                        <input
                            type="file"
                            multiple
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            onChange={handleFileUpload}
                        />
                        <Button
                            variant="contained"
                            startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />}
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            sx={{
                                bgcolor: '#03a9f4', 
                                color: '#fff', 
                                '&:hover': { bgcolor: '#0288d1' },
                                fontWeight: 'bold',
                                borderRadius: 2,
                                textTransform: 'none',
                                boxShadow: 2
                            }}
                        >
                            {uploading ? 'Subiendo...' : 'Subir Documento'}
                        </Button>
                    </Box>

                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                            <CircularProgress />
                        </Box>
                ) : documents.length === 0 ? (
                    <Box sx={{ width: '100%' }}>
                        <Paper sx={{ p: 6, textAlign: 'center', bgcolor: 'transparent', border: '2px dashed', borderColor: 'divider', borderRadius: 3 }}>
                            <InsertDriveFileIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                            <Typography variant="h6" color="text.secondary" fontWeight="bold">No hay documentos</Typography>
                            <Typography color="text.secondary">Este paciente aún no tiene archivos subidos.</Typography>
                        </Paper>
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', position: 'relative' }}>
                        <List sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 0 }}>
                        {documents.map((doc, index) => {
                            const originStyle = getOriginStyle(doc.origen);

                            return (
                                <Paper
                                    key={index}
                                    elevation={0}
                                    sx={{
                                        border: '1px solid',
                                        borderColor: originStyle.borderColor,
                                        bgcolor: originStyle.bgcolor,
                                        borderRadius: 3,
                                        overflow: 'hidden',
                                        transition: 'transform 0.2s, box-shadow 0.2s',
                                        '&:hover': {
                                            transform: 'translateY(-2px)',
                                            boxShadow: 3
                                        }
                                    }}
                                >
                                    <ListItem
                                        alignItems="center"
                                        sx={{ py: 2, pl: 0, pr: 3 }}
                                    >
                                        <Box sx={{ width: 80, display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0, color: originStyle.color }}>
                                            {originStyle.icon}
                                        </Box>
                                        <ListItemText
                                            primary={
                                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, gap: 1 }}>
                                                    <Typography variant="subtitle1" fontWeight="bold" sx={{ color: originStyle.color, wordBreak: 'break-word' }} title={doc.nombre}>
                                                        {truncateFilename(doc.nombre)}
                                                    </Typography>
                                                    <Tooltip title={doc.firmado ? "Los documentos firmados no se pueden modificar" : ""} arrow placement="top">
                                                        <span>
                                                            <IconButton size="small" onClick={() => handleOpenDesc(doc)} sx={{ color: originStyle.color }} disabled={doc.firmado}>
                                                                <EditIcon fontSize="small" />
                                                            </IconButton>
                                                        </span>
                                                    </Tooltip>
                                                </Box>
                                            }
                                            secondary={
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                    <Typography variant="body2" sx={{ color: 'text.primary', opacity: 0.8 }}>
                                                        Añadido el: {formatDateText(doc.created_at)}
                                                    </Typography>
                                                    <Chip 
                                                        size="small" 
                                                        label={doc.origen === 'documentos' ? 'Menú Documentos' : 'Historia Clínica'} 
                                                        sx={{ 
                                                            alignSelf: 'flex-start',
                                                            bgcolor: originStyle.color, 
                                                            color: '#fff', 
                                                            fontWeight: 'bold', 
                                                            fontSize: '0.65rem',
                                                            height: 20
                                                        }} 
                                                    />
                                                </Box>
                                            }
                                        />
                                        <Box sx={{ alignSelf: 'center', ml: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
                                            {doc.origen === 'historia_clinica' ? (
                                                <Button
                                                    variant="outlined"
                                                    startIcon={<KeyboardReturnIcon />}
                                                    onClick={() => handleGoToHC(doc)}
                                                    sx={{
                                                        color: originStyle.color,
                                                        borderColor: originStyle.color,
                                                        borderRadius: 2,
                                                        '&:hover': { bgcolor: originStyle.color, color: '#fff' }
                                                    }}
                                                >
                                                    Ir a la HC
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="outlined"
                                                    startIcon={<DescriptionIcon />}
                                                    onClick={() => handleOpenDesc(doc)}
                                                    sx={{
                                                        color: originStyle.color,
                                                        borderColor: originStyle.color,
                                                        borderRadius: 2,
                                                        '&:hover': { bgcolor: originStyle.color, color: '#fff' }
                                                    }}
                                                >
                                                    Descripción
                                                </Button>
                                            )}
                                            <Button
                                                variant="outlined"
                                                startIcon={<VisibilityIcon />}
                                                onClick={() => handleViewDocument(doc)}
                                                sx={{
                                                    color: originStyle.color,
                                                    borderColor: originStyle.color,
                                                    borderRadius: 2,
                                                    '&:hover': {
                                                        bgcolor: originStyle.color,
                                                        color: '#fff'
                                                    }
                                                }}
                                            >
                                                Ver
                                            </Button>
                                            <Tooltip title={doc.firmado ? "Los documentos firmados no se pueden borrar" : ""} arrow placement="top">
                                                <span>
                                                    <IconButton 
                                                        size="small" 
                                                        onClick={() => handleDeleteClick(doc)} 
                                                        disabled={doc.firmado}
                                                        sx={{ 
                                                            color: doc.firmado ? 'action.disabled' : 'error.main', 
                                                            border: '1px solid', 
                                                            borderColor: doc.firmado ? 'action.disabledBackground' : 'error.light', 
                                                            borderRadius: '50%',
                                                            width: 36,
                                                            height: 36,
                                                            '&:hover': doc.firmado ? {} : { bgcolor: 'error.light', color: '#fff' }
                                                        }}
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        </Box>
                                    </ListItem>
                                </Paper>
                            );
                        })}
                    </List>
                    </Box>
                )}
                </Box>
            </Box>

            <DocumentViewerDialog
                open={viewerOpen}
                onClose={() => setViewerOpen(false)}
                file={viewerFile}
                url={viewerUrl}
                loading={viewerLoading}
            />

            {/* Description / Edit Modal */}
            <Dialog open={descOpen} onClose={() => !descSaving && setDescOpen(false)} maxWidth="md" fullWidth>
                {descOpen && (
                    <Box sx={{ p: 4, bgcolor: 'background.paper' }}>
                        <Typography variant="h5" fontWeight="bold" mb={3} color="primary.main">
                            Detalles del Documento
                        </Typography>
                        
                        <TextField 
                            label="Nombre del archivo" 
                            fullWidth 
                            value={descName} 
                            onChange={(e) => setDescName(e.target.value)} 
                            InputProps={{
                                endAdornment: descExt ? <InputAdornment position="end">{descExt}</InputAdornment> : null,
                            }}
                            sx={{ mb: 4 }}
                        />

                        {descDoc?.origen === 'documentos' ? (
                            <>
                                <Typography variant="subtitle2" mb={1} color="text.secondary" fontWeight="bold" textTransform="uppercase">
                                    Descripción / Notas
                                </Typography>
                                <Box sx={{ borderRadius: 2, overflow: 'hidden' }}>
                                    <EntryEditor 
                                        initialText={descDoc?.descripcion || ''} 
                                        onSave={handleSaveDesc} 
                                        onCancel={() => setDescOpen(false)} 
                                        hideAttachments={true} 
                                        disableSign={true}
                                        fullHeight={false}
                                        placeholder="Escribe detalles adicionales sobre este documento..."
                                    />
                                </Box>
                            </>
                        ) : (
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
                                <Button variant="outlined" onClick={() => setDescOpen(false)} disabled={descSaving}>
                                    Cancelar
                                </Button>
                                <Button variant="contained" onClick={() => handleSaveDesc('')} disabled={descSaving}>
                                    {descSaving ? 'Guardando...' : 'Guardar Nombre'}
                                </Button>
                            </Box>
                        )}
                    </Box>
                )}
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog 
                open={deleteConfirmOpen} 
                onClose={() => setDeleteConfirmOpen(false)}
                PaperProps={{ sx: { borderRadius: 3, p: 2, minWidth: 320 } }}
            >
                <Box sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1.5 }}>
                        <WarningAmberIcon color="error" fontSize="large" />
                        <Typography variant="h6" fontWeight="bold">Confirmar Eliminación</Typography>
                    </Box>
                    <Typography mb={3} color="text.secondary">
                        ¿Estás seguro de que deseas eliminar permanentemente el archivo <strong>{docToDelete?.nombre}</strong>? Esta acción no se puede deshacer.
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                        <Button onClick={() => setDeleteConfirmOpen(false)} color="inherit" variant="text" sx={{ fontWeight: 'bold' }}>
                            Cancelar
                        </Button>
                        <Button onClick={executeDelete} variant="contained" color="error" sx={{ fontWeight: 'bold' }}>
                            Eliminar
                        </Button>
                    </Box>
                </Box>
            </Dialog>
        </Box>
    );
};

export default PatientDocumentsPanel;
