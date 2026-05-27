import { AlertTriangle, Bell, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import segoviaLogo from '@/assets/segovia-logo.png';

interface HeaderProps {
  hasDocumentAlerts: boolean;
  onDocumentAlertsClick: () => void;
  username?: string;
  onLogout?: () => void;
}

export function Header({ hasDocumentAlerts, onDocumentAlertsClick, username, onLogout }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <img src={segoviaLogo} alt="Segovia Logo" className="h-9 w-auto" />
            <div className="hidden sm:block h-7 w-px bg-gray-200" />
            <div className="hidden sm:block">
              <p className="text-sm font-bold text-gray-900 leading-tight">Sistema de Inspección Vehicular</p>
              <p className="text-xs text-emerald-600 font-medium">Segovia Aseo S.A.E.S.P.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={onDocumentAlertsClick}
                className={`h-9 w-9 p-0 rounded-lg ${hasDocumentAlerts ? 'text-amber-600 hover:bg-amber-50' : 'text-gray-500 hover:bg-gray-100'}`}
                data-testid="button-document-alerts"
              >
                {hasDocumentAlerts ? <AlertTriangle className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
              </Button>
              {hasDocumentAlerts && (
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white" data-testid="indicator-alerts" />
              )}
            </div>

            {username && (
              <>
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
                  <User className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-xs font-medium text-gray-600">{username}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onLogout?.()}
                  className="h-9 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg px-2.5 gap-1.5"
                  title="Cerrar sesión"
                  data-testid="button-logout"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline text-xs font-medium">Salir</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
