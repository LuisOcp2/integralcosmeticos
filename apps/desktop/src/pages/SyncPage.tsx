import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AppLayout from './components/AppLayout';
import api from '../lib/api';

interface SyncLogItem {
  id: string;
  tabla: string;
  estado: 'OK' | 'ERROR';
  registrosAfectados: number;
  creadoEn: string;
}

interface SyncStatusResponse {
  pendientes: number;
  completados: number;
  errores: number;
  ultimaSync: string | null;
  historial: SyncLogItem[];
}

async function getSyncStatus(): Promise<SyncStatusResponse> {
  const { data } = await api.get('/sync/status');
  return data;
}

async function forzarSync() {
  const { data } = await api.post('/sync/forzar');
  return data;
}

function formatFecha(value: string) {
  return new Date(value).toLocaleString('es-CO');
}

export default function SyncPage() {
  const queryClient = useQueryClient();

  const syncStatusQuery = useQuery({
    queryKey: ['sync', 'status'],
    queryFn: getSyncStatus,
    refetchInterval: 30000,
  });

  const forzarSyncMutation = useMutation({
    mutationFn: forzarSync,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['sync', 'status'] });
    },
  });

  const status = syncStatusQuery.data;
  const estadoCard =
    status?.errores && status.errores > 0
      ? { icono: '❌', texto: 'Error' }
      : status?.pendientes && status.pendientes > 0
        ? { icono: '⏳', texto: 'Pendiente' }
        : { icono: '✅', texto: 'Sincronizado' };

  return (
    <AppLayout>
      <div className="space-y-4">
        <section className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-sky-900">Sincronizacion cloud</h1>
              <p className="text-sm text-sky-700/80">
                Estado en tiempo real de cola, errores y ultimas operaciones.
              </p>
            </div>
            <button
              onClick={() => forzarSyncMutation.mutate()}
              disabled={forzarSyncMutation.isPending}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {forzarSyncMutation.isPending ? 'Encolando...' : 'Forzar Sync ahora'}
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-600">Estado actual</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-700">
              {estadoCard.icono} {estadoCard.texto}
            </p>
            {status?.ultimaSync ? (
              <p className="mt-2 text-xs text-slate-500">
                Ultima sync: {formatFecha(status.ultimaSync)}
              </p>
            ) : (
              <p className="mt-2 text-xs text-slate-500">Sin sincronizaciones recientes</p>
            )}
          </article>

          <article className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-600">Registros pendientes</p>
            <p className="mt-1 text-2xl font-semibold text-amber-700">{status?.pendientes ?? 0}</p>
          </article>

          <article className="rounded-2xl border border-rose-100 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-600">Errores acumulados</p>
            <p className="mt-1 text-2xl font-semibold text-rose-700">{status?.errores ?? 0}</p>
          </article>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-medium text-slate-900">Ultimas 10 sincronizaciones</h2>
            {syncStatusQuery.isFetching ? (
              <span className="text-xs text-slate-500">Actualizando...</span>
            ) : null}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-3 py-2 text-left">Tabla</th>
                  <th className="px-3 py-2 text-left">Estado</th>
                  <th className="px-3 py-2 text-left">Fecha</th>
                  <th className="px-3 py-2 text-left">Registros afectados</th>
                </tr>
              </thead>
              <tbody>
                {(status?.historial ?? []).map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">{item.tabla}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          item.estado === 'OK'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {item.estado}
                      </span>
                    </td>
                    <td className="px-3 py-2">{formatFecha(item.creadoEn)}</td>
                    <td className="px-3 py-2">{item.registrosAfectados}</td>
                  </tr>
                ))}
                {!status?.historial?.length ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-slate-500">
                      Sin registros de sincronizacion.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
