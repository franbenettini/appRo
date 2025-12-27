-- Migración para agregar campo nombre a la tabla client_contacts
-- Ejecutar este script en Supabase SQL Editor

-- Agregar columna nombre a la tabla client_contacts
ALTER TABLE public.client_contacts 
  ADD COLUMN IF NOT EXISTS nombre TEXT;

-- Hacer el campo nombre obligatorio (NOT NULL) después de agregarlo
-- Nota: Si ya hay registros, primero necesitarás actualizarlos con un valor por defecto
-- UPDATE public.client_contacts SET nombre = 'Sin nombre' WHERE nombre IS NULL;
-- ALTER TABLE public.client_contacts ALTER COLUMN nombre SET NOT NULL;

