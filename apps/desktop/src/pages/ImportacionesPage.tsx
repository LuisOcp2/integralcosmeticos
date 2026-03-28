import { ChangeEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AppLayout from './components/AppLayout';
import api from '../lib/api';

type ImportMode = 'crear_solo' | 'actualizar_solo' | 'crear_o_actualizar';

interface ImportJob {
  id: string;
  filename: string;
  format: 'csv' | 'xlsx';
  mode: ImportMode;
  dryRun: boolean;
  status: string;
  totalRows: number;
  validRows: number;
  errorRows: number;
  processedRows: number;
  createdProducts: number;
  updatedProducts: number;
  createdVariants: number;
  updatedVariants: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

interface ImportValidationResponse {
  jobId: string;
  status: string;
  dryRun: boolean;
  mode: string;
  summary: {
    totalRows: number;
    validRows: number;
    rowsWithErrors: number;
    productsToCreate: number;
    productsToUpdate: number;
    variantsToCreate: number;
    variantsToUpdate: number;
  };
  errors: Array<{ rowNumber: number; code: string; message: string }>;
  normalizedRowsPreview: Array<Record<string, unknown>>;
}

interface ImportReportRow {
  id: string;
  rowNumber: number;
  status: string;
  errorCode?: string;
  errorMessage?: string;
  normalizedData?: {
    codigoInterno?: string;
    nombreProducto?: string;
    nombreVariante?: string;
    sku?: string;
    codigoBarras?: string;
  };
}

interface ImportHealthResponse {
  ok: boolean;
  database: {
    importJobsTableReady: boolean;
    importRowsTableReady: boolean;
  };
  queue: {
    ready: boolean;
    ping: string;
  };
  timestamp: string;
}

async function listImportJobs(): Promise<ImportJob[]> {
  const { data } = await api.get('/catalogo/importaciones', { params: { limit: 30 } });
  return data;
}

async function getImportStatus(jobId: string): Promise<ImportJob> {
  const { data } = await api.get(`/catalogo/importaciones/${jobId}/estado`);
  return data;
}

async function getImportReport(
  jobId: string,
): Promise<{ job: ImportJob; rows: ImportReportRow[] }> {
  const { data } = await api.get(`/catalogo/importaciones/${jobId}/reporte`);
  return data;
}

async function getImportHealth(): Promise<ImportHealthResponse> {
  const { data } = await api.get('/catalogo/importaciones/health');
  return data;
}

async function downloadErrorsCsv(jobId: string) {
  const { data } = await api.get(`/catalogo/importaciones/${jobId}/errores.csv`);

  const link = document.createElement('a');
  link.href = `data:${data.mimeType};base64,${data.base64}`;
  link.download = data.filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

async function uploadImportFile(params: {
  file: File;
  dryRun: boolean;
  mode: ImportMode;
}): Promise<ImportValidationResponse> {
  const formData = new FormData();
  formData.append('file', params.file);
  const { data } = await api.post('/catalogo/importaciones/archivo', formData, {
    params: { dryRun: params.dryRun, modo: params.mode },
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

async function executeImport(jobId: string) {
  const { data } = await api.post(`/catalogo/importaciones/${jobId}/ejecutar`);
  return data;
}

async function downloadTemplate(format: 'csv' | 'xlsx') {
  const { data } = await api.get('/catalogo/importaciones/plantilla', {
    params: { format },
  });

  const link = document.createElement('a');
  link.href = `data:${data.mimeType};base64,${data.base64}`;
  link.download = data.filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function fmtDate(value: string) {
  return new Date(value).toLocaleString('es-CO');
}

const MODE_LABEL: Record<ImportMode, string> = {
  crear_solo: 'Crear solo',
  actualizar_solo: 'Actualizar solo',
  crear_o_actualizar: 'Crear o actualizar',
};

export default function ImportacionesPage() {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mode, setMode] = useState<ImportMode>('crear_o_actualizar');
  const [dryRun, setDryRun] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const jobsQuery = useQuery({
    queryKey: ['catalogo', 'importaciones', 'jobs'],
    queryFn: listImportJobs,
    refetchInterval: 15000,
  });

  const healthQuery = useQuery({
    queryKey: ['catalogo', 'importaciones', 'health'],
    queryFn: getImportHealth,
    refetchInterval: 15000,
  });

  const selectedJob = useQuery({
    queryKey: ['catalogo', 'importaciones', 'status', selectedJobId],
    queryFn: () => getImportStatus(selectedJobId as string),
    enabled: Boolean(selectedJobId),
    refetchInterval: 5000,
  });

  const selectedReport = useQuery({
    queryKey: ['catalogo', 'importaciones', 'report', selectedJobId],
    queryFn: () => getImportReport(selectedJobId as string),
    enabled: Boolean(selectedJobId),
    refetchInterval: 10000,
  });

  const uploadMutation = useMutation({
    mutationFn: uploadImportFile,
    onSuccess: async (result) => {
      setSelectedJobId(result.jobId);
      await queryClient.invalidateQueries({ queryKey: ['catalogo', 'importaciones', 'jobs'] });
      await queryClient.invalidateQueries({
        queryKey: ['catalogo', 'importaciones', 'status', result.jobId],
      });
      await queryClient.invalidateQueries({
        queryKey: ['catalogo', 'importaciones', 'report', result.jobId],
      });
    },
  });

  const executeMutation = useMutation({
    mutationFn: executeImport,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['catalogo', 'importaciones', 'jobs'] });
      if (selectedJobId) {
        await queryClient.invalidateQueries({
          queryKey: ['catalogo', 'importaciones', 'status', selectedJobId],
        });
        await queryClient.invalidateQueries({
          queryKey: ['catalogo', 'importaciones', 'report', selectedJobId],
        });
      }
    },
  });

  const downloadErrorsMutation = useMutation({
    mutationFn: downloadErrorsCsv,
  });

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
  };

  const importSummary = useMemo(() => {
    const latest = uploadMutation.data;
    if (!latest) {
      return null;
    }
    return latest.summary;
  }, [uploadMutation.data]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <header
          className="rounded-3xl p-5 sm:p-7 border"
          style={{
            background: 'linear-gradient(125deg, #fff 0%, #f5f0f2 100%)',
            borderColor: 'rgba(218,192,197,0.45)',
          }}
        >
          <h1 className="text-3xl font-black" style={{ color: '#402416' }}>
            Importaciones de Catalogo
          </h1>
          <p className="text-sm mt-2" style={{ color: '#735946' }}>
            Carga masiva de productos y variantes por CSV o XLSX con validacion previa y ejecucion
            por lotes.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{
                backgroundColor: healthQuery.data?.ok
                  ? '#2e7d32'
                  : healthQuery.isLoading
                    ? '#e65100'
                    : '#ba1a1a',
              }}
            />
            <span
              className="text-xs font-bold uppercase tracking-[0.12em]"
              style={{ color: '#735946' }}
            >
              {healthQuery.isLoading
                ? 'Verificando salud de importaciones...'
                : healthQuery.data?.ok
                  ? 'Importaciones saludables'
                  : 'Importaciones con alerta'}
            </span>
          </div>

          {!healthQuery.isLoading && healthQuery.data && !healthQuery.data.ok && (
            <div
              className="mt-3 rounded-xl px-3 py-2 text-xs font-semibold"
              style={{ backgroundColor: 'rgba(186,26,26,0.1)', color: '#7b1d1d' }}
            >
              DB tablas: jobs({String(healthQuery.data.database.importJobsTableReady)}) / rows(
              {String(healthQuery.data.database.importRowsTableReady)}) · Cola:{' '}
              {healthQuery.data.queue.ready ? 'OK' : `ERROR (${healthQuery.data.queue.ping})`}
            </div>
          )}

          <div className="flex flex-wrap gap-2 mt-4">
            <button
              type="button"
              onClick={() => downloadTemplate('csv')}
              className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider"
              style={{ backgroundColor: 'rgba(115,89,70,0.12)', color: '#735946' }}
            >
              Descargar plantilla CSV
            </button>
            <button
              type="button"
              onClick={() => downloadTemplate('xlsx')}
              className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider"
              style={{ backgroundColor: 'rgba(133,38,75,0.14)', color: '#85264b' }}
            >
              Descargar plantilla XLSX
            </button>
          </div>

          <div
            className="mt-5 rounded-2xl p-4 border"
            style={{ borderColor: 'rgba(218,192,197,0.45)', backgroundColor: '#fff' }}
          >
            <p
              className="text-[11px] font-black uppercase tracking-[0.16em] mb-2"
              style={{ color: '#877176' }}
            >
              Paso a paso recomendado
            </p>
            <ol className="grid gap-2 text-sm" style={{ color: '#5f4a3c' }}>
              <li>
                1) Descarga plantilla CSV/XLSX y completa columnas base de producto + variante.
              </li>
              <li>
                2) Sube archivo en modo <b>Solo validar (dry-run)</b> para revisar inconsistencias.
              </li>
              <li>
                3) Si hay errores, usa <b>Descargar solo errores CSV</b> y corrige solo esas filas.
              </li>
              <li>4) Repite validacion hasta dejar errores en 0 o aceptables.</li>
              <li>5) Desactiva dry-run y ejecuta job real por lotes desde Jobs recientes.</li>
              <li>6) Verifica estado final y reporte por fila para auditoria.</li>
            </ol>
          </div>
        </header>

        <section
          className="rounded-2xl p-5 border bg-white"
          style={{ borderColor: 'rgba(218,192,197,0.35)' }}
        >
          <h2 className="text-lg font-black" style={{ color: '#402416' }}>
            Nueva importacion
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
            <input
              type="file"
              accept=".csv,.xlsx"
              onChange={onFileChange}
              className="md:col-span-2 rounded-xl border px-3 py-2"
              style={{ borderColor: 'rgba(135,113,118,0.24)' }}
            />
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as ImportMode)}
              className="rounded-xl border px-3 py-2"
              style={{ borderColor: 'rgba(135,113,118,0.24)' }}
            >
              {Object.entries(MODE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <label
              className="flex items-center gap-2 text-sm font-semibold"
              style={{ color: '#735946' }}
            >
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
              />
              Solo validar (dry-run)
            </label>
          </div>
          <div className="mt-4">
            <button
              type="button"
              disabled={!selectedFile || uploadMutation.isPending}
              onClick={() => {
                if (!selectedFile) return;
                uploadMutation.mutate({ file: selectedFile, mode, dryRun });
              }}
              className="px-5 py-3 rounded-xl text-sm font-black text-white disabled:opacity-60"
              style={{ backgroundColor: '#2a1709' }}
            >
              {uploadMutation.isPending ? 'Procesando archivo...' : 'Subir y validar'}
            </button>
          </div>

          {uploadMutation.error && (
            <p className="mt-3 text-sm font-semibold" style={{ color: '#ba1a1a' }}>
              {String(
                (uploadMutation.error as any)?.response?.data?.message ||
                  (uploadMutation.error as any)?.message ||
                  'Error validando archivo',
              )}
            </p>
          )}

          {importSummary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              {[
                ['Filas', importSummary.totalRows],
                ['Validas', importSummary.validRows],
                ['Con errores', importSummary.rowsWithErrors],
                ['Prod. crear', importSummary.productsToCreate],
                ['Prod. actualizar', importSummary.productsToUpdate],
                ['Var. crear', importSummary.variantsToCreate],
                ['Var. actualizar', importSummary.variantsToUpdate],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="rounded-xl p-3"
                  style={{ backgroundColor: '#f8f4f6' }}
                >
                  <p
                    className="text-[11px] uppercase font-black tracking-[0.14em]"
                    style={{ color: '#877176' }}
                  >
                    {label}
                  </p>
                  <p className="text-xl font-black" style={{ color: '#402416' }}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section
          className="rounded-2xl p-5 border bg-white"
          style={{ borderColor: 'rgba(218,192,197,0.35)' }}
        >
          <h2 className="text-lg font-black" style={{ color: '#402416' }}>
            Jobs recientes
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left" style={{ color: '#877176' }}>
                  <th className="py-2">Archivo</th>
                  <th className="py-2">Estado</th>
                  <th className="py-2">Modo</th>
                  <th className="py-2">Filas</th>
                  <th className="py-2">Actualizado</th>
                  <th className="py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {(jobsQuery.data ?? []).map((job) => (
                  <tr
                    key={job.id}
                    className="border-t"
                    style={{ borderColor: 'rgba(218,192,197,0.25)' }}
                  >
                    <td className="py-2 pr-3">{job.filename}</td>
                    <td className="py-2 pr-3">{job.status}</td>
                    <td className="py-2 pr-3">{MODE_LABEL[job.mode as ImportMode] ?? job.mode}</td>
                    <td className="py-2 pr-3">
                      {job.processedRows}/{job.totalRows}
                    </td>
                    <td className="py-2 pr-3">{fmtDate(job.updatedAt)}</td>
                    <td className="py-2 text-right space-x-2">
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-lg text-xs font-bold"
                        style={{ backgroundColor: 'rgba(115,89,70,0.12)', color: '#735946' }}
                        onClick={() => setSelectedJobId(job.id)}
                      >
                        Ver
                      </button>
                      {!job.dryRun &&
                        (job.status === 'VALIDATED' || job.status === 'COMPLETED_WITH_ERRORS') && (
                          <button
                            type="button"
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                            style={{ backgroundColor: '#85264b' }}
                            onClick={() => executeMutation.mutate(job.id)}
                          >
                            Ejecutar
                          </button>
                        )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {selectedJob.data && (
          <section
            className="rounded-2xl p-5 border bg-white"
            style={{ borderColor: 'rgba(218,192,197,0.35)' }}
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <h2 className="text-lg font-black" style={{ color: '#402416' }}>
                  Detalle Job {selectedJob.data.id}
                </h2>
                <p className="text-sm mt-1" style={{ color: '#735946' }}>
                  Estado: {selectedJob.data.status} · Productos (+{selectedJob.data.createdProducts}{' '}
                  / ~{selectedJob.data.updatedProducts}) · Variantes (+
                  {selectedJob.data.createdVariants} / ~{selectedJob.data.updatedVariants})
                </p>
              </div>

              <button
                type="button"
                onClick={() => selectedJobId && downloadErrorsMutation.mutate(selectedJobId)}
                disabled={!selectedJob.data.errorRows || downloadErrorsMutation.isPending}
                className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider disabled:opacity-50"
                style={{ backgroundColor: 'rgba(186,26,26,0.12)', color: '#ba1a1a' }}
              >
                {downloadErrorsMutation.isPending ? 'Descargando...' : 'Descargar solo errores CSV'}
              </button>
            </div>
            <div className="mt-4 max-h-80 overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left" style={{ color: '#877176' }}>
                    <th className="py-2">Fila</th>
                    <th className="py-2">Estado</th>
                    <th className="py-2">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedReport.data?.rows ?? []).map((row) => (
                    <tr
                      key={row.id}
                      className="border-t"
                      style={{ borderColor: 'rgba(218,192,197,0.25)' }}
                    >
                      <td className="py-2">{row.rowNumber}</td>
                      <td className="py-2">{row.status}</td>
                      <td className="py-2" style={{ color: '#ba1a1a' }}>
                        {row.errorMessage ?? '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  );
}
