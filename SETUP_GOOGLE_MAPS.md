# Configuración de Google Maps API

Para que funcione el autocompletado de direcciones y el mapa en el formulario de clientes, necesitas configurar la API de Google Maps.

## Pasos:

1. **Obtener una API Key de Google Maps:**
   - Ve a [Google Cloud Console](https://console.cloud.google.com/)
   - Crea un nuevo proyecto o selecciona uno existente
   - **IMPORTANTE: Habilita las siguientes APIs (esto es crítico):**
     - **Maps JavaScript API** (OBLIGATORIO)
     - **Places API** (OBLIGATORIO - necesaria para el autocompletado)
     - Geocoding API (opcional, para mejor funcionalidad)
   
   **Para habilitar las APIs:**
   - Ve a "APIs y servicios" > "Biblioteca"
   - Busca "Maps JavaScript API" y haz clic en "Habilitar"
   - Busca "Places API" y haz clic en "Habilitar"
   - Asegúrate de que ambas APIs estén habilitadas antes de continuar

2. **Crear la API Key:**
   - Ve a "APIs y servicios" > "Credenciales"
   - Haz clic en "+ CREAR CREDENCIALES" > "Clave de API"
   - Se creará una nueva API Key
   - **IMPORTANTE:** Haz clic en "Restringir clave" para configurar las restricciones

3. **Configurar restricciones de la API Key (Recomendado):**
   - En "Restricciones de aplicación":
     - Selecciona "Sitios web" (si estás en producción)
     - O "Ninguna" para desarrollo local
     - Agrega tu dominio (ej: `localhost:3000` para desarrollo, `tudominio.com` para producción)
   - En "Restricciones de API":
     - Selecciona "Limitar clave"
     - Marca SOLO estas APIs:
       - Maps JavaScript API
       - Places API
       - (Opcional) Geocoding API
   - Guarda los cambios

4. **Agregar la API Key al proyecto:**
   - Crea o edita el archivo `.env.local` en la raíz del proyecto
   - Agrega la siguiente línea:
     ```
     NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=tu_api_key_aqui
     ```
   - Reemplaza `tu_api_key_aqui` con tu API Key real
   - **IMPORTANTE:** No incluyas comillas alrededor de la API key

5. **Reiniciar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```

## Solución de Problemas:

### Error: "This API project is not authorized to use this API"
**Solución:**
1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Asegúrate de que estás en el proyecto correcto
3. Ve a "APIs y servicios" > "Biblioteca"
4. Verifica que estas APIs estén **HABILITADAS**:
   - ✅ Maps JavaScript API
   - ✅ Places API
5. Si no están habilitadas, haz clic en cada una y presiona "Habilitar"
6. Espera unos minutos para que los cambios se propaguen
7. Reinicia tu servidor de desarrollo

### La dirección se selecciona pero aparece el error
- El código está funcionando correctamente
- El problema es solo la configuración de la API key
- Sigue los pasos de "Solución de Problemas" arriba

## Nota de Seguridad:

- **NUNCA** subas tu `.env.local` a Git
- La API Key que uses con el prefijo `NEXT_PUBLIC_` será visible en el cliente
- Asegúrate de restringir la API Key en Google Cloud Console a:
  - Tu dominio específico (o `localhost:3000` para desarrollo)
  - Solo las APIs necesarias (Maps JavaScript API, Places API)
- Considera usar restricciones de IP en producción para mayor seguridad

