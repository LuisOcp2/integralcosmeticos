import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AppLayout from './components/AppLayout';
import api from '../lib/api';

type Plan = 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
type EstadoEmpresa = 'ACTIVA' | 'SUSPENDIDA' | 'TRIAL' | 'CANCELADA';
type ResultadoLog = 'EXITO' | 'ERROR';

type Empresa = {
  id: string;
  nombre: string;
  nit: string;
  email?: string;
  estado: EstadoEmpresa;
  plan: Plan;
  usuariosActivos: number;
  vencimientoEn?: string | null;
};

type Metricas = {
  totalEmpresas: number;
  activas: number;
  nuevasEsteMes: number;
};

type LogActividad = {
  id: string;
  createdAt: string;
  modulo: string;
  accion: string;
  resultado: ResultadoLog;
  error?: string | null;
};

type LogsResponse = {
  data: LogActividad[];
  page: number;
  totalPages: number;
  total: number;
};

const formatDateInput = (value?: string | null) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
};

export default function SuperadminPage() {
  const queryClient = useQueryClient();

  const [logsPage, setLogsPage] = useState(1);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const [formCrearEmpresa, setFormCrearEmpresa] = useState({
    nombre: '',
    nit: '',
    email: '',
    plan: 'STARTER' as Plan,
    adminNombre: '',
    adminEmail: '',
    adminPassword: '',
  });

  const [filtrosLogs, setFiltrosLogs] = useState<{
    modulo: string;
    resultado: '' | ResultadoLog;
    fechaDesde: string;
    fechaHasta: string;
  }>({
    modulo: '',
    resultado: '',
    fechaDesde: '',
    fechaHasta: '',
  });

  const [modalVencimiento, setModalVencimiento] = useState<{
    open: boolean;
    empresaId: string;
    empresaNombre: string;
    plan: Plan;
    vencimientoEn: string;
  }>({
    open: false,
    empresaId: '',
    empresaNombre: '',
    plan: 'STARTER',
    vencimientoEn: '',
  });

  const logsQueryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', String(logsPage));
    params.set('limit', '10');
    if (filtrosLogs.modulo.trim()) params.set('modulo', filtrosLogs.modulo.trim());
    if (filtrosLogs.resultado) params.set('resultado', filtrosLogs.resultado);
    if (filtrosLogs.fechaDesde) params.set('fechaDesde', filtrosLogs.fechaDesde);
    if (filtrosLogs.fechaHasta) params.set('fechaHasta', filtrosLogs.fechaHasta);
    return params.toString();
  }, [logsPage, filtrosLogs]);

  const empresasQuery = useQuery({
    queryKey: ['superadmin', 'empresas'],
    queryFn: async () => {
      const { data } = await api.get<Empresa[]>('/superadmin/empresas');
      return data;
    },
  });

  const metricasQuery = useQuery({
    queryKey: ['superadmin', 'metricas'],
    queryFn: async () => {
      const { data } = await api.get<Metricas>('/superadmin/metricas');
      return data;
    },
  });

  const logsQuery = useQuery({
    queryKey: ['superadmin', 'logs', logsQueryString],
    queryFn: async () => {
      const { data } = await api.get<LogsResponse>(`/superadmin/logs?${logsQueryString}`);
      return data;
    },
  });

  const crearEmpresaMutation = useMutation({
    mutationFn: async () => {
      await api.post('/superadmin/empresas', formCrearEmpresa);
    },
    onSuccess: () => {
      setMensaje('Empresa creada correctamente.');
      setFormCrearEmpresa({
        nombre: '',
        nit: '',
        email: '',
        plan: 'STARTER',
        adminNombre: '',
        adminEmail: '',
        adminPassword: '',
      });
      void queryClient.invalidateQueries({ queryKey: ['superadmin', 'empresas'] });
      void queryClient.invalidateQueries({ queryKey: ['superadmin', 'metricas'] });
    },
    onError: (error: any) => {
      setMensaje(error?.response?.data?.message ?? 'No fue posible crear la empresa.');
    },
  });

  const cambiarPlanMutation = useMutation({
    mutationFn: async ({ empresaId, plan }: { empresaId: string; plan: Plan }) => {
      await api.patch(`/superadmin/empresas/${empresaId}/plan`, { plan });
    },
    onSuccess: () => {
      setMensaje('Plan actualizado.');
      void queryClient.invalidateQueries({ queryKey: ['superadmin', 'empresas'] });
    },
    onError: (error: any) => {
      setMensaje(error?.response?.data?.message ?? 'No fue posible cambiar el plan.');
    },
  });

  const actualizarVencimientoMutation = useMutation({
    mutationFn: async ({
      empresaId,
      plan,
      vencimientoEn,
    }: {
      empresaId: string;
      plan: Plan;
      vencimientoEn: string;
    }) => {
      await api.patch(`/superadmin/empresas/${empresaId}/plan`, {
        plan,
        vencimientoEn: vencimientoEn || undefined,
      });
    },
    onSuccess: () => {
      setMensaje('Vencimiento actualizado.');
      setModalVencimiento((prev) => ({ ...prev, open: false }));
      void queryClient.invalidateQueries({ queryKey: ['superadmin', 'empresas'] });
    },
    onError: (error: any) => {
      setMensaje(error?.response?.data?.message ?? 'No fue posible actualizar vencimiento.');
    },
  });

  const suspenderMutation = useMutation({
    mutationFn: async ({ empresaId, motivo }: { empresaId: string; motivo: string }) => {
      await api.patch(`/superadmin/empresas/${empresaId}/suspender`, { motivo });
    },
    onSuccess: () => {
      setMensaje('Empresa suspendida.');
      void queryClient.invalidateQueries({ queryKey: ['superadmin', 'empresas'] });
      void queryClient.invalidateQueries({ queryKey: ['superadmin', 'metricas'] });
    },
    onError: (error: any) => {
      setMensaje(error?.response?.data?.message ?? 'No fue posible suspender la empresa.');
    },
  });

  const reactivarMutation = useMutation({
    mutationFn: async (empresaId: string) => {
      await api.patch(`/superadmin/empresas/${empresaId}/reactivar`);
    },
    onSuccess: () => {
      setMensaje('Empresa reactivada.');
      void queryClient.invalidateQueries({ queryKey: ['superadmin', 'empresas'] });
      void queryClient.invalidateQueries({ queryKey: ['superadmin', 'metricas'] });
    },
    onError: (error: any) => {
      setMensaje(error?.response?.data?.message ?? 'No fue posible reactivar la empresa.');
    },
  });

  const onSubmitCrearEmpresa = (event: FormEvent) => {
    event.preventDefault();
    setMensaje(null);
    crearEmpresaMutation.mutate();
  };

  const onSuspenderEmpresa = (empresaId: string) => {
    const motivo = window.prompt('Motivo de suspensión', 'Incumplimiento de política o pago');
    if (!motivo || !motivo.trim()) return;
    setMensaje(null);
    suspenderMutation.mutate({ empresaId, motivo: motivo.trim() });
  };

  const onFiltrarLogs = (event: FormEvent) => {
    event.preventDefault();
    setLogsPage(1);
  };

  const clearLogsFilters = () => {
    setFiltrosLogs({ modulo: '', resultado: '', fechaDesde: '', fechaHasta: '' });
    setLogsPage(1);
  };

  const openVencimientoModal = (empresa: Empresa) => {
    setModalVencimiento({
      open: true,
      empresaId: empresa.id,
      empresaNombre: empresa.nombre,
      plan: empresa.plan,
      vencimientoEn: formatDateInput(empresa.vencimientoEn),
    });
  };

  const submitVencimiento = (event: FormEvent) => {
    event.preventDefault();
    if (!modalVencimiento.empresaId) return;
    actualizarVencimientoMutation.mutate({
      empresaId: modalVencimiento.empresaId,
      plan: modalVencimiento.plan,
      vencimientoEn: modalVencimiento.vencimientoEn,
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-on-secondary-fixed">
            Superadmin
          </h1>
          <p className="mt-1 text-secondary">Gestión global multi-empresa.</p>
        </div>

        {mensaje && (
          <div className="rounded-lg border border-outline-variant bg-white px-4 py-3 text-sm text-on-surface">
            {mensaje}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-outline-variant bg-white p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-secondary">Empresas</div>
            <div className="mt-1 text-2xl font-black text-on-surface">
              {metricasQuery.data?.totalEmpresas ?? 0}
            </div>
          </div>
          <div className="rounded-xl border border-outline-variant bg-white p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-secondary">Activas</div>
            <div className="mt-1 text-2xl font-black text-emerald-600">
              {metricasQuery.data?.activas ?? 0}
            </div>
          </div>
          <div className="rounded-xl border border-outline-variant bg-white p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-secondary">
              Nuevas este mes
            </div>
            <div className="mt-1 text-2xl font-black text-on-surface">
              {metricasQuery.data?.nuevasEsteMes ?? 0}
            </div>
          </div>
        </div>

        <form
          onSubmit={onSubmitCrearEmpresa}
          className="grid gap-3 rounded-xl border border-outline-variant bg-white p-4 md:grid-cols-2"
        >
          <h2 className="md:col-span-2 text-lg font-black text-on-surface">Crear empresa</h2>
          <input
            className="rounded-lg border border-outline-variant px-3 py-2"
            placeholder="Nombre de empresa"
            value={formCrearEmpresa.nombre}
            onChange={(e) => setFormCrearEmpresa((prev) => ({ ...prev, nombre: e.target.value }))}
            required
          />
          <input
            className="rounded-lg border border-outline-variant px-3 py-2"
            placeholder="NIT"
            value={formCrearEmpresa.nit}
            onChange={(e) => setFormCrearEmpresa((prev) => ({ ...prev, nit: e.target.value }))}
            required
          />
          <input
            className="rounded-lg border border-outline-variant px-3 py-2"
            placeholder="Email empresa"
            type="email"
            value={formCrearEmpresa.email}
            onChange={(e) => setFormCrearEmpresa((prev) => ({ ...prev, email: e.target.value }))}
            required
          />
          <select
            className="rounded-lg border border-outline-variant px-3 py-2"
            value={formCrearEmpresa.plan}
            onChange={(e) =>
              setFormCrearEmpresa((prev) => ({ ...prev, plan: e.target.value as Plan }))
            }
          >
            <option value="STARTER">STARTER</option>
            <option value="PROFESSIONAL">PROFESSIONAL</option>
            <option value="ENTERPRISE">ENTERPRISE</option>
          </select>
          <input
            className="rounded-lg border border-outline-variant px-3 py-2"
            placeholder="Nombre admin"
            value={formCrearEmpresa.adminNombre}
            onChange={(e) =>
              setFormCrearEmpresa((prev) => ({ ...prev, adminNombre: e.target.value }))
            }
            required
          />
          <input
            className="rounded-lg border border-outline-variant px-3 py-2"
            placeholder="Email admin"
            type="email"
            value={formCrearEmpresa.adminEmail}
            onChange={(e) =>
              setFormCrearEmpresa((prev) => ({ ...prev, adminEmail: e.target.value }))
            }
            required
          />
          <input
            className="rounded-lg border border-outline-variant px-3 py-2"
            placeholder="Password admin"
            type="password"
            minLength={8}
            value={formCrearEmpresa.adminPassword}
            onChange={(e) =>
              setFormCrearEmpresa((prev) => ({ ...prev, adminPassword: e.target.value }))
            }
            required
          />
          <div className="md:col-span-2">
            <button
              className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary disabled:opacity-50"
              disabled={crearEmpresaMutation.isPending}
              type="submit"
            >
              {crearEmpresaMutation.isPending ? 'Creando...' : 'Crear empresa'}
            </button>
          </div>
        </form>

        <div className="rounded-xl border border-outline-variant bg-white p-4">
          <h2 className="mb-3 text-lg font-black text-on-surface">Empresas</h2>
          <div className="space-y-2">
            {(empresasQuery.data ?? []).map((empresa) => (
              <div key={empresa.id} className="rounded-lg border border-outline-variant p-3">
                <div className="font-bold text-on-surface">{empresa.nombre}</div>
                <div className="text-sm text-on-surface-variant">
                  NIT: {empresa.nit} | Plan: {empresa.plan} | Estado: {empresa.estado} | Usuarios
                  activos: {empresa.usuariosActivos}
                  {empresa.vencimientoEn
                    ? ` | Vence: ${formatDateInput(empresa.vencimientoEn)}`
                    : ''}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <select
                    defaultValue={empresa.plan}
                    className="rounded-lg border border-outline-variant px-3 py-2 text-sm"
                    onChange={(e) =>
                      cambiarPlanMutation.mutate({
                        empresaId: empresa.id,
                        plan: e.target.value as Plan,
                      })
                    }
                  >
                    <option value="STARTER">STARTER</option>
                    <option value="PROFESSIONAL">PROFESSIONAL</option>
                    <option value="ENTERPRISE">ENTERPRISE</option>
                  </select>
                  <button
                    onClick={() => openVencimientoModal(empresa)}
                    className="rounded-lg border border-outline-variant px-3 py-2 text-sm font-semibold text-on-surface"
                    type="button"
                  >
                    Editar vencimiento
                  </button>
                  {empresa.estado === 'SUSPENDIDA' ? (
                    <button
                      onClick={() => reactivarMutation.mutate(empresa.id)}
                      className="rounded-lg border border-emerald-300 px-3 py-2 text-sm font-semibold text-emerald-700"
                      type="button"
                      disabled={reactivarMutation.isPending}
                    >
                      Reactivar
                    </button>
                  ) : (
                    <button
                      onClick={() => onSuspenderEmpresa(empresa.id)}
                      className="rounded-lg border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-700"
                      type="button"
                      disabled={suspenderMutation.isPending}
                    >
                      Suspender
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-outline-variant bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-black text-on-surface">Logs de actividad</h2>
            <div className="flex items-center gap-2">
              <button
                className="rounded border px-2 py-1 text-sm disabled:opacity-40"
                disabled={logsPage <= 1}
                onClick={() => setLogsPage((prev) => Math.max(1, prev - 1))}
                type="button"
              >
                Anterior
              </button>
              <span className="text-sm text-on-surface-variant">
                Página {logsQuery.data?.page ?? logsPage}
              </span>
              <button
                className="rounded border px-2 py-1 text-sm disabled:opacity-40"
                disabled={logsPage >= (logsQuery.data?.totalPages ?? 1)}
                onClick={() => setLogsPage((prev) => prev + 1)}
                type="button"
              >
                Siguiente
              </button>
            </div>
          </div>

          <form onSubmit={onFiltrarLogs} className="mb-3 grid gap-2 md:grid-cols-5">
            <input
              className="rounded-lg border border-outline-variant px-3 py-2 text-sm"
              placeholder="Módulo (ej: superadmin)"
              value={filtrosLogs.modulo}
              onChange={(e) => setFiltrosLogs((prev) => ({ ...prev, modulo: e.target.value }))}
            />
            <select
              className="rounded-lg border border-outline-variant px-3 py-2 text-sm"
              value={filtrosLogs.resultado}
              onChange={(e) =>
                setFiltrosLogs((prev) => ({
                  ...prev,
                  resultado: e.target.value as '' | ResultadoLog,
                }))
              }
            >
              <option value="">Resultado</option>
              <option value="EXITO">EXITO</option>
              <option value="ERROR">ERROR</option>
            </select>
            <input
              className="rounded-lg border border-outline-variant px-3 py-2 text-sm"
              type="date"
              value={filtrosLogs.fechaDesde}
              onChange={(e) => setFiltrosLogs((prev) => ({ ...prev, fechaDesde: e.target.value }))}
            />
            <input
              className="rounded-lg border border-outline-variant px-3 py-2 text-sm"
              type="date"
              value={filtrosLogs.fechaHasta}
              onChange={(e) => setFiltrosLogs((prev) => ({ ...prev, fechaHasta: e.target.value }))}
            />
            <div className="flex gap-2">
              <button
                className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-on-primary"
                type="submit"
              >
                Filtrar
              </button>
              <button
                className="rounded-lg border border-outline-variant px-3 py-2 text-sm"
                onClick={clearLogsFilters}
                type="button"
              >
                Limpiar
              </button>
            </div>
          </form>

          <div className="space-y-2">
            {(logsQuery.data?.data ?? []).map((log) => (
              <div key={log.id} className="rounded-lg border border-outline-variant p-3 text-sm">
                <div className="font-semibold text-on-surface">
                  [{log.resultado}] {log.modulo} - {log.accion}
                </div>
                <div className="text-on-surface-variant">
                  {new Date(log.createdAt).toLocaleString('es-CO')}
                  {log.error ? ` | Error: ${log.error}` : ''}
                </div>
              </div>
            ))}
            {(logsQuery.data?.data ?? []).length === 0 && (
              <div className="rounded-lg border border-dashed border-outline-variant p-4 text-sm text-on-surface-variant">
                Sin logs registrados.
              </div>
            )}
          </div>
        </div>

        {modalVencimiento.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <form
              onSubmit={submitVencimiento}
              className="w-full max-w-md space-y-3 rounded-xl border border-outline-variant bg-white p-4"
            >
              <h3 className="text-lg font-black text-on-surface">Editar vencimiento</h3>
              <p className="text-sm text-on-surface-variant">
                Empresa: {modalVencimiento.empresaNombre}
              </p>
              <select
                className="w-full rounded-lg border border-outline-variant px-3 py-2"
                value={modalVencimiento.plan}
                onChange={(e) =>
                  setModalVencimiento((prev) => ({ ...prev, plan: e.target.value as Plan }))
                }
              >
                <option value="STARTER">STARTER</option>
                <option value="PROFESSIONAL">PROFESSIONAL</option>
                <option value="ENTERPRISE">ENTERPRISE</option>
              </select>
              <input
                className="w-full rounded-lg border border-outline-variant px-3 py-2"
                type="date"
                value={modalVencimiento.vencimientoEn}
                onChange={(e) =>
                  setModalVencimiento((prev) => ({ ...prev, vencimientoEn: e.target.value }))
                }
              />
              <div className="flex justify-end gap-2">
                <button
                  className="rounded-lg border border-outline-variant px-3 py-2 text-sm"
                  type="button"
                  onClick={() => setModalVencimiento((prev) => ({ ...prev, open: false }))}
                >
                  Cancelar
                </button>
                <button
                  className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-on-primary disabled:opacity-50"
                  type="submit"
                  disabled={actualizarVencimientoMutation.isPending}
                >
                  {actualizarVencimientoMutation.isPending ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
