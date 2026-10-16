// Paletas de marca intercambiables. Todos los colores de marca del panel salen de aqui:
// MUI los recibe en AppTheme.js y el resto del codigo los usa como variables CSS (--c-*).
// Contraste verificado (WCAG AA >= 4.5:1): contrast sobre primary, text sobre bg/soft/blanco.
export const PALETTES = {
    dorado: {
        label: 'Dorado',
        primary: '#D4AF37',   // botones, bordes, acentos
        hover: '#B8962E',     // hover de botones
        text: '#7D6314',      // texto e iconos en color de marca
        soft: '#FBF5E3',      // fondos suaves (chips, filas activas)
        border: '#EADBA8',    // bordes suaves
        contrast: '#1A1A1A',  // texto sobre botones primary
        bg: '#F6F3EC',        // fondo de la app
        surface: '#FFFFFF',   // tarjetas y paneles
    },
    azul: {
        label: 'Azul',
        primary: '#1F6FD1',
        hover: '#185AAB',
        text: '#185AAB',
        soft: '#EBF2FC',
        border: '#C5D9F4',
        contrast: '#FFFFFF',
        bg: '#F2F5F9',
        surface: '#FFFFFF',
    },
    turquesa: {
        label: 'Turquesa',
        primary: '#0E7C7B',
        hover: '#0A6362',
        text: '#0A6362',
        soft: '#E5F4F3',
        border: '#B5DEDC',
        contrast: '#FFFFFF',
        bg: '#F1F6F6',
        surface: '#FFFFFF',
    },
};

export const DEFAULT_PALETTE = 'turquesa';

const hexToRgb = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
};

// Variables CSS de la paleta, para la app y para las ventanas de impresion
export const paletteCssVars = (key) => {
    const p = PALETTES[key] || PALETTES[DEFAULT_PALETTE];
    return {
        '--c-primary': p.primary,
        '--c-primary-rgb': hexToRgb(p.primary),
        '--c-primary-hover': p.hover,
        '--c-primary-text': p.text,
        '--c-primary-soft': p.soft,
        '--c-primary-border': p.border,
        '--c-on-primary': p.contrast,
        '--c-bg': p.bg,
        '--c-surface': p.surface,
    };
};

export const applyPalette = (key) => {
    const root = document.documentElement;
    Object.entries(paletteCssVars(key)).forEach(([name, value]) => root.style.setProperty(name, value));
};

// Bloque <style> con las variables, para documentos abiertos con window.open
export const paletteStyleBlock = () => {
    const styles = getComputedStyle(document.documentElement);
    const vars = Object.keys(paletteCssVars(DEFAULT_PALETTE))
        .map((name) => `${name}: ${styles.getPropertyValue(name).trim()};`)
        .join(' ');
    return `:root { ${vars} }`;
};
