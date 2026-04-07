import { createTheme } from '@mui/material/styles';

const customShadows = [
  'none',
  '0px 4px 20px rgba(42, 33, 53, 0.04)',
  '0px 6px 24px rgba(42, 33, 53, 0.05)',
  '0px 8px 30px rgba(42, 33, 53, 0.06)',
  '0px 10px 40px rgba(42, 33, 53, 0.07)',
  ...Array(20).fill('0px 12px 50px rgba(42, 33, 53, 0.08)'),
];

const getAppTheme = (mode) => createTheme({
  palette: {
    mode,
    primary: {
      main: '#CE82FF',
      dark: '#B365E5',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#B6F0FE',
      contrastText: '#2A2135',
    },
    tertiary: {
      main: '#FFD1E8',
      contrastText: '#2A2135',
    },
    background: {
      default: '#FFFFFF',
      paper: '#F9F6FC',
    },
    text: {
      primary: '#2A2135',
      secondary: '#5D546B',
    },
    error: {
      main: '#FF6B6B',
    },
    success: {
      main: '#20C997',
    },
    divider: 'rgba(42, 33, 53, 0.08)',
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
            backgroundColor: '#B365E5',
            boxShadow: '0px 8px 24px rgba(206, 130, 255, 0.35)',
            transform: 'translateY(-1px)',
          }
        },
        containedSecondary: {
          '&:hover': {
            backgroundColor: '#95DFEF', // slightly darker cyan for hover manually calculated
            boxShadow: '0px 8px 24px rgba(182, 240, 254, 0.4)',
            transform: 'translateY(-1px)',
          }
        }
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backgroundColor: '#F9F6FC',
          boxShadow: '0px 8px 30px rgba(42, 33, 53, 0.06)',
          backgroundImage: 'none',
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#F9F6FC',
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
            borderColor: '#CE82FF',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#CE82FF',
            borderWidth: '2px',
          },
          '&.Mui-focused': {
            boxShadow: '0px 0px 0px 4px rgba(206, 130, 255, 0.1)',
          }
        },
        notchedOutline: {
          borderColor: 'rgba(42, 33, 53, 0.15)',
        }
      }
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: '#5D546B',
          '&.Mui-focused': {
            color: '#CE82FF',
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
          boxShadow: '0px 8px 30px rgba(42, 33, 53, 0.2)',
        }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          boxShadow: '0px 12px 50px rgba(42, 33, 53, 0.15)',
        }
      }
    }
  },
});

export default getAppTheme;
