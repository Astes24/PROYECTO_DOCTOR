import React, { useState } from 'react';
import { Box, Tabs, Tab, Paper } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import DoctorsTab from './DoctorsTab';
import SchedulesTab from './SchedulesTab';

const DoctorsSchedulesManager = () => {
    const [subTab, setSubTab] = useState(0);

    const handleTabChange = (event, newValue) => {
        setSubTab(newValue);
    };

    return (
        <Paper
            elevation={0}
            sx={{
                flex: 1,
                width: '100%',
                height: '100%',
                bgcolor: 'background.paper',
                backdropFilter: 'blur(16px)',
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: 2,
                borderRadius: 3,
                p: { xs: 2, md: 3 },
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}
        >
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs value={subTab} onChange={handleTabChange} aria-label="doctors schedules subtabs"
                      sx={{
                          minHeight: 48,
                          '& .MuiTabs-indicator': { backgroundColor: '#0284c7', height: 3 },
                          '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: '0.95rem', minWidth: 100 },
                          '& .Mui-selected': { color: '#0284c7 !important' }
                      }}>
                    <Tab icon={<CalendarMonthIcon fontSize="small" />} iconPosition="start" label="Apertura de Agenda" sx={{ minHeight: 48 }} />
                    <Tab icon={<PeopleIcon fontSize="small" />} iconPosition="start" label="Gestión de Doctores" sx={{ minHeight: 48 }} />
                </Tabs>
            </Box>

            <Box sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                {subTab === 0 && <SchedulesTab />}
                {subTab === 1 && <DoctorsTab />}
            </Box>
        </Paper>
    );
};

export default DoctorsSchedulesManager;
