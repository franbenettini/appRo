-- Migración para agregar campo notas a la tabla clients
-- Ejecutar este script en Supabase SQL Editor

-- Agregar columna notas a la tabla clients
ALTER TABLE public.clients 
  ADD COLUMN IF NOT EXISTS notas TEXT;

