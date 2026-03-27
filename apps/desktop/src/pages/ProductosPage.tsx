import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ICategoria, IMarca, IProducto } from '@cosmeticos/shared-types';
import api from '../lib/api';
import AppLayout from './components/AppLayout';

const cop = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

async function getCategorias(): Promise<ICategoria[]> {
  const { data } = await api.get('/categorias');
  return data;
}
async function getMarcas(): Promise<IMarca[]> {
  const { data } = await api.get('/marcas');
  return data;
}
async function getProductos(categoriaId?: string, marcaId?: string): Promise<IProducto[]> {
  const { data } = await api.get('/productos', { params: { categoriaId: categoriaId || undefined, marcaId: marcaId || undefined } });
  return data;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-surface-container ${className ?? ''}`} />;
}

function VariantesModal({ producto, onClose }: { producto: IProducto; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(46,27,12,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="px-6 py-5 flex items-center justify-between" style={{ backgroundColor: '#2a1709' }}>
          <div>
            <h3 className="text-xl font-black text-white">{producto.nombre}</h3>
            <p className="text-sm mt-0.5" style={{ color: '#fba9e5' }}>Variantes del producto</p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-6">
          {producto.variantes && producto.variantes.length > 0 ? (
            <div className="space-y-3">
              {producto.variantes.map((v) => (
                <div key={v.id} className="flex items-center justify-between p-4 rounded-xl bg-surface-container">
                  <div>
                    <p className="font-bold text-on-surface text-sm">{v.nombre}</p>
                    <p className="text-xs text-secondary mt-0.5">SKU: {v.sku ?? '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-on-secondary-fixed">{cop.format(Number(v.precioVenta ?? 0))}</p>
                    {v.precioExtra > 0 && (
                      <p className="text-xs text-secondary">+{cop.format(Number(v.precioExtra))}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-8 gap-2">
              <span className="material-symbols-outlined text-4xl text-outline">category</span>
              <p className="text-sm text-secondary font-bold">Sin variantes registradas</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProductosPage() {
  const [categoriaId, setCategoriaId] = useState('');
  const [marcaId, setMarcaId] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [productoVariantes, setProductoVariantes] = useState<IProducto | null>(null);

  const categoriasQuery = useQuery({ queryKey: ['categorias'], queryFn: getCategorias });
  const marcasQuery = useQuery({ queryKey: ['marcas'], queryFn: getMarcas });
  const productosQuery = useQuery({
    queryKey: ['productos', categoriaId, marcaId],
    queryFn: () => getProductos(categoriaId, marcaId),
    refetchInterval: 60000,
  });

  const categoriasMap = useMemo(
    () => new Map((categoriasQuery.data ?? []).map((c) => [c.id, c.nombre])),
    [categoriasQuery.data],
  );
  const marcasMap = useMemo(
    () => new Map((marcasQuery.data ?? []).map((m) => [m.id, m.nombre])),
    [marcasQuery.data],
  );

  const productosFiltrados = useMemo(() => {
    const base = productosQuery.data ?? [];
    if (!busqueda.trim()) return base;
    const q = busqueda.toLowerCase();
    return base.filter((p) => p.nombre.toLowerCase().includes(q));
  }, [productosQuery.data, busqueda]);

  const margen = (precioBase: number, precioCosto: number) =>
    precioCosto > 0 ? (((precioBase - precioCosto) / precioBase) * 100).toFixed(0) : '—';

  return (
    <AppLayout>
      {productoVariantes && (
        <VariantesModal producto={productoVariantes} onClose={() => setProductoVariantes(null)} />
      )}

      <div className="space-y-8">
        <header className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-extrabold text-on-secondary-fixed tracking-tight">Productos</h1>
            <p className="text-secondary font-medium mt-1">Catálogo de productos y variantes</p>
          </div>
        </header>

        {/* KPIs */}
        {!productosQuery.isLoading && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-surface-container-low p-5 rounded-2xl border-l-4 border-primary">
              <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">Total productos</p>
              <p className="text-2xl font-black text-on-secondary-fixed">{productosQuery.data?.length ?? 0}</p>
            </div>
            <div className="bg-surface-container-low p-5 rounded-2xl border-l-4 border-tertiary">
              <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">Categorías</p>
              <p className="text-2xl font-black text-on-secondary-fixed">{categoriasQuery.data?.length ?? 0}</p>
            </div>
            <div className="bg-surface-container-low p-5 rounded-2xl border-l-4 border-secondary">
              <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">Marcas</p>
              <p className="text-2xl font-black text-on-secondary-fixed">{marcasQuery.data?.length ?? 0}</p>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center bg-surface-container-lowest border-2 border-outline-variant/30 rounded-xl px-4 gap-2 focus-within:border-primary transition-colors flex-1 min-w-[200px]">
            <span className="material-symbols-outlined text-secondary" style={{ fontSize: 18 }}>search</span>
            <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
              className="flex-1 bg-transparent py-2.5 text-sm font-medium text-on-surface placeholder-secondary/50 focus:outline-none"
              placeholder="Buscar producto..." />
          </div>
          <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}
            className="bg-surface-container-lowest border border-outline-variant/30 px-4 py-2.5 rounded-xl text-sm font-semibold text-on-surface min-w-[180px]">
            <option value="">Todas las categorías</option>
            {(categoriasQuery.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <select value={marcaId} onChange={(e) => setMarcaId(e.target.value)}
            className="bg-surface-container-lowest border border-outline-variant/30 px-4 py-2.5 rounded-xl text-sm font-semibold text-on-surface min-w-[160px]">
            <option value="">Todas las marcas</option>
            {(marcasQuery.data ?? []).map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
        </div>

        {/* Tabla */}
        <div className="overflow-hidden rounded-2xl shadow-sm border border-outline-variant/10">
          {(categoriasQuery.isLoading || marcasQuery.isLoading || productosQuery.isLoading) ? (
            <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : productosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <span className="material-symbols-outlined text-5xl text-outline">inventory</span>
              <p className="text-sm font-bold text-secondary">No se encontraron productos</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-highest text-on-surface-variant font-bold text-xs uppercase tracking-widest">
                  <th className="px-6 py-4">Producto</th>
                  <th className="px-6 py-4">Categoría</th>
                  <th className="px-6 py-4">Marca</th>
                  <th className="px-6 py-4 text-right">Precio venta</th>
                  <th className="px-6 py-4 text-right">Precio costo</th>
                  <th className="px-6 py-4 text-right">Margen</th>
                  <th className="px-6 py-4 text-center">IVA</th>
                  <th className="px-6 py-4 text-center">Variantes</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {productosFiltrados.map((producto, i) => (
                  <tr key={producto.id} className={`border-b border-outline-variant/5 ${i % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low'}`}>
                    <td className="px-6 py-4">
                      <p className="font-bold text-on-surface">{producto.nombre}</p>
                    </td>
                    <td className="px-6 py-4 text-secondary">{categoriasMap.get(producto.categoriaId) ?? '—'}</td>
                    <td className="px-6 py-4 text-secondary">{marcasMap.get(producto.marcaId) ?? '—'}</td>
                    <td className="px-6 py-4 text-right font-bold text-on-surface">{cop.format(Number(producto.precioBase))}</td>
                    <td className="px-6 py-4 text-right text-secondary">{cop.format(Number(producto.precioCosto))}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-black" style={{
                        color: Number(margen(Number(producto.precioBase), Number(producto.precioCosto))) >= 20 ? '#2e7d32'
                          : Number(margen(Number(producto.precioBase), Number(producto.precioCosto))) >= 10 ? '#e65100' : '#ba1a1a'
                      }}>
                        {margen(Number(producto.precioBase), Number(producto.precioCosto))}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: '#e8eaf6', color: '#3949ab' }}>
                        {Number(producto.iva).toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => setProductoVariantes(producto)}
                        className="flex items-center gap-1 mx-auto px-3 py-1.5 rounded-lg text-xs font-bold border border-outline-variant/30 text-secondary hover:bg-surface-container hover:text-primary transition-colors">
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>category</span>
                        {producto.variantes?.length ?? 0}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
