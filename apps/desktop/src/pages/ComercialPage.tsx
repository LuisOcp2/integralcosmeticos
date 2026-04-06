import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MetodoPago } from '@cosmeticos/shared-types';
import AppLayout from './components/AppLayout';
import api from '../lib/api';

type TabComercial = 'cotizaciones' | 'pedidos' | 'facturas';

type EstadoPedido =
  | 'PENDIENTE'
  | 'CONFIRMADO'
  | 'EN_PREPARACION'
  | 'LISTO'
  | 'DESPACHADO'
  | 'ENTREGADO'
  | 'CANCELADO';

type Cliente = {
  id: string;
  nombre: string;
  apellido?: string | null;
};

type DetalleBase = {
  id?: string;
  varianteId: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  subtotal: number;
};

type Cotizacion = {
  id: string;
  numero: string;
  clienteId: string;
  cliente?: Cliente;
  estado: string;
  fechaVigencia: string;
  total: number;
};

type Pedido = {
  id: string;
  numero: string;
  cotizacionId?: string | null;
  clienteId: string;
  cliente?: Cliente;
  estado: EstadoPedido;
  fechaEntregaEsperada?: string | null;
  total: number;
  detalles?: DetalleBase[];
};

type Factura = {
  id: string;
  numero: string;
  clienteId: string;
  cliente?: Cliente;
  estado: string;
  fechaEmision: string;
  fechaVencimiento: string;
  total: number;
  saldo: number;
};

type ProductoPos = {
  variantes: Array<{ id: string; nombre: string; precio: number }>;
  nombre: string;
};

type Paginado<T> = {
  items: T[];
};

type LineaCotizacionForm = {
  varianteId: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
};

type CotizacionForm = {
  clienteId: string;
  fechaVigencia: string;
  notasCliente: string;
  detalles: LineaCotizacionForm[];
};

type PagoForm = {
  facturaId: string;
  fecha: string;
  monto: string;
  metodoPago: MetodoPago;
  referencia: string;
};

const ESTADOS_PEDIDO_FLUJO: EstadoPedido[] = [
  'PENDIENTE',
  'CONFIRMADO',
  'EN_PREPARACION',
  'LISTO',
  'DESPACHADO',
  'ENTREGADO',
];

const formatCOP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

function toDateInput(date?: string): string {
  if (!date) return '';
  return date.slice(0, 10);
}

function nombreCliente(cliente?: Cliente, fallback?: string): string {
  if (!cliente) return fallback ?? '-';
  return `${cliente.nombre} ${cliente.apellido ?? ''}`.trim();
}

function extraerItems<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object' && 'items' in payload) {
    return (payload as Paginado<T>).items;
  }
  return [];
}

export default function ComercialPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabComercial>('cotizaciones');
  const [mostrarModalCotizacion, setMostrarModalCotizacion] = useState(false);
  const [mostrarModalPago, setMostrarModalPago] = useState(false);
  const [previewCotizacion, setPreviewCotizacion] = useState<string | null>(null);
  const [detallePedido, setDetallePedido] = useState<Pedido | null>(null);
  const [cotizacionForm, setCotizacionForm] = useState<CotizacionForm>({
    clienteId: '',
    fechaVigencia: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    notasCliente: '',
    detalles: [{ varianteId: '', descripcion: '', cantidad: 1, precioUnitario: 0, descuento: 0 }],
  });
  const [pagoForm, setPagoForm] = useState<PagoForm>({
    facturaId: '',
    fecha: new Date().toISOString().slice(0, 10),
    monto: '',
    metodoPago: MetodoPago.TRANSFERENCIA,
    referencia: '',
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['desktop-comercial-clientes'],
    queryFn: async () => {
      const { data } = await api.get('/clientes', { params: { page: 1, limit: 200 } });
      return extraerItems<Cliente>(data);
    },
  });

  const { data: productos = [] } = useQuery({
    queryKey: ['desktop-comercial-productos'],
    queryFn: async () => {
      const { data } = await api.get('/productos', { params: { page: 1, limit: 200 } });
      const items = extraerItems<any>(data);
      return items.map(
        (item): ProductoPos => ({
          nombre: item.nombre,
          variantes: (item.variantes ?? []).map((v: any) => ({
            id: v.id,
            nombre: v.nombre,
            precio: Number(v.precioVenta ?? v.precio ?? item.precio ?? 0),
          })),
        }),
      );
    },
  });

  const { data: cotizaciones = [] } = useQuery({
    queryKey: ['desktop-comercial-cotizaciones'],
    queryFn: async () => {
      const { data } = await api.get('/comercial/cotizaciones', { params: { page: 1, limit: 50 } });
      return extraerItems<Cotizacion>(data);
    },
  });

  const { data: pedidos = [] } = useQuery({
    queryKey: ['desktop-comercial-pedidos'],
    queryFn: async () => {
      const { data } = await api.get('/comercial/pedidos', { params: { page: 1, limit: 50 } });
      return extraerItems<Pedido>(data);
    },
  });

  const { data: facturas = [] } = useQuery({
    queryKey: ['desktop-comercial-facturas'],
    queryFn: async () => {
      const { data } = await api.get('/comercial/facturas', { params: { page: 1, limit: 50 } });
      return extraerItems<Factura>(data);
    },
  });

  const { data: cuentasPorCobrar = [] } = useQuery({
    queryKey: ['desktop-comercial-cuentas-por-cobrar'],
    queryFn: async () => {
      const { data } = await api.get<Factura[]>('/comercial/facturas/cuentas-por-cobrar');
      return data;
    },
  });

  const crearCotizacionMutation = useMutation({
    mutationFn: async (payload: CotizacionForm) => {
      await api.post('/comercial/cotizaciones', payload);
    },
    onSuccess: () => {
      setMostrarModalCotizacion(false);
      setCotizacionForm({
        clienteId: '',
        fechaVigencia: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        notasCliente: '',
        detalles: [
          { varianteId: '', descripcion: '', cantidad: 1, precioUnitario: 0, descuento: 0 },
        ],
      });
      void queryClient.invalidateQueries({ queryKey: ['desktop-comercial-cotizaciones'] });
    },
  });

  const eliminarCotizacionMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/comercial/cotizaciones/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['desktop-comercial-cotizaciones'] });
    },
  });

  const convertirCotizacionMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/comercial/cotizaciones/${id}/convertir-pedido`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['desktop-comercial-cotizaciones'] });
      void queryClient.invalidateQueries({ queryKey: ['desktop-comercial-pedidos'] });
      setTab('pedidos');
    },
  });

  const avanzarEstadoPedidoMutation = useMutation({
    mutationFn: async ({ id, estado }: { id: string; estado: EstadoPedido }) => {
      await api.patch(`/comercial/pedidos/${id}/estado`, { estado });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['desktop-comercial-pedidos'] });
    },
  });

  const convertirPedidoMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/comercial/pedidos/${id}/convertir-factura`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['desktop-comercial-pedidos'] });
      void queryClient.invalidateQueries({ queryKey: ['desktop-comercial-facturas'] });
      void queryClient.invalidateQueries({ queryKey: ['desktop-comercial-cuentas-por-cobrar'] });
      setTab('facturas');
    },
  });

  const registrarPagoMutation = useMutation({
    mutationFn: async (payload: PagoForm) => {
      await api.post(`/comercial/facturas/${payload.facturaId}/pagos`, {
        fecha: payload.fecha,
        monto: Number(payload.monto),
        metodoPago: payload.metodoPago,
        referencia: payload.referencia,
      });
    },
    onSuccess: () => {
      setMostrarModalPago(false);
      setPagoForm({
        facturaId: '',
        fecha: new Date().toISOString().slice(0, 10),
        monto: '',
        metodoPago: MetodoPago.TRANSFERENCIA,
        referencia: '',
      });
      void queryClient.invalidateQueries({ queryKey: ['desktop-comercial-facturas'] });
      void queryClient.invalidateQueries({ queryKey: ['desktop-comercial-cuentas-por-cobrar'] });
    },
  });

  const totalCuentasPorCobrar = useMemo(
    () => cuentasPorCobrar.reduce((acc, item) => acc + Number(item.saldo || 0), 0),
    [cuentasPorCobrar],
  );

  const opcionesVariantes = useMemo(
    () =>
      productos.flatMap((producto) =>
        producto.variantes.map((variante) => ({
          id: variante.id,
          label: `${producto.nombre} - ${variante.nombre}`,
          precio: variante.precio,
        })),
      ),
    [productos],
  );

  const abrirPreviewCotizacion = async (id: string) => {
    const { data } = await api.get<string>(`/comercial/cotizaciones/${id}/pdf`);
    setPreviewCotizacion(data);
  };

  const abrirDetallePedido = async (id: string) => {
    const { data } = await api.get<Pedido>(`/comercial/pedidos/${id}`);
    setDetallePedido(data);
  };

  const submitNuevaCotizacion = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    crearCotizacionMutation.mutate(cotizacionForm);
  };

  const submitPago = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    registrarPagoMutation.mutate(pagoForm);
  };

  const siguienteEstado = (estado: EstadoPedido): EstadoPedido | null => {
    const idx = ESTADOS_PEDIDO_FLUJO.indexOf(estado);
    if (idx < 0 || idx >= ESTADOS_PEDIDO_FLUJO.length - 1) return null;
    return ESTADOS_PEDIDO_FLUJO[idx + 1];
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-on-secondary-fixed">
              Comercial
            </h1>
            <p className="mt-1 font-medium text-secondary">
              Flujo integral de cotizaciones, pedidos, facturas y cobros.
            </p>
          </div>
          <div className="inline-flex rounded-xl border border-outline-variant bg-white p-1">
            {(['cotizaciones', 'pedidos', 'facturas'] as TabComercial[]).map((item) => (
              <button
                key={item}
                onClick={() => setTab(item)}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                  tab === item ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
                }`}
              >
                {item[0].toUpperCase() + item.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {tab === 'cotizaciones' && (
          <>
            <div className="flex justify-end">
              <button
                onClick={() => setMostrarModalCotizacion(true)}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary"
              >
                Nueva Cotizacion
              </button>
            </div>
            <div className="overflow-x-auto rounded-xl border border-outline-variant bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-surface-container text-left text-xs uppercase tracking-wide text-on-surface-variant">
                  <tr>
                    <th className="px-4 py-3">Numero</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Vigencia</th>
                    <th className="px-4 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cotizaciones.map((cotizacion) => (
                    <tr key={cotizacion.id} className="border-t border-outline-variant/30">
                      <td className="px-4 py-3 font-semibold">{cotizacion.numero}</td>
                      <td className="px-4 py-3 text-on-surface-variant">
                        {nombreCliente(cotizacion.cliente, cotizacion.clienteId)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-primary-container px-2 py-1 text-xs font-bold text-on-primary-container">
                          {cotizacion.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {formatCOP.format(Number(cotizacion.total || 0))}
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant">
                        {toDateInput(cotizacion.fechaVigencia)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => void abrirPreviewCotizacion(cotizacion.id)}
                            className="rounded-lg border border-outline-variant px-2 py-1 text-xs font-bold"
                          >
                            Ver
                          </button>
                          <button
                            onClick={() => convertirCotizacionMutation.mutate(cotizacion.id)}
                            className="rounded-lg border border-primary px-2 py-1 text-xs font-bold text-primary"
                          >
                            Convertir a Pedido
                          </button>
                          <button
                            onClick={() => eliminarCotizacionMutation.mutate(cotizacion.id)}
                            className="rounded-lg border border-error px-2 py-1 text-xs font-bold text-error"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'pedidos' && (
          <div className="overflow-x-auto rounded-xl border border-outline-variant bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-surface-container text-left text-xs uppercase tracking-wide text-on-surface-variant">
                <tr>
                  <th className="px-4 py-3">Numero</th>
                  <th className="px-4 py-3">Origen</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Fecha Entrega</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map((pedido) => {
                  const estadoSiguiente = siguienteEstado(pedido.estado);
                  return (
                    <tr key={pedido.id} className="border-t border-outline-variant/30 align-top">
                      <td className="px-4 py-3 font-semibold">{pedido.numero}</td>
                      <td className="px-4 py-3 text-on-surface-variant">
                        {pedido.cotizacionId ? 'Cotizacion' : 'Directo'}
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant">
                        {nombreCliente(pedido.cliente, pedido.clienteId)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {ESTADOS_PEDIDO_FLUJO.map((estado) => (
                            <span
                              key={estado}
                              className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                                ESTADOS_PEDIDO_FLUJO.indexOf(estado) <=
                                ESTADOS_PEDIDO_FLUJO.indexOf(pedido.estado)
                                  ? 'bg-primary-container text-on-primary-container'
                                  : 'bg-surface-container-low text-on-surface-variant'
                              }`}
                            >
                              {estado}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">{formatCOP.format(Number(pedido.total || 0))}</td>
                      <td className="px-4 py-3 text-on-surface-variant">
                        {toDateInput(pedido.fechaEntregaEsperada ?? '') || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            disabled={!estadoSiguiente}
                            onClick={() =>
                              estadoSiguiente &&
                              avanzarEstadoPedidoMutation.mutate({
                                id: pedido.id,
                                estado: estadoSiguiente,
                              })
                            }
                            className="rounded-lg border border-primary px-2 py-1 text-xs font-bold text-primary disabled:opacity-40"
                          >
                            Avanzar estado
                          </button>
                          <button
                            onClick={() => void abrirDetallePedido(pedido.id)}
                            className="rounded-lg border border-outline-variant px-2 py-1 text-xs font-bold"
                          >
                            Ver detalle
                          </button>
                          <button
                            onClick={() => convertirPedidoMutation.mutate(pedido.id)}
                            className="rounded-lg border border-secondary px-2 py-1 text-xs font-bold text-secondary"
                          >
                            Convertir a Factura
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'facturas' && (
          <>
            <div className="rounded-xl border border-outline-variant bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-on-surface-variant">
                Total cuentas por cobrar
              </p>
              <p className="text-2xl font-black text-on-surface">
                {formatCOP.format(totalCuentasPorCobrar)}
              </p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-outline-variant bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-surface-container text-left text-xs uppercase tracking-wide text-on-surface-variant">
                  <tr>
                    <th className="px-4 py-3">Numero</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Fecha Emision</th>
                    <th className="px-4 py-3">Fecha Vencimiento</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Saldo</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {facturas.map((factura) => (
                    <tr key={factura.id} className="border-t border-outline-variant/30">
                      <td className="px-4 py-3 font-semibold">{factura.numero}</td>
                      <td className="px-4 py-3 text-on-surface-variant">
                        {nombreCliente(factura.cliente, factura.clienteId)}
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant">
                        {toDateInput(factura.fechaEmision)}
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant">
                        {toDateInput(factura.fechaVencimiento)}
                      </td>
                      <td className="px-4 py-3">{formatCOP.format(Number(factura.total || 0))}</td>
                      <td
                        className={`px-4 py-3 font-bold ${
                          Number(factura.saldo || 0) > 0 ? 'text-error' : 'text-green-700'
                        }`}
                      >
                        {formatCOP.format(Number(factura.saldo || 0))}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-primary-container px-2 py-1 text-xs font-bold text-on-primary-container">
                          {factura.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            setPagoForm((prev) => ({ ...prev, facturaId: factura.id }));
                            setMostrarModalPago(true);
                          }}
                          className="rounded-lg border border-primary px-2 py-1 text-xs font-bold text-primary"
                        >
                          Registrar Pago
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {mostrarModalCotizacion && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <form
            onSubmit={submitNuevaCotizacion}
            className="w-full max-w-4xl space-y-4 rounded-2xl border border-outline-variant bg-white p-5"
          >
            <h2 className="text-lg font-black text-on-surface">Nueva Cotizacion</h2>
            <div className="grid gap-3 md:grid-cols-3">
              <select
                required
                value={cotizacionForm.clienteId}
                onChange={(e) =>
                  setCotizacionForm((prev) => ({ ...prev, clienteId: e.target.value }))
                }
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              >
                <option value="">Seleccionar cliente</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {nombreCliente(cliente)}
                  </option>
                ))}
              </select>

              <input
                type="date"
                required
                value={cotizacionForm.fechaVigencia}
                onChange={(e) =>
                  setCotizacionForm((prev) => ({ ...prev, fechaVigencia: e.target.value }))
                }
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              />

              <input
                placeholder="Notas cliente"
                value={cotizacionForm.notasCliente}
                onChange={(e) =>
                  setCotizacionForm((prev) => ({ ...prev, notasCliente: e.target.value }))
                }
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              />
            </div>

            <div className="overflow-x-auto rounded-lg border border-outline-variant">
              <table className="min-w-full text-sm">
                <thead className="bg-surface-container text-xs uppercase tracking-wide text-on-surface-variant">
                  <tr>
                    <th className="px-3 py-2 text-left">Producto</th>
                    <th className="px-3 py-2 text-left">Cantidad</th>
                    <th className="px-3 py-2 text-left">Precio</th>
                    <th className="px-3 py-2 text-left">Descuento</th>
                    <th className="px-3 py-2 text-left" />
                  </tr>
                </thead>
                <tbody>
                  {cotizacionForm.detalles.map((detalle, index) => (
                    <tr key={`linea-${index}`} className="border-t border-outline-variant/30">
                      <td className="px-3 py-2">
                        <select
                          required
                          value={detalle.varianteId}
                          onChange={(e) => {
                            const variante = opcionesVariantes.find(
                              (opt) => opt.id === e.target.value,
                            );
                            setCotizacionForm((prev) => {
                              const detalles = [...prev.detalles];
                              detalles[index] = {
                                ...detalles[index],
                                varianteId: e.target.value,
                                descripcion: variante?.label ?? '',
                                precioUnitario: variante?.precio ?? detalles[index].precioUnitario,
                              };
                              return { ...prev, detalles };
                            });
                          }}
                          className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-2 py-1"
                        >
                          <option value="">Seleccionar</option>
                          {opcionesVariantes.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={1}
                          value={detalle.cantidad}
                          onChange={(e) => {
                            const cantidad = Number(e.target.value || 1);
                            setCotizacionForm((prev) => {
                              const detalles = [...prev.detalles];
                              detalles[index] = { ...detalles[index], cantidad };
                              return { ...prev, detalles };
                            });
                          }}
                          className="w-24 rounded-lg border border-outline-variant bg-surface-container-low px-2 py-1"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          value={detalle.precioUnitario}
                          onChange={(e) => {
                            const precioUnitario = Number(e.target.value || 0);
                            setCotizacionForm((prev) => {
                              const detalles = [...prev.detalles];
                              detalles[index] = { ...detalles[index], precioUnitario };
                              return { ...prev, detalles };
                            });
                          }}
                          className="w-28 rounded-lg border border-outline-variant bg-surface-container-low px-2 py-1"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          value={detalle.descuento}
                          onChange={(e) => {
                            const descuento = Number(e.target.value || 0);
                            setCotizacionForm((prev) => {
                              const detalles = [...prev.detalles];
                              detalles[index] = { ...detalles[index], descuento };
                              return { ...prev, detalles };
                            });
                          }}
                          className="w-28 rounded-lg border border-outline-variant bg-surface-container-low px-2 py-1"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => {
                            setCotizacionForm((prev) => ({
                              ...prev,
                              detalles:
                                prev.detalles.length > 1
                                  ? prev.detalles.filter((_, idx) => idx !== index)
                                  : prev.detalles,
                            }));
                          }}
                          className="rounded-lg border border-error px-2 py-1 text-xs font-bold text-error"
                        >
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={() =>
                setCotizacionForm((prev) => ({
                  ...prev,
                  detalles: [
                    ...prev.detalles,
                    {
                      varianteId: '',
                      descripcion: '',
                      cantidad: 1,
                      precioUnitario: 0,
                      descuento: 0,
                    },
                  ],
                }))
              }
              className="rounded-lg border border-outline-variant px-3 py-2 text-sm"
            >
              Agregar producto
            </button>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMostrarModalCotizacion(false)}
                className="rounded-lg border border-outline-variant px-4 py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary"
              >
                Guardar Cotizacion
              </button>
            </div>
          </form>
        </div>
      )}

      {mostrarModalPago && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <form
            onSubmit={submitPago}
            className="w-full max-w-lg space-y-4 rounded-2xl border border-outline-variant bg-white p-5"
          >
            <h2 className="text-lg font-black text-on-surface">Registrar Pago</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                type="date"
                required
                value={pagoForm.fecha}
                onChange={(e) => setPagoForm((prev) => ({ ...prev, fecha: e.target.value }))}
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              />
              <input
                type="number"
                min={0}
                step="0.01"
                required
                placeholder="Monto"
                value={pagoForm.monto}
                onChange={(e) => setPagoForm((prev) => ({ ...prev, monto: e.target.value }))}
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              />

              <select
                value={pagoForm.metodoPago}
                onChange={(e) =>
                  setPagoForm((prev) => ({ ...prev, metodoPago: e.target.value as MetodoPago }))
                }
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              >
                {Object.values(MetodoPago).map((metodo) => (
                  <option key={metodo} value={metodo}>
                    {metodo}
                  </option>
                ))}
              </select>

              <input
                placeholder="Referencia"
                value={pagoForm.referencia}
                onChange={(e) => setPagoForm((prev) => ({ ...prev, referencia: e.target.value }))}
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMostrarModalPago(false)}
                className="rounded-lg border border-outline-variant px-4 py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary"
              >
                Registrar
              </button>
            </div>
          </form>
        </div>
      )}

      {previewCotizacion && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-outline-variant bg-white p-5">
            <h3 className="mb-3 text-lg font-black text-on-surface">Previsualizacion Cotizacion</h3>
            <pre className="max-h-[70vh] overflow-auto rounded-lg bg-surface-container-low p-4 text-xs">
              {previewCotizacion}
            </pre>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setPreviewCotizacion(null)}
                className="rounded-lg border border-outline-variant px-4 py-2 text-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {detallePedido && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-outline-variant bg-white p-5">
            <h3 className="text-lg font-black text-on-surface">
              Detalle Pedido {detallePedido.numero}
            </h3>
            <p className="mt-1 text-sm text-on-surface-variant">
              Cliente: {nombreCliente(detallePedido.cliente, detallePedido.clienteId)}
            </p>
            <div className="mt-4 space-y-2">
              {(detallePedido.detalles ?? []).map((item, index) => (
                <div
                  key={`${item.varianteId}-${index}`}
                  className="rounded-lg border border-outline-variant p-3"
                >
                  <p className="font-bold text-on-surface">{item.descripcion}</p>
                  <p className="text-sm text-on-surface-variant">
                    {item.cantidad} x {formatCOP.format(Number(item.precioUnitario || 0))} |
                    Subtotal: {formatCOP.format(Number(item.subtotal || 0))}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setDetallePedido(null)}
                className="rounded-lg border border-outline-variant px-4 py-2 text-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
