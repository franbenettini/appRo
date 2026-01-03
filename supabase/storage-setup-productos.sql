-- Script para configurar el bucket de Storage para productos
-- Ejecutar este script en Supabase SQL Editor después de crear el bucket manualmente

-- Nota: Primero debes crear el bucket "productos" manualmente en Supabase Dashboard:
-- Storage > Create bucket > Nombre: "productos" > Public: true

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Admins can upload product files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update product files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete product files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view product files" ON storage.objects;

-- Política para permitir que los admins suban archivos
CREATE POLICY "Admins can upload product files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'productos' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Política para permitir que los admins actualicen archivos
CREATE POLICY "Admins can update product files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'productos' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Política para permitir que los admins eliminen archivos
CREATE POLICY "Admins can delete product files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'productos' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Política para permitir que todos vean los archivos (públicos)
CREATE POLICY "Anyone can view product files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'productos');

