import { Car, Edit, Trash2, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import type { Vehicle } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface VehicleCardProps {
  vehicle: Vehicle;
  onEdit: (vehicle: Vehicle) => void;
  onDelete: (vehicleId: string) => void;
  getDocumentStatus: (expiryDate?: string | null) => { status: string; daysLeft: number };
}

export function VehicleCard({ vehicle, onEdit, onDelete, getDocumentStatus }: VehicleCardProps) {
  const soatStatus = getDocumentStatus(vehicle.soatExpiry);
  const rtmStatus = getDocumentStatus(vehicle.rtmExpiry);

  const getStatusBadge = (status: { status: string; daysLeft: number }) => {
    if (status.status === 'expired') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
          <XCircle className="h-3 w-3 mr-1" />Vencido
        </span>
      );
    }
    if (status.status === 'expiring') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
          <AlertTriangle className="h-3 w-3 mr-1" />Vence pronto
        </span>
      );
    }
    if (status.status === 'valid') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />Vigente
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
        No definido
      </span>
    );
  };

  const formatDate = (d?: string | null) => {
    if (!d) return 'No definido';
    const [y, m, day] = d.split('-').map(Number);
    return new Date(y, m - 1, day).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <Card className="hover:shadow-md transition-shadow duration-200" data-testid={`vehicle-card-${vehicle.id}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Car className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900" data-testid={`text-vehicle-name-${vehicle.id}`}>
                {vehicle.name}
              </h3>
              <p className="text-sm text-gray-500 font-mono" data-testid={`text-license-plate-${vehicle.id}`}>
                {vehicle.licensePlate}
              </p>
              <p className="text-xs text-gray-400" data-testid={`text-vehicle-type-${vehicle.id}`}>
                {vehicle.type}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <Button onClick={() => onEdit(vehicle)} size="sm" variant="ghost" className="p-2 text-gray-400 hover:text-blue-600" data-testid={`button-edit-${vehicle.id}`}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button onClick={() => onDelete(vehicle.id)} size="sm" variant="ghost" className="p-2 text-gray-400 hover:text-red-600" data-testid={`button-delete-${vehicle.id}`}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">SOAT</span>
            {getStatusBadge(soatStatus)}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">RTM</span>
            {getStatusBadge(rtmStatus)}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="text-xs text-gray-500 space-y-0.5">
            <p>SOAT: <span className="font-medium" data-testid={`text-soat-date-${vehicle.id}`}>{formatDate(vehicle.soatExpiry)}</span></p>
            <p>RTM: <span className="font-medium" data-testid={`text-rtm-date-${vehicle.id}`}>{formatDate(vehicle.rtmExpiry)}</span></p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
