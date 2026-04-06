import { Trash2, Minus, Plus, Percent } from 'lucide-react';
import type { ItemCarrito } from '@/types';

interface CarritoItemProps {
  item: ItemCarrito;
  onCambiarCantidad: (_key: string, _cantidad: number) => void;
  onCambiarDescuento: (_key: string, _descuento: number) => void;
  onQuitar: (_key: string) => void;
}

const PLACEHOLDER = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect width='80' height='80' fill='%23f3dde1'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='28' fill='%2385264b'%3E🧴%3C/text%3E%3C/svg%3E`;

const formatCOP = (v: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(v);

export default function CarritoItem({
  item,
  onCambiarCantidad,
  onCambiarDescuento,
  onQuitar,
}: CarritoItemProps) {
  const precioOriginal = item.precioUnitario * item.cantidad;
  const hasDiscount = item.descuentoItem > 0;

  return (
    <div className="flex gap-3 py-3 border-b border-outline-variant last:border-b-0">
      {/* Thumbnail */}
      <img
        src={item.imagenUrl ?? PLACEHOLDER}
        alt={item.nombre}
        className="w-16 h-16 rounded-xl object-cover shrink-0 bg-surface-2"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = PLACEHOLDER;
        }}
      />

      {/* Info & Controls */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0">
            <p className="text-on-background text-sm font-semibold leading-tight truncate">
              {item.nombre}
            </p>
            <p className="text-outline text-[11px] mt-0.5">{item.variante}</p>
          </div>
          <button
            onClick={() => onQuitar(item.key)}
            className="shrink-0 w-7 h-7 rounded-full hover:bg-error-container hover:text-error flex items-center justify-center transition-colors"
          >
            <Trash2 className="w-4 h-4 text-outline" />
          </button>
        </div>

        {/* Price row */}
        <div className="flex items-center gap-2 mt-1">
          {hasDiscount ? (
            <>
              <span className="text-outline text-xs line-through">{formatCOP(precioOriginal)}</span>
              <span className="text-primary font-bold text-sm">{formatCOP(item.subtotal)}</span>
            </>
          ) : (
            <span className="text-primary font-bold text-sm">{formatCOP(item.subtotal)}</span>
          )}
        </div>

        {/* Quantity + Discount */}
        <div className="flex items-center gap-3 mt-2">
          {/* Qty controls */}
          <div className="flex items-center gap-1 bg-surface-2 rounded-full px-1 py-0.5 border border-outline-variant">
            <button
              onClick={() => onCambiarCantidad(item.key, item.cantidad - 1)}
              className="w-6 h-6 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-3 active:scale-90 transition-all"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-on-background text-sm font-semibold min-w-[20px] text-center">
              {item.cantidad}
            </span>
            <button
              onClick={() => onCambiarCantidad(item.key, item.cantidad + 1)}
              className="w-6 h-6 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-3 active:scale-90 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Discount input */}
          <div className="flex items-center gap-1 bg-surface-2 border border-outline-variant rounded-full px-2 py-0.5">
            <Percent className="w-3.5 h-3.5 text-outline" />
            <input
              type="number"
              min={0}
              max={100}
              value={item.descuentoItem || ''}
              placeholder="0"
              onChange={(e) => onCambiarDescuento(item.key, Number(e.target.value))}
              className="w-10 bg-transparent text-on-background text-xs font-medium text-center focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
