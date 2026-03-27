import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ICliente, IProducto, IVariante, MetodoPago } from '@cosmeticos/shared-types';
import api from '../lib/api';
import { offlineDB } from '../lib/offline.db';
import { useAuthStore } from '../store/auth.store';
import { usePosStore } from '../store/pos.store';
import AppLayout from './components/AppLayout';

const cop = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const S = { primary: '#85264b', fuchsia: '#A43E63', brown: '#2E1B0C', secondary: '#735946', surface: '#f6f2f4', white: '#ffffff', border: '#dac0c5', pink: '#FBA9E5', error: '#ba1a1a', errorBg: '#ffdad6' };

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

// ─── Modal Cobro ────────────────────────────────────────────────────────────
function ModalCobro({
  total, usarSplit, splitPago, setSplitPago, metodoPago, setMetodoPago, setUsarSplit,
  onCobrar, onClose, loading,
}: {
  total: number; usarSplit: boolean; splitPago: ReturnType<typeof usePosStore.getState>['splitPago'];
  setSplitPago: (s: NonNullable<typeof splitPago>) => void;
  metodoPago: MetodoPago; setMetodoPago: (m: MetodoPago) => void;
  setUsarSplit: (b: boolean) => void; onCobrar: () => void; onClose: () => void; loading: boolean;
}) {
  const [recibido, setRecibido] = useState('');
  const cambio = Math.max(0, Number(recibido.replace(/[^0-9]/g, '')) - total);
  const splitTotal = usarSplit ? (splitPago?.efectivo ?? 0) + (splitPago?.tarjeta ?? 0) + (splitPago?.transferencia ?? 0) : 0;
  const splitOk = !usarSplit || Math.abs(splitTotal - total) < 1;

  const metodos: { key: MetodoPago; label: string; icon: string }[] = [
    { key: MetodoPago.EFECTIVO,       label: 'Efectivo',         icon: 'payments' },
    { key: MetodoPago.TARJETA_CREDITO,label: 'Tarjeta Crédito',  icon: 'credit_card' },
    { key: MetodoPago.TARJETA_DEBITO, label: 'Tarjeta Débito',   icon: 'account_balance' },
    { key: MetodoPago.TRANSFERENCIA,  label: 'Transferencia',    icon: 'account_balance_wallet' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(46,27,12,0.5)' }}>
      <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" style={{ backgroundColor: S.white }}>
        {/* Header */}
        <div className="px-8 py-6 flex items-center justify-between" style={{ backgroundColor: S.brown }}>
          <div>
            <h2 className="text-xl font-black text-white">Confirmar Cobro</h2>
            <p className="text-sm" style={{ color: '#FBA9E5' }}>Total a cobrar</p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-black text-white">{cop.format(total)}</p>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {/* Toggle split */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold" style={{ color: S.secondary }}>Pago dividido</span>
            <button
              onClick={() => setUsarSplit(!usarSplit)}
              className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
              style={{ backgroundColor: usarSplit ? S.fuchsia : S.border }}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${usarSplit ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {!usarSplit ? (
            <>
              {/* Método único */}
              <div className="grid grid-cols-2 gap-2">
                {metodos.map((m) => (
                  <button key={m.key} onClick={() => setMetodoPago(m.key)}
                    className="py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                    style={metodoPago === m.key
                      ? { backgroundColor: S.fuchsia, color: S.white }
                      : { backgroundColor: S.surface, color: S.secondary, border: `1px solid ${S.border}` }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{m.icon}</span>
                    {m.label}
                  </button>
                ))}
              </div>
              {/* Campo efectivo */}
              {metodoPago === MetodoPago.EFECTIVO && (
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest" style={{ color: S.secondary }}>Monto Recibido</label>
                  <input
                    className="w-full rounded-xl px-4 py-3 text-2xl font-black text-center outline-none border-2 transition-colors"
                    style={{ borderColor: S.fuchsia, color: S.brown }}
                    placeholder="$ 0"
                    value={recibido}
                    onChange={(e) => setRecibido(e.target.value)}
                    autoFocus
                  />
                  {Number(recibido.replace(/[^0-9]/g, '')) > 0 && (
                    <div className="flex justify-between px-1">
                      <span className="text-sm font-bold" style={{ color: S.secondary }}>Cambio</span>
                      <span className="text-xl font-black" style={{ color: S.primary }}>{cop.format(cambio)}</span>
                    </div>
                  )}
                  {/* Atajos rápidos */}
                  <div className="grid grid-cols-4 gap-2 pt-1">
                    {[50000, 100000, 200000, 500000].map((v) => (
                      <button key={v} onClick={() => setRecibido(String(v))}
                        className="py-2 rounded-lg text-xs font-bold transition-all"
                        style={{ backgroundColor: S.surface, color: S.secondary }}>
                        ${(v / 1000).toFixed(0)}k
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Split pago */
            <div className="space-y-3">
              {[
                { key: 'efectivo', label: 'Efectivo', icon: 'payments' },
                { key: 'tarjeta', label: 'Tarjeta', icon: 'credit_card' },
                { key: 'transferencia', label: 'Transferencia', icon: 'account_balance_wallet' },
              ].map((m) => (
                <div key={m.key} className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-sm" style={{ color: S.secondary }}>{m.icon}</span>
                  <span className="text-sm font-bold w-28" style={{ color: S.secondary }}>{m.label}</span>
                  <input
                    type="number" min={0} placeholder="0"
                    value={(splitPago as Record<string, number>)?.[m.key] || ''}
                    onChange={(e) => setSplitPago({ ...(splitPago ?? { efectivo: 0, tarjeta: 0, transferencia: 0 }), [m.key]: Number(e.target.value) })}
                    className="flex-1 rounded-xl px-3 py-2 text-sm font-bold text-right outline-none border-2 transition-colors"
                    style={{ borderColor: S.border, color: S.brown }}
                  />
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

          {/* Acciones */}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl font-bold text-sm border-2 transition-all"
              style={{ borderColor: S.border, color: S.secondary }}>Cancelar</button>
            <button onClick={onCobrar} disabled={loading || !splitOk}
              className="flex-1 py-3 rounded-xl font-black text-sm text-white uppercase tracking-widest transition-all disabled:opacity-50"
              style={{ backgroundColor: S.brown }}>
              {loading ? 'Procesando...' : 'COBRAR'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Variantes ────────────────────────────────────────────────────────
function ModalVariantes({
  variantes, onSeleccionar, onClose,
}: {
  variantes: (IVariante & { stockDisponible?: number })[]; onSeleccionar: (v: IVariante & { stockDisponible?: number }) => void; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(46,27,12,0.5)' }}>
      <div className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden" style={{ backgroundColor: S.white }}>
        <div className="px-6 py-5 flex items-center justify-between border-b" style={{ borderColor: S.border }}>
          <h3 className="text-lg font-black" style={{ color: S.brown }}>Seleccionar Variante</h3>
          <button onClick={onClose}><span className="material-symbols-outlined" style={{ color: S.secondary }}>close</span></button>
        </div>
        <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
          {variantes.map((v) => (
            <button key={v.id} onClick={() => onSeleccionar(v)}
              disabled={(v.stockDisponible ?? 1) === 0}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all disabled:opacity-40"
              style={{ backgroundColor: S.surface }}
            >
              <div>
                <p className="text-sm font-bold" style={{ color: S.brown }}>{v.nombre}</p>
                <p className="text-xs" style={{ color: S.secondary }}>{v.codigoBarras}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold" style={{ color: (v.stockDisponible ?? 1) < 5 ? S.error : S.primary }}>
                  {v.stockDisponible !== undefined ? `Stock: ${v.stockDisponible}` : ''}
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

// ─── Modal Ventas Suspendidas ────────────────────────────────────────────────
function ModalSuspendidas({
  ventas, onRetomar, onEliminar, onClose,
}: {
  ventas: ReturnType<typeof usePosStore.getState>['ventasSuspendidas'];
  onRetomar: (id: string) => void; onEliminar: (id: string) => void; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(46,27,12,0.5)' }}>
      <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" style={{ backgroundColor: S.white }}>
        <div className="px-6 py-5 flex items-center justify-between border-b" style={{ borderColor: S.border }}>
          <h3 className="text-lg font-black" style={{ color: S.brown }}>Ventas Suspendidas ({ventas.length})</h3>
          <button onClick={onClose}><span className="material-symbols-outlined" style={{ color: S.secondary }}>close</span></button>
        </div>
        <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
          {ventas.length === 0 && (
            <p className="text-center py-8 text-sm" style={{ color: S.secondary }}>No hay ventas suspendidas</p>
          )}
          {ventas.map((v) => (
            <div key={v.id} className="rounded-xl p-4 border" style={{ borderColor: S.border }}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-sm font-bold" style={{ color: S.brown }}>
                    {v.clienteNombre ?? 'Sin cliente'}
                  </p>
                  <p className="text-xs" style={{ color: S.secondary }}>
                    {v.items.length} producto(s) • Suspendida: {v.suspendidaEn}
                  </p>
                </div>
                <button onClick={() => onEliminar(v.id)}>
                  <span className="material-symbols-outlined text-sm" style={{ color: S.error }}>delete</span>
                </button>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => { onRetomar(v.id); onClose(); }}
                  className="flex-1 py-2 rounded-xl text-xs font-black uppercase text-white transition-all"
                  style={{ backgroundColor: S.fuchsia }}>
                  Retomar
                </button>
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
    items, clienteId, clienteNombre, metodoPago, splitPago, usarSplit,
    observaciones, descuentoGlobal, tipoDescuentoGlobal, ventasSuspendidas,
    agregarItem, quitarItem, actualizarCantidad, aplicarDescuentoItem,
    setCliente, setMetodoPago, setUsarSplit, setSplitPago,
    setObservaciones, setDescuentoGlobal, limpiarCarrito,
    suspenderVenta, retomarVenta, eliminarSuspendida, calcularTotales,
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
        sedeId: usuario?.sedeId,
        clienteId,
        metodoPago: usarSplit ? MetodoPago.MIXTO : metodoPago,
        splitPago: usarSplit ? splitPago : null,
        observaciones,
        descuento: totales.descuento,
        items: items.map((item) => ({
          varianteId: item.varianteId,
          cantidad: item.cantidad,
          descuentoItem: (item.precioUnitario * item.cantidad * item.descuentoItem) / 100,
        })),
      };
      const { data } = await api.post('/ventas', payload);
      return data;
    },
    onSuccess: (venta) => {
      setUltimaVentaId(venta.id);
      limpiarCarrito();
      setShowModalCobro(false);
    },
    onError: async () => {
      const totales = calcularTotales();
      const payload = {
        sedeId: usuario?.sedeId, clienteId,
        metodoPago: usarSplit ? MetodoPago.MIXTO : metodoPago,
        observaciones, descuento: totales.descuento,
        items: items.map((i) => ({ varianteId: i.varianteId, cantidad: i.cantidad, descuentoItem: 0 })),
      };
      await offlineDB.ventasPendientes.add({ payload, intentos: 0, creadoEn: new Date().toISOString() });
      limpiarCarrito();
      setShowModalCobro(false);
    },
  });

  const totales = useMemo(() => calcularTotales(), [items, descuentoGlobal, tipoDescuentoGlobal]);

  const handleAgregarVariante = async (variante: IVariante & { stockDisponible?: number }) => {
    const producto = await getProducto(variante.productoId);
    const precio = Number(producto.precioBase) + Number(variante.precioExtra);
    agregarItem({ varianteId: variante.id, nombre: variante.nombre, codigoBarras: variante.codigoBarras, precioUnitario: precio, stockDisponible: variante.stockDisponible }, 1);
    setShowModalVariantes(false);
    setSearch('');
  };

  const handleClickProducto = (variantes: (IVariante & { stockDisponible?: number })[]) => {
    if (variantes.length === 1) { void handleAgregarVariante(variantes[0]); }
    else { setVariantesModal(variantes); setShowModalVariantes(true); }
  };

  const imprimirTicket = async () => {
    if (!ultimaVentaId) return;
    const { data } = await api.get(`/ventas/${ultimaVentaId}/ticket`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
    window.open(url, '_blank');
  };

  // Agrupar variantes por productoId para mostrar una card por producto
  const productoCards = useMemo(() => {
    const map = new Map<string, { nombre: string; categoria: string; variantes: (IVariante & { stockDisponible?: number })[] }>();
    for (const v of variantesQuery.data ?? []) {
      if (!map.has(v.productoId)) map.set(v.productoId, { nombre: v.nombre.split(' - ')[0], categoria: '', variantes: [] });
      map.get(v.productoId)!.variantes.push(v);
    }
    return [...map.values()];
  }, [variantesQuery.data]);

  return (
    <AppLayout>
      {showModalCobro && (
        <ModalCobro
          total={totales.total} usarSplit={usarSplit} splitPago={splitPago}
          setSplitPago={setSplitPago} metodoPago={metodoPago} setMetodoPago={setMetodoPago}
          setUsarSplit={setUsarSplit} onCobrar={() => crearVentaMutation.mutate()}
          onClose={() => setShowModalCobro(false)} loading={crearVentaMutation.isPending}
        />
      )}
      {showModalVariantes && (
        <ModalVariantes variantes={variantesModal}
          onSeleccionar={(v) => void handleAgregarVariante(v)}
          onClose={() => setShowModalVariantes(false)}
        />
      )}
      {showSuspendidas && (
        <ModalSuspendidas ventas={ventasSuspendidas}
          onRetomar={retomarVenta} onEliminar={eliminarSuspendida}
          onClose={() => setShowSuspendidas(false)}
        />
      )}

      <div className="flex h-[calc(100vh-64px-64px)] gap-0 -m-8 overflow-hidden">
        {/* ── LEFT: Catálogo ───────────────────────── */}
        <div className="flex flex-col flex-1 p-8 overflow-hidden" style={{ backgroundColor: S.surface }}>
          {/* Search */}
          <div className="flex gap-3 mb-6">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined" style={{ color: S.secondary, fontSize: 20 }}>search</span>
              <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar producto o código de barras..."
                className="w-full rounded-xl py-3.5 pl-11 pr-4 text-sm font-medium outline-none border-2 transition-colors"
                style={{ backgroundColor: S.white, borderColor: search ? S.fuchsia : S.border, color: S.brown }}
              />
            </div>
            {/* Suspendidas badge */}
            <button onClick={() => setShowSuspendidas(true)}
              className="relative px-4 rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
              style={{ backgroundColor: ventasSuspendidas.length > 0 ? '#fff8e1' : S.white, color: S.secondary, border: `2px solid ${S.border}` }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>pause_circle</span>
              {ventasSuspendidas.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[10px] font-black text-white flex items-center justify-center"
                  style={{ backgroundColor: S.fuchsia }}>{ventasSuspendidas.length}</span>
              )}
            </button>
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto grid grid-cols-2 xl:grid-cols-3 gap-4 pr-1"
            style={{ scrollbarWidth: 'thin', scrollbarColor: `${S.border} transparent` }}>
            {search.length > 1 && variantesQuery.isLoading && (
              [...Array(6)].map((_, i) => (
                <div key={i} className="rounded-xl h-64 animate-pulse" style={{ backgroundColor: '#ebe7e9' }} />
              ))
            )}
            {productoCards.map((prod, i) => {
              const totalStock = prod.variantes.reduce((a, v) => a + (v.stockDisponible ?? 0), 0);
              const agotado = prod.variantes.every((v) => (v.stockDisponible ?? 1) === 0);
              const bajStock = !agotado && totalStock < 5;
              return (
                <div key={i}
                  onClick={() => !agotado && handleClickProducto(prod.variantes)}
                  className="rounded-xl p-4 flex flex-col gap-3 cursor-pointer transition-all"
                  style={{
                    backgroundColor: S.white,
                    opacity: agotado ? 0.5 : 1,
                    cursor: agotado ? 'not-allowed' : 'pointer',
                    border: `1px solid ${S.border}`,
                  }}
                >
                  {/* Stock badge */}
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: S.secondary }}>{prod.categoria || 'Producto'}</span>
                    <span className="text-xs font-black px-2 py-0.5 rounded-full"
                      style={agotado ? { backgroundColor: S.errorBg, color: S.error } : bajStock ? { backgroundColor: '#fff3e0', color: '#e65100' } : { backgroundColor: '#e8f5e9', color: '#2e7d32' }}>
                      {agotado ? 'Agotado' : `${totalStock} uds`}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-sm leading-snug" style={{ color: S.brown }}>{prod.nombre}</h3>
                    {prod.variantes.length > 1 && (
                      <p className="text-xs mt-0.5" style={{ color: S.secondary }}>{prod.variantes.length} variantes disponibles</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold" style={{ color: S.primary }}>
                      desde {cop.format(Math.min(...prod.variantes.map((v) => v.precioExtra || 0)))}
                    </span>
                    <button
                      className="text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all"
                      style={{ backgroundColor: agotado ? S.border : S.fuchsia }}
                      disabled={agotado}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>
                      Agregar
                    </button>
                  </div>
                </div>
              );
            })}
            {search.length > 1 && !variantesQuery.isLoading && productoCards.length === 0 && (
              <div className="col-span-3 flex flex-col items-center justify-center py-16 gap-3">
                <span className="material-symbols-outlined text-5xl" style={{ color: S.border }}>search_off</span>
                <p className="text-sm font-bold" style={{ color: S.secondary }}>Sin resultados para "{search}"</p>
              </div>
            )}
            {search.length <= 1 && (
              <div className="col-span-3 flex flex-col items-center justify-center py-16 gap-3">
                <span className="material-symbols-outlined text-5xl" style={{ color: S.border }}>barcode_scanner</span>
                <p className="text-sm font-bold" style={{ color: S.secondary }}>Escribe para buscar productos</p>
              </div>
            )}
          </div>

          {/* Cliente */}
          <div className="mt-6 pt-5 border-t flex gap-4 items-end" style={{ borderColor: S.border }}>
            <div className="flex-1">
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: S.secondary }}>Cliente por documento</label>
              <div className="flex gap-2">
                <input value={docCliente} onChange={(e) => setDocCliente(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && buscarClienteMutation.mutate(docCliente)}
                  placeholder="C.C. o NIT..."
                  className="flex-1 rounded-xl px-4 py-3 text-sm outline-none border-2 transition-colors"
                  style={{ backgroundColor: S.white, borderColor: S.border, color: S.brown }}
                />
                <button onClick={() => buscarClienteMutation.mutate(docCliente)}
                  className="px-4 py-3 rounded-xl text-sm font-bold transition-all"
                  style={{ backgroundColor: S.fuchsia, color: S.white }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person_search</span>
                </button>
              </div>
            </div>
            {clienteEncontrado && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl border" style={{ borderColor: S.border, backgroundColor: S.white }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-black"
                  style={{ backgroundColor: S.fuchsia }}>
                  {clienteEncontrado.nombre[0]}{clienteEncontrado.apellido[0]}
                </div>
                <div>
                  <p className="text-xs font-bold" style={{ color: S.brown }}>{clienteEncontrado.nombre} {clienteEncontrado.apellido}</p>
                  <p className="text-[10px]" style={{ color: S.secondary }}>{clienteEncontrado.documento}</p>
                </div>
                <button onClick={() => { setClienteEncontrado(null); setCliente(null); }}>
                  <span className="material-symbols-outlined text-sm" style={{ color: S.secondary }}>close</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Carrito ───────────────────────── */}
        <div className="flex flex-col w-96 p-6 shadow-2xl" style={{ backgroundColor: '#ebe7e9' }}>
          {/* Header carrito */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-black" style={{ color: S.brown }}>Carrito</h2>
            <div className="flex gap-2">
              <button onClick={suspenderVenta} title="Suspender venta"
                className="p-2 rounded-xl transition-all" style={{ backgroundColor: S.white, color: S.secondary }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>pause_circle</span>
              </button>
              <button onClick={limpiarCarrito} title="Vaciar carrito"
                className="p-2 rounded-xl transition-all" style={{ backgroundColor: S.white, color: S.error }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>delete_sweep</span>
              </button>
            </div>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: `${S.border} transparent` }}>
            {items.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 gap-2">
                <span className="material-symbols-outlined text-4xl" style={{ color: S.border }}>shopping_cart</span>
                <p className="text-xs font-bold" style={{ color: S.secondary }}>Carrito vacío</p>
              </div>
            )}
            {items.map((item) => {
              const lineTotal = item.precioUnitario * item.cantidad * (1 - item.descuentoItem / 100);
              return (
                <div key={item.varianteId} className="rounded-xl p-4 space-y-3" style={{ backgroundColor: S.white }}>
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-bold leading-tight" style={{ color: S.brown }}>{item.nombre}</p>
                      <p className="text-xs" style={{ color: S.secondary }}>{cop.format(item.precioUnitario)} c/u</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-black" style={{ color: S.primary }}>{cop.format(lineTotal)}</span>
                      <button onClick={() => quitarItem(item.varianteId)}>
                        <span className="material-symbols-outlined text-sm" style={{ color: S.error, fontSize: 16 }}>close</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    {/* Qty */}
                    <div className="flex items-center gap-1 rounded-full px-2 py-1" style={{ backgroundColor: S.surface }}>
                      <button onClick={() => actualizarCantidad(item.varianteId, item.cantidad - 1)}
                        className="w-6 h-6 rounded-full flex items-center justify-center" style={{ color: S.primary }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>remove</span>
                      </button>
                      <span className="text-sm font-black w-6 text-center" style={{ color: S.brown }}>{item.cantidad}</span>
                      <button onClick={() => actualizarCantidad(item.varianteId, item.cantidad + 1)}
                        className="w-6 h-6 rounded-full flex items-center justify-center" style={{ color: S.primary }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>
                      </button>
                    </div>
                    {/* Descuento ítem */}
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold" style={{ color: S.secondary }}>DTO</span>
                      <div className="relative">
                        <input type="number" min={0} max={100} value={item.descuentoItem || ''}
                          onChange={(e) => aplicarDescuentoItem(item.varianteId, Number(e.target.value))}
                          placeholder="0"
                          className="w-14 text-center rounded-lg px-2 py-1 text-sm font-bold outline-none border"
                          style={{ borderColor: S.border, color: S.primary, backgroundColor: S.surface }}
                        />
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
            <div className="mt-4 p-3 rounded-xl border" style={{ backgroundColor: S.white, borderColor: S.border }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: S.secondary }}>Descuento Global</p>
              <div className="flex gap-2">
                <select value={tipoDescuentoGlobal}
                  onChange={(e) => setDescuentoGlobal(descuentoGlobal, e.target.value as 'porcentaje' | 'monto')}
                  className="rounded-lg px-2 py-1.5 text-xs font-bold outline-none border"
                  style={{ borderColor: S.border, color: S.brown, backgroundColor: S.surface }}>
                  <option value="porcentaje">%</option>
                  <option value="monto">$</option>
                </select>
                <input type="number" min={0} value={descuentoGlobal || ''}
                  onChange={(e) => setDescuentoGlobal(Number(e.target.value), tipoDescuentoGlobal)}
                  placeholder={tipoDescuentoGlobal === 'porcentaje' ? '0%' : '$0'}
                  className="flex-1 rounded-lg px-3 py-1.5 text-sm font-bold text-center outline-none border"
                  style={{ borderColor: S.border, color: S.primary, backgroundColor: S.surface }}
                />
                {descuentoGlobal > 0 && (
                  <button onClick={() => setDescuentoGlobal(0, tipoDescuentoGlobal)}>
                    <span className="material-symbols-outlined text-sm" style={{ color: S.secondary }}>close</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Resumen */}
          {items.length > 0 && (
            <div className="mt-3 space-y-1 px-1">
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
              <div className="flex justify-between items-end pt-2 border-t" style={{ borderColor: S.border }}>
                <span className="text-sm font-black uppercase" style={{ color: S.brown }}>Total</span>
                <span className="text-3xl font-black" style={{ color: S.primary }}>{cop.format(totales.total)}</span>
              </div>
            </div>
          )}

          {/* Observaciones */}
          <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Nota interna (opcional)" rows={2}
            className="mt-3 w-full rounded-xl px-3 py-2 text-xs outline-none border resize-none"
            style={{ borderColor: S.border, backgroundColor: S.white, color: S.brown }}
          />

          {/* Acciones */}
          <div className="mt-3 space-y-2">
            <button onClick={() => items.length > 0 && setShowModalCobro(true)}
              disabled={!items.length || !usuario?.sedeId}
              className="w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: S.brown }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>shopping_basket</span>
              COBRAR
            </button>
            <button onClick={() => void imprimirTicket()} disabled={!ultimaVentaId}
              className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2 border-2"
              style={{ borderColor: S.primary, color: S.primary, backgroundColor: 'transparent' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>print</span>
              Imprimir Ticket
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
