# Deployment Guide - Netlify

## Quick Deploy

1. **Connect Repository**
   - Go to https://app.netlify.com
   - Click "Add new site" > "Import an existing project"
   - Connect your GitHub/GitLab repository

2. **Configure Build Settings**
   - Build command: `npm run build:netlify`
   - Publish directory: `dist/public`

3. **Set Environment Variables**
   Go to Site Settings > Environment Variables and add:

   Required:
   ```
   VITE_SUPABASE_URL=https://xuukzgykxmqrcrvpdzas.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   DATABASE_URL=postgresql://postgres.xuukzgykxmqrcrvpdzas:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
   ```

   To get DATABASE_URL:
   1. Go to Supabase Dashboard
   2. Settings > Database
   3. Copy the "Connection string (URI)"
   4. Replace `[YOUR-PASSWORD]` with your database password

4. **Deploy**
   - Click "Deploy site"
   - Wait for build to complete
   - Your site will be live at `https://[your-site-name].netlify.app`

## Database Password

If you don't have your Supabase database password:
1. Go to Supabase Dashboard
2. Settings > Database
3. Click "Reset database password" or note your current password
4. Use this password in your DATABASE_URL

## Testing Locally

```bash
npm run build:netlify
npx netlify-cli dev
```

## Troubleshooting

### Build fails
- Check all environment variables are set
- Verify DATABASE_URL is correct
- Check Node.js version (20.x required)

### API not working
- Verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set
- Check browser console for CORS errors

### Can't login
- Check DATABASE_URL is correct
- Verify the user exists in the database
- Default credentials: admin / segovia2024
