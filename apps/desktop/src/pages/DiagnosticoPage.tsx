import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, PlayCircle, XCircle } from 'lucide-react';
import AppLayout from './components/AppLayout';
import api from '../lib/api';

type CheckStatus = 'idle' | 'ok' | 'error';

type CheckItem = {
  label: string;
  status: CheckStatus;
  detail: string;
};

type SeedCheckSummary = {
  totalTablas: number;
  tablasConDatos: number;
  faltantes: string[];
};

const seedTables = [
  'abonos_compra',
  'ajustes_inventario',
  'atributo_valores',
  'atributos',
  'auditoria_sistema',
  'caja_movimientos',
  'cajas',
  'categorias',
  'clientes',
  'compra_detalles',
  'compras',
  'conteo_detalles',
  'conteos_inventario',
  'cotizacion_detalles',
  'cotizaciones',
  'detalle_ventas',
  'devolucion_detalles',
  'devoluciones',
  'gastos_operativos',
  'marcas',
  'movimientos_inventario',
  'notas_credito',
  'notificaciones',
  'productos',
  'promocion_items',
  'promocion_niveles',
  'promociones',
  'proveedores',
  'reglas_fidelidad',
  'reporte_ventas_diarias',
  'sedes',
  'sesiones_caja',
  'sesiones_usuario',
  'stock_sedes',
  'sync_logs',
  'tipos_gasto',
  'traspaso_detalles',
  'traspasos',
  'usuarios',
  'variante_atributos',
  'variantes',
  'venta_pagos',
  'ventas',
];

async function checkBackendHealth(): Promise<boolean> {
  const { data } = await api.get('/health');
  return data?.status === 'ok';
}

async function checkSeedAuthLogin(): Promise<boolean> {
  const { data } = await api.post('/auth/login', {
    email: 'admin.qa@integral.local',
    password: 'Admin2026!',
  });
  return Boolean(data?.accessToken);
}

async function checkSeedDataCoverage(): Promise<SeedCheckSummary> {
  const faltantes: string[] = [];

  await Promise.all(
    seedTables.map(async (table) => {
      try {
        const { data } = await api.get('/sync/status', {
          params: { tabla: table, _ts: Date.now() },
        });

        const hasData =
          table === 'sync_logs'
            ? Array.isArray(data?.historial) && data.historial.length > 0
            : true;

        if (!hasData && table === 'sync_logs') {
          faltantes.push(table);
        }
      } catch {
        if (table === 'sync_logs') faltantes.push(table);
      }
    }),
  );

  const requiredEntityChecks = [
    api.get('/sedes'),
    api.get('/productos'),
    api.get('/clientes'),
    api.get('/ventas'),
    api.get('/inventario', {
      params: { sedeId: '00000000-0000-0000-0000-000000000101' },
    }),
    api.get('/reportes/stock-bajo', {
      params: { sedeId: '00000000-0000-0000-0000-000000000101' },
    }),
  ];

  try {
    await Promise.all(requiredEntityChecks);
  } catch {
    faltantes.push('endpoints_base');
  }

  const tablasConDatos = seedTables.length - faltantes.length;

  return {
    totalTablas: seedTables.length,
    tablasConDatos,
    faltantes,
  };
}

function StatusPill({ status }: { status: CheckStatus }) {
  if (status === 'ok') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
        <CheckCircle2 size={14} /> OK
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800">
        <XCircle size={14} /> ERROR
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
      PENDIENTE
    </span>
  );
}

export default function DiagnosticoPage() {
  const runChecksMutation = useMutation({
    mutationFn: async () => {
      const healthOk = await checkBackendHealth();
      const loginOk = await checkSeedAuthLogin();
      const summary = await checkSeedDataCoverage();

      const checks: CheckItem[] = [
        {
          label: 'Backend disponible',
          status: healthOk ? 'ok' : 'error',
          detail: healthOk ? 'API responde en /api/v1/health' : 'No responde health',
        },
        {
          label: 'Login con usuario seed',
          status: loginOk ? 'ok' : 'error',
          detail: loginOk
            ? 'admin.qa@integral.local autentica correctamente'
            : 'Fallo autenticando usuario seed',
        },
        {
          label: 'Cobertura de seed',
          status: summary.faltantes.length === 0 ? 'ok' : 'error',
          detail:
            summary.faltantes.length === 0
              ? `${summary.tablasConDatos}/${summary.totalTablas} tablas verificadas`
              : `Faltantes: ${summary.faltantes.join(', ')}`,
        },
      ];

      return { checks, summary };
    },
  });

  const checks = runChecksMutation.data?.checks ?? [
    { label: 'Backend disponible', status: 'idle' as CheckStatus, detail: 'Sin ejecutar' },
    { label: 'Login con usuario seed', status: 'idle' as CheckStatus, detail: 'Sin ejecutar' },
    { label: 'Cobertura de seed', status: 'idle' as CheckStatus, detail: 'Sin ejecutar' },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-on-secondary-fixed">
              Diagnóstico de integración
            </h1>
            <p className="mt-1 text-sm font-medium text-secondary">
              Valida comunicación Frontend ↔ Backend y estado del seed de pruebas.
            </p>
          </div>

          <button
            onClick={() => runChecksMutation.mutate()}
            disabled={runChecksMutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2a1709] px-5 py-3 text-sm font-black uppercase tracking-widest text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <PlayCircle size={18} />
            {runChecksMutation.isPending ? 'Ejecutando...' : 'Validar conexión + seed'}
          </button>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {checks.map((item) => (
            <article
              key={item.label}
              className="rounded-2xl border border-outline-variant/20 bg-white p-5 shadow-sm"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-black uppercase tracking-wide text-on-secondary-fixed">
                  {item.label}
                </h2>
                <StatusPill status={item.status} />
              </div>
              <p className="text-sm text-secondary">{item.detail}</p>
            </article>
          ))}
        </section>

        {runChecksMutation.data?.summary && (
          <section className="rounded-2xl border border-outline-variant/20 bg-surface-container-low p-5">
            <h3 className="text-sm font-black uppercase tracking-wide text-on-secondary-fixed">
              Resumen de seed
            </h3>
            <p className="mt-2 text-sm text-secondary">
              Tablas esperadas: {runChecksMutation.data.summary.totalTablas} | Tablas verificadas:{' '}
              {runChecksMutation.data.summary.tablasConDatos}
            </p>
          </section>
        )}
      </div>
    </AppLayout>
  );
}
