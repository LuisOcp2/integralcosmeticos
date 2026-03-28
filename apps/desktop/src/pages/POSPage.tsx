import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Search, ScanBarcode, PauseCircle, Trash2, ShoppingCart, Plus, Minus,
  X, UserSearch, CreditCard, Printer, Banknote, CreditCard as CreditCardIcon,
  Landmark, Wallet, SearchX,
} from 'lucide-react';
import { ICliente, IProducto, IVariante, MetodoPago } from '@cosmeticos/shared-types';
import api from '../lib/api';
import { offlineDB } from '../lib/offline.db';
import { useAuthStore } from '../store/auth.store';
import { SplitPago, usePosStore } from '../store/pos.store';
import AppLayout from './components/AppLayout';

const cop = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});
const S = {
  primary: '#85264b',
  fuchsia: '#a43e63',
  brown: '#2a1709',
  secondary: '#735946',
  surface: '#f1edef',
  white: '#FFFFFF',
  border: '#dac0c5',
  error: '#B91C1C',
  errorBg: '#FEE2E2',
  success: '#2e7d32',
  successBg: '#e8f5e9',
  warning: '#e65100',
  warningBg: '#fff8e1',
  panel: '#fcf8fa',
  panelSoft: '#ebe7e9',
  ring: '#9f3a5f',
  backdrop: 'rgba(46, 27, 12, 0.5)',
  heroFrom: '#fcf8fa',
  heroVia: '#f6f2f4',
  heroTo: '#f1edef',
};

function inferCategoria(nombre: string): string {
  const n = nombre.toLowerCase();
  if (n.includes('labial') || n.includes('base') || n.includes('rubor') || n.includes('sombras')) return 'Maquillaje';
  if (n.includes('serum') || n.includes('crema') || n.includes('limpiador') || n.includes('skin')) return 'Skincare';
  if (n.includes('perfume') || n.includes('fragancia') || n.includes('colonia')) return 'Fragancias';
  if (n.includes('brocha') || n.includes('esponja') || n.includes('accesorio')) return 'Accesorios';
  return 'Todos';
}

async function buscarVariantes(q: string): Promise<(IVariante & { stockDisponible?: number })[]> {
  const { data } = await api.get('/catalogo/variantes', { params: { q } });
  return data;
}
async function getProducto(id: string): Promise<IProducto> {
  const { data } = await api.get(`/productos/${id}`);
  return data;
}
async function buscarClientePorDocumento(documento: string): Promise<ICliente> {
  const { data } = await api.get(`/clientes/documento/${documento}`);
  return data;
}

// ─── Modal Cobro ─────────────────────────────────────────────────────────────
function ModalCobro({
  total, usarSplit, splitPago, setSplitPago, metodoPago,
  setMetodoPago, setUsarSplit, onCobrar, onClose, loading,
}: {
  total: number; usarSplit: boolean; splitPago: SplitPago | null;
  setSplitPago: (s: SplitPago) => void; metodoPago: MetodoPago;
  setMetodoPago: (m: MetodoPago) => void; setUsarSplit: (b: boolean) => void;
  onCobrar: () => void; onClose: () => void; loading: boolean;
}) {
  const [recibido, setRecibido] = useState('');
  const cambio = Math.max(0, Number(recibido.replace(/[^0-9]/g, '')) - total);
  const splitTotal = usarSplit
    ? (splitPago?.efectivo ?? 0) + (splitPago?.tarjeta ?? 0) + (splitPago?.transferencia ?? 0)
    : 0;
  const splitOk = !usarSplit || Math.abs(splitTotal - total) < 0.01;

  const metodos: { key: MetodoPago; label: string; Icon: React.ElementType }[] = [
    { key: MetodoPago.EFECTIVO, label: 'Efectivo', Icon: Banknote },
    { key: MetodoPago.TARJETA_CREDITO, label: 'Tarjeta Crédito', Icon: CreditCardIcon },
    { key: MetodoPago.TARJETA_DEBITO, label: 'Tarjeta Débito', Icon: Landmark },
    { key: MetodoPago.TRANSFERENCIA, label: 'Transferencia', Icon: Wallet },
  ];
  const splitMetodos: Array<{ key: keyof SplitPago; label: string; Icon: React.ElementType }> = [
    { key: 'efectivo', label: 'Efectivo', Icon: Banknote },
    { key: 'tarjeta', label: 'Tarjeta', Icon: CreditCardIcon },
    { key: 'transferencia', label: 'Transferencia', Icon: Landmark },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4" style={{ backgroundColor: S.backdrop }}>
      <div className="max-h-[92dvh] w-full max-w-md overflow-hidden rounded-2xl shadow-2xl" style={{ backgroundColor: S.white }}>
        <div className="px-8 py-6 flex items-center justify-between" style={{ backgroundColor: S.brown }}>
          <div>
            <h2 className="text-xl font-black text-white">Confirmar Cobro</h2>
            <p className="text-sm" style={{ color: '#ffd4de' }}>Total a cobrar</p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-black text-white">{cop.format(total)}</p>
          </div>
        </div>

        <div className="max-h-[calc(92dvh-8rem)] space-y-6 overflow-y-auto p-5 sm:p-8">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold" style={{ color: S.secondary }}>Pago dividido</span>
            <button type="button" onClick={() => setUsarSplit(!usarSplit)}
              className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
              style={{ backgroundColor: usarSplit ? S.fuchsia : S.border }}
              aria-pressed={usarSplit} aria-label="Activar o desactivar pago dividido">
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${usarSplit ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {!usarSplit ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                {metodos.map((m) => (
                  <button type="button" key={m.key} onClick={() => setMetodoPago(m.key)}
                    className="min-h-11 rounded-xl px-2 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                    style={metodoPago === m.key
                      ? { backgroundColor: S.primary, color: S.white }
                      : { backgroundColor: S.surface, color: S.secondary, border: `1px solid ${S.border}` }}>
                    <m.Icon size={16} />
                    {m.label}
                  </button>
                ))}
              </div>
              {metodoPago === MetodoPago.EFECTIVO && (
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest" style={{ color: S.secondary }}>Monto Recibido</label>
                  <input className="w-full rounded-xl px-4 py-3 text-2xl font-black text-center outline-none border-2 transition-colors"
                    style={{ borderColor: S.fuchsia, color: S.brown }} placeholder="$ 0" value={recibido}
                    onChange={(e) => setRecibido(e.target.value)} autoFocus />
                  {Number(recibido.replace(/[^0-9]/g, '')) > 0 && (
                    <div className="flex justify-between px-1">
                      <span className="text-sm font-bold" style={{ color: S.secondary }}>Cambio</span>
                      <span className="text-xl font-black" style={{ color: S.primary }}>{cop.format(cambio)}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-4 gap-2 pt-1">
                    {[50000, 100000, 200000, 500000].map((v) => (
                      <button type="button" key={v} onClick={() => setRecibido(String(v))}
                        className="min-h-11 rounded-lg py-2 text-xs font-bold transition-all"
                        style={{ backgroundColor: S.surface, color: S.secondary }}>
                        ${(v / 1000).toFixed(0)}k
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              {splitMetodos.map((m) => (
                <div key={m.key} className="flex items-center gap-3">
                  <m.Icon size={16} style={{ color: S.secondary }} />
                  <span className="text-sm font-bold w-28" style={{ color: S.secondary }}>{m.label}</span>
                  <input type="number" min={0} placeholder="0" value={splitPago?.[m.key] || ''}
                    onChange={(e) => setSplitPago({ ...(splitPago ?? { efectivo: 0, tarjeta: 0, transferencia: 0 }), [m.key]: Number(e.target.value) })}
                    className="flex-1 rounded-xl px-3 py-2 text-sm font-bold text-right outline-none border-2 transition-colors"
                    style={{ borderColor: S.border, color: S.brown }} />
                </div>
              ))}
              <div className="flex justify-between pt-2 border-t" style={{ borderColor: S.border }}>
                <span className="text-sm font-bold" style={{ color: S.secondary }}>Suma</span>
                <span className="text-sm font-black" style={{ color: splitOk ? '#2d6a4f' : S.error }}>
                  {cop.format(splitTotal)} {splitOk ? '✓' : `(faltan ${cop.format(total - splitTotal)})`}
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="min-h-11 flex-1 rounded-xl py-3 font-bold text-sm border-2 transition-all"
              style={{ borderColor: S.border, color: S.secondary }}>Cancelar</button>
            <button type="button" onClick={onCobrar} disabled={loading || !splitOk}
              className="min-h-11 flex-1 rounded-xl py-3 font-black text-sm text-white uppercase tracking-widest transition-all disabled:opacity-50"
              style={{ backgroundColor: S.primary }}>
              {loading ? 'Procesando...' : 'COBRAR'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Variantes ─────────────────────────────────────────────────────────
function ModalVariantes({ variantes, onSeleccionar, onClose }: {
  variantes: (IVariante & { stockDisponible?: number })[];
  onSeleccionar: (v: IVariante & { stockDisponible?: number }) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4" style={{ backgroundColor: S.backdrop }}>
      <div className="max-h-[92dvh] w-full max-w-sm overflow-hidden rounded-2xl shadow-2xl" style={{ backgroundColor: S.white }}>
        <div className="px-6 py-5 flex items-center justify-between border-b" style={{ borderColor: S.border }}>
          <h3 className="text-lg font-black" style={{ color: S.brown }}>Seleccionar Variante</h3>
          <button type="button" onClick={onClose} aria-label="Cerrar selector de variantes">
            <X size={20} style={{ color: S.secondary }} />
          </button>
        </div>
        <div className="max-h-[calc(92dvh-5rem)] space-y-2 overflow-y-auto p-4">
          {variantes.map((v) => (
            <button type="button" key={v.id} onClick={() => onSeleccionar(v)}
              disabled={(v.stockDisponible ?? 1) === 0}
              className="min-h-11 w-full rounded-xl px-4 py-3 text-left transition-all disabled:opacity-40 flex items-center justify-between"
              style={{ backgroundColor: S.surface }}>
              <div>
                <p className="text-sm font-bold" style={{ color: S.brown }}>{v.nombre}</p>
                <p className="text-xs" style={{ color: S.secondary }}>{v.codigoBarras}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold" style={{ color: (v.stockDisponible ?? 1) < 5 ? S.error : S.primary }}>
                  {v.stockDisponible !== undefined ? `Existencias: ${v.stockDisponible}` : ''}
                </p>
                {(v.stockDisponible ?? 1) === 0 && (
                  <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{ backgroundColor: S.errorBg, color: S.error }}>Agotado</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Modal Ventas Suspendidas ─────────────────────────────────────────────────
function ModalSuspendidas({ ventas, onRetomar, onEliminar, onClose }: {
  ventas: ReturnType<typeof usePosStore.getState>['ventasSuspendidas'];
  onRetomar: (id: string) => void;
  onEliminar: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4" style={{ backgroundColor: S.backdrop }}>
      <div className="max-h-[92dvh] w-full max-w-md overflow-hidden rounded-2xl shadow-2xl" style={{ backgroundColor: S.white }}>
        <div className="px-6 py-5 flex items-center justify-between border-b" style={{ borderColor: S.border }}>
          <h3 className="text-lg font-black" style={{ color: S.brown }}>Ventas Suspendidas ({ventas.length})</h3>
          <button type="button" onClick={onClose} aria-label="Cerrar ventas suspendidas">
            <X size={20} style={{ color: S.secondary }} />
          </button>
        </div>
        <div className="max-h-[calc(92dvh-5rem)] space-y-3 overflow-y-auto p-4">
          {ventas.length === 0 && (
            <p className="text-center py-8 text-sm" style={{ color: S.secondary }}>No hay ventas suspendidas</p>
          )}
          {ventas.map((v) => (
            <div key={v.id} className="rounded-xl p-4 border" style={{ borderColor: S.border }}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-sm font-bold" style={{ color: S.brown }}>{v.clienteNombre ?? 'Sin cliente'}</p>
                  <p className="text-xs" style={{ color: S.secondary }}>{v.items.length} producto(s) • Suspendida: {v.suspendidaEn}</p>
                </div>
                <button type="button" onClick={() => onEliminar(v.id)} aria-label="Eliminar venta suspendida">
                  <Trash2 size={16} style={{ color: S.error }} />
                </button>
              </div>
              <div className="flex gap-2 mt-3">
                <button type="button" onClick={() => { onRetomar(v.id); onClose(); }}
                  className="min-h-11 flex-1 rounded-xl py-2 text-xs font-black uppercase text-white transition-all"
                  style={{ backgroundColor: S.primary }}>Retomar</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── POSPage Principal ────────────────────────────────────────────────────────
export default function POSPage() {
  const usuario = useAuthStore((state) => state.usuario);
  const {
    items, clienteId, metodoPago, splitPago, usarSplit, observaciones,
    descuentoGlobal, tipoDescuentoGlobal, ventasSuspendidas,
    agregarItem, quitarItem, actualizarCantidad, aplicarDescuentoItem,
    setCliente, setMetodoPago, setUsarSplit, setSplitPago, setObservaciones,
    setDescuentoGlobal, limpiarCarrito, suspenderVenta, retomarVenta,
    eliminarSuspendida, calcularTotales,
  } = usePosStore();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [docCliente, setDocCliente] = useState('');
  const [clienteEncontrado, setClienteEncontrado] = useState<ICliente | null>(null);
  const [ultimaVentaId, setUltimaVentaId] = useState<string | null>(null);
  const [showModalCobro, setShowModalCobro] = useState(false);
  const [showModalVariantes, setShowModalVariantes] = useState(false);
  const [variantesModal, setVariantesModal] = useState<(IVariante & { stockDisponible?: number })[]>([]);
  const [showSuspendidas, setShowSuspendidas] = useState(false);
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const variantesQuery = useQuery({
    queryKey: ['variantes', 'pos', debouncedSearch],
    queryFn: () => buscarVariantes(debouncedSearch),
    enabled: debouncedSearch.length > 1,
  });

  const buscarClienteMutation = useMutation({
    mutationFn: buscarClientePorDocumento,
    onSuccess: (cliente) => {
      setClienteEncontrado(cliente);
      setCliente(cliente.id, `${cliente.nombre} ${cliente.apellido}`);
    },
    onError: () => { setClienteEncontrado(null); setCliente(null); },
  });

  const crearVentaMutation = useMutation({
    mutationFn: async () => {
      const totales = calcularTotales();
      const payload = {
        sedeId: usuario?.sedeId, clienteId,
        metodoPago: usarSplit ? MetodoPago.COMBINADO : metodoPago,
        splitPago: usarSplit ? { efectivo: splitPago?.efectivo ?? 0, tarjeta: splitPago?.tarjeta ?? 0, transferencia: splitPago?.transferencia ?? 0 } : null,
        observaciones, descuento: totales.descuento,
        items: items.map((item) => ({ varianteId: item.varianteId, cantidad: item.cantidad, descuentoItem: (item.precioUnitario * item.cantidad * item.descuentoItem) / 100 })),
      };
      const { data } = await api.post('/ventas', payload);
      return data;
    },
    onSuccess: (venta) => { setUltimaVentaId(venta.id); limpiarCarrito(); setShowModalCobro(false); },
    onError: async () => {
      const totales = calcularTotales();
      const payload = {
        sedeId: usuario?.sedeId, clienteId,
        metodoPago: usarSplit ? MetodoPago.COMBINADO : metodoPago,
        observaciones, descuento: totales.descuento,
        items: items.map((i) => ({ varianteId: i.varianteId, cantidad: i.cantidad, descuentoItem: 0 })),
      };
      await offlineDB.ventasPendientes.add({ payload, intentos: 0, creadoEn: new Date().toISOString() });
      limpiarCarrito(); setShowModalCobro(false);
    },
  });

  const totales = useMemo(() => calcularTotales(), [items, descuentoGlobal, tipoDescuentoGlobal]);

  const handleAgregarVariante = async (variante: IVariante & { stockDisponible?: number }) => {
    const producto = await getProducto(variante.productoId);
    const precio = Number(producto.precioBase) + Number(variante.precioExtra);
    agregarItem({ varianteId: variante.id, nombre: variante.nombre, codigoBarras: variante.codigoBarras, precioUnitario: precio, stockDisponible: variante.stockDisponible }, 1);
    setShowModalVariantes(false); setSearch('');
  };

  const handleClickProducto = (variantes: (IVariante & { stockDisponible?: number })[]) => {
    if (variantes.length === 1) void handleAgregarVariante(variantes[0]);
    else { setVariantesModal(variantes); setShowModalVariantes(true); }
  };

  const imprimirTicket = async () => {
    if (!ultimaVentaId) return;
    const { data } = await api.get(`/ventas/${ultimaVentaId}/ticket`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
    window.open(url, '_blank');
  };

  const productoCards = useMemo(() => {
    const map = new Map<string, { nombre: string; categoria: string; variantes: (IVariante & { stockDisponible?: number })[] }>();
    for (const v of variantesQuery.data ?? []) {
      if (!map.has(v.productoId)) map.set(v.productoId, { nombre: v.nombre.split(' - ')[0], categoria: '', variantes: [] });
      map.get(v.productoId)!.variantes.push(v);
    }
    return [...map.values()]
      .map((p) => ({ ...p, categoria: p.categoria || inferCategoria(p.nombre) }))
      .filter((p) => categoriaActiva === 'Todos' || p.categoria === categoriaActiva);
  }, [variantesQuery.data, categoriaActiva]);

  const categorias = useMemo(() => {
    const source = variantesQuery.data ?? [];
    if (source.length === 0) return ['Todos'];
    const set = new Set<string>(['Todos']);
    source.forEach((v) => set.add(inferCategoria(v.nombre)));
    return [...set];
  }, [variantesQuery.data]);

  return (
    <AppLayout>
      {showModalCobro && (
        <ModalCobro total={totales.total} usarSplit={usarSplit} splitPago={splitPago}
          setSplitPago={setSplitPago} metodoPago={metodoPago} setMetodoPago={setMetodoPago}
          setUsarSplit={setUsarSplit} onCobrar={() => crearVentaMutation.mutate()}
          onClose={() => setShowModalCobro(false)} loading={crearVentaMutation.isPending} />
      )}
      {showModalVariantes && (
        <ModalVariantes variantes={variantesModal} onSeleccionar={(v) => void handleAgregarVariante(v)} onClose={() => setShowModalVariantes(false)} />
      )}
      {showSuspendidas && (
        <ModalSuspendidas ventas={ventasSuspendidas} onRetomar={retomarVenta} onEliminar={eliminarSuspendida} onClose={() => setShowSuspendidas(false)} />
      )}

      <div className="-m-4 flex min-h-[calc(100dvh-64px-32px)] flex-col gap-4 overflow-hidden p-4 md:-m-6 md:p-6 lg:-m-8 lg:p-8 xl:flex-row">
        {/* ── LEFT: Catálogo ─────────────────────────────────────── */}
        <div className="flex min-h-[58dvh] flex-1 flex-col overflow-hidden rounded-2xl border p-4 shadow-sm md:p-6"
          style={{ backgroundColor: S.panel, borderColor: S.border }}>
          {/* Header */}
          <div className="mb-4 rounded-2xl border p-3 md:mb-6 md:p-4"
            style={{ borderColor: S.border, background: `linear-gradient(135deg, ${S.heroFrom} 0%, ${S.heroVia} 52%, ${S.heroTo} 100%)` }}>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em]" style={{ color: S.secondary }}>Ventas POS</p>
            <p className="mt-1 text-sm font-semibold" style={{ color: S.brown }}>Escanea o busca por nombre y agrega al carrito</p>
          </div>

          {/* Search */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: S.secondary }} />
              <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar producto o código de barras..."
                className="h-14 w-full rounded-xl border py-3.5 pl-11 pr-12 text-sm font-semibold outline-none transition-colors focus-visible:ring-2"
                style={{ backgroundColor: S.white, borderColor: search ? S.fuchsia : S.border, color: S.brown }} />
              <ScanBarcode size={20} className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: S.secondary, opacity: 0.6 }} />
            </div>
            <button type="button" onClick={() => setShowSuspendidas(true)}
              className="relative min-h-11 rounded-xl border-2 px-4 text-sm font-bold transition-all flex items-center gap-2"
              style={{ backgroundColor: ventasSuspendidas.length > 0 ? S.warningBg : S.white, color: S.secondary, borderColor: S.border }}
              aria-label="Ver ventas suspendidas">
              <PauseCircle size={20} />
              {ventasSuspendidas.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[10px] font-black text-white flex items-center justify-center"
                  style={{ backgroundColor: S.fuchsia }}>{ventasSuspendidas.length}</span>
              )}
            </button>
          </div>

          {/* Categorías */}
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {categorias.map((cat) => {
              const activa = categoriaActiva === cat;
              return (
                <button key={cat} type="button" onClick={() => setCategoriaActiva(cat)}
                  className="whitespace-nowrap rounded-full px-5 py-2 text-sm font-bold transition-colors"
                  style={activa ? { backgroundColor: '#fdd9c1', color: '#5a4230' } : { backgroundColor: '#e5e1e3', color: '#554246' }}>
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Product grid */}
          <div className="grid flex-1 grid-cols-1 gap-6 overflow-y-auto pr-1 sm:grid-cols-2 2xl:grid-cols-3"
            style={{ scrollbarWidth: 'thin', scrollbarColor: `${S.border} transparent` }}>
            {search.length > 1 && variantesQuery.isLoading &&
              [...Array(6)].map((_, i) => <div key={i} className="rounded-xl h-64 animate-pulse" style={{ backgroundColor: '#ebe7e9' }} />)}
            {productoCards.map((prod, i) => {
              const totalStock = prod.variantes.reduce((a, v) => a + (v.stockDisponible ?? 0), 0);
              const agotado = prod.variantes.every((v) => (v.stockDisponible ?? 1) === 0);
              const bajStock = !agotado && totalStock < 5;
              return (
                <div key={i} onClick={() => !agotado && handleClickProducto(prod.variantes)}
                  className="group flex cursor-pointer flex-col gap-3"
                  style={{ opacity: agotado ? 0.5 : 1, cursor: agotado ? 'not-allowed' : 'pointer' }}>
                  <div className="relative aspect-square overflow-hidden rounded-xl" style={{ backgroundColor: S.surface }}>
                    <div className="h-full w-full transition-transform duration-500 group-hover:scale-105"
                      style={{ background: 'radial-gradient(circle at 30% 20%, rgba(159,58,95,0.35), transparent 42%), radial-gradient(circle at 70% 80%, rgba(133,38,75,0.22), transparent 48%), linear-gradient(135deg, #fff 0%, #f6f2f4 100%)' }} />
                    <div className="absolute inset-x-3 top-3 flex items-center justify-between">
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: '#ffffffcc', color: S.secondary }}>{prod.categoria || 'Producto'}</span>
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-black"
                        style={agotado ? { backgroundColor: S.errorBg, color: S.error } : bajStock ? { backgroundColor: S.warningBg, color: S.warning } : { backgroundColor: S.successBg, color: S.success }}>
                        {agotado ? 'Agotado' : `${totalStock} uds`}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-base leading-snug" style={{ color: S.brown }}>{prod.nombre}</h3>
                    {prod.variantes.length > 1 && <p className="text-xs mt-0.5 uppercase tracking-wide" style={{ color: S.secondary }}>{prod.variantes.length} variantes disponibles</p>}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold" style={{ color: '#1c1b1d' }}>desde {cop.format(Math.min(...prod.variantes.map((v) => v.precioExtra || 0)))}</span>
                    <button type="button" className="flex size-10 items-center justify-center rounded-full text-white transition-all active:scale-90"
                      style={{ backgroundColor: agotado ? S.border : S.primary }} disabled={agotado}>
                      <Plus size={20} />
                    </button>
                  </div>
                </div>
              );
            })}
            {search.length > 1 && !variantesQuery.isLoading && productoCards.length === 0 && (
              <div className="col-span-3 flex flex-col items-center justify-center py-16 gap-3">
                <SearchX size={48} style={{ color: S.border }} />
                <p className="text-sm font-bold" style={{ color: S.secondary }}>Sin resultados para "{search}"</p>
              </div>
            )}
            {search.length <= 1 && (
              <div className="col-span-3 flex flex-col items-center justify-center py-16 gap-3">
                <ScanBarcode size={48} style={{ color: S.border }} />
                <p className="text-sm font-bold" style={{ color: S.secondary }}>Escribe para buscar productos</p>
              </div>
            )}
          </div>

          {/* Cliente */}
          <div className="mt-6 flex flex-col gap-3 border-t pt-5 lg:flex-row lg:items-end" style={{ borderColor: S.border }}>
            <div className="flex-1">
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: S.secondary }}>Cliente por documento</label>
              <div className="flex gap-2">
                <input value={docCliente} onChange={(e) => setDocCliente(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && buscarClienteMutation.mutate(docCliente)}
                  placeholder="C.C. o NIT..." className="h-12 flex-1 rounded-lg border-none px-4 text-sm outline-none"
                  style={{ backgroundColor: S.surface, color: S.brown }} />
                <button type="button" onClick={() => buscarClienteMutation.mutate(docCliente)}
                  className="min-h-11 rounded-lg px-4 py-3 text-sm font-bold transition-all flex items-center justify-center"
                  style={{ backgroundColor: S.primary, color: S.white }} aria-label="Buscar cliente por documento">
                  <UserSearch size={18} />
                </button>
              </div>
            </div>
            {clienteEncontrado && (
              <div className="flex items-center gap-3 rounded-full px-3 py-1.5 text-xs font-bold"
                style={{ borderColor: S.border, backgroundColor: '#ffdcc4', color: '#2a1709' }}>
                <div className="flex h-7 w-7 items-center justify-center rounded-full text-white text-[10px] font-black" style={{ backgroundColor: S.primary }}>
                  {clienteEncontrado.nombre[0]}{clienteEncontrado.apellido[0]}
                </div>
                <div>
                  <p className="text-xs font-bold" style={{ color: '#2a1709' }}>{clienteEncontrado.nombre} {clienteEncontrado.apellido}</p>
                  <p className="text-[10px]" style={{ color: '#5a4230' }}>{clienteEncontrado.documento}</p>
                </div>
                <button type="button" onClick={() => { setClienteEncontrado(null); setCliente(null); }}>
                  <X size={16} style={{ color: '#5a4230' }} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Carrito ─────────────────────────────────────── */}
        <div className="flex w-full flex-col rounded-2xl border p-4 shadow-sm md:p-6 xl:w-[40%]"
          style={{ backgroundColor: S.panelSoft, borderColor: S.border }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-black" style={{ color: S.brown }}>Carrito de Venta</h2>
            <div className="flex gap-2">
              {items.length > 0 && (
                <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: '#a43e63', color: '#ffd4de' }}>{items.length} item(s)</span>
              )}
              <button type="button" onClick={suspenderVenta} title="Suspender venta"
                className="min-h-11 min-w-11 rounded-xl p-2 transition-all flex items-center justify-center"
                style={{ backgroundColor: S.white, color: S.secondary }}>
                <PauseCircle size={20} />
              </button>
              <button type="button" onClick={limpiarCarrito} title="Vaciar carrito"
                className="min-h-11 min-w-11 rounded-xl p-2 transition-all flex items-center justify-center"
                style={{ backgroundColor: S.white, color: S.error }}>
                <Trash2 size={20} />
              </button>
            </div>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: `${S.border} transparent` }}>
            {items.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 gap-2">
                <ShoppingCart size={40} style={{ color: S.border }} />
                <p className="text-xs font-bold" style={{ color: S.secondary }}>Carrito vacío</p>
              </div>
            )}
            {items.map((item) => {
              const lineTotal = item.precioUnitario * item.cantidad * (1 - item.descuentoItem / 100);
              return (
                <div key={item.varianteId} className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-bold leading-tight" style={{ color: S.brown }}>{item.nombre}</p>
                      <p className="text-[10px] uppercase tracking-tight" style={{ color: S.secondary }}>{item.codigoBarras || 'Sin codigo'}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-black" style={{ color: S.primary }}>{cop.format(lineTotal)}</span>
                      <button type="button" onClick={() => quitarItem(item.varianteId)} aria-label="Quitar producto del carrito"
                        className="text-[#877176] transition-colors hover:text-[#ba1a1a]">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center rounded-lg border px-1 py-1" style={{ backgroundColor: S.white, borderColor: S.border }}>
                      <button type="button" onClick={() => actualizarCantidad(item.varianteId, item.cantidad - 1)}
                        className="flex h-6 w-6 items-center justify-center rounded transition-colors" style={{ color: S.primary }}>
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center text-sm font-black" style={{ color: S.brown }}>{item.cantidad}</span>
                      <button type="button" onClick={() => actualizarCantidad(item.varianteId, item.cantidad + 1)}
                        className="flex h-6 w-6 items-center justify-center rounded transition-colors" style={{ color: S.primary }}>
                        <Plus size={14} />
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold uppercase" style={{ color: '#877176' }}>DTO</span>
                      <div className="relative">
                        <input type="number" min={0} max={100} value={item.descuentoItem || ''}
                          onChange={(e) => aplicarDescuentoItem(item.varianteId, Number(e.target.value))}
                          placeholder="0" className="h-6 w-12 rounded-md border px-2 text-center text-[10px] font-bold outline-none"
                          style={{ borderColor: S.border, color: S.primary, backgroundColor: S.white }} />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold" style={{ color: S.secondary }}>%</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Descuento global */}
          {items.length > 0 && (
            <div className="mt-4 rounded-xl border p-3" style={{ backgroundColor: S.white, borderColor: S.border }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: S.secondary }}>Descuento Global</p>
              <div className="flex gap-2">
                <select value={tipoDescuentoGlobal}
                  onChange={(e) => setDescuentoGlobal(descuentoGlobal, e.target.value as 'porcentaje' | 'monto')}
                  className="rounded-lg border px-2 py-1.5 text-xs font-bold outline-none"
                  style={{ borderColor: S.border, color: S.brown, backgroundColor: S.white }}>
                  <option value="porcentaje">%</option>
                  <option value="monto">$</option>
                </select>
                <input type="number" min={0} value={descuentoGlobal || ''}
                  onChange={(e) => setDescuentoGlobal(Number(e.target.value), tipoDescuentoGlobal)}
                  placeholder={tipoDescuentoGlobal === 'porcentaje' ? '0%' : '$0'}
                  className="flex-1 rounded-lg border px-3 py-1.5 text-center text-sm font-bold outline-none"
                  style={{ borderColor: S.border, color: S.primary, backgroundColor: S.white }} />
                {descuentoGlobal > 0 && (
                  <button type="button" onClick={() => setDescuentoGlobal(0, tipoDescuentoGlobal)}>
                    <X size={16} style={{ color: S.secondary }} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Resumen totales */}
          {items.length > 0 && (
            <div className="mb-6 mt-3 space-y-3 px-1">
              <div className="flex justify-between text-xs" style={{ color: S.secondary }}>
                <span>Subtotal</span><span>{cop.format(totales.subtotal)}</span>
              </div>
              {totales.descuentoItems > 0 && (
                <div className="flex justify-between text-xs" style={{ color: S.primary }}>
                  <span>Dto. ítems</span><span>-{cop.format(totales.descuentoItems)}</span>
                </div>
              )}
              {totales.descuentoGlobalMonto > 0 && (
                <div className="flex justify-between text-xs" style={{ color: S.primary }}>
                  <span>Dto. global</span><span>-{cop.format(totales.descuentoGlobalMonto)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs" style={{ color: S.secondary }}>
                <span>IVA 19%</span><span>{cop.format(totales.impuesto)}</span>
              </div>
              <div className="flex items-end justify-between border-t pt-4" style={{ borderColor: S.border }}>
                <span className="text-sm font-black uppercase" style={{ color: S.brown }}>Total</span>
                <span className="text-4xl font-black" style={{ color: S.primary }}>{cop.format(totales.total)}</span>
              </div>
            </div>
          )}

          <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Nota interna (opcional)" rows={2}
            className="mt-3 w-full resize-none rounded-xl border px-3 py-2 text-xs outline-none"
            style={{ borderColor: S.border, backgroundColor: S.white, color: S.brown }} />

          {/* Acciones */}
          <div className="mt-3 space-y-2">
            <button type="button" onClick={() => items.length > 0 && setShowModalCobro(true)}
              disabled={!items.length || !usuario?.sedeId}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl py-5 text-lg font-black uppercase tracking-widest text-white shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
              style={{ backgroundColor: S.brown }}>
              <CreditCard size={20} />
              COBRAR
            </button>
            <button type="button" onClick={() => void imprimirTicket()} disabled={!ultimaVentaId}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border-2 py-3 text-sm font-bold uppercase tracking-wide transition-all disabled:opacity-50"
              style={{ borderColor: S.primary, color: S.primary, backgroundColor: 'transparent' }}>
              <Printer size={16} />
              Imprimir Ticket
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
