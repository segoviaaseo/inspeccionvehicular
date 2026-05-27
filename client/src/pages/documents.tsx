import { Car, CheckCircle, AlertTriangle, XCircle, AlertCircle, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import type { Vehicle } from '@shared/schema';

export default function Documents() {
  const { data: vehicles = [] } = useQuery<Vehicle[]>({ queryKey: ['/api/vehicles'] });
  const [, setLocation] = useLocation();

  const getDocumentStatus = (expiryDate?: string | null) => {
    if (!expiryDate) return { status: 'missing', daysLeft: 0 };
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
    if (daysLeft < 0) return { status: 'expired', daysLeft };
    if (daysLeft <= 30) return { status: 'expiring', daysLeft };
    return { status: 'valid', daysLeft };
  };

  const getStatusCounts = () => {
    let expired = 0, expiring = 0, valid = 0;
    vehicles.forEach(v => {
      [getDocumentStatus(v.soatExpiry), getDocumentStatus(v.rtmExpiry)].forEach(s => {
        if (s.status === 'expired') expired++;
        else if (s.status === 'expiring') expiring++;
        else if (s.status === 'valid') valid++;
      });
    });
    return { expired, expiring, valid };
  };

  const getStatusBadge = (status: { status: string; daysLeft: number }) => {
    if (status.status === 'expired') return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <XCircle className="h-3 w-3 mr-1" />Vencido hace {Math.abs(status.daysLeft)} días
      </span>
    );
    if (status.status === 'expiring') return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        <AlertTriangle className="h-3 w-3 mr-1" />{status.daysLeft} días restantes
      </span>
    );
    if (status.status === 'valid') return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircle className="h-3 w-3 mr-1" />{status.daysLeft} días restantes
      </span>
    );
    return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">No definido</span>;
  };

  const getOverallStatus = (v: Vehicle) => {
    const s = getDocumentStatus(v.soatExpiry);
    const r = getDocumentStatus(v.rtmExpiry);
    if (s.status === 'expired' || r.status === 'expired') return { label: 'Crítico', icon: XCircle, cls: 'bg-red-100 text-red-800' };
    if (s.status === 'expiring' || r.status === 'expiring') return { label: 'Requiere Atención', icon: AlertTriangle, cls: 'bg-yellow-100 text-yellow-800' };
    return { label: 'Al Día', icon: CheckCircle, cls: 'bg-green-100 text-green-800' };
  };

  const formatDate = (d?: string | null) => {
    if (!d) return 'No definido';
    const [y, m, day] = d.split('-').map(Number);
    return new Date(y, m - 1, day).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const counts = getStatusCounts();

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="icon-box icon-box-primary"><FileText className="h-5 w-5 text-white" /></div>
          <div>
            <h1 className="page-title">Estado de Documentos</h1>
            <p className="page-subtitle">SOAT y RTM de la flota</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="professional-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg"><AlertCircle className="h-6 w-6 text-red-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Documentos Vencidos</p>
                <p className="text-2xl font-bold text-red-600" data-testid="count-expired">{counts.expired}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="professional-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg"><AlertTriangle className="h-6 w-6 text-yellow-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Vencen en 30 días</p>
                <p className="text-2xl font-bold text-yellow-600" data-testid="count-expiring">{counts.expiring}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="professional-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><CheckCircle className="h-6 w-6 text-green-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Documentos Vigentes</p>
                <p className="text-2xl font-bold text-green-600" data-testid="count-valid">{counts.valid}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="professional-card">
        <CardHeader className="card-header-accent">
          <CardTitle className="card-title-with-icon"><Car className="h-4 w-4 text-primary" />Detalle por Vehículo</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {vehicles.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Car className="h-8 w-8 text-gray-300" /></div>
              <p className="empty-state-title">No hay vehículos registrados</p>
              <Button onClick={() => setLocation('/vehicles')} className="mt-3 btn-primary">Agregar vehículos</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Vehículo</th>
                    <th>SOAT</th>
                    <th>RTM</th>
                    <th>Estado General</th>
                    <th className="text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map(v => {
                    const soatStatus = getDocumentStatus(v.soatExpiry);
                    const rtmStatus = getDocumentStatus(v.rtmExpiry);
                    const overall = getOverallStatus(v);
                    const Icon = overall.icon;
                    return (
                      <tr key={v.id} data-testid={`document-row-${v.id}`}>
                        <td>
                          <div className="flex items-center gap-2">
                            <Car className="h-4 w-4 text-gray-400" />
                            <div>
                              <p className="text-sm font-semibold text-gray-800" data-testid={`vehicle-name-${v.id}`}>{v.name}</p>
                              <p className="text-xs text-gray-400 font-mono" data-testid={`vehicle-plate-${v.id}`}>{v.licensePlate}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <p className="text-xs text-gray-500 mb-1" data-testid={`soat-date-${v.id}`}>{formatDate(v.soatExpiry)}</p>
                          {getStatusBadge(soatStatus)}
                        </td>
                        <td>
                          <p className="text-xs text-gray-500 mb-1" data-testid={`rtm-date-${v.id}`}>{formatDate(v.rtmExpiry)}</p>
                          {getStatusBadge(rtmStatus)}
                        </td>
                        <td>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${overall.cls}`}>
                            <Icon className="h-3 w-3" />{overall.label}
                          </span>
                        </td>
                        <td className="text-right">
                          <Button onClick={() => setLocation('/vehicles')} variant="ghost" size="sm" className="text-primary hover:text-primary/80 text-xs" data-testid={`button-edit-${v.id}`}>
                            Editar
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
