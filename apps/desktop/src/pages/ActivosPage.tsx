import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AppLayout from './components/AppLayout';
import api from '../lib/api';

type EstadoActivo = 'ACTIVO' | 'EN_MANTENIMIENTO' | 'DADO_DE_BAJA' | 'ROBADO';

type ActivoItem = {
  id: string;
  codigo: string;
  nombre: string;
  estado: EstadoActivo;
  valorActual: number;
  categoria?: { id: string; nombre: string } | null;
  sede?: { id: string; nombre: string } | null;
  custodio?: { id: string; nombre: string; apellido: string } | null;
  proximoMantenimiento?: string | null;
};

type Paginado<T> = {
  items: T[];
  total: number;
};

type SedeItem = { id: string; nombre: string };
type EmpleadoItem = { id: string; nombre: string; apellido: string };

type MovimientoActivo = {
  id: string;
  tipo: 'ALTA' | 'BAJA' | 'TRASLADO' | 'MANTENIMIENTO';
  descripcion: string;
  fecha: string;
  realizadoPor?: { nombre?: string; apellido?: string; email?: string } | null;
};

const formatCOP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const estadoClass: Record<EstadoActivo, string> = {
  ACTIVO: 'bg-emerald-100 text-emerald-700',
  EN_MANTENIMIENTO: 'bg-amber-100 text-amber-700',
  DADO_DE_BAJA: 'bg-slate-200 text-slate-700',
  ROBADO: 'bg-rose-100 text-rose-700',
};

export default function ActivosPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'activos' | 'mantenimientos'>('activos');
  const [activoTraslado, setActivoTraslado] = useState<ActivoItem | null>(null);
  const [activoBaja, setActivoBaja] = useState<ActivoItem | null>(null);
  const [activoHistorial, setActivoHistorial] = useState<ActivoItem | null>(null);

  const [trasladoForm, setTrasladoForm] = useState({
    sedeDestinoId: '',
    custodioDestinoId: '',
    descripcion: '',
  });
  const [motivoBaja, setMotivoBaja] = useState('');

  const activosQuery = useQuery({
    queryKey: ['activos-list'],
    queryFn: async () => {
      const { data } = await api.get<Paginado<ActivoItem>>('/activos', {
        params: { page: 1, limit: 100 },
      });
      return data;
    },
  });

  const mantenimientosQuery = useQuery({
    queryKey: ['activos-mantenimientos-proximos'],
    queryFn: async () => {
      const { data } = await api.get<ActivoItem[]>('/activos/mantenimientos-proximos', {
        params: { dias: 30 },
      });
      return data;
    },
  });

  const historialQuery = useQuery({
    queryKey: ['activo-historial', activoHistorial?.id],
    enabled: Boolean(activoHistorial?.id),
    queryFn: async () => {
      const { data } = await api.get<MovimientoActivo[]>(
        `/activos/${activoHistorial?.id}/historial`,
      );
      return data;
    },
  });

  const sedesQuery = useQuery({
    queryKey: ['activos-sedes'],
    queryFn: async () => {
      const { data } = await api.get<SedeItem[]>('/sedes');
      return data;
    },
  });

  const empleadosQuery = useQuery({
    queryKey: ['activos-empleados'],
    queryFn: async () => {
      const { data } = await api.get<Paginado<EmpleadoItem>>('/activos/empleados', {
        params: { page: 1, limit: 200 },
      });
      return data.items;
    },
  });

  const trasladarMutation = useMutation({
    mutationFn: async () => {
      if (!activoTraslado) return;
      await api.post(`/activos/${activoTraslado.id}/trasladar`, trasladoForm);
    },
    onSuccess: () => {
      setActivoTraslado(null);
      setTrasladoForm({ sedeDestinoId: '', custodioDestinoId: '', descripcion: '' });
      void queryClient.invalidateQueries({ queryKey: ['activos-list'] });
      void queryClient.invalidateQueries({ queryKey: ['activos-mantenimientos-proximos'] });
    },
  });

  const bajaMutation = useMutation({
    mutationFn: async () => {
      if (!activoBaja) return;
      await api.patch(`/activos/${activoBaja.id}/baja`, { motivo: motivoBaja });
    },
    onSuccess: () => {
      setActivoBaja(null);
      setMotivoBaja('');
      void queryClient.invalidateQueries({ queryKey: ['activos-list'] });
      void queryClient.invalidateQueries({ queryKey: ['activos-mantenimientos-proximos'] });
    },
  });

  const activos = activosQuery.data?.items ?? [];
  const mantenimientos = mantenimientosQuery.data ?? [];

  const alertasMantenimiento = useMemo(
    () =>
      mantenimientos.map((item) => ({
        ...item,
        diasRestantes: item.proximoMantenimiento
          ? Math.ceil(
              (new Date(item.proximoMantenimiento).getTime() - new Date().getTime()) /
                (1000 * 60 * 60 * 24),
            )
          : null,
      })),
    [mantenimientos],
  );

  const submitTraslado = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    trasladarMutation.mutate();
  };

  const submitBaja = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    bajaMutation.mutate();
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-on-secondary-fixed">
              Activos
            </h1>
            <p className="mt-1 font-medium text-secondary">
              Control de activos fijos, traslados y mantenimientos.
            </p>
          </div>
          <div className="inline-flex rounded-xl border border-outline-variant bg-white p-1">
            <button
              onClick={() => setTab('activos')}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                tab === 'activos' ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
              }`}
            >
              Activos
            </button>
            <button
              onClick={() => setTab('mantenimientos')}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                tab === 'mantenimientos' ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
              }`}
            >
              Proximos mantenimientos
            </button>
          </div>
        </div>

        {tab === 'activos' ? (
          <div className="overflow-x-auto rounded-xl border border-outline-variant bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-surface-container text-left text-xs uppercase tracking-wide text-on-surface-variant">
                <tr>
                  <th className="px-4 py-3">Codigo</th>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Sede</th>
                  <th className="px-4 py-3">Custodio</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Valor actual</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {activos.map((activo) => (
                  <tr key={activo.id} className="border-t border-outline-variant/30">
                    <td className="px-4 py-3 font-semibold text-on-surface">{activo.codigo}</td>
                    <td className="px-4 py-3 text-on-surface">{activo.nombre}</td>
                    <td className="px-4 py-3 text-on-surface-variant">
                      {activo.categoria?.nombre ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">
                      {activo.sede?.nombre ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">
                      {activo.custodio
                        ? `${activo.custodio.nombre} ${activo.custodio.apellido}`
                        : 'Sin custodio'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-bold ${estadoClass[activo.estado]}`}
                      >
                        {activo.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-on-surface">
                      {formatCOP.format(Number(activo.valorActual || 0))}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => {
                            setActivoTraslado(activo);
                            setTrasladoForm((prev) => ({
                              ...prev,
                              descripcion: `Traslado de ${activo.codigo}`,
                            }));
                          }}
                          className="rounded-lg border border-primary px-3 py-1.5 text-xs font-bold text-primary"
                        >
                          Trasladar
                        </button>
                        <button
                          onClick={() => setActivoBaja(activo)}
                          className="rounded-lg border border-error px-3 py-1.5 text-xs font-bold text-error"
                        >
                          Dar de baja
                        </button>
                        <button
                          onClick={() => setActivoHistorial(activo)}
                          className="rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-bold"
                        >
                          Ver historial
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!activosQuery.isLoading && activos.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-on-surface-variant">
                      No hay activos para mostrar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="space-y-3">
            {alertasMantenimiento.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
              >
                <p className="font-bold">
                  {item.codigo} - {item.nombre}
                </p>
                <p className="mt-0.5">
                  Sede: {item.sede?.nombre ?? '-'} | Fecha mantenimiento:{' '}
                  {item.proximoMantenimiento?.slice(0, 10) ?? '-'}
                  {typeof item.diasRestantes === 'number' ? ` (${item.diasRestantes} dias)` : ''}
                </p>
              </div>
            ))}
            {!mantenimientosQuery.isLoading && alertasMantenimiento.length === 0 && (
              <div className="rounded-xl border border-outline-variant bg-white px-4 py-8 text-center text-on-surface-variant">
                No hay mantenimientos proximos en los proximos 30 dias.
              </div>
            )}
          </div>
        )}
      </div>

      {activoTraslado && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <form
            onSubmit={submitTraslado}
            className="w-full max-w-lg space-y-4 rounded-2xl border border-outline-variant bg-white p-5"
          >
            <h2 className="text-lg font-black text-on-surface">
              Trasladar activo {activoTraslado.codigo}
            </h2>
            <div className="grid gap-3">
              <select
                required
                value={trasladoForm.sedeDestinoId}
                onChange={(e) =>
                  setTrasladoForm((prev) => ({ ...prev, sedeDestinoId: e.target.value }))
                }
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              >
                <option value="">Seleccionar sede destino</option>
                {(sedesQuery.data ?? []).map((sede) => (
                  <option key={sede.id} value={sede.id}>
                    {sede.nombre}
                  </option>
                ))}
              </select>

              <select
                required
                value={trasladoForm.custodioDestinoId}
                onChange={(e) =>
                  setTrasladoForm((prev) => ({ ...prev, custodioDestinoId: e.target.value }))
                }
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              >
                <option value="">Seleccionar custodio destino</option>
                {(empleadosQuery.data ?? []).map((empleado) => (
                  <option key={empleado.id} value={empleado.id}>
                    {empleado.nombre} {empleado.apellido}
                  </option>
                ))}
              </select>

              <textarea
                required
                value={trasladoForm.descripcion}
                onChange={(e) =>
                  setTrasladoForm((prev) => ({ ...prev, descripcion: e.target.value }))
                }
                rows={4}
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
                placeholder="Descripcion del traslado"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActivoTraslado(null)}
                className="rounded-lg border border-outline-variant px-4 py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={trasladarMutation.isPending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary disabled:opacity-60"
              >
                {trasladarMutation.isPending ? 'Guardando...' : 'Confirmar traslado'}
              </button>
            </div>
          </form>
        </div>
      )}

      {activoBaja && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <form
            onSubmit={submitBaja}
            className="w-full max-w-md space-y-4 rounded-2xl border border-outline-variant bg-white p-5"
          >
            <h2 className="text-lg font-black text-on-surface">Dar de baja {activoBaja.codigo}</h2>
            <textarea
              required
              value={motivoBaja}
              onChange={(e) => setMotivoBaja(e.target.value)}
              rows={4}
              placeholder="Motivo"
              className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActivoBaja(null)}
                className="rounded-lg border border-outline-variant px-4 py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={bajaMutation.isPending}
                className="rounded-lg bg-error px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                {bajaMutation.isPending ? 'Procesando...' : 'Confirmar baja'}
              </button>
            </div>
          </form>
        </div>
      )}

      {activoHistorial && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-outline-variant bg-white p-5">
            <h2 className="text-lg font-black text-on-surface">
              Historial {activoHistorial.codigo}
            </h2>
            <div className="mt-4 max-h-[60vh] overflow-auto space-y-3">
              {(historialQuery.data ?? []).map((mov) => (
                <div
                  key={mov.id}
                  className="rounded-lg border border-outline-variant px-3 py-2 text-sm"
                >
                  <p className="font-bold text-on-surface">{mov.tipo}</p>
                  <p className="mt-0.5 text-on-surface-variant">{mov.descripcion}</p>
                  <p className="mt-1 text-xs text-on-surface-variant">
                    {new Date(mov.fecha).toLocaleString('es-CO')} -{' '}
                    {`${mov.realizadoPor?.nombre ?? ''} ${mov.realizadoPor?.apellido ?? ''}`.trim() ||
                      mov.realizadoPor?.email ||
                      'Usuario'}
                  </p>
                </div>
              ))}
              {!historialQuery.isLoading && (historialQuery.data ?? []).length === 0 && (
                <p className="text-sm text-on-surface-variant">Sin movimientos registrados.</p>
              )}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setActivoHistorial(null)}
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
