import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../lib/api';
import AppLayout from './components/AppLayout';

type TabFinanzas = 'tesoreria' | 'movimientos' | 'conciliacion' | 'presupuesto';

type CuentaBancaria = {
  id: string;
  nombre: string;
  banco: string;
  tipoCuenta: string;
  numeroCuenta: string;
  saldoActual: number;
  activa: boolean;
  esPrincipal: boolean;
  moneda: string;
};

type Movimiento = {
  id: string;
  fecha: string;
  descripcion: string;
  referencia?: string | null;
  tipo: 'INGRESO' | 'EGRESO' | 'TRASLADO';
  monto: number;
  saldoDespues: number;
  categoria: string;
  conciliado: boolean;
  cuentaBancariaId: string;
  cuentaBancaria?: CuentaBancaria;
};

type FlujoCajaItem = {
  fecha: string;
  ingresos: number;
  egresos: number;
  neto: number;
};

type FlujoCaja = {
  serie: FlujoCajaItem[];
  totalIngresos: number;
  totalEgresos: number;
};

type ResumenTesoreria = {
  saldoTotal: number;
  cuentas: CuentaBancaria[];
  alertas: Array<{ tipo: string; cuentaId: string; mensaje: string; saldoActual: number }>;
};

type Paginado<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};

type EjecucionPresupuesto = {
  mes: number;
  ano: number;
  items: Array<{
    id: string;
    categoria: string;
    tipo: 'INGRESO' | 'EGRESO';
    presupuestado: number;
    ejecutado: number;
    diferencia: number;
    porcentaje: number;
  }>;
};

const cop = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const COLORS = {
  textStrong: '#2E1B0C',
  textMuted: '#735946',
  border: '#EADFE3',
  card: '#FFFFFF',
  panel: '#F8F4F6',
  accent: '#A43E63',
  income: '#2E7D32',
  expense: '#B91C1C',
  info: '#3949AB',
};

function toISODate(date: Date): string {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;
}

function toDateInput(value?: string | null): string {
  if (!value) return '-';
  return value.slice(0, 10);
}

function extraerItems<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object' && 'items' in payload) {
    return (payload as Paginado<T>).items;
  }
  return [];
}

export default function FinanzasPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabFinanzas>('tesoreria');
  const [mostrarIngreso, setMostrarIngreso] = useState(false);
  const [mostrarEgreso, setMostrarEgreso] = useState(false);
  const [mostrarCsv, setMostrarCsv] = useState(false);
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().getMonth() + 1);
  const [anoSeleccionado, setAnoSeleccionado] = useState(new Date().getFullYear());
  const [cuentaConciliacion, setCuentaConciliacion] = useState('');

  const [ingresoForm, setIngresoForm] = useState({
    cuentaId: '',
    monto: '',
    categoria: 'VENTA',
    descripcion: '',
    referencia: '',
    fecha: toISODate(new Date()),
  });

  const [egresoForm, setEgresoForm] = useState({
    cuentaId: '',
    monto: '',
    categoria: 'GASTO_OPERATIVO',
    descripcion: '',
    referencia: '',
    fecha: toISODate(new Date()),
  });

  const [csvForm, setCsvForm] = useState({
    cuentaId: '',
    csv: '',
  });

  const fechaHasta = toISODate(new Date());
  const fechaDesde = toISODate(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000));

  const { data: resumenTesoreria } = useQuery({
    queryKey: ['finanzas', 'tesoreria', 'resumen'],
    queryFn: async () => {
      const { data } = await api.get<ResumenTesoreria>('/finanzas/tesoreria');
      return data;
    },
  });

  const { data: cuentas = [] } = useQuery({
    queryKey: ['finanzas', 'cuentas'],
    queryFn: async () => {
      const { data } = await api.get('/finanzas/cuentas', { params: { page: 1, limit: 100 } });
      return extraerItems<CuentaBancaria>(data);
    },
  });

  const { data: movimientosData } = useQuery({
    queryKey: ['finanzas', 'movimientos', 1, 50],
    queryFn: async () => {
      const { data } = await api.get<Paginado<Movimiento>>('/finanzas/movimientos', {
        params: { page: 1, limit: 50 },
      });
      return data;
    },
  });

  const { data: flujoCaja } = useQuery({
    queryKey: ['finanzas', 'flujo', fechaDesde, fechaHasta],
    queryFn: async () => {
      const { data } = await api.get<FlujoCaja>('/finanzas/tesoreria/flujo-caja', {
        params: { fechaDesde, fechaHasta },
      });
      return data;
    },
  });

  const { data: noConciliados = [] } = useQuery({
    queryKey: ['finanzas', 'conciliacion', cuentaConciliacion, mesSeleccionado, anoSeleccionado],
    queryFn: async () => {
      if (!cuentaConciliacion) return [];
      const { data } = await api.get<Movimiento[]>(`/finanzas/conciliacion/${cuentaConciliacion}`, {
        params: { mes: mesSeleccionado, ano: anoSeleccionado },
      });
      return data;
    },
    enabled: Boolean(cuentaConciliacion),
  });

  const { data: reporteConciliacion } = useQuery({
    queryKey: [
      'finanzas',
      'conciliacion-reporte',
      cuentaConciliacion,
      mesSeleccionado,
      anoSeleccionado,
    ],
    queryFn: async () => {
      if (!cuentaConciliacion) return null;
      const { data } = await api.get(`/finanzas/conciliacion/reporte/${cuentaConciliacion}`, {
        params: { mes: mesSeleccionado, ano: anoSeleccionado },
      });
      return data as { totalSistema: number; totalBanco: number; diferencia: number };
    },
    enabled: Boolean(cuentaConciliacion),
  });

  const { data: ejecucionPresupuesto } = useQuery({
    queryKey: ['finanzas', 'presupuesto', mesSeleccionado, anoSeleccionado],
    queryFn: async () => {
      const { data } = await api.get<EjecucionPresupuesto>(
        `/finanzas/presupuesto/${mesSeleccionado}/${anoSeleccionado}`,
      );
      return data;
    },
  });

  const registrarIngresoMutation = useMutation({
    mutationFn: async () => {
      await api.post('/finanzas/movimientos/ingreso', {
        cuentaId: ingresoForm.cuentaId,
        monto: Number(ingresoForm.monto),
        categoria: ingresoForm.categoria,
        descripcion: ingresoForm.descripcion,
        referencia: ingresoForm.referencia,
        fecha: ingresoForm.fecha,
      });
    },
    onSuccess: () => {
      setMostrarIngreso(false);
      setIngresoForm((prev) => ({ ...prev, monto: '', descripcion: '', referencia: '' }));
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['finanzas', 'movimientos'] }),
        queryClient.invalidateQueries({ queryKey: ['finanzas', 'tesoreria', 'resumen'] }),
        queryClient.invalidateQueries({ queryKey: ['finanzas', 'flujo'] }),
      ]);
    },
  });

  const registrarEgresoMutation = useMutation({
    mutationFn: async () => {
      await api.post('/finanzas/movimientos/egreso', {
        cuentaId: egresoForm.cuentaId,
        monto: Number(egresoForm.monto),
        categoria: egresoForm.categoria,
        descripcion: egresoForm.descripcion,
        referencia: egresoForm.referencia,
        fecha: egresoForm.fecha,
      });
    },
    onSuccess: () => {
      setMostrarEgreso(false);
      setEgresoForm((prev) => ({ ...prev, monto: '', descripcion: '', referencia: '' }));
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['finanzas', 'movimientos'] }),
        queryClient.invalidateQueries({ queryKey: ['finanzas', 'tesoreria', 'resumen'] }),
        queryClient.invalidateQueries({ queryKey: ['finanzas', 'flujo'] }),
      ]);
    },
  });

  const importarCsvMutation = useMutation({
    mutationFn: async () => {
      await api.post('/finanzas/conciliacion/importar', csvForm);
    },
    onSuccess: () => {
      setMostrarCsv(false);
      setCsvForm((prev) => ({ ...prev, csv: '' }));
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['finanzas', 'conciliacion'] }),
        queryClient.invalidateQueries({ queryKey: ['finanzas', 'conciliacion-reporte'] }),
        queryClient.invalidateQueries({ queryKey: ['finanzas', 'movimientos'] }),
      ]);
    },
  });

  const conciliarMutation = useMutation({
    mutationFn: async (movimientoId: string) => {
      await api.patch(`/finanzas/conciliacion/${movimientoId}/conciliar`);
    },
    onSuccess: () => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['finanzas', 'conciliacion'] }),
        queryClient.invalidateQueries({ queryKey: ['finanzas', 'conciliacion-reporte'] }),
        queryClient.invalidateQueries({ queryKey: ['finanzas', 'movimientos'] }),
      ]);
    },
  });

  const movimientos = movimientosData?.items ?? [];

  const chartData = useMemo(
    () =>
      (flujoCaja?.serie ?? []).map((item) => ({
        ...item,
        label: item.fecha.slice(5),
      })),
    [flujoCaja],
  );

  const totalPendientesConciliacion = useMemo(
    () => noConciliados.reduce((acc, item) => acc + Number(item.monto || 0), 0),
    [noConciliados],
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold" style={{ color: COLORS.textStrong }}>
              Finanzas y Tesoreria
            </h1>
            <p className="mt-1 text-sm font-medium" style={{ color: COLORS.textMuted }}>
              Control bancario, conciliacion y ejecucion presupuestal.
            </p>
          </div>
          <div className="inline-flex rounded-xl border p-1" style={{ borderColor: COLORS.border }}>
            {(['tesoreria', 'movimientos', 'conciliacion', 'presupuesto'] as TabFinanzas[]).map(
              (item) => (
                <button
                  key={item}
                  onClick={() => setTab(item)}
                  className="rounded-lg px-4 py-2 text-sm font-bold transition"
                  style={{
                    backgroundColor: tab === item ? COLORS.accent : 'transparent',
                    color: tab === item ? '#ffffff' : COLORS.textMuted,
                  }}
                >
                  {item[0].toUpperCase() + item.slice(1)}
                </button>
              ),
            )}
          </div>
        </div>

        {tab === 'tesoreria' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
              <div
                className="rounded-2xl border p-5 lg:col-span-1"
                style={{ backgroundColor: COLORS.card, borderColor: COLORS.border }}
              >
                <p
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: COLORS.textMuted }}
                >
                  Saldo consolidado
                </p>
                <p className="mt-2 text-3xl font-black" style={{ color: COLORS.textStrong }}>
                  {cop.format(Number(resumenTesoreria?.saldoTotal ?? 0))}
                </p>
              </div>
              <div
                className="rounded-2xl border p-5 lg:col-span-3"
                style={{ backgroundColor: COLORS.card, borderColor: COLORS.border }}
              >
                <p className="mb-3 text-sm font-bold" style={{ color: COLORS.textStrong }}>
                  Ingresos vs egresos ultimos 30 dias
                </p>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: COLORS.textMuted }} />
                      <YAxis tick={{ fontSize: 11, fill: COLORS.textMuted }} />
                      <Tooltip formatter={(value) => cop.format(Number(value || 0))} />
                      <Legend />
                      <Bar dataKey="ingresos" stackId="a" fill={COLORS.income} name="Ingresos" />
                      <Bar dataKey="egresos" stackId="a" fill={COLORS.expense} name="Egresos" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {!!resumenTesoreria?.alertas?.length && (
              <div
                className="rounded-xl border px-4 py-3"
                style={{ borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' }}
              >
                <p className="text-sm font-bold" style={{ color: COLORS.expense }}>
                  Alertas de tesoreria
                </p>
                <ul className="mt-2 space-y-1 text-sm" style={{ color: COLORS.expense }}>
                  {resumenTesoreria.alertas.map((alerta) => (
                    <li key={`${alerta.tipo}-${alerta.cuentaId}`}>- {alerta.mensaje}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {(resumenTesoreria?.cuentas ?? []).map((cuenta) => (
                <div
                  key={cuenta.id}
                  className="rounded-2xl border p-4"
                  style={{ backgroundColor: COLORS.card, borderColor: COLORS.border }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-extrabold" style={{ color: COLORS.textStrong }}>
                        {cuenta.nombre}
                      </p>
                      <p className="text-xs" style={{ color: COLORS.textMuted }}>
                        {cuenta.banco} - {cuenta.tipoCuenta}
                      </p>
                    </div>
                    {cuenta.esPrincipal && (
                      <span
                        className="rounded-full px-2 py-1 text-[10px] font-bold"
                        style={{ backgroundColor: '#E8EAF6', color: COLORS.info }}
                      >
                        Principal
                      </span>
                    )}
                  </div>
                  <p className="mt-4 text-2xl font-black" style={{ color: COLORS.textStrong }}>
                    {cop.format(Number(cuenta.saldoActual || 0))}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'movimientos' && (
          <div
            className="rounded-2xl border"
            style={{ borderColor: COLORS.border, backgroundColor: COLORS.card }}
          >
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead style={{ backgroundColor: COLORS.panel }}>
                  <tr
                    className="text-left text-xs uppercase tracking-wide"
                    style={{ color: COLORS.textMuted }}
                  >
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Descripcion</th>
                    <th className="px-4 py-3">Cuenta</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Monto</th>
                    <th className="px-4 py-3">Categoria</th>
                    <th className="px-4 py-3">Conciliado</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.map((mov) => (
                    <tr key={mov.id} className="border-t" style={{ borderColor: COLORS.border }}>
                      <td className="px-4 py-3">{toDateInput(mov.fecha)}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold" style={{ color: COLORS.textStrong }}>
                          {mov.descripcion}
                        </p>
                        {!!mov.referencia && (
                          <p className="text-xs" style={{ color: COLORS.textMuted }}>
                            Ref: {mov.referencia}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3" style={{ color: COLORS.textMuted }}>
                        {mov.cuentaBancaria?.nombre ?? mov.cuentaBancariaId}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="rounded-full px-2 py-1 text-xs font-bold"
                          style={{
                            backgroundColor: mov.tipo === 'INGRESO' ? '#E8F5E9' : '#FEE2E2',
                            color: mov.tipo === 'INGRESO' ? COLORS.income : COLORS.expense,
                          }}
                        >
                          {mov.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold" style={{ color: COLORS.textStrong }}>
                        {cop.format(Number(mov.monto || 0))}
                      </td>
                      <td className="px-4 py-3" style={{ color: COLORS.textMuted }}>
                        {mov.categoria}
                      </td>
                      <td className="px-4 py-3 text-center">{mov.conciliado ? '✓' : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="fixed bottom-8 right-8 z-40 flex flex-col gap-2">
              <button
                onClick={() => setMostrarIngreso(true)}
                className="rounded-xl px-4 py-3 text-sm font-black text-white shadow-lg"
                style={{ backgroundColor: COLORS.income }}
              >
                Registrar Ingreso
              </button>
              <button
                onClick={() => setMostrarEgreso(true)}
                className="rounded-xl px-4 py-3 text-sm font-black text-white shadow-lg"
                style={{ backgroundColor: COLORS.expense }}
              >
                Registrar Egreso
              </button>
            </div>
          </div>
        )}

        {tab === 'conciliacion' && (
          <div className="space-y-4">
            <div
              className="grid gap-3 rounded-2xl border p-4 md:grid-cols-5"
              style={{ borderColor: COLORS.border, backgroundColor: COLORS.card }}
            >
              <select
                value={cuentaConciliacion}
                onChange={(e) => {
                  setCuentaConciliacion(e.target.value);
                  setCsvForm((prev) => ({ ...prev, cuentaId: e.target.value }));
                }}
                className="rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: COLORS.border, backgroundColor: COLORS.panel }}
              >
                <option value="">Selecciona cuenta</option>
                {cuentas.map((cuenta) => (
                  <option key={cuenta.id} value={cuenta.id}>
                    {cuenta.nombre}
                  </option>
                ))}
              </select>

              <input
                type="number"
                min={1}
                max={12}
                value={mesSeleccionado}
                onChange={(e) => setMesSeleccionado(Number(e.target.value || 1))}
                className="rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: COLORS.border, backgroundColor: COLORS.panel }}
              />

              <input
                type="number"
                min={2000}
                max={2100}
                value={anoSeleccionado}
                onChange={(e) =>
                  setAnoSeleccionado(Number(e.target.value || new Date().getFullYear()))
                }
                className="rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: COLORS.border, backgroundColor: COLORS.panel }}
              />

              <button
                onClick={() => setMostrarCsv(true)}
                className="rounded-lg px-4 py-2 text-sm font-bold text-white"
                style={{ backgroundColor: COLORS.info }}
              >
                Importar Extracto CSV
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div
                className="rounded-xl border p-4"
                style={{ borderColor: COLORS.border, backgroundColor: COLORS.card }}
              >
                <p className="text-xs uppercase" style={{ color: COLORS.textMuted }}>
                  Total sistema
                </p>
                <p className="text-2xl font-black" style={{ color: COLORS.textStrong }}>
                  {cop.format(Number(reporteConciliacion?.totalSistema ?? 0))}
                </p>
              </div>
              <div
                className="rounded-xl border p-4"
                style={{ borderColor: COLORS.border, backgroundColor: COLORS.card }}
              >
                <p className="text-xs uppercase" style={{ color: COLORS.textMuted }}>
                  Total banco
                </p>
                <p className="text-2xl font-black" style={{ color: COLORS.textStrong }}>
                  {cop.format(Number(reporteConciliacion?.totalBanco ?? 0))}
                </p>
              </div>
              <div
                className="rounded-xl border p-4"
                style={{ borderColor: COLORS.border, backgroundColor: COLORS.card }}
              >
                <p className="text-xs uppercase" style={{ color: COLORS.textMuted }}>
                  Pendientes
                </p>
                <p className="text-2xl font-black" style={{ color: COLORS.expense }}>
                  {cop.format(totalPendientesConciliacion)}
                </p>
              </div>
            </div>

            <div
              className="overflow-x-auto rounded-2xl border"
              style={{ borderColor: COLORS.border, backgroundColor: COLORS.card }}
            >
              <table className="min-w-full text-sm">
                <thead style={{ backgroundColor: COLORS.panel }}>
                  <tr
                    className="text-left text-xs uppercase tracking-wide"
                    style={{ color: COLORS.textMuted }}
                  >
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Descripcion</th>
                    <th className="px-4 py-3">Referencia</th>
                    <th className="px-4 py-3">Monto</th>
                    <th className="px-4 py-3">Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {noConciliados.map((mov) => (
                    <tr key={mov.id} className="border-t" style={{ borderColor: COLORS.border }}>
                      <td className="px-4 py-3">{toDateInput(mov.fecha)}</td>
                      <td className="px-4 py-3">{mov.descripcion}</td>
                      <td className="px-4 py-3">{mov.referencia || '-'}</td>
                      <td className="px-4 py-3 font-bold">{cop.format(Number(mov.monto || 0))}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => conciliarMutation.mutate(mov.id)}
                          className="rounded-lg border px-3 py-1 text-xs font-bold"
                          style={{ borderColor: COLORS.info, color: COLORS.info }}
                        >
                          Conciliar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'presupuesto' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:max-w-md">
              <input
                type="number"
                min={1}
                max={12}
                value={mesSeleccionado}
                onChange={(e) => setMesSeleccionado(Number(e.target.value || 1))}
                className="rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: COLORS.border, backgroundColor: COLORS.panel }}
              />
              <input
                type="number"
                min={2000}
                max={2100}
                value={anoSeleccionado}
                onChange={(e) =>
                  setAnoSeleccionado(Number(e.target.value || new Date().getFullYear()))
                }
                className="rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: COLORS.border, backgroundColor: COLORS.panel }}
              />
            </div>

            <div
              className="overflow-x-auto rounded-2xl border"
              style={{ borderColor: COLORS.border, backgroundColor: COLORS.card }}
            >
              <table className="min-w-full text-sm">
                <thead style={{ backgroundColor: COLORS.panel }}>
                  <tr
                    className="text-left text-xs uppercase tracking-wide"
                    style={{ color: COLORS.textMuted }}
                  >
                    <th className="px-4 py-3">Categoria</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Presupuestado</th>
                    <th className="px-4 py-3">Ejecutado</th>
                    <th className="px-4 py-3">Diferencia</th>
                    <th className="px-4 py-3">Progreso</th>
                  </tr>
                </thead>
                <tbody>
                  {(ejecucionPresupuesto?.items ?? []).map((item) => {
                    const porcentaje = Math.max(0, Math.min(item.porcentaje, 200));
                    const excedido = item.ejecutado > item.presupuestado;
                    return (
                      <tr key={item.id} className="border-t" style={{ borderColor: COLORS.border }}>
                        <td className="px-4 py-3 font-semibold">{item.categoria}</td>
                        <td className="px-4 py-3">{item.tipo}</td>
                        <td className="px-4 py-3">{cop.format(Number(item.presupuestado || 0))}</td>
                        <td className="px-4 py-3">{cop.format(Number(item.ejecutado || 0))}</td>
                        <td
                          className="px-4 py-3 font-bold"
                          style={{
                            color: item.diferencia < 0 ? COLORS.expense : COLORS.textStrong,
                          }}
                        >
                          {cop.format(Number(item.diferencia || 0))}
                        </td>
                        <td className="px-4 py-3">
                          <div
                            className="h-3 w-52 overflow-hidden rounded-full"
                            style={{ backgroundColor: '#ECECEC' }}
                          >
                            <div
                              className="h-full"
                              style={{
                                width: `${Math.min(porcentaje, 100)}%`,
                                backgroundColor: excedido ? COLORS.expense : COLORS.income,
                              }}
                            />
                          </div>
                          <p className="mt-1 text-xs" style={{ color: COLORS.textMuted }}>
                            {item.porcentaje.toFixed(1)}%
                          </p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {mostrarIngreso && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <form
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              registrarIngresoMutation.mutate();
            }}
            className="w-full max-w-xl space-y-4 rounded-2xl border p-5"
            style={{ borderColor: COLORS.border, backgroundColor: COLORS.card }}
          >
            <h3 className="text-lg font-black" style={{ color: COLORS.textStrong }}>
              Registrar ingreso
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              <select
                required
                value={ingresoForm.cuentaId}
                onChange={(e) => setIngresoForm((prev) => ({ ...prev, cuentaId: e.target.value }))}
                className="rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: COLORS.border, backgroundColor: COLORS.panel }}
              >
                <option value="">Seleccionar cuenta</option>
                {cuentas.map((cuenta) => (
                  <option key={cuenta.id} value={cuenta.id}>
                    {cuenta.nombre}
                  </option>
                ))}
              </select>
              <input
                required
                type="number"
                min={0.01}
                step="0.01"
                value={ingresoForm.monto}
                onChange={(e) => setIngresoForm((prev) => ({ ...prev, monto: e.target.value }))}
                placeholder="Monto"
                className="rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: COLORS.border, backgroundColor: COLORS.panel }}
              />
              <input
                required
                value={ingresoForm.descripcion}
                onChange={(e) =>
                  setIngresoForm((prev) => ({ ...prev, descripcion: e.target.value }))
                }
                placeholder="Descripcion"
                className="rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: COLORS.border, backgroundColor: COLORS.panel }}
              />
              <input
                value={ingresoForm.referencia}
                onChange={(e) =>
                  setIngresoForm((prev) => ({ ...prev, referencia: e.target.value }))
                }
                placeholder="Referencia"
                className="rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: COLORS.border, backgroundColor: COLORS.panel }}
              />
              <select
                value={ingresoForm.categoria}
                onChange={(e) => setIngresoForm((prev) => ({ ...prev, categoria: e.target.value }))}
                className="rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: COLORS.border, backgroundColor: COLORS.panel }}
              >
                {[
                  'VENTA',
                  'COBRO_FACTURA',
                  'PAGO_PROVEEDOR',
                  'NOMINA',
                  'IMPUESTO',
                  'GASTO_OPERATIVO',
                  'OTRO',
                ].map((categoria) => (
                  <option key={categoria} value={categoria}>
                    {categoria}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={ingresoForm.fecha}
                onChange={(e) => setIngresoForm((prev) => ({ ...prev, fecha: e.target.value }))}
                className="rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: COLORS.border, backgroundColor: COLORS.panel }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMostrarIngreso(false)}
                className="rounded-lg border px-4 py-2 text-sm"
                style={{ borderColor: COLORS.border }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg px-4 py-2 text-sm font-bold text-white"
                style={{ backgroundColor: COLORS.income }}
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}

      {mostrarEgreso && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <form
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              registrarEgresoMutation.mutate();
            }}
            className="w-full max-w-xl space-y-4 rounded-2xl border p-5"
            style={{ borderColor: COLORS.border, backgroundColor: COLORS.card }}
          >
            <h3 className="text-lg font-black" style={{ color: COLORS.textStrong }}>
              Registrar egreso
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              <select
                required
                value={egresoForm.cuentaId}
                onChange={(e) => setEgresoForm((prev) => ({ ...prev, cuentaId: e.target.value }))}
                className="rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: COLORS.border, backgroundColor: COLORS.panel }}
              >
                <option value="">Seleccionar cuenta</option>
                {cuentas.map((cuenta) => (
                  <option key={cuenta.id} value={cuenta.id}>
                    {cuenta.nombre}
                  </option>
                ))}
              </select>
              <input
                required
                type="number"
                min={0.01}
                step="0.01"
                value={egresoForm.monto}
                onChange={(e) => setEgresoForm((prev) => ({ ...prev, monto: e.target.value }))}
                placeholder="Monto"
                className="rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: COLORS.border, backgroundColor: COLORS.panel }}
              />
              <input
                required
                value={egresoForm.descripcion}
                onChange={(e) =>
                  setEgresoForm((prev) => ({ ...prev, descripcion: e.target.value }))
                }
                placeholder="Descripcion"
                className="rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: COLORS.border, backgroundColor: COLORS.panel }}
              />
              <input
                value={egresoForm.referencia}
                onChange={(e) => setEgresoForm((prev) => ({ ...prev, referencia: e.target.value }))}
                placeholder="Referencia"
                className="rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: COLORS.border, backgroundColor: COLORS.panel }}
              />
              <select
                value={egresoForm.categoria}
                onChange={(e) => setEgresoForm((prev) => ({ ...prev, categoria: e.target.value }))}
                className="rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: COLORS.border, backgroundColor: COLORS.panel }}
              >
                {[
                  'VENTA',
                  'COBRO_FACTURA',
                  'PAGO_PROVEEDOR',
                  'NOMINA',
                  'IMPUESTO',
                  'GASTO_OPERATIVO',
                  'OTRO',
                ].map((categoria) => (
                  <option key={categoria} value={categoria}>
                    {categoria}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={egresoForm.fecha}
                onChange={(e) => setEgresoForm((prev) => ({ ...prev, fecha: e.target.value }))}
                className="rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: COLORS.border, backgroundColor: COLORS.panel }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMostrarEgreso(false)}
                className="rounded-lg border px-4 py-2 text-sm"
                style={{ borderColor: COLORS.border }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg px-4 py-2 text-sm font-bold text-white"
                style={{ backgroundColor: COLORS.expense }}
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}

      {mostrarCsv && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <form
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              importarCsvMutation.mutate();
            }}
            className="w-full max-w-2xl space-y-4 rounded-2xl border p-5"
            style={{ borderColor: COLORS.border, backgroundColor: COLORS.card }}
          >
            <h3 className="text-lg font-black" style={{ color: COLORS.textStrong }}>
              Importar extracto CSV
            </h3>
            <select
              required
              value={csvForm.cuentaId}
              onChange={(e) => setCsvForm((prev) => ({ ...prev, cuentaId: e.target.value }))}
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: COLORS.border, backgroundColor: COLORS.panel }}
            >
              <option value="">Seleccionar cuenta</option>
              {cuentas.map((cuenta) => (
                <option key={cuenta.id} value={cuenta.id}>
                  {cuenta.nombre}
                </option>
              ))}
            </select>
            <textarea
              required
              rows={12}
              value={csvForm.csv}
              onChange={(e) => setCsvForm((prev) => ({ ...prev, csv: e.target.value }))}
              placeholder="fecha,descripcion,referencia,monto,tipo"
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: COLORS.border, backgroundColor: COLORS.panel }}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMostrarCsv(false)}
                className="rounded-lg border px-4 py-2 text-sm"
                style={{ borderColor: COLORS.border }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg px-4 py-2 text-sm font-bold text-white"
                style={{ backgroundColor: COLORS.info }}
              >
                Importar
              </button>
            </div>
          </form>
        </div>
      )}
    </AppLayout>
  );
}
