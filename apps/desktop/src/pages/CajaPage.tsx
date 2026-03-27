import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ICierreCaja, IVenta } from '@cosmeticos/shared-types';
import api from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import { usePosStore } from '../store/pos.store';
import AppLayout from './components/AppLayout';

const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const fechaHoy = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

async function getCajaActiva(sedeId: string): Promise<ICierreCaja | null> {
  const { data } = await api.get(`/caja/activa/${sedeId}`);
  return data;
}

async function getVentasDia(sedeId: string): Promise<IVenta[]> {
  const { data } = await api.get('/ventas', {
    params: { sedeId, fecha: fechaHoy() },
  });
  return data;
}

export default function CajaPage() {
  const queryClient = useQueryClient();
  const usuario = useAuthStore((state) => state.usuario);
  const setCajaActivaStore = usePosStore((state) => state.setCajaActiva);
  const [montoInicial, setMontoInicial] = useState('0');
  const [montoFinal, setMontoFinal] = useState('0');

  const cajaActivaQuery = useQuery({
    queryKey: ['caja', 'activa', usuario?.sedeId],
    queryFn: () => getCajaActiva(usuario!.sedeId),
    enabled: Boolean(usuario?.sedeId),
  });

  const ventasDiaQuery = useQuery({
    queryKey: ['ventas', 'dia', usuario?.sedeId],
    queryFn: () => getVentasDia(usuario!.sedeId),
    enabled: Boolean(usuario?.sedeId) && Boolean(cajaActivaQuery.data),
  });

  const abrirCajaMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/caja/abrir', {
        sedeId: usuario?.sedeId,
        montoInicial: Number(montoInicial),
      });
      return data;
    },
    onSuccess: (caja) => {
      setCajaActivaStore(caja);
      void queryClient.invalidateQueries({ queryKey: ['caja', 'activa', usuario?.sedeId] });
    },
  });

  const cerrarCajaMutation = useMutation({
    mutationFn: async () => {
      const caja = cajaActivaQuery.data;
      if (!caja) {
        return null;
      }
      const { data } = await api.post(`/caja/${caja.id}/cerrar`, {
        montoFinal: Number(montoFinal),
      });
      return data;
    },
    onSuccess: () => {
      setCajaActivaStore(null);
      void queryClient.invalidateQueries({ queryKey: ['caja', 'activa', usuario?.sedeId] });
      void queryClient.invalidateQueries({ queryKey: ['ventas', 'dia', usuario?.sedeId] });
    },
  });

  const cajaActiva = cajaActivaQuery.data;

  const esperado = useMemo(() => {
    if (!cajaActiva) {
      return 0;
    }
    return Number(cajaActiva.montoInicial) + Number(cajaActiva.totalEfectivo);
  }, [cajaActiva]);

  const diferenciaPreview = Number(montoFinal || 0) - esperado;

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
          <h1 className="text-2xl font-semibold text-emerald-900">Caja</h1>
          <p className="text-sm text-emerald-700/70">Apertura, monitoreo y cierre diario.</p>
        </div>

        {!cajaActiva ? (
          <div className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-medium text-emerald-900">Abrir caja</h2>
            <div className="mt-3 flex max-w-sm gap-2">
              <input
                type="number"
                min={0}
                value={montoInicial}
                onChange={(e) => setMontoInicial(e.target.value)}
                className="flex-1 rounded-lg border border-emerald-200 px-3 py-2"
              />
              <button
                onClick={() => abrirCajaMutation.mutate()}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-white hover:bg-emerald-700"
              >
                Abrir
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
              <p className="text-sm text-emerald-800">
                Caja abierta desde {new Date(cajaActiva.fechaApertura).toLocaleString()}
              </p>
              <p className="text-sm text-emerald-800">
                Monto inicial: {copFormatter.format(Number(cajaActiva.montoInicial))}
              </p>
              <p className="text-sm text-emerald-800">
                Total efectivo: {copFormatter.format(Number(cajaActiva.totalEfectivo))}
              </p>
            </div>

            <div className="overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-sm">
              <div className="border-b border-emerald-100 p-4">
                <h3 className="font-medium text-emerald-900">Ventas del dia</h3>
              </div>
              {ventasDiaQuery.isLoading ? (
                <p className="p-4 text-emerald-700/70">Cargando ventas...</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-emerald-50 text-emerald-800">
                    <tr>
                      <th className="px-4 py-3 text-left">Numero</th>
                      <th className="px-4 py-3 text-left">Metodo</th>
                      <th className="px-4 py-3 text-left">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(ventasDiaQuery.data ?? []).map((venta) => (
                      <tr key={venta.id} className="border-t border-emerald-100">
                        <td className="px-4 py-3">{venta.numero}</td>
                        <td className="px-4 py-3">{venta.metodoPago}</td>
                        <td className="px-4 py-3">{copFormatter.format(Number(venta.total))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
              <h3 className="font-medium text-emerald-900">Cerrar caja</h3>
              <p className="mt-1 text-sm text-emerald-700/80">
                Esperado en caja: {copFormatter.format(esperado)}
              </p>
              <div className="mt-3 flex max-w-md gap-2">
                <input
                  type="number"
                  min={0}
                  value={montoFinal}
                  onChange={(e) => setMontoFinal(e.target.value)}
                  className="flex-1 rounded-lg border border-emerald-200 px-3 py-2"
                />
                <button
                  onClick={() => {
                    const ok = window.confirm(
                      `Confirmar cierre de caja con diferencia ${copFormatter.format(diferenciaPreview)}?`,
                    );
                    if (ok) {
                      cerrarCajaMutation.mutate();
                    }
                  }}
                  className="rounded-lg bg-emerald-700 px-3 py-2 text-white hover:bg-emerald-800"
                >
                  Cerrar Caja
                </button>
              </div>
              <p className="mt-2 text-sm text-emerald-800">
                Diferencia estimada: {copFormatter.format(diferenciaPreview)}
              </p>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
