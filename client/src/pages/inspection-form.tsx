import { useRoute, useLocation } from 'wouter';
import { ArrowLeft, CheckCircle, Car, Calendar, User, Clock, Settings, Shield, FileText, AlertTriangle, ChevronDown, ChevronUp, PenLine } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { InspectionItem } from '@/components/inspection/inspection-item';
import { SignaturePad } from '@/components/inspection/signature-pad';
import type { InspectionWithItems, Vehicle } from '@shared/schema';

export default function InspectionForm() {
  const [, params] = useRoute('/inspection/:id/edit');
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const id = params?.id ?? '';
  const [expanded, setExpanded] = useState({ technical: true, safety: true, legal: true });
  const [saving, setSaving] = useState(false);
  const [inspectorSig, setInspectorSig] = useState<string | null>(null);
  const [driverSig, setDriverSig] = useState<string | null>(null);

  const { data: inspection, isLoading } = useQuery<InspectionWithItems>({
    queryKey: ['/api/inspections', id],
    enabled: !!id,
    refetchInterval: 10000,
  });

  const { data: vehicles = [] } = useQuery<Vehicle[]>({ queryKey: ['/api/vehicles'] });
  const vehicle = vehicles.find(v => v.id === inspection?.vehicleId);

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, status, notes }: { itemId: string; status?: string; notes?: string | null }) =>
      apiRequest('PUT', `/api/inspection-items/${itemId}`, { status, notes }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/inspections', id] }),
  });

  const updateNotesMutation = useMutation({
    mutationFn: (notes: string) => apiRequest('PUT', `/api/inspections/${id}`, { notes }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/inspections', id] }),
  });

  const handleComplete = async () => {
    if (!inspection) return;
    const failedNoNotes = inspection.items.filter(i => i.status === 'fail' && !i.notes);
    if (failedNoNotes.length > 0) {
      toast({ title: 'Agregue observaciones a todos los ítems fallidos', variant: 'destructive' });
      return;
    }
    if (!inspectorSig) {
      toast({ title: 'Se requiere la firma del inspector para completar', variant: 'destructive' });
      return;
    }
    if (!window.confirm('¿Completar esta inspección?')) return;
    setSaving(true);
    try {
      const now = new Date();
      await apiRequest('PUT', `/api/inspections/${id}`, {
        completed: true,
        endTime: now.toTimeString().split(' ')[0],
        inspectorSignature: inspectorSig,
        driverSignature: driverSig,
      });
      qc.invalidateQueries({ queryKey: ['/api/inspections'] });
      toast({ title: 'Inspección completada exitosamente' });
      setLocation(`/inspection/${id}`);
    } catch {
      toast({ title: 'Error al completar', variant: 'destructive' });
      setSaving(false);
    }
  };

  const handleGoBack = () => {
    if (window.confirm('¿Salir? Los cambios ya fueron guardados automáticamente.')) setLocation('/');
  };

  const formatDate = (d: string) => {
    const [y, m, day] = d.split('-').map(Number);
    return new Date(y, m - 1, day).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (isLoading || !inspection) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Cargando inspección...</p>
          </div>
        </div>
      </div>
    );
  }

  const technicalItems = inspection.items.filter(i => i.category === 'technical').sort((a, b) => parseInt(a.sortOrder ?? '0') - parseInt(b.sortOrder ?? '0'));
  const safetyItems = inspection.items.filter(i => i.category === 'safety').sort((a, b) => parseInt(a.sortOrder ?? '0') - parseInt(b.sortOrder ?? '0'));
  const legalItems = inspection.items.filter(i => i.category === 'legal').sort((a, b) => parseInt(a.sortOrder ?? '0') - parseInt(b.sortOrder ?? '0'));

  const done = inspection.items.filter(i => i.status !== 'not-checked').length;
  const progress = Math.round((done / inspection.items.length) * 100);
  const failedNoNotes = inspection.items.filter(i => i.status === 'fail' && !i.notes).length;
  const naCount = inspection.items.filter(i => i.status === 'n/a').length;

  const toggle = (s: keyof typeof expanded) => setExpanded(p => ({ ...p, [s]: !p[s] }));

  const SectionHeader = ({ icon, title, items, color, sectionKey }: {
    icon: React.ReactNode; title: string; items: any[]; color: string; sectionKey: keyof typeof expanded;
  }) => {
    const doneCount = items.filter(i => i.status !== 'not-checked').length;
    const failCount = items.filter(i => i.status === 'fail').length;
    return (
      <button onClick={() => toggle(sectionKey)} className={`w-full flex items-center justify-between p-5 border-b ${color} transition-colors rounded-t-xl`}>
        <div className="flex items-center gap-3">
          {icon}
          <span className="font-semibold text-gray-800">{title}</span>
          {failCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
              <AlertTriangle className="h-3 w-3" />{failCount} falla{failCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 font-medium">{doneCount}/{items.length}</span>
          {expanded[sectionKey] ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
        </div>
      </button>
    );
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button onClick={handleGoBack} variant="ghost" size="sm" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Formulario de Inspección</h1>
            <p className="text-sm text-gray-500">Los cambios se guardan automáticamente</p>
          </div>
        </div>
        <Button onClick={handleComplete} disabled={saving} className="btn-success" data-testid="button-complete-inspection">
          {saving ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />Guardando...</> : <><CheckCircle className="h-4 w-4 mr-2" />Completar</>}
        </Button>
      </div>

      {/* Info bar */}
      <Card className="professional-card mb-5">
        <CardContent className="p-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="info-chip">
              <Car className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Vehículo</p>
                <p className="text-sm font-semibold text-gray-800">{vehicle?.name ?? '—'}</p>
                <p className="text-xs text-gray-400 font-mono">{vehicle?.licensePlate ?? ''}</p>
              </div>
            </div>
            <div className="info-chip">
              <Calendar className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Fecha</p>
                <p className="text-sm font-semibold text-gray-800">{formatDate(inspection.date)}</p>
              </div>
            </div>
            <div className="info-chip">
              <User className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Inspector</p>
                <p className="text-sm font-semibold text-gray-800">{inspection.inspector}</p>
                {inspection.driverName && <p className="text-xs text-gray-400">{inspection.driverName}</p>}
              </div>
            </div>
            <div className="info-chip">
              <Clock className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Progreso</p>
                <p className="text-sm font-semibold text-gray-800">{progress}% ({done}/{inspection.items.length})</p>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <Progress value={progress} className="h-2" />
          </div>
          {failedNoNotes > 0 && (
            <div className="mt-3 flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <p className="text-xs text-amber-700 font-medium">
                {failedNoNotes} ítem{failedNoNotes > 1 ? 's' : ''} fallido{failedNoNotes > 1 ? 's' : ''} sin observación. Requerido para completar.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Checklist sections */}
      <div className="space-y-5">
        <Card className="professional-card overflow-hidden">
          <SectionHeader icon={<Settings className="h-5 w-5 text-blue-600" />} title="Técnico-Mecánico" items={technicalItems} color="bg-blue-50 hover:bg-blue-100" sectionKey="technical" />
          {expanded.technical && (
            <CardContent className="p-4">
              <div className="grid gap-3">
                {technicalItems.map(item => (
                  <InspectionItem key={item.id} item={item}
                    onStatusUpdate={(itemId, status) => updateItemMutation.mutate({ itemId, status })}
                    onNotesUpdate={(itemId, notes) => updateItemMutation.mutate({ itemId, notes })}
                  />
                ))}
              </div>
            </CardContent>
          )}
        </Card>

        <Card className="professional-card overflow-hidden">
          <SectionHeader icon={<Shield className="h-5 w-5 text-orange-600" />} title="Seguridad y Botiquín" items={safetyItems} color="bg-orange-50 hover:bg-orange-100" sectionKey="safety" />
          {expanded.safety && (
            <CardContent className="p-4">
              <div className="grid gap-3">
                {safetyItems.map(item => (
                  <InspectionItem key={item.id} item={item}
                    onStatusUpdate={(itemId, status) => updateItemMutation.mutate({ itemId, status })}
                    onNotesUpdate={(itemId, notes) => updateItemMutation.mutate({ itemId, notes })}
                  />
                ))}
              </div>
            </CardContent>
          )}
        </Card>

        <Card className="professional-card overflow-hidden">
          <SectionHeader icon={<FileText className="h-5 w-5 text-purple-600" />} title="Documentación Legal" items={legalItems} color="bg-purple-50 hover:bg-purple-100" sectionKey="legal" />
          {expanded.legal && (
            <CardContent className="p-4">
              <div className="grid gap-3">
                {legalItems.map(item => (
                  <InspectionItem key={item.id} item={item}
                    onStatusUpdate={(itemId, status) => updateItemMutation.mutate({ itemId, status })}
                    onNotesUpdate={(itemId, notes) => updateItemMutation.mutate({ itemId, notes })}
                  />
                ))}
              </div>
            </CardContent>
          )}
        </Card>

        {/* General notes */}
        <Card className="professional-card">
          <CardHeader className="card-header-accent">
            <CardTitle className="card-title-with-icon">
              <FileText className="h-4 w-4 text-primary" />Observaciones Generales
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <Textarea
              defaultValue={inspection.notes ?? ''}
              onBlur={e => updateNotesMutation.mutate(e.target.value)}
              placeholder="Observaciones adicionales sobre la inspección..."
              rows={3}
              className="resize-none text-sm"
              data-testid="textarea-general-notes"
            />
            <p className="text-xs text-gray-400 mt-1.5">Se guarda al perder el foco</p>
          </CardContent>
        </Card>

        {/* Digital signatures */}
        <Card className="professional-card">
          <CardHeader className="card-header-accent">
            <CardTitle className="card-title-with-icon">
              <PenLine className="h-4 w-4 text-primary" />Firmas Digitales
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SignaturePad
                value={inspectorSig}
                onChange={setInspectorSig}
                label={`Inspector: ${inspection.inspector}`}
              />
              <SignaturePad
                value={driverSig}
                onChange={setDriverSig}
                label={`Conductor / Mecánico: ${inspection.driverName || 'Sin especificar'}`}
              />
            </div>
            {!inspectorSig && (
              <div className="mt-4 flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <PenLine className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <p className="text-xs text-blue-700">La firma del inspector es obligatoria para completar la inspección.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end pb-6">
          <Button onClick={handleComplete} disabled={saving} className="btn-success px-8">
            <CheckCircle className="h-4 w-4 mr-2" />
            Completar y Guardar Inspección
          </Button>
        </div>
      </div>
    </div>
  );
}
