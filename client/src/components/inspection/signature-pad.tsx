import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, CheckCircle } from 'lucide-react';

interface SignaturePadProps {
  value?: string | null;
  onChange: (dataUrl: string | null) => void;
  label: string;
  disabled?: boolean;
}

export function SignaturePad({ value, onChange, label, disabled = false }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(!!value);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const getCanvas = () => canvasRef.current;
  const getCtx = () => canvasRef.current?.getContext('2d');

  const initCanvas = useCallback(() => {
    const canvas = getCanvas();
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1a3f7a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  useEffect(() => {
    initCanvas();
    if (value) {
      const canvas = getCanvas();
      const ctx = getCtx();
      if (!canvas || !ctx) return;
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = value;
      setHasSignature(true);
    }
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      const touch = e.touches[0];
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
    }
    return { x: ((e as React.MouseEvent).clientX - rect.left) * scaleX, y: ((e as React.MouseEvent).clientY - rect.top) * scaleY };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    e.preventDefault();
    const canvas = getCanvas();
    if (!canvas) return;
    setIsDrawing(true);
    lastPos.current = getPos(e, canvas);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || disabled) return;
    e.preventDefault();
    const canvas = getCanvas();
    const ctx = getCtx();
    if (!canvas || !ctx || !lastPos.current) return;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
    setHasSignature(true);
  };

  const endDraw = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    lastPos.current = null;
    const canvas = getCanvas();
    if (canvas) onChange(canvas.toDataURL('image/png'));
  };

  const clear = () => {
    initCanvas();
    setHasSignature(false);
    onChange(null);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</p>
        {hasSignature && !disabled && (
          <Button type="button" onClick={clear} variant="ghost" size="sm" className="h-6 text-xs text-gray-400 hover:text-red-500 gap-1 px-2">
            <Trash2 className="h-3 w-3" /> Limpiar
          </Button>
        )}
      </div>
      <div className={`relative rounded-xl border-2 overflow-hidden bg-white ${disabled ? 'border-gray-200' : hasSignature ? 'border-green-400' : 'border-dashed border-gray-300 hover:border-primary/50'}`}>
        <canvas
          ref={canvasRef}
          width={500}
          height={160}
          className="w-full touch-none cursor-crosshair block"
          style={{ cursor: disabled ? 'default' : 'crosshair' }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        {!hasSignature && !disabled && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-sm text-gray-300 select-none">Firme aquí...</p>
          </div>
        )}
        {hasSignature && !disabled && (
          <div className="absolute top-2 right-2 pointer-events-none">
            <CheckCircle className="h-4 w-4 text-green-500" />
          </div>
        )}
      </div>
    </div>
  );
}
