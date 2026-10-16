import { createTheme } from '@mui/material/styles';
import { PALETTES, DEFAULT_PALETTE } from './palettes';

const hexRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
};

const customShadows = [
  'none',
  '0px 4px 20px rgba(32, 28, 20, 0.04)',
  '0px 6px 24px rgba(32, 28, 20, 0.05)',
  '0px 8px 30px rgba(32, 28, 20, 0.06)',
  '0px 10px 40px rgba(32, 28, 20, 0.07)',
  ...Array(20).fill('0px 12px 50px rgba(32, 28, 20, 0.08)'),
];

const getAppTheme = (mode, paletteKey = DEFAULT_PALETTE) => {
  const brand = PALETTES[paletteKey] || PALETTES[DEFAULT_PALETTE];
  return createTheme({
  palette: {
    mode,
    primary: {
      main: brand.primary,
      dark: brand.hover,
      light: brand.soft,
      contrastText: brand.contrast,
    },
    secondary: {
      main: brand.border,
      contrastText: '#1F2937',
    },
    tertiary: {
      main: brand.soft,
      contrastText: '#1F2937',
    },
    background: {
      default: brand.bg,
      paper: brand.surface,
    },
    text: {
      primary: '#1A1A1A',
      secondary: '#5B6472',
    },
    error: {
      main: '#DC2626',
    },
    success: {
      main: '#15803D',
    },
    divider: 'rgba(32, 28, 20, 0.08)',
  },
  typography: {
    fontFamily: '"Inter", "Roboto", sans-serif',
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
            backgroundColor: brand.hover,
            boxShadow: `0px 8px 24px rgba(${hexRgb(brand.primary)}, 0.35)`,
            transform: 'translateY(-1px)',
          }
        },
        containedSecondary: {
          '&:hover': {
            backgroundColor: brand.soft,
            boxShadow: `0px 8px 24px rgba(${hexRgb(brand.primary)}, 0.2)`,
            transform: 'translateY(-1px)',
          }
        }
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backgroundColor: brand.surface,
          boxShadow: '0px 8px 30px rgba(32, 28, 20, 0.06)',
          backgroundImage: 'none',
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: brand.surface,
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
            borderColor: brand.primary,
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: brand.primary,
            borderWidth: '2px',
          },
          '&.Mui-focused': {
            boxShadow: `0px 0px 0px 4px rgba(${hexRgb(brand.primary)}, 0.12)`,
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
          color: '#5B6472',
          '&.Mui-focused': {
            color: brand.text,
          }
        }
      }
    },
    MuiSnackbarContent: {
      styleOverrides: {
        root: {
          backgroundColor: '#1F2937',
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
};

export default getAppTheme;
