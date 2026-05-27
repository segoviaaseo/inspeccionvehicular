import { useRoute, useLocation } from 'wouter';
import { ArrowLeft, Car, Calendar, User, Clock, CheckCircle, XCircle, Settings, Shield, FileText, Download, AlertTriangle, MinusCircle, Edit, PenLine, Ban } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SignaturePad } from '@/components/inspection/signature-pad';
import type { InspectionWithItems, Vehicle } from '@shared/schema';
import segoviaLogo from '@/assets/segovia-logo.png';

export default function InspectionDetail() {
  const [, params] = useRoute('/inspection/:id');
  const [, setLocation] = useLocation();
  const id = params?.id ?? '';
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const { data: inspection, isLoading } = useQuery<InspectionWithItems>({
    queryKey: ['/api/inspections', id],
    enabled: !!id,
  });

  const { data: vehicles = [] } = useQuery<Vehicle[]>({ queryKey: ['/api/vehicles'] });
  const vehicle = vehicles.find(v => v.id === inspection?.vehicleId);

  const formatDate = (d: string) => {
    const [y, m, day] = d.split('-').map(Number);
    return new Date(y, m - 1, day).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getLogoDataUrl = (): Promise<{ url: string; w: number; h: number }> =>
    new Promise(resolve => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve({ url: c.toDataURL('image/png'), w: img.naturalWidth, h: img.naturalHeight });
        } else resolve({ url: '', w: 1, h: 1 });
      };
      img.onerror = () => resolve({ url: '', w: 1, h: 1 });
      img.src = segoviaLogo;
    });

  const handleGeneratePdf = async () => {
    if (!inspection || !vehicle) return;
    setGeneratingPdf(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();
      const M = 15;
      const CW = W - M * 2;

      // ── Header ─────────────────────────────────────────────────────
      doc.setFillColor(22, 107, 52);
      doc.rect(0, 0, W, 44, 'F');

      const logo = await getLogoDataUrl();
      if (logo.url) {
        try {
          // Fit logo into a 38×28 mm box preserving aspect ratio
          const maxW = 38; const maxH = 28;
          const ratio = logo.w / logo.h;
          let lw = maxW; let lh = maxW / ratio;
          if (lh > maxH) { lh = maxH; lw = maxH * ratio; }
          const lx = M;
          const ly = (44 - lh) / 2;
          doc.addImage(logo.url, 'PNG', lx, ly, lw, lh);
        } catch (_) {}
      }

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(15); doc.setFont('helvetica', 'bold');
      doc.text('INFORME DE INSPECCIÓN VEHICULAR', W / 2, 18, { align: 'center' });
      doc.setFontSize(8.5); doc.setFont('helvetica', 'normal');
      doc.text('Segovia Aseo S.A.E.S.P.  ·  Sistema de Gestión de Flota', W / 2, 26, { align: 'center' });
      doc.setFontSize(8);
      doc.text(`Fecha del informe: ${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}`, W / 2, 33, { align: 'center' });

      // ── Info block ─────────────────────────────────────────────────
      let y = 48;
      const fields = [
        ['VEHÍCULO', vehicle.name],
        ['PLACA', vehicle.licensePlate],
        ['TIPO', vehicle.type],
        ['FECHA INSPECCIÓN', formatDate(inspection.date)],
        ['INSPECTOR', inspection.inspector],
        ['CONDUCTOR / MECÁNICO', inspection.driverName ?? '—'],
        ['HORA INICIO', inspection.startTime ?? '—'],
        ['HORA FIN', inspection.endTime ?? '—'],
      ];

      const half = Math.ceil(fields.length / 2);
      const cols = [fields.slice(0, half), fields.slice(half)];

      doc.setFillColor(245, 247, 250);
      doc.setDrawColor(210, 218, 230);
      doc.roundedRect(M, y, CW, 34, 2, 2, 'FD');

      cols.forEach((col, ci) => {
        const cx = M + 4 + ci * (CW / 2);
        col.forEach(([label, value], ri) => {
          const ry = y + 6 + ri * 8;
          doc.setFontSize(6.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(100, 120, 150);
          doc.text(label, cx, ry);
          doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20);
          doc.text(value, cx, ry + 4);
        });
      });

      // ── Summary boxes ──────────────────────────────────────────────
      y += 40;
      const pdfPass = inspection.items.filter(i => i.status === 'pass').length;
      const pdfFail = inspection.items.filter(i => i.status === 'fail').length;
      const pdfNc = inspection.items.filter(i => i.status === 'not-checked').length;
      const pdfNa = inspection.items.filter(i => i.status === 'n/a').length;
      const pdfApplicable = inspection.items.length - pdfNa;
      const pdfPct = pdfApplicable > 0 ? Math.round((pdfPass / pdfApplicable) * 100) : 100;

      const boxes = [
        { label: 'APROBADOS', value: pdfPass, r: 39, g: 174, b: 96 },
        { label: 'FALLIDOS', value: pdfFail, r: 231, g: 76, b: 60 },
        { label: 'N/A', value: pdfNa, r: 100, g: 116, b: 139 },
        { label: 'SIN REVISAR', value: pdfNc, r: 149, g: 165, b: 166 },
        { label: 'CUMPLIMIENTO', value: `${pdfPct}%`, r: 22, g: 107, b: 52 },
      ];
      const bw = (CW - 16) / 5;
      boxes.forEach((b, i) => {
        const bx = M + i * (bw + 4);
        doc.setFillColor(b.r, b.g, b.b);
        doc.roundedRect(bx, y, bw, 18, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14); doc.setFont('helvetica', 'bold');
        doc.text(String(b.value), bx + bw / 2, y + 11, { align: 'center' });
        doc.setFontSize(6); doc.setFont('helvetica', 'normal');
        doc.text(b.label, bx + bw / 2, y + 16, { align: 'center' });
      });

      // ── Checklist ──────────────────────────────────────────────────
      y += 24;
      const sections = [
        { key: 'technical', title: 'TÉCNICO-MECÁNICO', r: 41, g: 128, b: 185 },
        { key: 'safety', title: 'SEGURIDAD Y BOTIQUÍN', r: 230, g: 126, b: 34 },
        { key: 'legal', title: 'DOCUMENTACIÓN LEGAL', r: 142, g: 68, b: 173 },
      ];

      for (const sec of sections) {
        const items = inspection.items
          .filter(i => i.category === sec.key)
          .sort((a, b) => parseInt(a.sortOrder ?? '0') - parseInt(b.sortOrder ?? '0'));
        if (!items.length) continue;
        if (y > H - 55) { doc.addPage(); y = 18; }
        doc.setFillColor(sec.r, sec.g, sec.b);
        doc.rect(M, y, CW, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8); doc.setFont('helvetica', 'bold');
        const secPass = items.filter(i => i.status === 'pass').length;
        doc.text(`${sec.title}  (${secPass}/${items.length} aprobados)`, M + 3, y + 5.5);
        y += 9;

        autoTable(doc, {
          startY: y,
          margin: { left: M, right: M },
          head: [['Ítem', 'Estado', 'Observaciones']],
          body: items.map(item => [
            item.name,
            item.status === 'pass' ? '✓ Aprobado' : item.status === 'fail' ? '✗ Fallido' : item.status === 'n/a' ? '◌ N/A' : '– Sin revisar',
            item.notes ?? '',
          ]),
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 2.5, overflow: 'linebreak' },
          headStyles: { fillColor: [240, 244, 250], textColor: [50, 70, 110], fontStyle: 'bold', fontSize: 7.5 },
          columnStyles: {
            0: { cellWidth: CW * 0.50 },
            1: { cellWidth: CW * 0.22 },
            2: { cellWidth: CW * 0.28 },
          },
          didParseCell: (data: any) => {
            if (data.column.index === 1 && data.section === 'body') {
              const v = data.cell.raw as string;
              if (v.startsWith('✓')) { data.cell.styles.textColor = [22, 130, 52]; data.cell.styles.fontStyle = 'bold'; }
              else if (v.startsWith('✗')) { data.cell.styles.textColor = [190, 28, 28]; data.cell.styles.fontStyle = 'bold'; }
              else if (v.startsWith('◌')) { data.cell.styles.textColor = [100, 116, 139]; data.cell.styles.fontStyle = 'italic'; }
              else { data.cell.styles.textColor = [140, 140, 140]; }
            }
          },
        });
        y = (doc as any).lastAutoTable.finalY + 6;
      }

      // ── Notes ──────────────────────────────────────────────────────
      if (inspection.notes) {
        if (y > H - 40) { doc.addPage(); y = 18; }
        doc.setFillColor(250, 249, 240); doc.setDrawColor(210, 200, 170);
        const noteLines = doc.splitTextToSize(inspection.notes, CW - 8);
        const noteH = Math.max(14, noteLines.length * 5 + 8);
        doc.roundedRect(M, y, CW, noteH, 2, 2, 'FD');
        doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(100, 90, 50);
        doc.text('OBSERVACIONES GENERALES', M + 3, y + 5);
        doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 40, 40);
        doc.text(noteLines, M + 3, y + 11);
        y += noteH + 6;
      }

      // ── Digital Signatures ─────────────────────────────────────────
      const hasSigs = inspection.inspectorSignature || inspection.driverSignature;
      if (y > H - 68) { doc.addPage(); y = 18; }
      y += 4;
      doc.setFillColor(245, 247, 252); doc.setDrawColor(200, 210, 230);
      doc.roundedRect(M, y, CW, hasSigs ? 66 : 52, 2, 2, 'FD');
      doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(50, 70, 120);
      doc.text('FIRMAS DE CONFORMIDAD', W / 2, y + 7, { align: 'center' });

      const sw = (CW - 20) / 2;
      const s1x = M + 5; const s2x = M + CW / 2 + 5;

      if (hasSigs) {
        // Draw signature images
        const sigY = y + 12;
        const sigH = 30;
        if (inspection.inspectorSignature) {
          try {
            doc.addImage(inspection.inspectorSignature, 'PNG', s1x, sigY, sw, sigH);
          } catch (_) {}
        }
        if (inspection.driverSignature) {
          try {
            doc.addImage(inspection.driverSignature, 'PNG', s2x, sigY, sw, sigH);
          } catch (_) {}
        }
        const lineY = y + 46;
        doc.setDrawColor(70, 90, 130); doc.setLineWidth(0.6);
        doc.line(s1x, lineY, s1x + sw, lineY);
        doc.line(s2x, lineY, s2x + sw, lineY);
        doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20);
        doc.text(inspection.inspector, s1x + sw / 2, lineY + 5, { align: 'center' });
        doc.text(inspection.driverName ?? '________________________', s2x + sw / 2, lineY + 5, { align: 'center' });
        doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100);
        doc.text('INSPECTOR', s1x + sw / 2, lineY + 10, { align: 'center' });
        doc.text('CONDUCTOR / MECÁNICO', s2x + sw / 2, lineY + 10, { align: 'center' });
      } else {
        const lineY = y + 38;
        doc.setDrawColor(70, 90, 130); doc.setLineWidth(0.6);
        doc.line(s1x, lineY, s1x + sw, lineY);
        doc.line(s2x, lineY, s2x + sw, lineY);
        doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20);
        doc.text(inspection.inspector, s1x + sw / 2, lineY + 5, { align: 'center' });
        doc.text(inspection.driverName ?? '________________________', s2x + sw / 2, lineY + 5, { align: 'center' });
        doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100);
        doc.text('INSPECTOR', s1x + sw / 2, lineY + 10, { align: 'center' });
        doc.text('CONDUCTOR / MECÁNICO', s2x + sw / 2, lineY + 10, { align: 'center' });
      }

      // ── Footer ─────────────────────────────────────────────────────
      const pages = (doc as any).internal.pages.length - 1;
      for (let p = 1; p <= pages; p++) {
        doc.setPage(p);
        doc.setFillColor(22, 107, 52);
        doc.rect(0, H - 10, W, 10, 'F');
        doc.setTextColor(180, 230, 200); doc.setFontSize(6.5); doc.setFont('helvetica', 'normal');
        doc.text('Segovia Aseo S.A.E.S.P.  ·  Sistema de Inspección Vehicular', W / 2, H - 5.5, { align: 'center' });
        doc.text(`Página ${p} de ${pages}`, W - M, H - 5.5, { align: 'right' });
      }

      doc.save(`Inspeccion_${vehicle.licensePlate}_${inspection.date}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Error al generar el PDF. Por favor intente de nuevo.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (isLoading || !inspection) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto" />
        </div>
      </div>
    );
  }

  const pass = inspection.items.filter(i => i.status === 'pass').length;
  const fail = inspection.items.filter(i => i.status === 'fail').length;
  const nc = inspection.items.filter(i => i.status === 'not-checked').length;
  const na = inspection.items.filter(i => i.status === 'n/a').length;
  const applicable = inspection.items.length - na;
  const pct = applicable > 0 ? Math.round((pass / applicable) * 100) : 100;

  const technicalItems = inspection.items.filter(i => i.category === 'technical').sort((a, b) => parseInt(a.sortOrder ?? '0') - parseInt(b.sortOrder ?? '0'));
  const safetyItems = inspection.items.filter(i => i.category === 'safety').sort((a, b) => parseInt(a.sortOrder ?? '0') - parseInt(b.sortOrder ?? '0'));
  const legalItems = inspection.items.filter(i => i.category === 'legal').sort((a, b) => parseInt(a.sortOrder ?? '0') - parseInt(b.sortOrder ?? '0'));

  const getStatusBadge = (status: string) => {
    if (status === 'pass') return <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700"><CheckCircle className="h-3.5 w-3.5" />Aprobado</span>;
    if (status === 'fail') return <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700"><XCircle className="h-3.5 w-3.5" />Fallido</span>;
    if (status === 'n/a') return <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500"><Ban className="h-3.5 w-3.5" />N/A</span>;
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400"><MinusCircle className="h-3.5 w-3.5" />Sin revisar</span>;
  };

  const renderSection = (items: typeof technicalItems, title: string, icon: React.ReactNode, bg: string) => (
    <Card className="professional-card overflow-hidden">
      <div className={`flex items-center justify-between px-5 py-4 border-b ${bg}`}>
        <div className="flex items-center gap-2.5">{icon}<span className="font-semibold text-gray-800">{title}</span></div>
        <span className="text-sm text-gray-600">{items.filter(i => i.status !== 'not-checked').length}/{items.length}</span>
      </div>
      <CardContent className="p-0">
        <div className="divide-y divide-gray-50">
          {items.map(item => (
            <div key={item.id} className={`flex items-start justify-between px-5 py-3 ${item.status === 'fail' ? 'bg-red-50/40' : item.status === 'pass' ? 'bg-green-50/20' : item.status === 'n/a' ? 'bg-slate-50/60' : ''}`}>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800">{item.name}</p>
                {item.notes && (
                  <div className="mt-1 flex items-start gap-1.5">
                    <AlertTriangle className="h-3 w-3 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-600 italic">{item.notes}</p>
                  </div>
                )}
              </div>
              <div className="ml-4 flex-shrink-0">{getStatusBadge(item.status)}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button onClick={() => setLocation('/')} variant="ghost" size="sm" className="p-2 hover:bg-gray-100 rounded-lg" data-testid="button-back-to-list">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Detalle de Inspección</h1>
            <p className="text-sm text-gray-500">{formatDate(inspection.date)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!inspection.completed && (
            <Button onClick={() => setLocation(`/inspection/${id}/edit`)} variant="outline" size="sm" className="border-primary text-primary hover:bg-primary/5">
              <Edit className="h-4 w-4 mr-1.5" />Continuar
            </Button>
          )}
          <Button onClick={handleGeneratePdf} disabled={generatingPdf} className="btn-primary">
            {generatingPdf ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />Generando...</> : <><Download className="h-4 w-4 mr-2" />Exportar PDF</>}
          </Button>
        </div>
      </div>

      {/* Info */}
      <Card className="professional-card mb-5">
        <CardContent className="p-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="info-chip">
              <Car className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
              <div><p className="text-xs text-gray-500">Vehículo</p><p className="text-sm font-semibold text-gray-800">{vehicle?.name ?? '—'}</p><p className="text-xs text-gray-400 font-mono">{vehicle?.licensePlate ?? ''}</p></div>
            </div>
            <div className="info-chip">
              <Calendar className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
              <div><p className="text-xs text-gray-500">Fecha</p><p className="text-sm font-semibold text-gray-800">{formatDate(inspection.date)}</p></div>
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
                <p className="text-xs text-gray-500">Estado</p>
                <p className={`text-sm font-semibold ${inspection.completed ? 'text-green-600' : 'text-amber-600'}`}>{inspection.completed ? 'Completada' : 'En progreso'}</p>
                {inspection.startTime && <p className="text-xs text-gray-400">{inspection.startTime}{inspection.endTime ? ` → ${inspection.endTime}` : ''}</p>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-5 gap-2 mb-5">
        {[
          { label: 'Aprobados', value: pass, icon: <CheckCircle className="h-5 w-5 text-green-500 mx-auto mb-1" />, cls: 'summary-card-pass text-green-700' },
          { label: 'Fallidos', value: fail, icon: <XCircle className="h-5 w-5 text-red-500 mx-auto mb-1" />, cls: 'summary-card-fail text-red-700' },
          { label: 'N/A', value: na, icon: <Ban className="h-5 w-5 text-slate-400 mx-auto mb-1" />, cls: 'bg-slate-50 border border-slate-200 text-slate-500' },
          { label: 'Sin revisar', value: nc, icon: <MinusCircle className="h-5 w-5 text-gray-400 mx-auto mb-1" />, cls: 'summary-card-neutral text-gray-500' },
          { label: 'Cumplimiento', value: `${pct}%`, icon: <FileText className="h-5 w-5 text-blue-500 mx-auto mb-1" />, cls: 'bg-blue-50 border border-blue-200 text-blue-700' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-3 text-center ${s.cls}`}>
            {s.icon}
            <p className="text-xl font-bold">{s.value}</p>
            <p className="text-xs font-medium opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {renderSection(technicalItems, 'Técnico-Mecánico', <Settings className="h-4 w-4 text-blue-600" />, 'bg-blue-50')}
        {renderSection(safetyItems, 'Seguridad y Botiquín', <Shield className="h-4 w-4 text-orange-600" />, 'bg-orange-50')}
        {renderSection(legalItems, 'Documentación Legal', <FileText className="h-4 w-4 text-purple-600" />, 'bg-purple-50')}

        {inspection.notes && (
          <Card className="professional-card">
            <CardHeader className="card-header-accent">
              <CardTitle className="card-title-with-icon"><FileText className="h-4 w-4 text-primary" />Observaciones Generales</CardTitle>
            </CardHeader>
            <CardContent className="p-5"><p className="text-sm text-gray-700 leading-relaxed">{inspection.notes}</p></CardContent>
          </Card>
        )}

        {/* Signatures */}
        <Card className="professional-card">
          <CardHeader className="card-header-accent">
            <CardTitle className="card-title-with-icon"><PenLine className="h-4 w-4 text-primary" />Firmas de Conformidad</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {inspection.inspectorSignature || inspection.driverSignature ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <SignaturePad
                    value={inspection.inspectorSignature}
                    onChange={() => {}}
                    label={`Inspector: ${inspection.inspector}`}
                    disabled
                  />
                </div>
                <div>
                  <SignaturePad
                    value={inspection.driverSignature}
                    onChange={() => {}}
                    label={`Conductor / Mecánico: ${inspection.driverName || 'Sin especificar'}`}
                    disabled
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-10">
                <div className="text-center">
                  <div className="h-16 border-b-2 border-gray-400 mb-2" />
                  <p className="text-sm font-bold text-gray-800">{inspection.inspector}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Inspector</p>
                </div>
                <div className="text-center">
                  <div className="h-16 border-b-2 border-gray-400 mb-2" />
                  <p className="text-sm font-bold text-gray-800">{inspection.driverName || '________________________'}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Conductor / Mecánico</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-center pb-6">
          <Button onClick={handleGeneratePdf} disabled={generatingPdf} className="btn-primary px-8">
            <Download className="h-4 w-4 mr-2" />
            {generatingPdf ? 'Generando PDF...' : 'Descargar PDF'}
          </Button>
        </div>
      </div>
    </div>
  );
}
