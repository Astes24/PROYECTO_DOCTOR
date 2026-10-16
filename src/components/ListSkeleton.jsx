import React from 'react';
import { Box, Skeleton } from '@mui/material';

// Filas de esqueleto para las listas (vista movil) mientras cargan los datos
const ListSkeleton = ({ rows = 5 }) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 2 }}>
        {Array.from({ length: rows }).map((_, i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Skeleton variant="circular" width={40} height={40} />
                <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="60%" />
                    <Skeleton variant="text" width="35%" />
                </Box>
            </Box>
        ))}
    </Box>
);

export default ListSkeleton;
