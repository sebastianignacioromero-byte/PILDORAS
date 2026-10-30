-- =====================================================================
-- MIGRACIÓN CARGA MASIVA - Píldoras
-- Ejecutar una vez, antes del primer carga.sql generado desde el stock.
-- Permite fichas cuyo nombre no declara la dosis (p. ej. "VESNIDAN X 30CR"):
-- el principio activo se registra sin cantidad.
-- =====================================================================
alter table public.medicamento_principios alter column cantidad drop not null;
