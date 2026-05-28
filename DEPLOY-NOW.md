# INSTRUCCIONES DE DESPLIEGUE - SEGOVIA AUTO

## PASO 1: Obtener contraseña de base de datos Supabase

1. Ve a: https://supabase.com/dashboard/project/radpbsxvivbxtilowjzm/settings/database
2. Busca la sección "Connection string" > "URI"
3. Click en "Copy" para copiar el string completo
4. El string tiene este formato:
   `postgresql://postgres.[PROJECT-REF]:[CONTRASEÑA]@aws-0-us-east-1.pooler.supabase.com:6543/postgres`

## PASO 2: Configurar variables en Netlify

Con la contraseña obtenida, configura estas variables en Netlify:

1. Ve a tu sitio en Netlify: https://app.netlify.com
2. Busca el sitio "radpbsxvivbxtilowjzm" (o tu sitio)
3. Ve a: Site settings > Build & deploy > Environment variables
4. Añade estas 3 variables:

**Variable 1:**
- Key: `VITE_SUPABASE_URL`
- Value: `https://radpbsxvivbxtilowjzm.supabase.co`

**Variable 2:**
- Key: `VITE_SUPABASE_ANON_KEY`
- Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZHBic3h2aXZieHRpbG93anptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5MDc5NzcsImV4cCI6MjA5NTQ4Mzk3N30.cnTn9aXRa4sptbIJ-eXczC0cIUgtbf8Kaku9M8BL3Pw`

**Variable 3:**
- Key: `DATABASE_URL`
- Value: Pega aquí el string completo que copiaste en el Paso 1
  (debe verse como: postgresql://postgres.xxx:contraseña@...)

## PASO 3: Deploy

1. En Netlify, ve a la sección "Deploys"
2. Click en "Trigger deploy" > "Deploy site"
3. Espera a que termine el build (aproximadamente 2-3 minutos)
4. El build debería mostrar ✅ "Build succeeded"

## CREDENCIALES DEL SISTEMA

Una vez desplegado, accede con:
- URL: https://radpbsxvivbxtilowjzm.netlify.app
- Usuario: admin
- Contraseña: segovia2026

## FUNCIONALIDADES DISPONIBLES

- Gestión de vehículos (crear, editar, eliminar)
- Inspecciones completas con 30+ items
- Firmas digitales
- Exportación a PDF
- Alertas de documentos vencidos
- Acceso multi-usuario desde cualquier dispositivo

## ¿PROBLEMAS?

Si el build falla:
1. Verifica que todas las variables de entorno estén configuradas
2. Verifica que la contraseña de BD sea correcta
3. Revisa los logs en Netlify

Para soporte: revisa el archivo NETLIFY.md
