-- Migración para eliminar columnas antiguas que ya no se usan
-- Ejecutar este script en Supabase SQL Editor

-- Eliminar columnas antiguas de la tabla clients
-- Estas columnas ya no se usan, ahora usamos razon_social, nombre_establecimiento y client_contacts

ALTER TABLE public.clients 
  DROP COLUMN IF EXISTS name,
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS phone,
  DROP COLUMN IF EXISTS company;

-- Nota: Si tienes datos importantes en estas columnas, haz un backup antes de ejecutar este script

