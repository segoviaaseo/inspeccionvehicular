# Guía de Despliegue Gratuito

## Opción 1: Render.com (Recomendado para Full-Stack)

### Pasos para desplegar:

1. **Crear cuenta en Render.com**
   - Ve a [render.com](https://render.com) y crea una cuenta gratuita

2. **Subir código a GitHub**
   - Crea un repositorio en GitHub
   - Sube todo el código de tu proyecto

3. **Conectar con Render**
   - En Render, selecciona "New" → "Blueprint"
   - Conecta tu repositorio de GitHub
   - Render detectará automáticamente el archivo `render.yaml`

4. **Configuración automática**
   - Render creará automáticamente:
     - Una aplicación web
     - Una base de datos PostgreSQL gratuita
     - Variables de entorno necesarias

### Límites del plan gratuito:
- La aplicación se "duerme" después de 15 minutos de inactividad
- 750 horas de tiempo activo por mes
- Base de datos PostgreSQL con límite de conexiones

---

## Opción 2: Railway.app

### Pasos:

1. Ve a [railway.app](https://railway.app)
2. Conecta tu repositorio de GitHub
3. Railway detectará automáticamente que es una aplicación Node.js
4. Añade una base de datos PostgreSQL desde el dashboard
5. La variable `DATABASE_URL` se configurará automáticamente

---

## Opción 3: Netlify + Supabase (Solo Frontend)

Si quieres desplegar solo el frontend y usar Supabase como backend:

1. **Frontend en Netlify:**
   - Conecta tu repo a Netlify
   - Comando de build: `npm run build`
   - Directorio de publicación: `dist/public`

2. **Backend con Supabase:**
   - Crea proyecto en [supabase.com](https://supabase.com)
   - Usa Supabase como base de datos y API

---

## Variables de Entorno Necesarias

Para cualquier plataforma, necesitarás estas variables:

```
DATABASE_URL=tu_url_de_base_de_datos_postgresql
NODE_ENV=production
PORT=5000
```

## Comandos de Build

- **Build**: `npm run build`
- **Start**: `npm start`
- **Development**: `npm run dev`

## Notas Importantes

- La aplicación está configurada para servir tanto el frontend como el backend desde un solo servidor
- El frontend se construye en `dist/public`
- El backend se construye en `dist/index.js`
- La aplicación usa PostgreSQL como base de datos