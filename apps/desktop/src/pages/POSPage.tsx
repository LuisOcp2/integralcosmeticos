import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ICliente, IProducto, IVariante, MetodoPago } from '@cosmeticos/shared-types';
import api from '../lib/api';
import { offlineDB } from '../lib/offline.db';
import { useAuthStore } from '../store/auth.store';
import { usePosStore } from '../store/pos.store';
import AppLayout from './components/AppLayout';

const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

async function buscarVariantes(q: string): Promise<IVariante[]> {
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

export default function POSPage() {
  const usuario = useAuthStore((state) => state.usuario);
  const {
    items,
    clienteId,
    metodoPago,
    observaciones,
    agregarItem,
    quitarItem,
    actualizarCantidad,
    aplicarDescuentoItem,
    setCliente,
    setMetodoPago,
    setObservaciones,
    limpiarCarrito,
    calcularTotales,
  } = usePosStore();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [docCliente, setDocCliente] = useState('');
  const [clienteEncontrado, setClienteEncontrado] = useState<ICliente | null>(null);
  const [ultimaVentaId, setUltimaVentaId] = useState<string | null>(null);

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
      setCliente(cliente.id);
    },
    onError: () => {
      setClienteEncontrado(null);
      setCliente(null);
    },
  });

  const crearVentaMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        sedeId: usuario?.sedeId,
        clienteId,
        metodoPago,
        observaciones,
        descuento: 0,
        items: items.map((item) => ({
          varianteId: item.varianteId,
          cantidad: item.cantidad,
          descuentoItem: item.descuentoItem,
        })),
      };

      const { data } = await api.post('/ventas', payload);
      return data;
    },
    onSuccess: (venta) => {
      setUltimaVentaId(venta.id);
      limpiarCarrito();
    },
    onError: async () => {
      const payload = {
        sedeId: usuario?.sedeId,
        clienteId,
        metodoPago,
        observaciones,
        descuento: 0,
        items: items.map((item) => ({
          varianteId: item.varianteId,
          cantidad: item.cantidad,
          descuentoItem: item.descuentoItem,
        })),
      };

      await offlineDB.ventasPendientes.add({
        payload,
        intentos: 0,
        creadoEn: new Date().toISOString(),
      });
      limpiarCarrito();
    },
  });

  const totales = useMemo(() => calcularTotales(), [items, calcularTotales]);

  const handleAgregarVariante = async (variante: IVariante) => {
    const producto = await getProducto(variante.productoId);
    const precio = Number(producto.precioBase) + Number(variante.precioExtra);
    agregarItem(
      {
        varianteId: variante.id,
        nombre: variante.nombre,
        codigoBarras: variante.codigoBarras,
        precioUnitario: precio,
      },
      1,
    );
  };

  const imprimirTicket = async () => {
    if (!ultimaVentaId) {
      return;
    }

    const { data } = await api.get(`/ventas/${ultimaVentaId}/ticket`, {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
    window.open(url, '_blank');
  };

  return (
    <AppLayout>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="space-y-4 rounded-2xl border border-rose-100 bg-white p-4 shadow-sm">
          <div>
            <h1 className="text-2xl font-semibold text-rose-900">Punto de venta</h1>
            <p className="text-sm text-rose-700/70">Busqueda por nombre o codigo de barras.</p>
          </div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar variante por nombre o codigo..."
            className="w-full rounded-lg border border-rose-200 px-3 py-2 focus:border-rose-400 focus:outline-none"
          />

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {(variantesQuery.data ?? []).map((variante) => (
              <article
                key={variante.id}
                className="rounded-xl border border-rose-100 bg-rose-50/40 p-3"
              >
                <h3 className="font-medium text-rose-900">{variante.nombre}</h3>
                <p className="text-xs text-rose-700/70">{variante.codigoBarras}</p>
                <button
                  className="mt-3 rounded-lg bg-rose-600 px-3 py-1.5 text-sm text-white hover:bg-rose-700"
                  onClick={() => void handleAgregarVariante(variante)}
                >
                  Agregar
                </button>
              </article>
            ))}
          </div>

          <div className="rounded-xl border border-rose-100 p-3">
            <label className="mb-1 block text-sm text-rose-800">Cliente por documento</label>
            <div className="flex gap-2">
              <input
                value={docCliente}
                onChange={(e) => setDocCliente(e.target.value)}
                placeholder="Documento"
                className="flex-1 rounded-lg border border-rose-200 px-3 py-2 focus:border-rose-400 focus:outline-none"
              />
              <button
                className="rounded-lg border border-rose-300 px-3 py-2 text-sm text-rose-800 hover:bg-rose-50"
                onClick={() => buscarClienteMutation.mutate(docCliente)}
              >
                Buscar
              </button>
            </div>
            <p className="mt-2 text-xs text-rose-700/70">
              {clienteEncontrado
                ? `Cliente: ${clienteEncontrado.nombre} ${clienteEncontrado.apellido}`
                : 'Sin cliente seleccionado'}
            </p>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-amber-100 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-semibold text-amber-900">Carrito y cobro</h2>

          <div className="max-h-80 space-y-2 overflow-auto">
            {items.map((item) => (
              <div key={item.varianteId} className="rounded-lg border border-amber-100 p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-amber-900">{item.nombre}</p>
                  <button
                    onClick={() => quitarItem(item.varianteId)}
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    Quitar
                  </button>
                </div>
                <p className="text-xs text-amber-700/70">{item.codigoBarras}</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min={1}
                    value={item.cantidad}
                    onChange={(e) =>
                      actualizarCantidad(item.varianteId, Math.max(1, Number(e.target.value)))
                    }
                    className="rounded-lg border border-amber-200 px-2 py-1"
                  />
                  <input
                    type="number"
                    min={0}
                    value={item.descuentoItem}
                    onChange={(e) =>
                      aplicarDescuentoItem(item.varianteId, Math.max(0, Number(e.target.value)))
                    }
                    className="rounded-lg border border-amber-200 px-2 py-1"
                  />
                </div>
                <p className="mt-2 text-sm text-amber-900">
                  {copFormatter.format(item.precioUnitario * item.cantidad - item.descuentoItem)}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3 text-sm text-amber-900">
            <p>Subtotal: {copFormatter.format(totales.subtotal)}</p>
            <p>Descuento: {copFormatter.format(totales.descuento)}</p>
            <p>IVA (19%): {copFormatter.format(totales.impuesto)}</p>
            <p className="mt-1 text-lg font-semibold">
              TOTAL: {copFormatter.format(totales.total)}
            </p>
          </div>

          <div>
            <p className="mb-2 text-sm text-amber-800">Metodo de pago</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                MetodoPago.EFECTIVO,
                MetodoPago.TARJETA_CREDITO,
                MetodoPago.TARJETA_DEBITO,
                MetodoPago.TRANSFERENCIA,
              ].map((metodo) => (
                <button
                  key={metodo}
                  onClick={() => setMetodoPago(metodo)}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    metodoPago === metodo
                      ? 'border-amber-600 bg-amber-600 text-white'
                      : 'border-amber-200 text-amber-800 hover:bg-amber-50'
                  }`}
                >
                  {metodo}
                </button>
              ))}
            </div>
          </div>

          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Observaciones"
            className="w-full rounded-lg border border-amber-200 px-3 py-2 focus:border-amber-400 focus:outline-none"
          />

          <div className="flex gap-2">
            <button
              onClick={() => crearVentaMutation.mutate()}
              disabled={!items.length || !usuario?.sedeId}
              className="flex-1 rounded-lg bg-amber-600 px-3 py-2 font-medium text-white hover:bg-amber-700 disabled:opacity-60"
            >
              COBRAR
            </button>
            <button
              onClick={() => void imprimirTicket()}
              disabled={!ultimaVentaId}
              className="rounded-lg border border-amber-300 px-3 py-2 text-sm text-amber-800 hover:bg-amber-50 disabled:opacity-60"
            >
              Imprimir Ticket
            </button>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
