import { esES } from '@mui/x-data-grid/locales';

// Configuracion comun de las tablas: textos en espanol y esqueleto mientras cargan
export const gridLocaleText = {
    ...esES.components.MuiDataGrid.defaultProps.localeText,
    noRowsLabel: 'Aún no hay registros',
    noResultsLabel: 'No se encontraron resultados',
};

export const gridSlotProps = {
    loadingOverlay: { variant: 'skeleton', noRowsVariant: 'skeleton' },
};
