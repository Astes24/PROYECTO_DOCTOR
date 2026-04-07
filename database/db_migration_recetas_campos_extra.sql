-- ================================================================
-- Migración: Agregar campos de RNE y Dirección del médico a Recetas
-- ================================================================

ALTER TABLE medical_prescriptions 
    ADD COLUMN IF NOT EXISTS medico_rne VARCHAR(50),
    ADD COLUMN IF NOT EXISTS medico_direccion TEXT;

COMMENT ON COLUMN medical_prescriptions.medico_rne IS 'Registro Nacional de Especialistas del médico al momento de emitir';
COMMENT ON COLUMN medical_prescriptions.medico_direccion IS 'Dirección del consultorio del médico al momento de emitir';
