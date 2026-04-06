import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  FileDown,
  Pencil,
  Trash2,
  X,
  ClipboardList,
  CheckCircle2,
} from 'lucide-react';
import AppLayout from './components/AppLayout';
import api from '../lib/api';
import { tokens } from '../styles/tokens';

type ProveedorOption = {
  id: string;
  nombre: string;
  nit: string;
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

type ProveedorApiItem = {
  id?: string;
  proveedorId?: string;
  proveedor_id?: string;
  nombre?: string;
  razonSocial?: string;
  razon_social?: string;
  nit?: string;
};

type VarianteOption = {
  id: string;
  nombre: string;
  sku: string;
  codigoBarras?: string | null;
  precioVenta?: number | null;
  precio?: number | null;
  producto?: {
    nombre: string;
  };
};

type OrdenCompra = {
  id: string;
  numero: string;
  proveedorId: string;
  proveedor: ProveedorOption;
  sedeId: string;
  subtotal: number;
  total: number;
  estado: 'BORRADOR' | 'ENVIADA' | 'RECIBIDA_PARCIAL' | 'RECIBIDA_TOTAL' | 'CANCELADA';
  detallesOrden?: DetalleOrdenCompra[];
  fechaEsperada: string | null;
  createdAt: string;
  updatedAt: string;
};

type DetalleOrdenCompra = {
  id: string;
  varianteId: string;
  cantidadPedida: number;
  cantidadRecibida: number;
  precioUnitario: number;
};

type OrdenesResponse = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  items: OrdenCompra[];
};

type SedeOption = {
  id: string;
  nombre: string;
};

type DetalleDraft = {
  varianteId: string;
  varianteLabel: string;
  cantidadPedida: number;
  precioUnitario: number;
};

const DEFAULT_SEDE_ID = import.meta.env.VITE_DEFAULT_SEDE_ID || '';

async function getOrdenes(q: string): Promise<OrdenesResponse> {
  const params = q.trim() ? { q: q.trim() } : undefined;
  const { data } = await api.get('/ordenes-compra', { params });
  return data;
}

async function getProveedores(): Promise<ProveedorOption[]> {
  const { data } = await api.get('/proveedores');
  const rawItems = (Array.isArray(data?.items) ? data.items : []) as ProveedorApiItem[];
  return rawItems
    .map((item) => ({
      id: String(item?.id ?? item?.proveedorId ?? item?.proveedor_id ?? ''),
      nombre: String(item?.nombre ?? item?.razonSocial ?? item?.razon_social ?? 'Proveedor'),
      nit: String(item?.nit ?? ''),
    }))
    .filter((item) => isUuid(item.id));
}

async function getVariantes(q: string): Promise<VarianteOption[]> {
  const params = q.trim() ? { q: q.trim() } : undefined;
  const { data } = await api.get('/variantes', { params });
  return data;
}

async function getSedes(): Promise<SedeOption[]> {
  const { data } = await api.get('/sedes');
  return data;
}

async function getOrdenById(id: string): Promise<OrdenCompra> {
  const { data } = await api.get(`/ordenes-compra/${id}`);
  return data;
}

async function descargarPdfOrden(id: string, numero: string): Promise<void> {
  const response = await api.get(`/ordenes-compra/${id}/pdf`, {
    responseType: 'blob',
  });

  const blobUrl = window.URL.createObjectURL(
    new Blob([response.data], { type: 'application/pdf' }),
  );
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = `orden-compra-${numero}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}

const estadoMap: Record<OrdenCompra['estado'], { label: string; bg: string; color: string }> = {
  BORRADOR: { label: 'Borrador', bg: '#efe3ff', color: '#5e35b1' },
  ENVIADA: { label: 'Enviada', bg: '#e3f2fd', color: '#1565c0' },
  RECIBIDA_PARCIAL: { label: 'Recibida parcial', bg: '#fff3e0', color: '#ef6c00' },
  RECIBIDA_TOTAL: { label: 'Recibida total', bg: '#e8f5e9', color: '#2e7d32' },
  CANCELADA: { label: 'Cancelada', bg: '#fde7e9', color: '#ba1a1a' },
};

function RecibirOrdenModal({
  ordenId,
  onClose,
  onSaved,
}: {
  ordenId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [cantidades, setCantidades] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const ordenQuery = useQuery({
    queryKey: ['ordenes-compra', 'detalle', ordenId],
    queryFn: () => getOrdenById(ordenId),
  });

  useEffect(() => {
    if (!ordenQuery.data?.detallesOrden) return;
    const initial: Record<string, string> = {};
    for (const d of ordenQuery.data.detallesOrden) {
      const faltante = Math.max(0, Number(d.cantidadPedida) - Number(d.cantidadRecibida));
      initial[d.id] = String(faltante);
    }
    setCantidades(initial);
  }, [ordenQuery.data]);

  const recibirMutation = useMutation({
    mutationFn: async () => {
      const detalles = (ordenQuery.data?.detallesOrden ?? [])
        .map((d) => {
          const faltante = Math.max(0, Number(d.cantidadPedida) - Number(d.cantidadRecibida));
          const cantidadRecibida = Math.max(0, Number(cantidades[d.id] ?? 0));
          return {
            detalleId: d.id,
            cantidadRecibida: Math.min(
              faltante,
              Number.isFinite(cantidadRecibida) ? cantidadRecibida : 0,
            ),
          };
        })
        .filter((d) => d.cantidadRecibida > 0);

      if (!detalles.length) {
        throw new Error('Ingresa cantidades de recepcion mayores a 0.');
      }

      await api.post(`/ordenes-compra/${ordenId}/recibir`, { detalles });
    },
    onSuccess: onSaved,
    onError: (e: any) => {
      const backend = Array.isArray(e?.response?.data?.message)
        ? e.response.data.message.join('. ')
        : e?.response?.data?.message;
      setError(backend || e?.message || 'No se pudo registrar la recepcion.');
    },
  });

  const detalles = ordenQuery.data?.detallesOrden ?? [];

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4"
      style={{ background: 'rgba(46,27,12,0.48)' }}
    >
      <div
        className="w-full max-w-3xl overflow-hidden rounded-2xl"
        style={{ backgroundColor: tokens.color.bgCard }}
      >
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ backgroundColor: tokens.color.bgDark }}
        >
          <div>
            <h3 className="text-xl font-black text-white">Recepcion de orden</h3>
            <p className="text-sm" style={{ color: tokens.color.accentSoft }}>
              Registra cantidades recibidas por cada detalle
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-white/80 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {ordenQuery.isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-surface-container" />
              ))}
            </div>
          ) : !detalles.length ? (
            <p className="text-sm" style={{ color: tokens.color.textMuted }}>
              La orden no tiene detalles.
            </p>
          ) : (
            <div className="space-y-3">
              {detalles.map((d) => {
                const faltante = Math.max(0, Number(d.cantidadPedida) - Number(d.cantidadRecibida));
                const completado = faltante === 0;
                return (
                  <div
                    key={d.id}
                    className="grid grid-cols-1 items-center gap-3 rounded-xl border p-3 md:grid-cols-6"
                    style={{ borderColor: tokens.color.borderSoft }}
                  >
                    <div className="md:col-span-2">
                      <p className="text-sm font-bold" style={{ color: tokens.color.textStrong }}>
                        Detalle {d.id.slice(0, 8)}...
                      </p>
                      <p className="text-xs" style={{ color: tokens.color.textMuted }}>
                        Pedida: {d.cantidadPedida} | Recibida: {d.cantidadRecibida}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <p
                        className="text-xs font-bold uppercase tracking-wider"
                        style={{ color: tokens.color.textMuted }}
                      >
                        Pendiente
                      </p>
                      <p
                        className="text-sm font-semibold"
                        style={{ color: completado ? tokens.color.success : tokens.color.warning }}
                      >
                        {faltante}
                      </p>
                    </div>
                    <div>
                      {completado ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold"
                          style={{
                            backgroundColor: tokens.color.successBg,
                            color: tokens.color.success,
                          }}
                        >
                          <CheckCircle2 size={14} /> Completo
                        </span>
                      ) : (
                        <input
                          type="number"
                          min={0}
                          max={faltante}
                          value={cantidades[d.id] ?? '0'}
                          onChange={(e) =>
                            setCantidades((prev) => ({ ...prev, [d.id]: e.target.value }))
                          }
                          className="w-full rounded-xl border px-3 py-2.5"
                          style={{ borderColor: tokens.color.border }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {error && (
          <p className="px-6 pb-2 text-sm font-semibold" style={{ color: tokens.color.danger }}>
            {error}
          </p>
        )}

        <div className="flex gap-3 px-6 pb-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border py-3 font-bold"
            style={{ borderColor: tokens.color.border, color: tokens.color.textMuted }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => recibirMutation.mutate()}
            disabled={recibirMutation.isPending || ordenQuery.isLoading || !detalles.length}
            className="flex-1 rounded-xl py-3 font-black text-white disabled:opacity-70"
            style={{ backgroundColor: tokens.color.bgDark }}
          >
            {recibirMutation.isPending ? 'Guardando...' : 'Registrar recepcion'}
          </button>
        </div>
      </div>
    </div>
  );
}

function OrdenModal({
  orden,
  onClose,
  onSaved,
}: {
  orden: OrdenCompra | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEditing = Boolean(orden);
  const [proveedorId, setProveedorId] = useState(orden?.proveedorId ?? '');
  const [sedeId, setSedeId] = useState(orden?.sedeId ?? DEFAULT_SEDE_ID);
  const [fechaEsperada, setFechaEsperada] = useState(orden?.fechaEsperada?.slice(0, 10) ?? '');
  const [notas, setNotas] = useState('');
  const [detalleSearch, setDetalleSearch] = useState('');
  const [selectedVarianteId, setSelectedVarianteId] = useState('');
  const [cantidadDraft, setCantidadDraft] = useState('1');
  const [precioDraft, setPrecioDraft] = useState('0');
  const [detalles, setDetalles] = useState<DetalleDraft[]>([]);
  const [error, setError] = useState<string | null>(null);

  const proveedoresQuery = useQuery({
    queryKey: ['ordenes-compra', 'proveedores'],
    queryFn: getProveedores,
  });
  const variantesQuery = useQuery({
    queryKey: ['ordenes-compra', 'variantes', detalleSearch],
    queryFn: () => getVariantes(detalleSearch),
    enabled: !isEditing,
  });
  const sedesQuery = useQuery({ queryKey: ['ordenes-compra', 'sedes'], queryFn: getSedes });

  const selectedVariante = useMemo(
    () => (variantesQuery.data ?? []).find((v) => v.id === selectedVarianteId),
    [variantesQuery.data, selectedVarianteId],
  );

  const totalDraft = useMemo(
    () => detalles.reduce((acc, d) => acc + d.cantidadPedida * d.precioUnitario, 0),
    [detalles],
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!isUuid(proveedorId)) {
        throw new Error('Selecciona un proveedor.');
      }

      if (isEditing && orden) {
        await api.put(`/ordenes-compra/${orden.id}`, {
          proveedorId,
          sedeId: sedeId || undefined,
          fechaEsperada: fechaEsperada ? new Date(fechaEsperada).toISOString() : undefined,
        });
        return;
      }

      if (!sedeId) {
        throw new Error('Selecciona una sede.');
      }
      if (!detalles.length) {
        throw new Error('Agrega al menos un detalle.');
      }

      await api.post('/ordenes-compra', {
        proveedorId,
        sedeId,
        fechaEsperada: fechaEsperada ? new Date(fechaEsperada).toISOString() : undefined,
        notas: notas.trim() || undefined,
        detalles: detalles.map((d) => ({
          varianteId: d.varianteId,
          cantidadPedida: d.cantidadPedida,
          precioUnitario: d.precioUnitario,
        })),
      });
    },
    onSuccess: onSaved,
    onError: (e: any) => {
      const backend = Array.isArray(e?.response?.data?.message)
        ? e.response.data.message.join('. ')
        : e?.response?.data?.message;
      setError(backend || e?.message || 'No se pudo guardar la orden.');
    },
  });

  const addDetalle = () => {
    if (!selectedVariante) return;
    const cantidad = Number(cantidadDraft);
    const precio = Number(precioDraft);
    if (!Number.isFinite(cantidad) || cantidad <= 0 || !Number.isFinite(precio) || precio < 0) {
      return;
    }
    if (detalles.some((d) => d.varianteId === selectedVariante.id)) {
      return;
    }

    const label = `${selectedVariante.producto?.nombre ?? 'Producto'} - ${selectedVariante.nombre}`;
    setDetalles((prev) => [
      ...prev,
      {
        varianteId: selectedVariante.id,
        varianteLabel: label,
        cantidadPedida: cantidad,
        precioUnitario: precio,
      },
    ]);
    setSelectedVarianteId('');
    setCantidadDraft('1');
    setPrecioDraft('0');
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4"
      style={{ background: 'rgba(46,27,12,0.48)' }}
    >
      <div
        className="w-full max-w-3xl overflow-hidden rounded-2xl"
        style={{ backgroundColor: tokens.color.bgCard }}
      >
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ backgroundColor: tokens.color.bgDark }}
        >
          <div>
            <h3 className="text-xl font-black text-white">
              {isEditing ? 'Editar orden de compra' : 'Nueva orden de compra'}
            </h3>
            <p className="text-sm" style={{ color: tokens.color.accentSoft }}>
              {isEditing
                ? 'Actualiza datos generales de la orden'
                : 'Registra productos y condiciones de compra'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-white/80 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
          <label>
            <span
              className="mb-1 block text-xs font-bold uppercase tracking-wider"
              style={{ color: tokens.color.textMuted }}
            >
              Proveedor
            </span>
            <select
              value={proveedorId}
              onChange={(e) => setProveedorId(e.target.value)}
              className="w-full rounded-xl border px-3 py-2.5"
              style={{ borderColor: tokens.color.border }}
              disabled={proveedoresQuery.isLoading || isEditing}
            >
              <option value="">Seleccionar...</option>
              {(proveedoresQuery.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} ({p.nit})
                </option>
              ))}
            </select>
          </label>

          <label>
            <span
              className="mb-1 block text-xs font-bold uppercase tracking-wider"
              style={{ color: tokens.color.textMuted }}
            >
              Sede
            </span>
            <select
              value={sedeId}
              onChange={(e) => setSedeId(e.target.value)}
              className="w-full rounded-xl border px-3 py-2.5"
              style={{ borderColor: tokens.color.border }}
              disabled={sedesQuery.isLoading || isEditing}
            >
              <option value="">Seleccionar...</option>
              {(sedesQuery.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span
              className="mb-1 block text-xs font-bold uppercase tracking-wider"
              style={{ color: tokens.color.textMuted }}
            >
              Fecha esperada
            </span>
            <input
              type="date"
              value={fechaEsperada}
              onChange={(e) => setFechaEsperada(e.target.value)}
              className="w-full rounded-xl border px-3 py-2.5"
              style={{ borderColor: tokens.color.border }}
            />
          </label>

          <label>
            <span
              className="mb-1 block text-xs font-bold uppercase tracking-wider"
              style={{ color: tokens.color.textMuted }}
            >
              Total
            </span>
            <input
              value={isEditing ? String(Number(orden?.total ?? 0)) : String(totalDraft)}
              readOnly
              className="w-full rounded-xl border px-3 py-2.5"
              style={{ borderColor: tokens.color.border }}
            />
          </label>

          {!isEditing && (
            <label className="md:col-span-2">
              <span
                className="mb-1 block text-xs font-bold uppercase tracking-wider"
                style={{ color: tokens.color.textMuted }}
              >
                Notas
              </span>
              <textarea
                rows={2}
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                className="w-full rounded-xl border px-3 py-2.5"
                style={{ borderColor: tokens.color.border }}
              />
            </label>
          )}
        </div>

        {!isEditing && (
          <div
            className="mx-6 mb-2 rounded-2xl border p-4"
            style={{ borderColor: tokens.color.border }}
          >
            <h4
              className="mb-3 text-sm font-black uppercase tracking-wide"
              style={{ color: tokens.color.textStrong }}
            >
              Detalles de la orden
            </h4>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <input
                value={detalleSearch}
                onChange={(e) => setDetalleSearch(e.target.value)}
                placeholder="Buscar variante"
                className="rounded-xl border px-3 py-2.5 md:col-span-2"
                style={{ borderColor: tokens.color.border }}
              />
              <input
                type="number"
                min={1}
                value={cantidadDraft}
                onChange={(e) => setCantidadDraft(e.target.value)}
                placeholder="Cantidad"
                className="rounded-xl border px-3 py-2.5"
                style={{ borderColor: tokens.color.border }}
              />
              <input
                type="number"
                min={0}
                step="0.01"
                value={precioDraft}
                onChange={(e) => setPrecioDraft(e.target.value)}
                placeholder="Precio"
                className="rounded-xl border px-3 py-2.5"
                style={{ borderColor: tokens.color.border }}
              />
              <select
                value={selectedVarianteId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedVarianteId(id);
                  const v = (variantesQuery.data ?? []).find((item) => item.id === id);
                  if (v) {
                    setPrecioDraft(String(Number(v.precioVenta ?? v.precio ?? 0)));
                  }
                }}
                className="rounded-xl border px-3 py-2.5 md:col-span-3"
                style={{ borderColor: tokens.color.border }}
              >
                <option value="">Seleccionar variante...</option>
                {(variantesQuery.data ?? []).map((v) => (
                  <option key={v.id} value={v.id}>
                    {(v.producto?.nombre ?? 'Producto') + ' - ' + v.nombre + ' | ' + v.sku}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="rounded-xl py-2.5 font-bold text-white disabled:opacity-60"
                style={{ backgroundColor: tokens.color.bgDark }}
                onClick={addDetalle}
                disabled={!selectedVarianteId}
              >
                Agregar
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {detalles.length === 0 ? (
                <p className="text-sm" style={{ color: tokens.color.textMuted }}>
                  Sin detalles agregados.
                </p>
              ) : (
                detalles.map((d) => (
                  <div
                    key={d.varianteId}
                    className="flex items-center justify-between rounded-xl border px-3 py-2"
                    style={{ borderColor: tokens.color.borderSoft }}
                  >
                    <div>
                      <p
                        className="text-sm font-semibold"
                        style={{ color: tokens.color.textStrong }}
                      >
                        {d.varianteLabel}
                      </p>
                      <p className="text-xs" style={{ color: tokens.color.textMuted }}>
                        Cantidad: {d.cantidadPedida} | Precio: $
                        {d.precioUnitario.toLocaleString('es-CO')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setDetalles((prev) => prev.filter((x) => x.varianteId !== d.varianteId))
                      }
                      className="rounded-lg p-2 hover:bg-surface-container"
                    >
                      <Trash2 size={16} style={{ color: tokens.color.danger }} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {error && (
          <p className="px-6 pb-2 text-sm font-semibold" style={{ color: tokens.color.danger }}>
            {error}
          </p>
        )}

        <div className="flex gap-3 px-6 pb-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border py-3 font-bold"
            style={{ borderColor: tokens.color.border, color: tokens.color.textMuted }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="flex-1 rounded-xl py-3 font-black text-white disabled:opacity-70"
            style={{ backgroundColor: tokens.color.bgDark }}
          >
            {saveMutation.isPending ? 'Guardando...' : 'Guardar orden'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OrdenesCompraPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<OrdenCompra | null>(null);
  const [receivingId, setReceivingId] = useState<string | null>(null);

  const ordenesQuery = useQuery({
    queryKey: ['ordenes-compra', search],
    queryFn: () => getOrdenes(search),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/ordenes-compra/${id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['ordenes-compra'] });
    },
  });

  const ordenes = ordenesQuery.data?.items ?? [];
  const total = useMemo(() => ordenes.reduce((acc, o) => acc + Number(o.total ?? 0), 0), [ordenes]);

  return (
    <AppLayout>
      {(showModal || editing) && (
        <OrdenModal
          orden={editing}
          onClose={() => {
            setShowModal(false);
            setEditing(null);
          }}
          onSaved={() => {
            setShowModal(false);
            setEditing(null);
            void queryClient.invalidateQueries({ queryKey: ['ordenes-compra'] });
          }}
        />
      )}
      {receivingId && (
        <RecibirOrdenModal
          ordenId={receivingId}
          onClose={() => setReceivingId(null)}
          onSaved={() => {
            setReceivingId(null);
            void queryClient.invalidateQueries({ queryKey: ['ordenes-compra'] });
            void queryClient.invalidateQueries({ queryKey: ['inventario'] });
          }}
        />
      )}

      <div className="space-y-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-on-secondary-fixed">
              Ordenes de compra
            </h1>
            <p className="mt-1 font-medium text-secondary">Control de pedidos a proveedores</p>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-black uppercase tracking-wider text-white"
            style={{ backgroundColor: tokens.color.bgDark }}
          >
            <Plus size={18} /> Nueva orden
          </button>
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border-l-4 border-primary bg-surface-container-low p-5">
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-secondary">
              Ordenes listadas
            </p>
            <p className="text-2xl font-black text-on-secondary-fixed">{ordenes.length}</p>
          </div>
          <div
            className="rounded-2xl border-l-4 bg-surface-container-low p-5"
            style={{ borderColor: '#5e35b1' }}
          >
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-secondary">
              Monto total
            </p>
            <p className="text-2xl font-black text-on-secondary-fixed">
              ${total.toLocaleString('es-CO')}
            </p>
          </div>
          <div
            className="rounded-2xl border-l-4 bg-surface-container-low p-5"
            style={{ borderColor: '#2e7d32' }}
          >
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-secondary">
              Recibidas total
            </p>
            <p className="text-2xl font-black text-on-secondary-fixed">
              {ordenes.filter((o) => o.estado === 'RECIBIDA_TOTAL').length}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-outline-variant/20 bg-white p-4">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por numero, proveedor o NIT"
              className="w-full rounded-xl border py-2.5 pl-10 pr-3"
              style={{ borderColor: tokens.color.border }}
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-outline-variant/10 shadow-sm">
          {ordenesQuery.isLoading ? (
            <div className="grid grid-cols-1 gap-3 p-6">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-surface-container" />
              ))}
            </div>
          ) : !ordenes.length ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <ClipboardList size={48} className="text-outline" />
              <p className="text-sm font-bold text-secondary">
                No hay ordenes de compra para mostrar
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-surface-container-highest text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  <th className="px-6 py-4">Orden</th>
                  <th className="px-6 py-4">Proveedor</th>
                  <th className="px-6 py-4">Total</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Fecha esperada</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ordenes.map((orden, index) => {
                  const estado = estadoMap[orden.estado];
                  return (
                    <tr
                      key={orden.id}
                      className={`border-b border-outline-variant/10 ${index % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low'}`}
                    >
                      <td className="px-6 py-4">
                        <p className="font-bold text-on-surface">{orden.numero}</p>
                        <p className="text-xs text-secondary">
                          {new Date(orden.createdAt).toLocaleDateString('es-CO')}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-secondary">
                        <p>{orden.proveedor?.nombre ?? '-'}</p>
                        <p className="text-xs">{orden.proveedor?.nit ?? '-'}</p>
                      </td>
                      <td className="px-6 py-4 font-bold text-on-surface">
                        ${Number(orden.total ?? 0).toLocaleString('es-CO')}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="rounded-full px-3 py-1 text-xs font-bold"
                          style={{ backgroundColor: estado.bg, color: estado.color }}
                        >
                          {estado.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-secondary">
                        {orden.fechaEsperada
                          ? new Date(orden.fechaEsperada).toLocaleDateString('es-CO')
                          : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {(orden.estado === 'BORRADOR' ||
                            orden.estado === 'ENVIADA' ||
                            orden.estado === 'RECIBIDA_PARCIAL') && (
                            <button
                              type="button"
                              title="Recibir"
                              className="rounded-lg p-2 hover:bg-surface-container"
                              onClick={() => setReceivingId(orden.id)}
                            >
                              <CheckCircle2 size={18} style={{ color: tokens.color.success }} />
                            </button>
                          )}
                          <button
                            type="button"
                            title="Editar"
                            className="rounded-lg p-2 hover:bg-surface-container"
                            onClick={() => setEditing(orden)}
                          >
                            <Pencil size={18} style={{ color: tokens.color.textMuted }} />
                          </button>
                          <button
                            type="button"
                            title="Cancelar"
                            className="rounded-lg p-2 hover:bg-surface-container"
                            disabled={deleteMutation.isPending}
                            onClick={() => deleteMutation.mutate(orden.id)}
                          >
                            <Trash2 size={18} style={{ color: tokens.color.danger }} />
                          </button>
                          <button
                            type="button"
                            title="Descargar PDF"
                            className="rounded-lg p-2 hover:bg-surface-container"
                            onClick={() => {
                              void descargarPdfOrden(orden.id, orden.numero);
                            }}
                          >
                            <FileDown size={18} style={{ color: tokens.color.success }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
