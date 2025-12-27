-- Migración para agregar el campo fecha_finalizacion a la tabla rutas
-- Ejecutar este script en Supabase SQL Editor si ya ejecutaste migration-visitas.sql

ALTER TABLE public.rutas
ADD COLUMN IF NOT EXISTS fecha_finalizacion DATE;

