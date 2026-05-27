import { useState } from 'react';
import { Plus, Car, Wrench } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { VehicleCard } from '@/components/vehicle/vehicle-card';
import type { Vehicle } from '@shared/schema';

type FormData = { name: string; licensePlate: string; type: string; soatExpiry: string; rtmExpiry: string };
const empty: FormData = { name: '', licensePlate: '', type: '', soatExpiry: '', rtmExpiry: '' };

export default function Vehicles() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [form, setForm] = useState<FormData>(empty);

  const { data: vehicles = [], isLoading } = useQuery<Vehicle[]>({ queryKey: ['/api/vehicles'] });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => apiRequest('POST', '/api/vehicles', {
      name: data.name, licensePlate: data.licensePlate, type: data.type,
      soatExpiry: data.soatExpiry || null, rtmExpiry: data.rtmExpiry || null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['/api/vehicles'] }); closeModal(); toast({ title: 'Vehículo agregado' }); },
    onError: (e: any) => toast({ title: e.message?.includes('unique') ? 'Ya existe un vehículo con esa placa' : 'Error al guardar', variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) => apiRequest('PUT', `/api/vehicles/${id}`, {
      name: data.name, licensePlate: data.licensePlate, type: data.type,
      soatExpiry: data.soatExpiry || null, rtmExpiry: data.rtmExpiry || null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['/api/vehicles'] }); closeModal(); toast({ title: 'Vehículo actualizado' }); },
    onError: () => toast({ title: 'Error al actualizar', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/vehicles/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['/api/vehicles'] }); toast({ title: 'Vehículo eliminado' }); },
    onError: () => toast({ title: 'Error al eliminar', variant: 'destructive' }),
  });

  const openModal = (v?: Vehicle) => {
    if (v) { setEditing(v); setForm({ name: v.name, licensePlate: v.licensePlate, type: v.type, soatExpiry: v.soatExpiry ?? '', rtmExpiry: v.rtmExpiry ?? '' }); }
    else { setEditing(null); setForm(empty); }
    setOpen(true);
  };

  const closeModal = () => { setOpen(false); setEditing(null); setForm(empty); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.licensePlate || !form.type) { toast({ title: 'Complete los campos obligatorios', variant: 'destructive' }); return; }
    if (editing) updateMutation.mutate({ id: editing.id, data: form });
    else createMutation.mutate(form);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('¿Eliminar este vehículo?')) deleteMutation.mutate(id);
  };

  const getDocumentStatus = (expiryDate?: string | null) => {
    if (!expiryDate) return { status: 'missing', daysLeft: 0 };
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
    if (daysLeft < 0) return { status: 'expired', daysLeft };
    if (daysLeft <= 30) return { status: 'expiring', daysLeft };
    return { status: 'valid', daysLeft };
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="icon-box icon-box-primary"><Car className="h-5 w-5 text-white" /></div>
          <div>
            <h1 className="page-title">Gestión de Vehículos</h1>
            <p className="page-subtitle">{vehicles.length} vehículo{vehicles.length !== 1 ? 's' : ''} registrado{vehicles.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openModal()} className="btn-primary" data-testid="button-add-vehicle">
              <Plus className="h-4 w-4 mr-2" />Agregar Vehículo
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar Vehículo' : 'Agregar Vehículo'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="form-field">
                <Label className="form-label">Nombre del Vehículo *</Label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ej: Chevrolet C70" className="form-input" data-testid="input-vehicle-name" />
              </div>
              <div className="form-field">
                <Label className="form-label">Placa *</Label>
                <Input value={form.licensePlate} onChange={e => setForm(p => ({ ...p, licensePlate: e.target.value.toUpperCase() }))} placeholder="Ej: LHJ747" className="form-input" data-testid="input-license-plate" />
              </div>
              <div className="form-field">
                <Label className="form-label">Tipo de Vehículo *</Label>
                <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger className="form-input" data-testid="select-vehicle-type"><SelectValue placeholder="Seleccione un tipo..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Camion">Camión</SelectItem>
                    <SelectItem value="Volqueta">Volqueta</SelectItem>
                    <SelectItem value="Motocarguero">Motocarguero</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="form-field">
                  <Label className="form-label">Venc. SOAT</Label>
                  <Input type="date" value={form.soatExpiry} onChange={e => setForm(p => ({ ...p, soatExpiry: e.target.value }))} className="form-input" data-testid="input-soat-expiry" />
                </div>
                <div className="form-field">
                  <Label className="form-label">Venc. RTM</Label>
                  <Input type="date" value={form.rtmExpiry} onChange={e => setForm(p => ({ ...p, rtmExpiry: e.target.value }))} className="form-input" data-testid="input-rtm-expiry" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={closeModal} data-testid="button-cancel">Cancelar</Button>
                <Button type="submit" className="btn-primary" disabled={isPending} data-testid="button-save-vehicle">
                  {isPending ? 'Guardando...' : editing ? 'Actualizar' : 'Agregar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : vehicles.length === 0 ? (
        <Card className="professional-card">
          <CardContent className="p-0">
            <div className="empty-state">
              <div className="empty-state-icon"><Car className="h-8 w-8 text-gray-300" /></div>
              <p className="empty-state-title">No hay vehículos registrados</p>
              <p className="empty-state-subtitle">Haga clic en "Agregar Vehículo" para comenzar.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map(v => (
            <VehicleCard key={v.id} vehicle={v} onEdit={openModal} onDelete={handleDelete} getDocumentStatus={getDocumentStatus} />
          ))}
        </div>
      )}
    </div>
  );
}
