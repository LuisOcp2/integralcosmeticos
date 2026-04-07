import { FormEvent, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowUp,
  CalendarClock,
  CircleCheck,
  File,
  FileText,
  FolderOpen,
  Grid3X3,
  History,
  Image,
  Plus,
  Rows3,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
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
  descripcion?: string | null;
  tipo: string;
  tamano: number;
  version: number;
  vencimientoEn?: string | null;
  carpetaId: string;
  nombreArchivo: string;
  archivoUrl: string;
  mimeType: string;
  etiquetas: string[];
};

type VersionDocumento = {
  id: string;
  version: number;
  nombreArchivo: string;
  archivoUrl: string;
  cambios?: string | null;
  createdAt: string;
};

type TipoDocumento =
  | 'CONTRATO'
  | 'FACTURA'
  | 'MANUAL'
  | 'POLITICA'
  | 'CERTIFICADO'
  | 'REPORTE'
  | 'OTRO';

type PreviewTarget = {
  url: string;
  mimeType?: string;
  nombre?: string;
};

const tiposDocumento: TipoDocumento[] = [
  'CONTRATO',
  'FACTURA',
  'MANUAL',
  'POLITICA',
  'CERTIFICADO',
  'REPORTE',
  'OTRO',
];

const typeColor: Record<string, string> = {
  CONTRATO: 'bg-sky-100 text-sky-700',
  FACTURA: 'bg-emerald-100 text-emerald-700',
  MANUAL: 'bg-orange-100 text-orange-700',
  POLITICA: 'bg-rose-100 text-rose-700',
  CERTIFICADO: 'bg-indigo-100 text-indigo-700',
  REPORTE: 'bg-violet-100 text-violet-700',
  OTRO: 'bg-slate-100 text-slate-700',
};

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const result = value / 1024 ** index;
  return `${result.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function resolveFileUrl(url: string) {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
    return url;
  }
  if (url.startsWith('/uploads/')) {
    return `/uploads${url.replace('/uploads', '')}`;
  }
  if (url.startsWith('uploads/')) {
    return `/${url}`;
  }
  if (url.startsWith('/')) return url;
  return `/${url}`;
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
            className={`flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm transition-all ${
              selectedId === node.id
                ? 'bg-gradient-to-r from-primary to-amber-500 text-white shadow'
                : 'text-on-surface hover:bg-surface-container'
            }`}
            style={{ paddingLeft: `${10 + level * 16}px` }}
          >
            <span className="line-clamp-1 font-semibold">{node.nombre}</span>
            <span className="ml-2 rounded-full bg-black/10 px-2 py-0.5 text-xs font-bold">
              {node.documentCount ?? 0}
            </span>
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [carpetaSeleccionada, setCarpetaSeleccionada] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [mostrarSubida, setMostrarSubida] = useState(false);
  const [mostrarNuevaCarpeta, setMostrarNuevaCarpeta] = useState(false);
  const [selectedDocumentoId, setSelectedDocumentoId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<PreviewTarget | null>(null);

  const [formSubida, setFormSubida] = useState({
    nombre: '',
    tipo: 'OTRO' as TipoDocumento,
    etiquetas: '',
    vencimientoEn: '',
    descripcion: '',
    file: null as File | null,
  });

  const [formNuevaCarpeta, setFormNuevaCarpeta] = useState({
    nombre: '',
    padreId: '',
    acceso: 'PUBLICO',
  });

  const [formNuevaVersion, setFormNuevaVersion] = useState({
    cambios: '',
    file: null as File | null,
  });

  const [message, setMessage] = useState<string | null>(null);

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

  const versionesQuery = useQuery({
    queryKey: ['documentos-versiones', selectedDocumentoId],
    enabled: Boolean(selectedDocumentoId),
    queryFn: async () => {
      const { data } = await api.get<VersionDocumento[]>(
        `/documentos/${selectedDocumentoId}/versiones`,
      );
      return data;
    },
  });

  const crearCarpetaMutation = useMutation({
    mutationFn: async () => {
      await api.post('/documentos/carpetas', {
        nombre: formNuevaCarpeta.nombre,
        padreId: formNuevaCarpeta.padreId || undefined,
        acceso: formNuevaCarpeta.acceso,
      });
    },
    onSuccess: () => {
      setMessage('Carpeta creada.');
      setMostrarNuevaCarpeta(false);
      setFormNuevaCarpeta({ nombre: '', padreId: '', acceso: 'PUBLICO' });
      void queryClient.invalidateQueries({ queryKey: ['documentos-carpetas-arbol'] });
    },
  });

  const subirDocumentoMutation = useMutation({
    mutationFn: async () => {
      if (!carpetaSeleccionada || !formSubida.file) return;
      const payload = new FormData();
      payload.append('file', formSubida.file);
      payload.append('nombre', formSubida.nombre);
      payload.append('tipo', formSubida.tipo);
      payload.append('carpetaId', carpetaSeleccionada);
      if (formSubida.descripcion) payload.append('descripcion', formSubida.descripcion);
      if (formSubida.vencimientoEn) payload.append('vencimientoEn', formSubida.vencimientoEn);
      if (formSubida.etiquetas.trim()) payload.append('etiquetas', formSubida.etiquetas);

      await api.post('/documentos/subir-archivo', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      setMessage('Documento subido correctamente.');
      setMostrarSubida(false);
      setFormSubida({
        nombre: '',
        tipo: 'OTRO',
        etiquetas: '',
        vencimientoEn: '',
        descripcion: '',
        file: null,
      });
      void queryClient.invalidateQueries({ queryKey: ['documentos-list'] });
      void queryClient.invalidateQueries({ queryKey: ['documentos-carpetas-arbol'] });
      void queryClient.invalidateQueries({ queryKey: ['documentos-buscar'] });
    },
  });

  const nuevaVersionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDocumentoId || !formNuevaVersion.file) return;
      const payload = new FormData();
      payload.append('file', formNuevaVersion.file);
      if (formNuevaVersion.cambios) payload.append('cambios', formNuevaVersion.cambios);
      await api.post(`/documentos/${selectedDocumentoId}/nueva-version-archivo`, payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      setMessage('Nueva versión registrada.');
      setFormNuevaVersion({ cambios: '', file: null });
      void queryClient.invalidateQueries({ queryKey: ['documentos-list'] });
      void queryClient.invalidateQueries({
        queryKey: ['documentos-versiones', selectedDocumentoId],
      });
      void queryClient.invalidateQueries({ queryKey: ['documentos-buscar'] });
    },
  });

  const eliminarDocumentoMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/documentos/${id}`);
    },
    onSuccess: () => {
      setMessage('Documento eliminado.');
      setSelectedDocumentoId(null);
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
  const documentoSeleccionado =
    documentos.find((documento) => documento.id === selectedDocumentoId) ?? null;

  const previewSource = preview?.url
    ? preview
    : documentoSeleccionado
      ? {
          url: resolveFileUrl(documentoSeleccionado.archivoUrl),
          mimeType: documentoSeleccionado.mimeType,
          nombre: documentoSeleccionado.nombreArchivo,
        }
      : null;

  const totalDocs = documentos.length;
  const totalSize = documentos.reduce((acc, doc) => acc + Number(doc.tamano || 0), 0);
  const vencenPronto = documentos.filter((doc) => {
    if (!doc.vencimientoEn) return false;
    const d = new Date(doc.vencimientoEn);
    const now = new Date();
    const in15 = new Date();
    in15.setDate(in15.getDate() + 15);
    return d >= now && d <= in15;
  }).length;

  const isImagePreview =
    Boolean(previewSource?.mimeType?.startsWith('image/')) ||
    Boolean(previewSource?.url?.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i));
  const isPdfPreview =
    previewSource?.mimeType === 'application/pdf' ||
    Boolean(previewSource?.url?.match(/\.pdf($|\?)/i));

  const onSubmitCrearCarpeta = (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    crearCarpetaMutation.mutate();
  };

  const onSubmitSubida = (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    subirDocumentoMutation.mutate();
  };

  const onSubmitNuevaVersion = (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    nuevaVersionMutation.mutate();
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <section className="rounded-2xl border border-outline-variant bg-gradient-to-br from-[#fff9f5] via-white to-[#f8fffb] p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-on-secondary-fixed">
                Documentos
              </h1>
              <p className="mt-1 text-secondary">
                Centro de gestión documental con control de versiones.
              </p>
            </div>
            <div className="flex gap-2">
              <div className="hidden rounded-lg border border-outline-variant p-1 md:flex">
                <button
                  onClick={() => setViewMode('table')}
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold ${viewMode === 'table' ? 'bg-surface-container text-on-surface' : 'text-on-surface-variant'}`}
                >
                  <Rows3 className="h-3.5 w-3.5" /> Tabla
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold ${viewMode === 'cards' ? 'bg-surface-container text-on-surface' : 'text-on-surface-variant'}`}
                >
                  <Grid3X3 className="h-3.5 w-3.5" /> Tarjetas
                </button>
              </div>
              <button
                onClick={() => setMostrarNuevaCarpeta(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-outline-variant bg-white px-4 py-2 text-sm font-bold text-on-surface"
              >
                <Plus className="h-4 w-4" /> Carpeta
              </button>
              <button
                onClick={() => setMostrarSubida(true)}
                disabled={!carpetaSeleccionada}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary disabled:opacity-50"
              >
                <Upload className="h-4 w-4" /> Subir documento
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-outline-variant bg-white p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                Documentos
              </p>
              <p className="mt-1 text-2xl font-black text-on-surface">{totalDocs}</p>
            </div>
            <div className="rounded-xl border border-outline-variant bg-white p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                Peso total
              </p>
              <p className="mt-1 text-2xl font-black text-on-surface">{formatBytes(totalSize)}</p>
            </div>
            <div className="rounded-xl border border-outline-variant bg-white p-3">
              <p className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                <CalendarClock className="h-3.5 w-3.5" /> Vencen pronto
              </p>
              <p className="mt-1 text-2xl font-black text-amber-600">{vencenPronto}</p>
            </div>
          </div>
        </section>

        {message && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <div className="inline-flex items-center gap-2 font-semibold">
              <CircleCheck className="h-4 w-4" />
              {message}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-outline-variant bg-white p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-on-surface-variant" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, descripción o etiquetas"
              className="w-full rounded-lg border border-outline-variant bg-surface-container-low py-2 pl-9 pr-3 text-sm"
            />
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[300px_1fr_360px]">
          <aside className="rounded-xl border border-outline-variant bg-white p-4">
            <div className="mb-3 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-on-surface-variant">
              <FolderOpen className="h-4 w-4" /> Árbol de carpetas
            </div>
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
            {viewMode === 'table' ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-surface-container text-left text-xs uppercase tracking-wide text-on-surface-variant">
                    <tr>
                      <th className="px-4 py-3">Documento</th>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Peso</th>
                      <th className="px-4 py-3">Versión</th>
                      <th className="px-4 py-3">Vence</th>
                      <th className="px-4 py-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documentos.map((doc) => (
                      <tr
                        key={doc.id}
                        className={`border-t border-outline-variant/30 transition ${selectedDocumentoId === doc.id ? 'bg-amber-50/50' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <div className="font-semibold text-on-surface">{doc.nombre}</div>
                          <div className="text-xs text-on-surface-variant">{doc.nombreArchivo}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-bold ${typeColor[doc.tipo] ?? typeColor.OTRO}`}
                          >
                            {doc.tipo}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-on-surface-variant">
                          {formatBytes(Number(doc.tamano || 0))}
                        </td>
                        <td className="px-4 py-3 text-on-surface-variant">v{doc.version}</td>
                        <td className="px-4 py-3 text-on-surface-variant">
                          {doc.vencimientoEn ? doc.vencimientoEn.slice(0, 10) : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setSelectedDocumentoId(doc.id);
                                setPreview({
                                  url: resolveFileUrl(doc.archivoUrl),
                                  mimeType: doc.mimeType,
                                  nombre: doc.nombreArchivo,
                                });
                              }}
                              className="rounded-lg border border-outline-variant px-2 py-1 text-xs"
                            >
                              Detalle
                            </button>
                            <a
                              href={resolveFileUrl(doc.archivoUrl)}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg border border-outline-variant px-2 py-1 text-xs"
                            >
                              Abrir
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid gap-3 p-4 md:grid-cols-2">
                {documentos.map((doc) => (
                  <div
                    key={doc.id}
                    className={`rounded-xl border p-3 ${selectedDocumentoId === doc.id ? 'border-amber-300 bg-amber-50/40' : 'border-outline-variant'}`}
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <p className="line-clamp-2 font-semibold text-on-surface">{doc.nombre}</p>
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-bold ${typeColor[doc.tipo] ?? typeColor.OTRO}`}
                      >
                        {doc.tipo}
                      </span>
                    </div>
                    <p className="line-clamp-1 text-xs text-on-surface-variant">
                      {doc.nombreArchivo}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-xs text-on-surface-variant">
                      <span>{formatBytes(doc.tamano)}</span>
                      <span>v{doc.version}</span>
                      <span>{doc.vencimientoEn ? doc.vencimientoEn.slice(0, 10) : '-'}</span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedDocumentoId(doc.id);
                          setPreview({
                            url: resolveFileUrl(doc.archivoUrl),
                            mimeType: doc.mimeType,
                            nombre: doc.nombreArchivo,
                          });
                        }}
                        className="rounded-lg border border-outline-variant px-2 py-1 text-xs"
                      >
                        Detalle
                      </button>
                      <a
                        href={resolveFileUrl(doc.archivoUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-outline-variant px-2 py-1 text-xs"
                      >
                        Abrir
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!documentosQuery.isLoading && !buscarQuery.isLoading && documentos.length === 0 && (
              <div className="px-4 py-10 text-center text-sm text-on-surface-variant">
                No hay documentos para mostrar.
              </div>
            )}
          </section>

          <aside className="rounded-xl border border-outline-variant bg-white p-4">
            <h2 className="mb-3 inline-flex items-center gap-2 text-sm font-black uppercase tracking-wide text-on-surface">
              <FileText className="h-4 w-4" />
              Detalle del documento
            </h2>

            {!documentoSeleccionado && (
              <p className="text-sm text-on-surface-variant">
                Selecciona un documento para revisar historial, etiquetas y acciones.
              </p>
            )}

            {documentoSeleccionado && (
              <div className="space-y-4">
                <div className="rounded-lg border border-outline-variant bg-surface-container-low p-2">
                  <div className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                    {isImagePreview ? (
                      <Image className="h-3.5 w-3.5" />
                    ) : (
                      <File className="h-3.5 w-3.5" />
                    )}
                    Vista previa
                  </div>
                  {previewSource && isImagePreview && (
                    <img
                      src={previewSource.url}
                      alt={previewSource.nombre ?? 'preview'}
                      className="max-h-52 w-full rounded-md object-contain bg-white"
                    />
                  )}
                  {previewSource && isPdfPreview && (
                    <iframe
                      src={previewSource.url}
                      title="pdf-preview"
                      className="h-56 w-full rounded-md bg-white"
                    />
                  )}
                  {previewSource && !isImagePreview && !isPdfPreview && (
                    <div className="rounded-md border border-dashed border-outline-variant bg-white p-4 text-xs text-on-surface-variant">
                      Este tipo de archivo no tiene preview inline. Ábrelo en una pestaña nueva.
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3">
                  <p className="text-base font-bold text-on-surface">
                    {documentoSeleccionado.nombre}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    {documentoSeleccionado.nombreArchivo}
                  </p>
                  {documentoSeleccionado.descripcion ? (
                    <p className="mt-2 text-xs text-on-surface-variant">
                      {documentoSeleccionado.descripcion}
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {documentoSeleccionado.etiquetas?.length ? (
                      documentoSeleccionado.etiquetas.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600"
                        >
                          #{tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-on-surface-variant">Sin etiquetas</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <a
                    href={resolveFileUrl(documentoSeleccionado.archivoUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-3 py-2 text-xs font-semibold"
                  >
                    <ArrowUp className="h-3 w-3" />
                    Abrir actual
                  </a>
                  <button
                    onClick={() => {
                      if (!confirm('¿Eliminar documento y todas sus versiones?')) return;
                      eliminarDocumentoMutation.mutate(documentoSeleccionado.id);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700"
                  >
                    <Trash2 className="h-3 w-3" />
                    Eliminar
                  </button>
                </div>

                <form
                  onSubmit={onSubmitNuevaVersion}
                  className="space-y-2 rounded-lg border border-outline-variant p-3"
                >
                  <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                    <Upload className="h-3 w-3" />
                    Nueva versión
                  </p>
                  <input
                    type="file"
                    onChange={(e) =>
                      setFormNuevaVersion((prev) => ({
                        ...prev,
                        file: e.target.files?.[0] ?? null,
                      }))
                    }
                    className="w-full text-xs"
                    required
                  />
                  <textarea
                    value={formNuevaVersion.cambios}
                    onChange={(e) =>
                      setFormNuevaVersion((prev) => ({ ...prev, cambios: e.target.value }))
                    }
                    placeholder="Describe cambios"
                    rows={2}
                    className="w-full rounded-lg border border-outline-variant px-2 py-1.5 text-xs"
                  />
                  <button
                    type="submit"
                    disabled={nuevaVersionMutation.isPending}
                    className="rounded bg-primary px-3 py-1.5 text-xs font-bold text-on-primary disabled:opacity-50"
                  >
                    {nuevaVersionMutation.isPending ? 'Subiendo...' : 'Registrar versión'}
                  </button>
                </form>

                <div className="space-y-2">
                  <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                    <History className="h-3 w-3" />
                    Historial
                  </p>
                  {(versionesQuery.data ?? []).map((version) => (
                    <div
                      key={version.id}
                      className="rounded-lg border border-outline-variant p-2 text-xs"
                    >
                      <div className="font-semibold">
                        v{version.version} - {version.nombreArchivo}
                      </div>
                      <div className="text-on-surface-variant">
                        {new Date(version.createdAt).toLocaleString('es-CO')}
                      </div>
                      {version.cambios ? (
                        <div className="mt-1 text-on-surface-variant">{version.cambios}</div>
                      ) : null}
                      <div className="mt-1 flex items-center gap-2">
                        <button
                          onClick={() =>
                            setPreview({
                              url: resolveFileUrl(version.archivoUrl),
                              nombre: version.nombreArchivo,
                            })
                          }
                          className="rounded border border-outline-variant px-1.5 py-0.5"
                          type="button"
                        >
                          Preview
                        </button>
                        <a
                          href={resolveFileUrl(version.archivoUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block underline"
                        >
                          Abrir versión
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      {mostrarNuevaCarpeta && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <form
            onSubmit={onSubmitCrearCarpeta}
            className="w-full max-w-lg space-y-3 rounded-2xl border border-outline-variant bg-white p-5"
          >
            <h2 className="text-lg font-black text-on-surface">Nueva carpeta</h2>
            <input
              required
              value={formNuevaCarpeta.nombre}
              onChange={(e) => setFormNuevaCarpeta((prev) => ({ ...prev, nombre: e.target.value }))}
              placeholder="Nombre carpeta"
              className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm"
            />
            <select
              value={formNuevaCarpeta.padreId}
              onChange={(e) =>
                setFormNuevaCarpeta((prev) => ({ ...prev, padreId: e.target.value }))
              }
              className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm"
            >
              <option value="">Raíz</option>
              {flatFolders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.nombre}
                </option>
              ))}
            </select>
            <select
              value={formNuevaCarpeta.acceso}
              onChange={(e) => setFormNuevaCarpeta((prev) => ({ ...prev, acceso: e.target.value }))}
              className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm"
            >
              <option value="PUBLICO">PUBLICO</option>
              <option value="PRIVADO">PRIVADO</option>
              <option value="DEPARTAMENTO">DEPARTAMENTO</option>
            </select>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMostrarNuevaCarpeta(false)}
                className="rounded-lg border border-outline-variant px-4 py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={crearCarpetaMutation.isPending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary disabled:opacity-50"
              >
                Crear carpeta
              </button>
            </div>
          </form>
        </div>
      )}

      {mostrarSubida && carpetaSeleccionada && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <form
            onSubmit={onSubmitSubida}
            className="w-full max-w-2xl space-y-4 rounded-2xl border border-outline-variant bg-white p-5"
          >
            <h2 className="text-lg font-black text-on-surface">Subir documento</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                required
                value={formSubida.nombre}
                onChange={(e) => setFormSubida((prev) => ({ ...prev, nombre: e.target.value }))}
                placeholder="Nombre"
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              />
              <select
                value={formSubida.tipo}
                onChange={(e) =>
                  setFormSubida((prev) => ({ ...prev, tipo: e.target.value as TipoDocumento }))
                }
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              >
                {tiposDocumento.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) setFormSubida((prev) => ({ ...prev, file }));
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer rounded-lg border-2 border-dashed px-3 py-6 text-center text-sm md:col-span-2 ${dragActive ? 'border-primary bg-primary/5' : 'border-outline-variant bg-surface-container-low'}`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  required
                  onChange={(e) =>
                    setFormSubida((prev) => ({ ...prev, file: e.target.files?.[0] ?? null }))
                  }
                  className="hidden"
                />
                <p className="font-semibold text-on-surface">Arrastra y suelta el archivo aquí</p>
                <p className="text-xs text-on-surface-variant">o haz clic para seleccionar</p>
                {formSubida.file ? (
                  <p className="mt-2 text-xs font-semibold text-primary">
                    {formSubida.file.name} ({formatBytes(formSubida.file.size)})
                  </p>
                ) : null}
              </div>

              <input
                value={formSubida.etiquetas}
                onChange={(e) => setFormSubida((prev) => ({ ...prev, etiquetas: e.target.value }))}
                placeholder="Etiquetas separadas por coma"
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm md:col-span-2"
              />
              <input
                type="date"
                value={formSubida.vencimientoEn}
                onChange={(e) =>
                  setFormSubida((prev) => ({ ...prev, vencimientoEn: e.target.value }))
                }
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              />
              <textarea
                value={formSubida.descripcion}
                onChange={(e) =>
                  setFormSubida((prev) => ({ ...prev, descripcion: e.target.value }))
                }
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
                disabled={subirDocumentoMutation.isPending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary disabled:opacity-60"
              >
                {subirDocumentoMutation.isPending ? 'Subiendo...' : 'Guardar documento'}
              </button>
            </div>
          </form>
        </div>
      )}
    </AppLayout>
  );
}
