import type { Producto } from '@/types';
import ProductoCard from './ProductoCard';

interface ProductoGridProps {
  productos: Producto[];
  loading: boolean;
  onAgregar: (producto: Producto) => void;
  emptyMessage?: string;
}

function SkeletonCard() {
  return (
    <div className="bg-surface rounded-2xl border border-outline-variant overflow-hidden animate-pulse">
      <div className="aspect-square bg-surface-3" />
      <div className="p-3 flex flex-col gap-2">
        <div className="h-4 bg-surface-3 rounded w-3/4" />
        <div className="h-3 bg-surface-3 rounded w-1/2" />
        <div className="h-6 bg-surface-3 rounded w-1/3 mt-2" />
      </div>
    </div>
  );
}

export default function ProductoGrid({ productos, loading, onAgregar, emptyMessage }: ProductoGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (productos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-on-surface-variant">
        <span className="material-icon text-6xl opacity-30">search_off</span>
        <p className="text-sm font-medium">{emptyMessage ?? 'No se encontraron productos'}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
      {productos.map((p) => (
        <ProductoCard key={p.id} producto={p} onAgregar={onAgregar} />
      ))}
    </div>
  );
}
