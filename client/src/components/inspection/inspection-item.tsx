import { CheckCircle, XCircle, MinusCircle, Ban } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import type { InspectionItem as InspectionItemType } from '@shared/schema';

interface InspectionItemProps {
  item: InspectionItemType;
  onStatusUpdate: (itemId: string, status: 'pass' | 'fail' | 'not-checked' | 'n/a') => void;
  onNotesUpdate: (itemId: string, notes: string | null) => void;
}

export function InspectionItem({ item, onStatusUpdate, onNotesUpdate }: InspectionItemProps) {
  const isPass = item.status === 'pass';
  const isFail = item.status === 'fail';
  const isNA = item.status === 'n/a';

  const borderColor = isPass
    ? 'border-l-green-500 bg-green-50/40'
    : isFail
    ? 'border-l-red-500 bg-red-50/40'
    : isNA
    ? 'border-l-slate-400 bg-slate-50/60'
    : 'border-l-gray-200 bg-white';

  return (
    <div
      className={`border border-gray-100 border-l-4 rounded-lg p-3.5 transition-all duration-150 ${borderColor}`}
      data-testid={`inspection-item-${item.id}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium leading-tight ${isNA ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
            {item.name}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => onStatusUpdate(item.id, isPass ? 'not-checked' : 'pass')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-all duration-150 ${
              isPass
                ? 'bg-green-600 text-white border-green-600 shadow-sm'
                : 'bg-white text-gray-500 border-gray-200 hover:bg-green-50 hover:text-green-700 hover:border-green-300'
            }`}
            data-testid={`button-pass-${item.id}`}
          >
            <CheckCircle className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Bien</span>
          </button>
          <button
            onClick={() => onStatusUpdate(item.id, isFail ? 'not-checked' : 'fail')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-all duration-150 ${
              isFail
                ? 'bg-red-600 text-white border-red-600 shadow-sm'
                : 'bg-white text-gray-500 border-gray-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300'
            }`}
            data-testid={`button-fail-${item.id}`}
          >
            <XCircle className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Falla</span>
          </button>
          <button
            onClick={() => onStatusUpdate(item.id, isNA ? 'not-checked' : 'n/a')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-all duration-150 ${
              isNA
                ? 'bg-slate-500 text-white border-slate-500 shadow-sm'
                : 'bg-white text-gray-400 border-gray-200 hover:bg-slate-50 hover:text-slate-600 hover:border-slate-300'
            }`}
            data-testid={`button-na-${item.id}`}
          >
            <Ban className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">N/A</span>
          </button>
          {item.status === 'not-checked' && (
            <span className="inline-flex items-center gap-1 px-2 py-1.5 text-xs text-gray-300">
              <MinusCircle className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      </div>

      {isFail && (
        <div className="mt-3">
          <label htmlFor={`notes-${item.id}`} className="block text-xs font-semibold text-red-700 mb-1.5">
            ⚠ Descripción del problema (obligatorio)
          </label>
          <Textarea
            id={`notes-${item.id}`}
            defaultValue={item.notes ?? ''}
            onBlur={(e) => onNotesUpdate(item.id, e.target.value || null)}
            placeholder="Describa el problema encontrado..."
            className="text-sm border-red-200 focus:ring-red-400 resize-none"
            rows={2}
            data-testid={`textarea-notes-${item.id}`}
          />
        </div>
      )}
    </div>
  );
}
