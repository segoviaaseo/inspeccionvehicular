import { ClipboardList, Car, FileText } from 'lucide-react';
import { Link, useLocation } from 'wouter';

export function Navigation() {
  const [location] = useLocation();

  const isActive = (path: string) => {
    if (path === '/' && location === '/') return true;
    if (path !== '/' && location.startsWith(path)) return true;
    return false;
  };

  const navItems = [
    { href: '/', icon: ClipboardList, label: 'Inspecciones', short: 'Inspecciones' },
    { href: '/vehicles', icon: Car, label: 'Vehículos', short: 'Vehículos' },
    { href: '/documents', icon: FileText, label: 'Documentos', short: 'Documentos' },
  ];

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex">
          {navItems.map(item => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-all duration-200 ${
                  active
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300 hover:bg-gray-50'
                }`}
                data-testid={`nav-${item.href === '/' ? 'inspections' : item.href.replace('/', '')}`}
              >
                <item.icon className={`h-4 w-4 ${active ? 'text-primary' : 'text-gray-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
