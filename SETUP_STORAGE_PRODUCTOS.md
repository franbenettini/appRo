# Configuración de Supabase Storage para Productos

Para que funcione la subida de imágenes y PDFs de productos, necesitas crear el bucket de Storage en Supabase.

## Pasos para crear el bucket:

1. **Accede al Dashboard de Supabase:**
   - Ve a [Supabase Dashboard](https://app.supabase.com/)
   - Selecciona tu proyecto

2. **Navega a Storage:**
   - En el menú lateral, haz clic en **Storage**
   - Verás una lista de buckets (si ya tienes alguno)

3. **Crea el nuevo bucket:**
   - Haz clic en el botón **"New bucket"** o **"Create bucket"**
   - Configura el bucket con estos valores:
     - **Name:** `productos` (exactamente así, en minúsculas)
     - **Public bucket:** ✅ **Marca esta opción como "Public"** (esto permite que las imágenes y PDFs sean accesibles públicamente)
     - **File size limit:** Puedes dejarlo en el valor por defecto o configurarlo (recomendado: 10MB)
     - **Allowed MIME types:** Puedes dejarlo vacío para permitir todos los tipos, o especificar:
       - Para imágenes: `image/jpeg,image/png,image/gif,image/webp`
       - Para PDFs: `application/pdf`

4. **Haz clic en "Create bucket"**

## Configurar las políticas de Storage:

Después de crear el bucket, ejecuta el script SQL en el SQL Editor de Supabase:

1. Ve a **SQL Editor** en el Dashboard de Supabase
2. Abre el archivo `supabase/storage-setup-productos.sql`
3. Copia y pega el contenido en el editor
4. Haz clic en **"Run"** para ejecutar el script

Este script creará las políticas necesarias para que:
- Los administradores puedan subir, actualizar y eliminar archivos
- Todos los usuarios puedan ver los archivos (porque el bucket es público)

## Verificación:

Después de crear el bucket y ejecutar las políticas:

1. Intenta subir una imagen en el formulario de productos
2. Si todo está bien configurado, deberías poder subir la imagen sin errores
3. La imagen debería aparecer en la vista previa y guardarse correctamente

## Solución de problemas:

### Error: "Bucket not found"
- Verifica que el bucket se llame exactamente `productos` (en minúsculas)
- Asegúrate de que el bucket esté creado en el proyecto correcto de Supabase

### Error: "Permission denied" o "Access denied"
- Verifica que hayas ejecutado el script `storage-setup-productos.sql`
- Asegúrate de que estés logueado como usuario con rol `admin`
- Verifica que las políticas de Storage estén correctamente configuradas

### Los archivos no se muestran
- Verifica que el bucket esté marcado como **Public**
- Revisa que la URL generada sea correcta en la consola del navegador

## Estructura del bucket:

Los archivos se organizarán así:
```
productos/
  └── {user_id}/
      ├── {timestamp}-imagen.{ext}
      └── {timestamp}-especificaciones.pdf
```

Cada usuario tiene su propia carpeta dentro del bucket, lo que facilita la gestión y limpieza de archivos.

