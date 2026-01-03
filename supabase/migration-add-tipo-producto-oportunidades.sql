-- Migración para agregar columna tipo_producto a la tabla oportunidades
-- Esto permite distinguir entre "Descartables" y "Ninguno"
-- Ejecutar este script en Supabase SQL Editor

-- Agregar columna tipo_producto a oportunidades
ALTER TABLE public.oportunidades
ADD COLUMN IF NOT EXISTS tipo_producto TEXT CHECK (tipo_producto IN ('descartables', NULL));

