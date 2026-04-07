import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useTheme } from '@mui/material/styles';

const ConfirmDialog = ({ open, title = '¿Estás seguro?', content, onConfirm, onCancel, confirmText = 'Sí', cancelText = 'No' }) => {
    const theme = useTheme();
    return (
        <Dialog
            open={open}
            onClose={onCancel}
            PaperProps={{
                sx: { borderRadius: 4, padding: 1, minWidth: { xs: 300, sm: 400 }, boxShadow: '0px 10px 40px rgba(0,0,0,0.2)' }
            }}
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
                <Box sx={{ bgcolor: theme.palette.mode === 'dark' ? 'warning.dark' : 'warning.light', color: theme.palette.mode === 'dark' ? '#fff' : 'warning.dark', borderRadius: '50%', p: 1, display: 'flex' }}>
                    <WarningAmberIcon />
                </Box>
                <Typography variant="h6" fontWeight="bold">
                    {title}
                </Typography>
            </DialogTitle>
            <DialogContent>
                <Typography variant="body1" color="text.secondary" sx={{ mt: 1, whiteSpace: 'pre-line' }}>
                    {content}
                </Typography>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
                <Button onClick={onCancel} color="inherit" variant="text" sx={{ fontWeight: 'bold', borderRadius: 2 }}>
                    {cancelText}
                </Button>
                <Button onClick={onConfirm} color="primary" variant="contained" sx={{ fontWeight: 'bold', borderRadius: 2, px: 3 }}>
                    {confirmText}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ConfirmDialog;
