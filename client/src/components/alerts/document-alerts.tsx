import { AlertTriangle } from 'lucide-react';
import { DocumentAlert } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DocumentAlertsProps {
  alerts: DocumentAlert[];
  onUpdateDocument: () => void;
}

export function DocumentAlerts({ alerts, onUpdateDocument }: DocumentAlertsProps) {
  if (alerts.length === 0) return null;

  return (
    <Card className="mb-6 border-red-200">
      <CardHeader className="bg-red-50 border-b border-red-200">
        <CardTitle className="flex items-center text-red-800">
          <AlertTriangle className="h-6 w-6 mr-3" />
          Alertas de Documentos
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-3">
          {alerts.map((alert, index) => (
            <div key={index} className={`p-3 rounded-md border-l-4 ${
              alert.status === 'expired' 
                ? 'bg-red-50 border-red-400' 
                : 'bg-yellow-50 border-yellow-400'
            }`} data-testid={`alert-${alert.vehicleId}-${alert.document.toLowerCase()}`}>
              <div className="flex justify-between items-center">
                <div>
                  <p className={`font-medium ${
                    alert.status === 'expired' ? 'text-red-800' : 'text-yellow-800'
                  }`}>
                    {alert.vehicleName} ({alert.licensePlate}) - {alert.document}
                  </p>
                  <p className={`text-sm ${
                    alert.status === 'expired' ? 'text-red-600' : 'text-yellow-600'
                  }`}>
                    {alert.status === 'expired' 
                      ? `Vencido hace ${Math.abs(alert.daysLeft)} días`
                      : `Vence en ${alert.daysLeft} días`
                    }
                  </p>
                </div>
                <Button
                  onClick={onUpdateDocument}
                  size="sm"
                  variant="outline"
                  className={`${
                    alert.status === 'expired'
                      ? 'bg-red-100 text-red-800 hover:bg-red-200 border-red-300'
                      : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-300'
                  }`}
                  data-testid={`button-update-${alert.vehicleId}-${alert.document.toLowerCase()}`}
                >
                  Actualizar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
