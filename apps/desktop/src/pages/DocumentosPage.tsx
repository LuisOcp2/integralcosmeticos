import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AppLayout from './components/AppLayout';
import api from '../lib/api';

type CarpetaNode = {
  id: string;
  nombre: string;
  padreId?: string | null;
  documentCount?: number;
  children?: CarpetaNode[];
};

type Documento = {
  id: string;
  nombre: string;
  tipo: string;
  tamano: number;
  version: number;
  vencimientoEn?: string | null;
  carpetaId: string;
};

type TipoDocumento =
  | 'CONTRATO'
  | 'FACTURA'
  | 'MANUAL'
  | 'POLITICA'
  | 'CERTIFICADO'
  | 'REPORTE'
  | 'OTRO';

const tiposDocumento: TipoDocumento[] = [
  'CONTRATO',
  'FACTURA',
  'MANUAL',
  'POLITICA',
  'CERTIFICADO',
  'REPORTE',
  'OTRO',
];

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const result = value / 1024 ** index;
  return `${result.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function flattenTree(nodes: CarpetaNode[]): CarpetaNode[] {
  const output: CarpetaNode[] = [];
  const walk = (list: CarpetaNode[]) => {
    list.forEach((node) => {
      output.push(node);
      if (node.children?.length) walk(node.children);
    });
  };
  walk(nodes);
  return output;
}

function FolderTree({
  nodes,
  selectedId,
  onSelect,
  level = 0,
}: {
  nodes: CarpetaNode[];
  selectedId: string | null;
  onSelect: (folderId: string) => void;
  level?: number;
}) {
  return (
    <div className="space-y-1">
      {nodes.map((node) => (
        <div key={node.id}>
          <button
            onClick={() => onSelect(node.id)}
            className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm ${
              selectedId === node.id ? 'bg-primary text-on-primary' : 'hover:bg-surface-container'
            }`}
            style={{ paddingLeft: `${8 + level * 16}px` }}
          >
            <span>{node.nombre}</span>
            <span className="text-xs font-bold">{node.documentCount ?? 0}</span>
          </button>
          {node.children?.length ? (
            <FolderTree
              nodes={node.children}
              selectedId={selectedId}
              onSelect={onSelect}
              level={level + 1}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

export default function DocumentosPage() {
  const queryClient = useQueryClient();
  const [carpetaSeleccionada, setCarpetaSeleccionada] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [mostrarSubida, setMostrarSubida] = useState(false);
  const [form, setForm] = useState({
    nombre: '',
    tipo: 'OTRO' as TipoDocumento,
    etiquetas: '',
    vencimientoEn: '',
    archivoNombre: '',
    archivoUrl: '',
    mimeType: '',
    tamano: '',
    descripcion: '',
  });

  const carpetasQuery = useQuery({
    queryKey: ['documentos-carpetas-arbol'],
    queryFn: async () => {
      const { data } = await api.get<CarpetaNode[]>('/documentos/carpetas');
      return data;
    },
  });

  const documentosQuery = useQuery({
    queryKey: ['documentos-list', carpetaSeleccionada],
    queryFn: async () => {
      const { data } = await api.get<Documento[]>('/documentos', {
        params: carpetaSeleccionada ? { carpetaId: carpetaSeleccionada } : undefined,
      });
      return data;
    },
  });

  const buscarQuery = useQuery({
    queryKey: ['documentos-buscar', search, carpetaSeleccionada],
    enabled: search.trim().length > 0,
    queryFn: async () => {
      const { data } = await api.get<Documento[]>('/documentos/buscar', {
        params: {
          q: search,
          ...(carpetaSeleccionada ? { carpetaId: carpetaSeleccionada } : {}),
        },
      });
      return data;
    },
  });

  const crearDocumentoMutation = useMutation({
    mutationFn: async () => {
      if (!carpetaSeleccionada) return;
      await api.post('/documentos', {
        nombre: form.nombre,
        descripcion: form.descripcion || undefined,
        carpetaId: carpetaSeleccionada,
        tipo: form.tipo,
        nombreArchivo: form.archivoNombre,
        archivoUrl: form.archivoUrl,
        tamano: Number(form.tamano),
        mimeType: form.mimeType,
        etiquetas: form.etiquetas
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        vencimientoEn: form.vencimientoEn || undefined,
      });
    },
    onSuccess: () => {
      setMostrarSubida(false);
      setForm({
        nombre: '',
        tipo: 'OTRO',
        etiquetas: '',
        vencimientoEn: '',
        archivoNombre: '',
        archivoUrl: '',
        mimeType: '',
        tamano: '',
        descripcion: '',
      });
      void queryClient.invalidateQueries({ queryKey: ['documentos-list'] });
      void queryClient.invalidateQueries({ queryKey: ['documentos-carpetas-arbol'] });
      void queryClient.invalidateQueries({ queryKey: ['documentos-buscar'] });
    },
  });

  const folders = carpetasQuery.data ?? [];
  const flatFolders = useMemo(() => flattenTree(folders), [folders]);

  const documentos =
    search.trim().length > 0 ? (buscarQuery.data ?? []) : (documentosQuery.data ?? []);

  const carpetaActual = flatFolders.find((f) => f.id === carpetaSeleccionada) ?? null;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-on-secondary-fixed">
              Documentos
            </h1>
            <p className="mt-1 font-medium text-secondary">
              Gestion documental por carpetas, versiones y vencimientos.
            </p>
          </div>
          <button
            onClick={() => setMostrarSubida(true)}
            disabled={!carpetaSeleccionada}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary disabled:opacity-50"
          >
            Subir Documento
          </button>
        </div>

        <div className="rounded-xl border border-outline-variant bg-white p-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar en nombre, descripcion o etiquetas"
            className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <aside className="rounded-xl border border-outline-variant bg-white p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Arbol de carpetas
            </p>
            {folders.length ? (
              <FolderTree
                nodes={folders}
                selectedId={carpetaSeleccionada}
                onSelect={setCarpetaSeleccionada}
              />
            ) : (
              <p className="text-sm text-on-surface-variant">No hay carpetas registradas.</p>
            )}
          </aside>

          <section className="rounded-xl border border-outline-variant bg-white">
            <div className="border-b border-outline-variant px-4 py-3">
              <p className="text-sm font-bold text-on-surface">
                {carpetaActual ? `Carpeta: ${carpetaActual.nombre}` : 'Todos los documentos'}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-surface-container text-left text-xs uppercase tracking-wide text-on-surface-variant">
                  <tr>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Tamano</th>
                    <th className="px-4 py-3">Version</th>
                    <th className="px-4 py-3">Vencimiento</th>
                  </tr>
                </thead>
                <tbody>
                  {documentos.map((doc) => (
                    <tr key={doc.id} className="border-t border-outline-variant/30">
                      <td className="px-4 py-3 font-semibold text-on-surface">{doc.nombre}</td>
                      <td className="px-4 py-3 text-on-surface-variant">{doc.tipo}</td>
                      <td className="px-4 py-3 text-on-surface-variant">
                        {formatBytes(Number(doc.tamano || 0))}
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant">v{doc.version}</td>
                      <td className="px-4 py-3 text-on-surface-variant">
                        {doc.vencimientoEn ? doc.vencimientoEn.slice(0, 10) : '-'}
                      </td>
                    </tr>
                  ))}
                  {!documentosQuery.isLoading &&
                    !buscarQuery.isLoading &&
                    documentos.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-on-surface-variant">
                          No hay documentos para mostrar.
                        </td>
                      </tr>
                    )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      {mostrarSubida && carpetaSeleccionada && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <form
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              crearDocumentoMutation.mutate();
            }}
            className="w-full max-w-2xl space-y-4 rounded-2xl border border-outline-variant bg-white p-5"
          >
            <h2 className="text-lg font-black text-on-surface">Subir documento</h2>

            <div className="grid gap-3 md:grid-cols-2">
              <input
                required
                value={form.nombre}
                onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
                placeholder="Nombre"
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              />

              <select
                value={form.tipo}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, tipo: e.target.value as TipoDocumento }))
                }
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              >
                {tiposDocumento.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>

              <input
                value={form.etiquetas}
                onChange={(e) => setForm((prev) => ({ ...prev, etiquetas: e.target.value }))}
                placeholder="Etiquetas separadas por coma"
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm md:col-span-2"
              />

              <input
                type="date"
                value={form.vencimientoEn}
                onChange={(e) => setForm((prev) => ({ ...prev, vencimientoEn: e.target.value }))}
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              />

              <input
                value={form.archivoNombre}
                onChange={(e) => setForm((prev) => ({ ...prev, archivoNombre: e.target.value }))}
                placeholder="Nombre archivo"
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              />

              <input
                value={form.archivoUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, archivoUrl: e.target.value }))}
                placeholder="URL del archivo"
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm md:col-span-2"
              />

              <input
                value={form.mimeType}
                onChange={(e) => setForm((prev) => ({ ...prev, mimeType: e.target.value }))}
                placeholder="MIME type"
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              />

              <input
                type="number"
                min="0"
                value={form.tamano}
                onChange={(e) => setForm((prev) => ({ ...prev, tamano: e.target.value }))}
                placeholder="Tamano en bytes"
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              />

              <textarea
                value={form.descripcion}
                onChange={(e) => setForm((prev) => ({ ...prev, descripcion: e.target.value }))}
                placeholder="Descripcion"
                rows={3}
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm md:col-span-2"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMostrarSubida(false)}
                className="rounded-lg border border-outline-variant px-4 py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={crearDocumentoMutation.isPending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary disabled:opacity-60"
              >
                {crearDocumentoMutation.isPending ? 'Guardando...' : 'Guardar documento'}
              </button>
            </div>
          </form>
        </div>
      )}
    </AppLayout>
  );
}
