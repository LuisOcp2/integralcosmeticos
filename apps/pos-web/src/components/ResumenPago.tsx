const IVA_RATE = 0.19;

interface ResumenPagoProps {
  subtotal: number;
  descuentoGlobal: number; // percentage 0-100
}

const formatCOP = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

export default function ResumenPago({ subtotal, descuentoGlobal }: ResumenPagoProps) {
  const descuentoMonto = subtotal * (descuentoGlobal / 100);
  const baseImponible = subtotal - descuentoMonto;
  const iva = baseImponible * IVA_RATE;
  const total = baseImponible + iva;

  return (
    <div className="flex flex-col gap-1.5 py-3 border-t border-outline-variant">
      <Row label="Subtotal" value={formatCOP(subtotal)} />
      {descuentoGlobal > 0 && (
        <Row label={`Descuento (${descuentoGlobal}%)`} value={`-${formatCOP(descuentoMonto)}`} highlight="discount" />
      )}
      <Row label="IVA 19%" value={formatCOP(iva)} />

      {/* Global discount input */}
      <div className="flex items-center gap-2 mt-1">
        <label className="text-outline text-xs flex-1">Descuento global (%)</label>
        <div className="flex items-center gap-1 bg-surface-2 border border-outline-variant rounded-2xl px-3 py-1">
          <span className="material-icon text-[14px] text-outline">percent</span>
          <input
            id="descuento-global"
            type="number"
            min={0}
            max={100}
            defaultValue={0}
            className="w-12 bg-transparent text-on-background text-sm font-medium text-center focus:outline-none"
          />
        </div>
      </div>

      {/* Total */}
      <div className="flex items-center justify-between pt-2 border-t border-outline-variant mt-1">
        <span className="text-on-background font-bold text-base">Total</span>
        <span className="text-primary font-extrabold text-2xl">{formatCOP(total)}</span>
      </div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: 'discount' }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-on-surface-variant text-sm">{label}</span>
      <span
        className={`text-sm font-semibold ${
          highlight === 'discount' ? 'text-primary' : 'text-on-background'
        }`}
      >
        {value}
      </span>
    </div>
  );
}
