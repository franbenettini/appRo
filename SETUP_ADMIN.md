# Configuración del Panel de Administración

Para que funcione el panel de administración y puedas crear usuarios, necesitas configurar la **Service Role Key** de Supabase.

## Pasos:

1. **Obtener la Service Role Key de Supabase:**
   - Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com/)
   - Ve a **Settings** → **API**
   - En la sección "Project API keys", encontrarás:
     - `anon` `public` - Esta es la que ya tienes (NEXT_PUBLIC_SUPABASE_ANON_KEY)
     - `service_role` `secret` - Esta es la que necesitas (SUPABASE_SERVICE_ROLE_KEY)
   - **IMPORTANTE:** Haz clic en el ícono de "eye" (ojo) para revelar la service_role key
   - Copia la clave completa (es muy larga)

2. **Agregar la Service Role Key al proyecto:**
   - Abre el archivo `.env.local` en la raíz del proyecto
   - Agrega la siguiente línea:
     ```
     SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
     ```
   - Reemplaza `tu_service_role_key_aqui` con la clave que copiaste
   - **IMPORTANTE:** 
     - No incluyas comillas alrededor de la clave
     - No dejes espacios antes o después del `=`
     - La clave es muy larga, asegúrate de copiarla completa

3. **Reiniciar el servidor de desarrollo:**
   - Detén el servidor (Ctrl+C)
   - Inícialo nuevamente:
     ```bash
     npm run dev
     ```

## Ejemplo de `.env.local` completo:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=tu_google_maps_key_aqui
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
```

## ⚠️ Advertencia de Seguridad:

- **NUNCA** subas tu `.env.local` a Git (ya está en .gitignore)
- La **Service Role Key** tiene permisos completos de administrador
- **NUNCA** la uses en el cliente (por eso NO tiene el prefijo `NEXT_PUBLIC_`)
- Solo se usa en el servidor (API routes)
- Si alguien obtiene esta clave, puede hacer cualquier cosa en tu base de datos

## Verificación:

Después de configurar la variable y reiniciar el servidor:
1. Ve al panel de administración (dropdown del perfil → Administración)
2. Intenta crear un usuario
3. Si todo está bien, deberías poder crear usuarios sin problemas

