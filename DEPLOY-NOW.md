# INSTRUCCIONES DE DESPLIEGUE - SEGOVIA AUTO

## PASO 1: Obtener contraseña de base de datos Supabase

1. Ve a: https://supabase.com/dashboard/project/xuukzgykxmqrcrvpdzas/settings/database
2. Busca la sección "Connection string"
3. Copia la URI completa (incluye la contraseña)
4. La contraseña está entre los ":" y "@" del string:
   `postgresql://postgres.xxxx:[AQUÍ-ESTÁ-LA-CONTRASEÑA]@...`

## PASO 2: Configurar variables en Netlify

Con la contraseña obtenida, configura estas variables en Netlify:

1. Ve a: https://app.netlify.com/sites/radpbsxvivbxtilowjzm/settings/env
2. Añade estas variables:

```
VITE_SUPABASE_URL=https://xuukzgykxmqrcrvpdzas.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1dWt6Z3lreG1xcmNydnBkemFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5MDkwMzIsImV4cCI6MjA5NTQ4NTAzMn0.BK8oHfLY8km6tKEWUjQ0wqZyMgfII5nEEFhbcyAmtRE
DATABASE_URL=postgresql://postgres.xuukzgykxmqrcrvpdzas:[TU-CONTRASEÑA]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

Reemplaza `[TU-CONTRASEÑA]` con la contraseña del paso 1.

## PASO 3: Deploy

1. En Netlify, ve a "Deploys"
2. Click en "Trigger deploy" > "Deploy site"
3. Espera a que termine el build (aproximadamente 2-3 minutos)

## CREDENCIALES DEL SISTEMA

Una vez desplegado, accede con:
- URL: https://radpbsxvivbxtilowjzm.netlify.app
- Usuario: admin
- Contraseña: segovia2024

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
