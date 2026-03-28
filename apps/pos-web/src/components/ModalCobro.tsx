import { useState, useRef, useEffect } from 'react';
import { X, CheckCircle2 } from 'lucide-react';

const IVA_RATE = 0.19;
const formatCOP = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

interface ModalCobroProps {
  subtotal: number;
  descuentoGlobal: number;
  metodoPago: string;
  onConfirmar: (montoRecibido: number | null) => void;
  onCancelar: () => void;
}

export default function ModalCobro({ subtotal, descuentoGlobal, metodoPago, onConfirmar, onCancelar }: ModalCobroProps) {
  const baseImponible = subtotal * (1 - descuentoGlobal / 100);
  const total = baseImponible * (1 + IVA_RATE);

  const [montoRecibido, setMontoRecibido] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const esEfectivo = metodoPago === 'EFECTIVO';
  const monto = parseFloat(montoRecibido.replace(/[^0-9.]/g, '')) || 0;
  const vuelto = esEfectivo ? Math.max(0, monto - total) : 0;
  const puedeConfirmar = !esEfectivo || monto >= total;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/40 backdrop-blur-sm">
      <div className="bg-surface rounded-4xl p-6 shadow-elevation3 w-96 flex flex-col gap-5 animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-on-background font-bold text-xl">Confirmar Cobro</h2>
          <button
            onClick={onCancelar}
            className="w-9 h-9 rounded-full hover:bg-surface-2 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-on-surface-variant" />
          </button>
        </div>

        {/* Total */}
        <div className="bg-primary-container rounded-3xl p-4 text-center">
          <p className="text-on-primary-container/70 text-sm font-medium mb-1">Total a cobrar</p>
          <p className="text-on-primary-container font-extrabold text-4xl">{formatCOP(total)}</p>
        </div>

        {/* Efectivo inputs */}
        {esEfectivo && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-on-surface-variant text-sm font-medium">Monto recibido</label>
              <div className="flex items-center gap-2 bg-surface-2 border border-outline-variant rounded-2xl px-4 h-12 focus-within:border-primary transition-colors">
                <span className="text-outline font-medium text-sm">$</span>
                <input
                  ref={inputRef}
                  type="number"
                  min={total}
                  step={1000}
                  value={montoRecibido}
                  onChange={(e) => setMontoRecibido(e.target.value)}
                  placeholder={formatCOP(Math.ceil(total / 1000) * 1000)}
                  className="flex-1 bg-transparent text-on-background text-base font-semibold focus:outline-none"
                />
              </div>
            </div>
            {monto >= total && (
              <div className="flex items-center justify-between bg-tertiary-container rounded-2xl px-4 py-3">
                <span className="text-on-tertiary-container text-sm font-medium">Vuelto</span>
                <span className="text-on-tertiary-container font-bold text-lg">{formatCOP(vuelto)}</span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancelar}
            className="flex-1 py-3 rounded-2xl border border-outline-variant text-on-surface-variant text-sm font-semibold hover:bg-surface-2 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirmar(esEfectivo ? monto : null)}
            disabled={!puedeConfirmar}
            className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2
              ${puedeConfirmar
                ? 'bg-primary text-on-primary hover:opacity-90 active:scale-95'
                : 'bg-surface-3 text-outline cursor-not-allowed'
              }`}
          >
            <CheckCircle2 className="w-5 h-5" />
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
