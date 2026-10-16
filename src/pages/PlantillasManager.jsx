import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Box, Typography, Button, TextField, Select, MenuItem, FormControl, InputLabel, Paper, IconButton, Dialog, DialogTitle, DialogContent, Divider, Menu } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import DescriptionIcon from '@mui/icons-material/Description';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { EntryEditor, getContentStyles } from '../components/HistoriaClinicaEditor';
import ConfirmDialog from '../components/ConfirmDialog';
import { useTheme } from '@mui/material/styles';
import { marked } from 'marked';

import { useToast } from '../components/ToastProvider';
const PlantillasManager = () => {
    const toast = useToast();
    const theme = useTheme();
    const [plantillas, setPlantillas] = useState([]);
    const [loading, setLoading] = useState(true);

    const [confirmDeleteDialog, setConfirmDeleteDialog] = useState({ open: false, id: null });

    // Edit / Create State
    const [isEditing, setIsEditing] = useState(false);
    const [editingPlantilla, setEditingPlantilla] = useState(null); // null means creating new

    // Form fields
    const [nombre, setNombre] = useState('');
    const [tipo, setTipo] = useState('historia_clinica');

    const fetchPlantillas = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('plantillas')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching plantillas:', error);
        } else {
            setPlantillas(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchPlantillas();
    }, []);

    const [anchorElCreate, setAnchorElCreate] = useState(null);

    const handleCreateClick = (event) => {
        setAnchorElCreate(event.currentTarget);
    };

    const handleCreateClose = () => {
        setAnchorElCreate(null);
    };

    const handleCreateNuevo = () => {
        setEditingPlantilla(null);
        setNombre('');
        setTipo('historia_clinica');
        setIsEditing(true);
        handleCreateClose();
    };

    const handleEdit = (plantilla) => {
        setEditingPlantilla(plantilla);
        setNombre(plantilla.nombre);
        setTipo(plantilla.tipo);
        setIsEditing(true);
    };

    const confirmDelete = (id) => {
        setConfirmDeleteDialog({ open: true, id });
    };

    const handleDelete = async () => {
        const id = confirmDeleteDialog.id;
        setConfirmDeleteDialog({ open: false, id: null });
        if (!id) return;

        const { error } = await supabase.from('plantillas').delete().eq('id', id);
        if (error) {
            console.error('Error deleting plantilla:', error);
            toast('Error al eliminar la plantilla', 'error');
        } else {
            fetchPlantillas();
        }
    };

    const handleSave = async (markdownText) => {
        if (!nombre.trim()) {
            toast('Por favor, ingresa un nombre para la plantilla.', 'warning');
            return;
        }

        try {
            if (editingPlantilla) {
                // Update
                const { error } = await supabase
                    .from('plantillas')
                    .update({ nombre, tipo, contenido: markdownText })
                    .eq('id', editingPlantilla.id);

                if (error) throw error;
            } else {
                // Insert
                const { error } = await supabase
                    .from('plantillas')
                    .insert([{ nombre, tipo, contenido: markdownText }]);

                if (error) throw error;
            }
            setIsEditing(false);
            fetchPlantillas();
        } catch (error) {
            console.error('Error saving plantilla:', error);
            toast('Hubo un error al guardar la plantilla.', 'error');
        }
    };

    if (isEditing) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider', pb: 2 }}>
                    <TextField
                        variant="standard"
                        placeholder="Escribe el nombre de la plantilla..."
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        InputProps={{
                            disableUnderline: true,
                            sx: { fontSize: '1.5rem', fontWeight: 800, color: 'text.primary' }
                        }}
                        autoFocus={!editingPlantilla}
                        sx={{ flex: 1, mr: 2 }}
                    />
                    <Button variant="outlined" onClick={() => setIsEditing(false)} sx={{ flexShrink: 0 }}>Volver a la lista</Button>
                </Box>

                <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    <EntryEditor
                        initialText={editingPlantilla?.contenido || ''}
                        onSave={handleSave}
                        onCancel={() => setIsEditing(false)}
                        disableSign={true}
                        fullHeight={true}
                        placeholder="Escribe aquí tu plantilla de historia clinica..."
                    />
                </Box>
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" color="text.secondary">
                    Plantillas ({plantillas.length})
                </Typography>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={handleCreateClick}
                    sx={{ borderRadius: 2 }}
                >
                    Crear Plantilla
                </Button>
            </Box>

            {loading ? (
                <Typography>Cargando plantillas...</Typography>
            ) : plantillas.length === 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 8, bgcolor: 'background.default', borderRadius: 4, border: '1px dashed', borderColor: 'divider' }}>
                    <DescriptionIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
                    <Typography variant="h6" color="text.secondary">No hay plantillas creadas</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Crea una plantilla para usarla rápidamente en las historias clínicas.
                    </Typography>
                    <Button variant="outlined" startIcon={<AddIcon />} onClick={handleCreateClick}>
                        Crear mi primera plantilla
                    </Button>
                </Box>
            ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 3 }}>
                    {plantillas.map(p => (
                        <Paper key={p.id} elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 2, '&:hover': { borderColor: 'primary.main', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }, transition: 'all 0.2s' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Typography variant="h6" fontWeight="bold" sx={{ color: 'text.primary', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {p.nombre}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                    <IconButton size="small" onClick={() => handleEdit(p)} sx={{ color: 'var(--c-primary-text)', bgcolor: 'primary.light', opacity: 0.8, '&:hover': { opacity: 1 } }}>
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton size="small" onClick={() => confirmDelete(p.id)} sx={{ color: 'error.main', bgcolor: 'error.light', opacity: 0.8, '&:hover': { opacity: 1 } }}>
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Box>
                            </Box>

                            <Box sx={{ mt: 'auto' }}>
                                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontWeight: 'bold', textTransform: 'uppercase', mb: 0.5 }}>
                                    {p.tipo.replace('_', ' ')}
                                </Typography>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                                    <Typography variant="caption" color="text.secondary">
                                        Modificada: {format(new Date(p.fecha_modificacion), "dd/MM/yyyy", { locale: es })}
                                    </Typography>
                                </Box>
                            </Box>
                        </Paper>
                    ))}
                </Box>
            )}

            <Menu
                anchorEl={anchorElCreate}
                open={Boolean(anchorElCreate)}
                onClose={handleCreateClose}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                PaperProps={{
                    elevation: 0,
                    sx: {
                        overflow: 'visible',
                        filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                        mt: 1.5,
                        minWidth: 200,
                        borderRadius: 2
                    },
                }}
            >
                <MenuItem onClick={handleCreateNuevo} sx={{ py: 1.5, display: 'flex', justifyContent: 'center', gap: 1.5 }}>
                    <DescriptionIcon sx={{ color: 'text.secondary' }} fontSize="small" />
                    <Typography variant="body2" fontWeight="500">Historia Clínica</Typography>
                </MenuItem>
            </Menu>

            <ConfirmDialog
                open={confirmDeleteDialog.open}
                title="Eliminar Plantilla"
                content="¿Estás seguro de que deseas eliminar esta plantilla? Esta acción no se puede deshacer."
                onConfirm={handleDelete}
                onCancel={() => setConfirmDeleteDialog({ open: false, id: null })}
                confirmText="Sí, eliminar"
            />
        </Box>
    );
};

export default PlantillasManager;
