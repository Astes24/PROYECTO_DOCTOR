import React, { createContext, useCallback, useContext, useState } from 'react';
import { Snackbar, Alert } from '@mui/material';

// Avisos globales (reemplazan a window.alert). Uso: const toast = useToast(); toast('Mensaje', 'error');
const ToastContext = createContext(() => { });

export const ToastProvider = ({ children }) => {
    const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });

    const showToast = useCallback((message, severity = 'info') => {
        setToast({ open: true, message, severity });
    }, []);

    const handleClose = (_, reason) => {
        if (reason === 'clickaway') return;
        setToast((prev) => ({ ...prev, open: false }));
    };

    return (
        <ToastContext.Provider value={showToast}>
            {children}
            <Snackbar
                open={toast.open}
                autoHideDuration={5000}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                sx={{ zIndex: 9000 }}
            >
                <Alert onClose={handleClose} severity={toast.severity} variant="filled" sx={{ width: '100%', borderRadius: 3, boxShadow: 3, fontWeight: 'bold' }}>
                    {toast.message}
                </Alert>
            </Snackbar>
        </ToastContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(ToastContext);
