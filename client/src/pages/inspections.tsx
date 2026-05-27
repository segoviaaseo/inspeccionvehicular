import { useState } from 'react';
import { useLocation } from 'wouter';
import { Plus, Eye, Trash2, CheckCircle, Clock, Car, ClipboardList, Calendar, AlertTriangle, RefreshCw } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { DocumentAlerts } from '@/components/alerts/document-alerts';
import type { Vehicle, InspectionWithItems } from '@shared/schema';
import type { DocumentAlert } from '@/lib/types';

export default function Inspections() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const today = new Date().toISOString().split('T')[0];

  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [inspectorName, setInspectorName] = useState(() => localStorage.getItem('inspectorName') || '');
  const [driverName, setDriverName] = useState('');
  const [inspectionDate, setInspectionDate] = useState(today);
  const [starting, setStarting] = useState(false);

  const { data: vehicles = [] } = useQuery<Vehicle[]>({ queryKey: ['/api/vehicles'] });
  const { data: inspections = [], isLoading, refetch } = useQuery<InspectionWithItems[]>({
    queryKey: ['/api/inspections'],
    refetchInterval: 30000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/inspections/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/inspections'] });
      toast({ title: 'Inspección eliminada' });
    },
    onError: () => toast({ title: 'Error al eliminar', variant: 'destructive' }),
  });

  const getDocumentStatus = (expiryDate?: string | null) => {
    if (!expiryDate) return { status: 'missing', daysLeft: 0 };
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
    if (daysLeft < 0) return { status: 'expired', daysLeft };
    if (daysLeft <= 30) return { status: 'expiring', daysLeft };
    return { status: 'valid', daysLeft };
  };

  const documentAlerts: DocumentAlert[] = vehicles.flatMap(v => {
    const alerts: DocumentAlert[] = [];
    const s = getDocumentStatus(v.soatExpiry);
    const r = getDocumentStatus(v.rtmExpiry);
    if (s.status === 'expired' || s.status === 'expiring')
      alerts.push({ vehicleId: v.id, vehicleName: v.name, licensePlate: v.licensePlate, document: 'SOAT', status: s.status, daysLeft: s.daysLeft });
    if (r.status === 'expired' || r.status === 'expiring')
      alerts.push({ vehicleId: v.id, vehicleName: v.name, licensePlate: v.licensePlate, document: 'RTM', status: r.status, daysLeft: r.daysLeft });
    return alerts;
  });

  const handleStart = async () => {
    if (!selectedVehicleId || !inspectorName.trim() || !inspectionDate) return;
    setStarting(true);
    localStorage.setItem('inspectorName', inspectorName);
    try {
      const now = new Date();
      const res = await apiRequest('POST', '/api/inspections', {
        date: inspectionDate,
        vehicleId: selectedVehicleId,
        inspector: inspectorName.trim(),
        driverName: driverName.trim() || null,
        startTime: now.toTimeString().split(' ')[0],
        completed: false,
      });
      const insp = await res.json();
      qc.invalidateQueries({ queryKey: ['/api/inspections'] });
      setLocation(`/inspection/${insp.id}/edit`);
    } catch {
      toast({ title: 'Error al crear la inspección', variant: 'destructive' });
      setStarting(false);
    }
  };

  const formatDate = (d: string) => {
    const [y, m, day] = d.split('-').map(Number);
    return new Date(y, m - 1, day).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getResults = (insp: InspectionWithItems) => ({
    pass: insp.items.filter(i => i.status === 'pass').length,
    fail: insp.items.filter(i => i.status === 'fail').length,
  });

  const getVehicle = (id: string) => vehicles.find(v => v.id === id);
  const canStart = selectedVehicleId && inspectorName.trim() && inspectionDate;

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="icon-box icon-box-primary">
            <ClipboardList className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="page-title">Inspecciones Vehiculares</h1>
            <p className="page-subtitle">{inspections.length} inspección{inspections.length !== 1 ? 'es' : ''} registrada{inspections.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => refetch()} className="text-gray-500 hover:text-gray-700">
          <RefreshCw className="h-4 w-4 mr-1.5" />
          Actualizar
        </Button>
      </div>

      <DocumentAlerts alerts={documentAlerts} onUpdateDocument={() => setLocation('/documents')} />

      <Card className="professional-card mb-6">
        <CardHeader className="card-header-accent">
          <CardTitle className="card-title-with-icon">
            <Plus className="h-5 w-5 text-primary" />
            Nueva Inspección
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="form-field">
              <Label className="form-label">Vehículo a Inspeccionar *</Label>
              <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                <SelectTrigger className="form-input h-10" data-testid="select-vehicle">
                  <SelectValue placeholder="Seleccione un vehículo..." />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.length === 0 && (
                    <SelectItem value="__none__" disabled>No hay vehículos registrados</SelectItem>
                  )}
                  {vehicles.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4 text-gray-400" />
                        <span>{v.name}</span>
                        <span className="text-gray-400 font-mono text-xs">{v.licensePlate}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="form-field">
              <Label className="form-label">
                <Calendar className="h-3.5 w-3.5 inline mr-1" />
                Fecha de Inspección *
              </Label>
              <Input type="date" value={inspectionDate} onChange={e => setInspectionDate(e.target.value)} className="form-input" />
            </div>
            <div className="form-field">
              <Label className="form-label">Nombre del Inspector *</Label>
              <Input value={inspectorName} onChange={e => setInspectorName(e.target.value)} placeholder="Nombre completo del inspector" className="form-input" data-testid="input-inspector-name" />
            </div>
            <div className="form-field">
              <Label className="form-label">Conductor / Mecánico</Label>
              <Input value={driverName} onChange={e => setDriverName(e.target.value)} placeholder="Nombre del conductor o mecánico" className="form-input" />
            </div>
          </div>
          <div className="flex justify-end mt-6">
            <Button onClick={handleStart} disabled={!canStart || starting} className="btn-primary" data-testid="button-start-inspection">
              {starting ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />Creando...</> : <><Plus className="h-4 w-4 mr-2" />Iniciar Inspección</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="professional-card">
        <CardHeader className="card-header-accent">
          <CardTitle className="card-title-with-icon">
            <ClipboardList className="h-5 w-5 text-primary" />
            Historial de Inspecciones
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-14">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : inspections.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><ClipboardList className="h-8 w-8 text-gray-300" /></div>
              <p className="empty-state-title">Sin inspecciones registradas</p>
              <p className="empty-state-subtitle">Complete el formulario de arriba para iniciar una inspección.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Vehículo</th>
                    <th>Inspector</th>
                    <th>Estado</th>
                    <th>Resultado</th>
                    <th className="text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {inspections.map(insp => {
                    const v = getVehicle(insp.vehicleId);
                    const r = getResults(insp);
                    return (
                      <tr key={insp.id} data-testid={`inspection-row-${insp.id}`}>
                        <td><span className="text-sm font-medium text-gray-800">{formatDate(insp.date)}</span></td>
                        <td>
                          <div className="flex items-center gap-2">
                            <Car className="h-4 w-4 text-primary/60 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{v?.name ?? 'Desconocido'}</p>
                              <p className="text-xs text-gray-400 font-mono">{v?.licensePlate ?? ''}</p>
                            </div>
                          </div>
                        </td>
                        <td><span className="text-sm text-gray-700">{insp.inspector}</span></td>
                        <td>
                          {insp.completed
                            ? <Badge className="badge-success"><CheckCircle className="h-3 w-3 mr-1" />Completada</Badge>
                            : <Badge className="badge-warning"><Clock className="h-3 w-3 mr-1" />En Progreso</Badge>}
                        </td>
                        <td>
                          {insp.completed
                            ? <div className="flex items-center gap-2">
                                <span className="result-pass">✓ {r.pass}</span>
                                {r.fail > 0 && <span className="result-fail">✗ {r.fail}</span>}
                              </div>
                            : <span className="text-xs text-gray-500">{r.pass + r.fail} / {insp.items.length}</span>}
                        </td>
                        <td>
                          <div className="flex items-center justify-end gap-1">
                            <Button onClick={() => setLocation(insp.completed ? `/inspection/${insp.id}` : `/inspection/${insp.id}/edit`)} size="sm" variant="ghost" className="action-btn-view" data-testid={`button-view-${insp.id}`}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button onClick={() => { if (window.confirm('¿Eliminar esta inspección?')) deleteMutation.mutate(insp.id); }} size="sm" variant="ghost" className="action-btn-delete" data-testid={`button-delete-${insp.id}`}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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
