import React, { useState } from 'react';
import { Box, Typography, Tabs, Tab } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import DescriptionIcon from '@mui/icons-material/Description';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import BusinessIcon from '@mui/icons-material/Business';
import UserManagement from './UserManagement';
import PlantillasManager from './PlantillasManager';
import DoctorsSchedulesManager from './settings/DoctorsSchedulesManager';
import ClinicInfoTab from './settings/ClinicInfoTab';

const Settings = () => {
    const isAdmin = (window.userRole || localStorage.getItem('user_rol')) === 'ADMIN';
    const [activeTab, setActiveTab] = useState(0);

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    return (
        <Box sx={{ width: '95%', mx: 'auto', height: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column', p: 3, gap: 3, bgcolor: 'transparent' }}>
            {/* Content Area */}
            <Box sx={{ flex: 1, width: '100%', bgcolor: 'background.paper', borderRadius: 4, boxShadow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, pt: 1 }}>
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
        </Box>
    );
};

export default Settings;
