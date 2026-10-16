import React from 'react';

// Logo generico de la clinica; toma los colores de la paleta activa
const ClinicLogo = ({ style, className }) => (
    <svg viewBox="0 0 200 200" role="img" aria-label="Logo Clínica" style={style} className={className}>
        <rect width="200" height="200" fill="var(--c-primary-text)" />
        <circle cx="100" cy="100" r="62" fill="none" stroke="var(--c-primary-border)" strokeWidth="6" />
        <path d="M100 64V136M64 100H136" stroke="var(--c-primary-border)" strokeWidth="20" strokeLinecap="round" />
    </svg>
);

export default ClinicLogo;
