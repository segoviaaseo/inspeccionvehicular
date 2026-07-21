# Respaldo automático en Google Drive

Cuando se completa una inspección, el servidor genera un PDF y lo guarda
automáticamente en Google Drive, dentro de:

```
INSPECCIONES/
  └── Julio 2026/
      ├── Inspeccion_LHJ747_2026-07-15.pdf
      └── Inspeccion_XYZ123_2026-07-21.pdf
  └── Agosto 2026/
      └── ...
```

La carpeta `INSPECCIONES` se crea sola la primera vez, y se crea una subcarpeta
por cada mes. Esto ocurre en segundo plano: la aplicación no muestra nada al
respecto, y si falla el respaldo la inspección se completa igual.

## Configuración (una sola vez)

### 1. Crear un proyecto y una Service Account

1. Entra a https://console.cloud.google.com/ y crea un proyecto (o usa uno existente).
2. Ve a **APIs y servicios → Biblioteca**, busca **Google Drive API** y actívala.
3. Ve a **APIs y servicios → Credenciales → Crear credenciales → Cuenta de servicio**.
4. Ponle un nombre (ej. `segovia-backup`), crea la cuenta y entra a ella.
5. Pestaña **Claves → Agregar clave → Crear clave nueva → JSON**.
6. Se descarga un archivo JSON. **Guárdalo**: contiene la credencial.

### 2. Compartir una carpeta de Drive con la Service Account

1. Abre el JSON descargado y copia el valor de `client_email`
   (es algo como `segovia-backup@tu-proyecto.iam.gserviceaccount.com`).
2. En Google Drive crea una carpeta donde quieras que vivan los respaldos
   (o deja que el sistema cree `INSPECCIONES` en la raíz de la cuenta de la
   Service Account). Para usar tu propia carpeta de Drive:
   - Crea una carpeta en tu Drive.
   - Clic derecho → Compartir → pega el `client_email` → Editor → Guardar.
3. (Opcional) Si compartiste una carpeta propia, anota su ID (el último
   fragmento de la URL de la carpeta). Por ahora el sistema crea `INSPECCIONES`
   en la raíz de la cuenta de la Service Account; compartir tu carpeta es
   solo para que tú puedas verla.

### 3. Configurar la variable de entorno

Pega **todo el contenido del JSON** en una sola variable llamada
`GOOGLE_DRIVE_SERVICE_ACCOUNT`.

Localmente, en `.env`:

```
GOOGLE_DRIVE_SERVICE_ACCOUNT={"type":"service_account","project_id":"segovia-...","private_key":"-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n","client_email":"segovia-backup@segovia-....iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/segovia-backup%40segovia-....iam.gserviceaccount.com"}
```

En Render/Railway/Netlify: agrega la misma variable en el panel de variables
de entorno, como una sola línea.

### 4. Reiniciar el servidor

A partir de aquí, cada vez que se complete una inspección (botón
"Completar" en el formulario), el PDF se respaldará en Drive.

## Verificación

- Completa una inspección de prueba.
- Revisa la consola del servidor: verás
  `[Drive] PDF respaldado: Inspeccion_..._.pdf (<fileId>)`.
- Entra a la cuenta de Drive de la Service Account (o a la carpeta que
  compartiste) y verifica que exista `INSPECCIONES/<Mes Año>/`.

## Si algo falla

- **`[Backup] Error al respaldar inspección en Drive`** en consola:
  revisa que el JSON esté completo y bien pegado, que la Drive API esté
  activada y que la `client_email` tenga acceso a la carpeta.
- Si la variable no está configurada, el respaldo se desactiva solo y la
  aplicación funciona con normalidad (solo sin respaldo en Drive).
