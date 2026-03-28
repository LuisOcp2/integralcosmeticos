import { Plus } from 'lucide-react';
import type { Producto } from '@/types';

interface ProductoCardProps {
  producto: Producto;
  onAgregar: (producto: Producto) => void;
}

const PLACEHOLDER = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Crect width='120' height='120' fill='%23f3dde1'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='40' fill='%2385264b'%3E🧴%3C/text%3E%3C/svg%3E`;

export default function ProductoCard({ producto, onAgregar }: ProductoCardProps) {
  const precio = producto.precioBase;
  const formattedPrice = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(precio);

  const variantesCount = producto.variantes?.length ?? 0;

  return (
    <div className="group bg-surface rounded-2xl border border-outline-variant overflow-hidden flex flex-col hover:border-primary hover:shadow-elevation2 transition-all duration-200 cursor-pointer">
      {/* Product image */}
      <div className="relative aspect-square overflow-hidden bg-surface-2">
        <img
          src={producto.imagenUrl ?? PLACEHOLDER}
          alt={producto.nombre}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = PLACEHOLDER;
          }}
        />
        {variantesCount > 1 && (
          <span className="absolute top-2 right-2 bg-primary text-on-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
            {variantesCount} vars
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1 p-3 flex-1">
        <p className="text-on-background font-semibold text-sm leading-tight line-clamp-2">
          {producto.nombre}
        </p>
        {producto.codigoInterno && (
          <p className="text-outline text-[11px] font-medium">{producto.codigoInterno}</p>
        )}
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-primary font-bold text-base">{formattedPrice}</span>
          <button
            onClick={() => onAgregar(producto)}
            className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center hover:bg-on-primary-container hover:text-primary-container active:scale-90 transition-all duration-150 shadow-elevation1"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
