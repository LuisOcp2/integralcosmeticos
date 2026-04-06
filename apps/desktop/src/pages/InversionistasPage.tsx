import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AppLayout from './components/AppLayout';
import api from '../lib/api';

type Portafolio = {
  id: string;
  nombre: string;
  activo: boolean;
};

type ResumenItem = {
  id: string;
  nombre: string;
  tipo: string;
  cantidadUnidades: number;
  precioActual: number;
  gananciaRelativa: number;
};

type ResumenPortafolio = {
  valorCosto: number;
  valorActual: number;
  gananciaAbsoluta: number;
  gananciaRelativa: number;
  items: ResumenItem[];
};

export default function InversionistasPage() {
  const queryClient = useQueryClient();
  const [portafolioId, setPortafolioId] = useState<string>('');

  const portafoliosQuery = useQuery({
    queryKey: ['inversionistas', 'portafolios'],
    queryFn: async () => {
      const { data } = await api.get<Portafolio[]>('/verticales/inversionistas/portafolios');
      return data;
    },
  });

  const resumenQuery = useQuery({
    queryKey: ['inversionistas', 'resumen', portafolioId],
    enabled: Boolean(portafolioId),
    queryFn: async () => {
      const { data } = await api.get<ResumenPortafolio>(
        `/verticales/inversionistas/portafolios/${portafolioId}/resumen`,
      );
      return data;
    },
  });

  const items = resumenQuery.data?.items ?? [];

  const actualizarPreciosMutation = useMutation({
    mutationFn: async () => {
      if (!portafolioId || items.length === 0) return;
      await api.patch(`/verticales/inversionistas/portafolios/${portafolioId}/actualizar-precios`, {
        items: items.map((item) => ({ itemId: item.id, precioActual: item.precioActual })),
      });
    },
    onSuccess: () => {
      if (!portafolioId) return;
      void queryClient.invalidateQueries({ queryKey: ['inversionistas', 'resumen', portafolioId] });
    },
  });

  const resumen = resumenQuery.data;

  const tarjetaResumen = useMemo(
    () => [
      { label: 'Valor costo', value: resumen?.valorCosto ?? 0 },
      { label: 'Valor actual', value: resumen?.valorActual ?? 0 },
      { label: 'Ganancia', value: resumen?.gananciaAbsoluta ?? 0 },
      { label: 'Ganancia %', value: resumen?.gananciaRelativa ?? 0, isPercent: true },
    ],
    [resumen],
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-on-secondary-fixed">
              Inversionistas
            </h1>
            <p className="mt-1 text-secondary">Resumen de portafolio y evolución por item.</p>
          </div>
          <select
            value={portafolioId}
            onChange={(e) => setPortafolioId(e.target.value)}
            className="rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm"
          >
            <option value="">Selecciona un portafolio</option>
            {(portafoliosQuery.data ?? []).map((portafolio) => (
              <option key={portafolio.id} value={portafolio.id}>
                {portafolio.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {tarjetaResumen.map((card) => {
            const value = card.isPercent
              ? `${Number(card.value).toFixed(2)}%`
              : `$${Number(card.value).toLocaleString('es-CO')}`;
            const positive = Number(card.value) >= 0;

            return (
              <div
                key={card.label}
                className="rounded-xl border border-outline-variant bg-white p-4"
              >
                <div className="text-xs font-bold uppercase tracking-wide text-secondary">
                  {card.label}
                </div>
                <div
                  className={`mt-2 text-2xl font-black ${card.isPercent ? (positive ? 'text-emerald-600' : 'text-rose-600') : 'text-on-surface'}`}
                >
                  {value}
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-xl border border-outline-variant bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-black text-on-surface">Items del portafolio</h2>
            <button
              onClick={() => actualizarPreciosMutation.mutate()}
              disabled={!portafolioId || items.length === 0}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary disabled:opacity-50"
            >
              Sincronizar precios
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant text-left text-secondary">
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Unidades</th>
                  <th className="px-3 py-2">Precio actual</th>
                  <th className="px-3 py-2">Ganancia %</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const profit = Number(item.gananciaRelativa ?? 0);
                  const profitClass = profit >= 0 ? 'text-emerald-600' : 'text-rose-600';

                  return (
                    <tr key={item.id} className="border-b border-outline-variant">
                      <td className="px-3 py-2 font-semibold text-on-surface">{item.nombre}</td>
                      <td className="px-3 py-2 text-on-surface-variant">{item.tipo}</td>
                      <td className="px-3 py-2 text-on-surface-variant">
                        {Number(item.cantidadUnidades).toLocaleString('es-CO')}
                      </td>
                      <td className="px-3 py-2 text-on-surface-variant">
                        ${Number(item.precioActual).toLocaleString('es-CO')}
                      </td>
                      <td className={`px-3 py-2 font-bold ${profitClass}`}>{profit.toFixed(2)}%</td>
                    </tr>
                  );
                })}
                {portafolioId && items.length === 0 && (
                  <tr>
                    <td className="px-3 py-6 text-center text-on-surface-variant" colSpan={5}>
                      No hay items en este portafolio.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
