import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { MetodoPago } from '@cosmeticos/shared-types';

type TabComercial = 'cotizaciones' | 'pedidos' | 'facturas';

type EstadoCotizacion =
  | 'BORRADOR'
  | 'ENVIADA'
  | 'ACEPTADA'
  | 'RECHAZADA'
  | 'VENCIDA'
  | 'CONVERTIDA';

type EstadoPedido =
  | 'PENDIENTE'
  | 'CONFIRMADO'
  | 'EN_PREPARACION'
  | 'LISTO'
  | 'DESPACHADO'
  | 'ENTREGADO'
  | 'CANCELADO';

type EstadoFactura =
  | 'BORRADOR'
  | 'EMITIDA'
  | 'ENVIADA'
  | 'PAGADA'
  | 'PAGADA_PARCIAL'
  | 'VENCIDA'
  | 'ANULADA';

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
  estado: EstadoCotizacion;
  fechaVigencia: string;
  total: number;
  subtotal: number;
  descuento: number;
  impuestos: number;
  detalles?: DetalleBase[];
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
  subtotal: number;
  descuento: number;
  impuestos: number;
  detalles?: DetalleBase[];
};

type Factura = {
  id: string;
  numero: string;
  clienteId: string;
  cliente?: Cliente;
  estado: EstadoFactura;
  fechaEmision: string;
  fechaVencimiento: string;
  total: number;
  saldo: number;
};

type ProductoPos = {
  id: string;
  nombre: string;
  variantes: Array<{ id: string; nombre: string; precio: number }>;
};

type Paginado<T> = {
  items: T[];
  total: number;
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
    queryKey: ['comercial-clientes'],
    queryFn: async () => {
      const response = await apiClient.get('/clientes', { params: { page: 1, limit: 200 } });
      return extraerItems<Cliente>(response.data);
    },
  });

  const { data: productos = [] } = useQuery({
    queryKey: ['comercial-productos'],
    queryFn: async () => {
      const response = await apiClient.get('/productos', { params: { page: 1, limit: 200 } });
      const items = extraerItems<any>(response.data);
      return items.map(
        (item): ProductoPos => ({
          id: item.id,
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
    queryKey: ['comercial-cotizaciones'],
    queryFn: async () => {
      const response = await apiClient.get('/comercial/cotizaciones', {
        params: { page: 1, limit: 50 },
      });
      return extraerItems<Cotizacion>(response.data);
    },
  });

  const { data: pedidos = [] } = useQuery({
    queryKey: ['comercial-pedidos'],
    queryFn: async () => {
      const response = await apiClient.get('/comercial/pedidos', {
        params: { page: 1, limit: 50 },
      });
      return extraerItems<Pedido>(response.data);
    },
  });

  const { data: facturas = [] } = useQuery({
    queryKey: ['comercial-facturas'],
    queryFn: async () => {
      const response = await apiClient.get('/comercial/facturas', {
        params: { page: 1, limit: 50 },
      });
      return extraerItems<Factura>(response.data);
    },
  });

  const { data: cuentasPorCobrar = [] } = useQuery({
    queryKey: ['comercial-cuentas-por-cobrar'],
    queryFn: async () => {
      const response = await apiClient.get<Factura[]>('/comercial/facturas/cuentas-por-cobrar');
      return response.data;
    },
  });

  const crearCotizacionMutation = useMutation({
    mutationFn: async (payload: CotizacionForm) => {
      await apiClient.post('/comercial/cotizaciones', payload);
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
      queryClient.invalidateQueries({ queryKey: ['comercial-cotizaciones'] });
    },
  });

  const eliminarCotizacionMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/comercial/cotizaciones/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comercial-cotizaciones'] });
    },
  });

  const convertirCotizacionMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(`/comercial/cotizaciones/${id}/convertir-pedido`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comercial-cotizaciones'] });
      queryClient.invalidateQueries({ queryKey: ['comercial-pedidos'] });
      setTab('pedidos');
    },
  });

  const avanzarEstadoPedidoMutation = useMutation({
    mutationFn: async ({ id, estado }: { id: string; estado: EstadoPedido }) => {
      await apiClient.patch(`/comercial/pedidos/${id}/estado`, { estado });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comercial-pedidos'] });
    },
  });

  const convertirPedidoMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(`/comercial/pedidos/${id}/convertir-factura`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comercial-pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['comercial-facturas'] });
      queryClient.invalidateQueries({ queryKey: ['comercial-cuentas-por-cobrar'] });
      setTab('facturas');
    },
  });

  const registrarPagoMutation = useMutation({
    mutationFn: async (payload: PagoForm) => {
      await apiClient.post(`/comercial/facturas/${payload.facturaId}/pagos`, {
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
      queryClient.invalidateQueries({ queryKey: ['comercial-facturas'] });
      queryClient.invalidateQueries({ queryKey: ['comercial-cuentas-por-cobrar'] });
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
    const response = await apiClient.get<string>(`/comercial/cotizaciones/${id}/pdf`);
    setPreviewCotizacion(response.data);
  };

  const abrirDetallePedido = async (id: string) => {
    const response = await apiClient.get<Pedido>(`/comercial/pedidos/${id}`);
    setDetallePedido(response.data);
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
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-on-background">Comercial</h1>
            <p className="text-sm text-on-surface-variant">
              Flujo integral de cotizaciones, pedidos, facturas y cobros.
            </p>
          </div>
          <div className="inline-flex rounded-xl border border-outline-variant bg-surface p-1">
            <button
              onClick={() => setTab('cotizaciones')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                tab === 'cotizaciones' ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
              }`}
            >
              Cotizaciones
            </button>
            <button
              onClick={() => setTab('pedidos')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                tab === 'pedidos' ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
              }`}
            >
              Pedidos
            </button>
            <button
              onClick={() => setTab('facturas')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                tab === 'facturas' ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
              }`}
            >
              Facturas
            </button>
          </div>
        </div>

        {tab === 'cotizaciones' ? (
          <>
            <div className="flex justify-end">
              <button
                onClick={() => setMostrarModalCotizacion(true)}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary"
              >
                Nueva Cotizacion
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-outline-variant bg-surface">
              <table className="min-w-full text-sm">
                <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-on-surface-variant">
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
                    <tr key={cotizacion.id} className="border-t border-outline-variant">
                      <td className="px-4 py-3 font-semibold text-on-background">
                        {cotizacion.numero}
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant">
                        {nombreCliente(cotizacion.cliente, cotizacion.clienteId)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-secondary-container px-2 py-1 text-xs font-semibold text-on-secondary-container">
                          {cotizacion.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-on-background">
                        {formatCOP.format(Number(cotizacion.total || 0))}
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant">
                        {toDateInput(cotizacion.fechaVigencia)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => void abrirPreviewCotizacion(cotizacion.id)}
                            className="rounded-lg border border-outline-variant px-2 py-1 text-xs font-semibold"
                          >
                            Ver
                          </button>
                          <button
                            onClick={() => convertirCotizacionMutation.mutate(cotizacion.id)}
                            className="rounded-lg border border-primary px-2 py-1 text-xs font-semibold text-primary"
                          >
                            Convertir a Pedido
                          </button>
                          <button
                            onClick={() => eliminarCotizacionMutation.mutate(cotizacion.id)}
                            className="rounded-lg border border-error px-2 py-1 text-xs font-semibold text-error"
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
        ) : null}

        {tab === 'pedidos' ? (
          <div className="overflow-x-auto rounded-xl border border-outline-variant bg-surface">
            <table className="min-w-full text-sm">
              <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-on-surface-variant">
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
                    <tr key={pedido.id} className="border-t border-outline-variant align-top">
                      <td className="px-4 py-3 font-semibold text-on-background">
                        {pedido.numero}
                      </td>
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
                              className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                                ESTADOS_PEDIDO_FLUJO.indexOf(estado) <=
                                ESTADOS_PEDIDO_FLUJO.indexOf(pedido.estado)
                                  ? 'bg-primary-container text-on-primary-container'
                                  : 'bg-surface-2 text-on-surface-variant'
                              }`}
                            >
                              {estado}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-on-background">
                        {formatCOP.format(Number(pedido.total || 0))}
                      </td>
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
                            className="rounded-lg border border-primary px-2 py-1 text-xs font-semibold text-primary disabled:opacity-40"
                          >
                            Avanzar estado
                          </button>
                          <button
                            onClick={() => void abrirDetallePedido(pedido.id)}
                            className="rounded-lg border border-outline-variant px-2 py-1 text-xs font-semibold"
                          >
                            Ver detalle
                          </button>
                          <button
                            onClick={() => convertirPedidoMutation.mutate(pedido.id)}
                            className="rounded-lg border border-secondary px-2 py-1 text-xs font-semibold text-secondary"
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
        ) : null}

        {tab === 'facturas' ? (
          <>
            <div className="rounded-xl border border-outline-variant bg-surface p-4">
              <p className="text-xs uppercase tracking-wide text-on-surface-variant">
                Total cuentas por cobrar
              </p>
              <p className="text-2xl font-bold text-on-background">
                {formatCOP.format(totalCuentasPorCobrar)}
              </p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-outline-variant bg-surface">
              <table className="min-w-full text-sm">
                <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-on-surface-variant">
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
                    <tr key={factura.id} className="border-t border-outline-variant">
                      <td className="px-4 py-3 font-semibold text-on-background">
                        {factura.numero}
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant">
                        {nombreCliente(factura.cliente, factura.clienteId)}
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant">
                        {toDateInput(factura.fechaEmision)}
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant">
                        {toDateInput(factura.fechaVencimiento)}
                      </td>
                      <td className="px-4 py-3 text-on-background">
                        {formatCOP.format(Number(factura.total || 0))}
                      </td>
                      <td
                        className={`px-4 py-3 font-semibold ${
                          Number(factura.saldo || 0) > 0 ? 'text-error' : 'text-success'
                        }`}
                      >
                        {formatCOP.format(Number(factura.saldo || 0))}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-secondary-container px-2 py-1 text-xs font-semibold text-on-secondary-container">
                          {factura.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            setPagoForm((prev) => ({ ...prev, facturaId: factura.id }));
                            setMostrarModalPago(true);
                          }}
                          className="rounded-lg border border-primary px-2 py-1 text-xs font-semibold text-primary"
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
        ) : null}
      </div>

      {mostrarModalCotizacion ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <form
            onSubmit={submitNuevaCotizacion}
            className="w-full max-w-4xl space-y-4 rounded-2xl border border-outline-variant bg-surface p-5"
          >
            <h2 className="text-lg font-bold text-on-background">Nueva Cotizacion</h2>
            <div className="grid gap-3 md:grid-cols-3">
              <select
                required
                value={cotizacionForm.clienteId}
                onChange={(e) =>
                  setCotizacionForm((prev) => ({ ...prev, clienteId: e.target.value }))
                }
                className="rounded-lg border border-outline-variant bg-surface-2 px-3 py-2 text-sm"
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
                className="rounded-lg border border-outline-variant bg-surface-2 px-3 py-2 text-sm"
              />

              <input
                placeholder="Notas cliente"
                value={cotizacionForm.notasCliente}
                onChange={(e) =>
                  setCotizacionForm((prev) => ({ ...prev, notasCliente: e.target.value }))
                }
                className="rounded-lg border border-outline-variant bg-surface-2 px-3 py-2 text-sm"
              />
            </div>

            <div className="overflow-x-auto rounded-lg border border-outline-variant">
              <table className="min-w-full text-sm">
                <thead className="bg-surface-2 text-xs uppercase tracking-wide text-on-surface-variant">
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
                    <tr key={`linea-${index}`} className="border-t border-outline-variant">
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
                          className="w-full rounded-lg border border-outline-variant bg-surface-2 px-2 py-1"
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
                          className="w-24 rounded-lg border border-outline-variant bg-surface-2 px-2 py-1"
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
                          className="w-28 rounded-lg border border-outline-variant bg-surface-2 px-2 py-1"
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
                          className="w-28 rounded-lg border border-outline-variant bg-surface-2 px-2 py-1"
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
                          className="rounded-lg border border-error px-2 py-1 text-xs font-semibold text-error"
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
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary"
              >
                Guardar Cotizacion
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {mostrarModalPago ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <form
            onSubmit={submitPago}
            className="w-full max-w-lg space-y-4 rounded-2xl border border-outline-variant bg-surface p-5"
          >
            <h2 className="text-lg font-bold text-on-background">Registrar Pago</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                type="date"
                required
                value={pagoForm.fecha}
                onChange={(e) => setPagoForm((prev) => ({ ...prev, fecha: e.target.value }))}
                className="rounded-lg border border-outline-variant bg-surface-2 px-3 py-2 text-sm"
              />
              <input
                type="number"
                min={0}
                step="0.01"
                required
                placeholder="Monto"
                value={pagoForm.monto}
                onChange={(e) => setPagoForm((prev) => ({ ...prev, monto: e.target.value }))}
                className="rounded-lg border border-outline-variant bg-surface-2 px-3 py-2 text-sm"
              />

              <select
                value={pagoForm.metodoPago}
                onChange={(e) =>
                  setPagoForm((prev) => ({ ...prev, metodoPago: e.target.value as MetodoPago }))
                }
                className="rounded-lg border border-outline-variant bg-surface-2 px-3 py-2 text-sm"
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
                className="rounded-lg border border-outline-variant bg-surface-2 px-3 py-2 text-sm"
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
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary"
              >
                Registrar
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {previewCotizacion ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-outline-variant bg-surface p-5">
            <h3 className="mb-3 text-lg font-bold text-on-background">
              Previsualizacion Cotizacion
            </h3>
            <pre className="max-h-[70vh] overflow-auto rounded-lg bg-surface-2 p-4 text-xs text-on-surface">
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
      ) : null}

      {detallePedido ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-outline-variant bg-surface p-5">
            <h3 className="text-lg font-bold text-on-background">
              Detalle Pedido {detallePedido.numero}
            </h3>
            <p className="mt-1 text-sm text-on-surface-variant">
              Cliente: {nombreCliente(detallePedido.cliente, detallePedido.clienteId)}
            </p>
            <div className="mt-4 space-y-2">
              {(detallePedido.detalles ?? []).map((item, index) => (
                <div
                  key={`${item.varianteId}-${index}`}
                  className="rounded-lg border border-outline-variant p-3 text-sm"
                >
                  <p className="font-semibold text-on-background">{item.descripcion}</p>
                  <p className="text-on-surface-variant">
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
      ) : null}
    </div>
  );
}
