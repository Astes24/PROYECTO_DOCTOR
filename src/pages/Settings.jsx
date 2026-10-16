import React, { useState } from 'react';
import { Box, Typography, Tabs, Tab, Button, CircularProgress } from '@mui/material';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import SettingsIcon from '@mui/icons-material/Settings';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import DescriptionIcon from '@mui/icons-material/Description';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import BusinessIcon from '@mui/icons-material/Business';
import UserManagement from './UserManagement';
import PlantillasManager from './PlantillasManager';
import DoctorsSchedulesManager from './settings/DoctorsSchedulesManager';
import ClinicInfoTab from './settings/ClinicInfoTab';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/ToastProvider';
import { seedDemoData } from '../services/demoSeed';

const Settings = () => {
    const isAdmin = (window.userRole || localStorage.getItem('user_rol')) === 'ADMIN';
    const [activeTab, setActiveTab] = useState(0);
    const toast = useToast();
    // Carga de datos demo (temporal, solo para preparar la demo)
    const [confirmSeed, setConfirmSeed] = useState(false);
    const [seedStep, setSeedStep] = useState(null);

    const handleSeed = async () => {
        setConfirmSeed(false);
        setSeedStep('Iniciando');
        try {
            const result = await seedDemoData(setSeedStep);
            if (result.alreadyLoaded) {
                toast('Los datos demo ya estaban cargados.', 'info');
            } else if (result.skipped.length) {
                toast(`Datos demo cargados. No se pudo cargar: ${result.skipped.join(', ')}.`, 'warning');
            } else {
                toast('Datos demo cargados correctamente.', 'success');
            }
        } catch (err) {
            toast(`Error al cargar datos demo (${err.message})`, 'error');
        } finally {
            setSeedStep(null);
        }
    };

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    return (
        <Box sx={{ width: '95%', mx: 'auto', height: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column', p: 3, gap: 3, bgcolor: 'transparent' }}>
            {/* Content Area */}
            <Box sx={{ flex: 1, width: '100%', bgcolor: 'background.paper', borderRadius: 4, boxShadow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, pt: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Tabs value={activeTab} onChange={handleTabChange} aria-label="settings tabs"
                        sx={{
                            '& .MuiTabs-indicator': { backgroundColor: 'primary.main', height: 3 },
                            '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: '1rem', minWidth: 120 }
                        }}
                    >
                        <Tab icon={<DescriptionIcon fontSize="small" />} iconPosition="start" label="Plantillas" />
                        <Tab icon={<MedicalServicesIcon fontSize="small" />} iconPosition="start" label="Doctores y Horarios" />
                        {isAdmin && <Tab icon={<BusinessIcon fontSize="small" />} iconPosition="start" label="Información del Consultorio" />}
                        {isAdmin && <Tab icon={<PersonAddAlt1Icon fontSize="small" />} iconPosition="start" label="Gestión de Usuarios" />}
                    </Tabs>
                    {isAdmin && (
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={() => setConfirmSeed(true)}
                            disabled={!!seedStep}
                            startIcon={seedStep ? <CircularProgress size={16} color="inherit" /> : <CloudDownloadIcon />}
                            sx={{ ml: 'auto', whiteSpace: 'nowrap', flexShrink: 0 }}
                        >
                            {seedStep ? `Cargando: ${seedStep}...` : 'Cargar datos demo'}
                        </Button>
                    )}
                </Box>

                <Box sx={{ flex: 1, p: 3, overflowY: 'auto' }}>
                    {activeTab === 0 && (
                        <Box sx={{ animation: 'fadeIn 300ms ease-in', height: '100%' }}>
                            <PlantillasManager />
                        </Box>
                    )}

                    {activeTab === 1 && (
                        <Box sx={{ animation: 'fadeIn 300ms ease-in', height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <DoctorsSchedulesManager />
                        </Box>
                    )}

                    {activeTab === 2 && isAdmin && (
                        <Box sx={{ animation: 'fadeIn 300ms ease-in', height: '100%' }}>
                            <ClinicInfoTab />
                        </Box>
                    )}

                    {activeTab === 3 && isAdmin && (
                        <Box sx={{ animation: 'fadeIn 300ms ease-in', height: '100%' }}>
                            <UserManagement />
                        </Box>
                    )}
                </Box>
            </Box>
            <ConfirmDialog
                open={confirmSeed}
                title="¿Cargar datos de demostración?"
                content="Se agregarán pacientes, inventario, recetas, boletas, órdenes de laboratorio, historias clínicas, citas y notificaciones ficticias. Solo se cargan una vez."
                confirmText="Cargar"
                cancelText="Cancelar"
                onConfirm={handleSeed}
                onCancel={() => setConfirmSeed(false)}
            />
        </Box>
    );
};

export default Settings;
