import React, { useState, useMemo, createContext, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import getAppTheme from './theme/AppTheme';
import MainLayout from './components/MainLayout';
import DashboardHome from './pages/DashboardHome';
import Appointments from './pages/Appointments';
import Patients from './pages/Patients';
import Notifications from './pages/Notifications';
import Login from './pages/Login';
import Settings from './pages/Settings';
import LiveChat from './pages/LiveChat';
import ClinicalHistory from './pages/ClinicalHistory';
import Documents from './pages/Documents';
import Inventory from './pages/Inventory';
import SalesReceipts from './pages/SalesReceipts';
import MedicalPrescriptions from './pages/MedicalPrescriptions';
import LaboratoryOrders from './pages/LaboratoryOrders';

export const ColorModeContext = createContext({ toggleColorMode: () => { } });

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: 'red' }}>
          <h1>Algo salió mal.</h1>
          <pre>{this.state.error && this.state.error.toString()}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  const [mode, setMode] = useState('light');

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
      },
    }),
    [],
  );

  const theme = useMemo(() => getAppTheme(mode), [mode]);

  // Sync with Tailwind dark mode class
  useEffect(() => {
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [mode]);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ErrorBoundary>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<MainLayout />}>
                <Route index element={<DashboardHome />} />
                <Route path="appointments" element={<Appointments />} />
                <Route path="patients" element={<Patients />} />
                <Route path="clinical-history" element={<ClinicalHistory />} />
                <Route path="documents" element={<Documents />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="sales-receipts" element={<SalesReceipts />} />
                <Route path="prescriptions" element={<MedicalPrescriptions />} />
                <Route path="laboratory" element={<LaboratoryOrders />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="live-chat" element={<LiveChat />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ErrorBoundary>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export default App;
