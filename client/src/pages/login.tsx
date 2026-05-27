import { useState } from 'react';
import { useLocation } from 'wouter';
import { Lock, User, LogIn, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import segoviaLogo from '@/assets/segovia-logo.png';

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setLoading(true);
    try {
      await apiRequest('POST', '/api/login', { username: username.trim(), password });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      setLocation('/');
    } catch {
      toast({ title: 'Credenciales incorrectas', description: 'Verifique usuario y contraseña.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-gray-50 to-emerald-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center bg-white rounded-2xl p-4 shadow-lg mb-4">
            <img src={segoviaLogo} alt="Segovia Aseo" className="h-16 w-auto" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Sistema de Inspección Vehicular</h1>
          <p className="text-sm text-emerald-600 font-medium mt-1">Segovia Aseo S.A.E.S.P.</p>
        </div>

        <Card className="professional-card shadow-xl">
          <CardContent className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="icon-box icon-box-primary">
                <Lock className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Iniciar Sesión</h2>
                <p className="text-xs text-gray-500">Ingrese sus credenciales para continuar</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="form-field">
                <Label className="form-label">Usuario</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Nombre de usuario"
                    className="form-input pl-10"
                    autoComplete="username"
                    data-testid="input-username"
                  />
                </div>
              </div>

              <div className="form-field">
                <Label className="form-label">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Contraseña"
                    className="form-input pl-10 pr-10"
                    autoComplete="current-password"
                    data-testid="input-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="btn-primary w-full h-11 text-base"
                disabled={loading || !username.trim() || !password}
                data-testid="button-login"
              >
                {loading
                  ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />Ingresando...</>
                  : <><LogIn className="h-4 w-4 mr-2" />Ingresar</>
                }
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-400 mt-6">
          © 2024 Segovia Aseo S.A.E.S.P. · Sistema de Gestión de Flota
        </p>
      </div>
    </div>
  );
}
