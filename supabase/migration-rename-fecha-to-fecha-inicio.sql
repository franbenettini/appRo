-- Migración para renombrar la columna 'fecha' a 'fecha_inicio' en la tabla rutas
-- Ejecutar este script en Supabase SQL Editor

ALTER TABLE public.rutas 
RENAME COLUMN fecha TO fecha_inicio;

