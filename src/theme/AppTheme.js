import { createTheme } from '@mui/material/styles';

const customShadows = [
  'none',
  '0px 4px 20px rgba(32, 28, 20, 0.04)',
  '0px 6px 24px rgba(32, 28, 20, 0.05)',
  '0px 8px 30px rgba(32, 28, 20, 0.06)',
  '0px 10px 40px rgba(32, 28, 20, 0.07)',
  ...Array(20).fill('0px 12px 50px rgba(32, 28, 20, 0.08)'),
];

const getAppTheme = (mode) => createTheme({
  palette: {
    mode,
    primary: {
      main: '#D4AF37',
      dark: '#B8860B',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#E5D5B0',
      contrastText: '#2A2135',
    },
    tertiary: {
      main: '#F5F5DC',
      contrastText: '#2A2135',
    },
    background: {
      default: '#FFFDF5',
      paper: '#FCF9F2',
    },
    text: {
      primary: '#1A1A1A',
      secondary: '#5D546B',
    },
    error: {
      main: '#FF6B6B',
    },
    success: {
      main: '#20C997',
    },
    divider: 'rgba(32, 28, 20, 0.08)',
  },
  typography: {
    fontFamily: '"Roboto", sans-serif',
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12, // Global 12px for Buttons and Inputs
  },
  shadows: customShadows,
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '8px 24px',
          transition: 'all 0.3s ease-in-out',
        },
        containedPrimary: {
          '&:hover': {
            backgroundColor: '#B8860B',
            boxShadow: '0px 8px 24px rgba(212, 175, 55, 0.35)',
            transform: 'translateY(-1px)',
          }
        },
        containedSecondary: {
          '&:hover': {
            backgroundColor: '#D4C49F', // slightly darker champagne for hover
            boxShadow: '0px 8px 24px rgba(229, 213, 176, 0.4)',
            transform: 'translateY(-1px)',
          }
        }
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backgroundColor: '#FCF9F2',
          boxShadow: '0px 8px 30px rgba(32, 28, 20, 0.06)',
          backgroundImage: 'none',
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#FCF9F2',
        }
      }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: '#FFFFFF',
          transition: 'all 0.2s ease-in-out',
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#D4AF37',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#D4AF37',
            borderWidth: '2px',
          },
          '&.Mui-focused': {
            boxShadow: '0px 0px 0px 4px rgba(212, 175, 55, 0.1)',
          }
        },
        notchedOutline: {
          borderColor: 'rgba(32, 28, 20, 0.15)',
        }
      }
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: '#5D546B',
          '&.Mui-focused': {
            color: '#D4AF37',
          }
        }
      }
    },
    MuiSnackbarContent: {
      styleOverrides: {
        root: {
          backgroundColor: '#2A2135',
          color: '#FFFFFF',
          borderRadius: 12,
          boxShadow: '0px 8px 30px rgba(32, 28, 20, 0.2)',
        }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          boxShadow: '0px 12px 50px rgba(32, 28, 20, 0.15)',
        }
      }
    }
  },
});

export default getAppTheme;
