import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Filter,
  FolderKanban,
  MessageSquarePlus,
  PenSquare,
  Plus,
  RefreshCw,
  Search,
  Timer,
  TrendingUp,
} from 'lucide-react';
import AppLayout from './components/AppLayout';
import api from '../lib/api';

type EstadoTarea = 'PENDIENTE' | 'EN_PROGRESO' | 'REVISION' | 'COMPLETADA' | 'CANCELADA';
type Prioridad = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';

type Proyecto = {
  id: string;
  nombre: string;
  tipo: TipoProyecto;
  estado: EstadoProyecto;
  porcentajeAvance: number;
  fechaInicio: string;
  fechaFinEsperada: string;
  prioridad: Prioridad;
  responsable?: { nombre: string; apellido: string } | null;
  responsableId?: string;
};

type Tarea = {
  id: string;
  titulo: string;
  estado: EstadoTarea;
  prioridad: Prioridad;
  estimacionHoras?: number | null;
  horasReales?: number | null;
  fechaVencimiento?: string | null;
  asignadoA?: { nombre: string; apellido: string } | null;
  comentarios?: { id: string; texto: string; createdAt: string }[];
};

type Paginado<T> = {
  items: T[];
  total: number;
};

type KanbanColumn = {
  count: number;
  horasEstimadas: number;
  items: Tarea[];
};

type KanbanResponse = Record<EstadoTarea, KanbanColumn>;
type Empleado = { id: string; nombre: string; apellido: string };
type TipoProyecto = 'INTERNO' | 'CLIENTE' | 'INFRAESTRUCTURA' | 'MARKETING' | 'TI';
type EstadoProyecto = 'PLANIFICACION' | 'EN_EJECUCION' | 'PAUSADO' | 'COMPLETADO' | 'CANCELADO';

const estadosKanban: EstadoTarea[] = [
  'PENDIENTE',
  'EN_PROGRESO',
  'REVISION',
  'COMPLETADA',
  'CANCELADA',
];

const estadoLabel: Record<EstadoTarea, string> = {
  PENDIENTE: 'Pendiente',
  EN_PROGRESO: 'En progreso',
  REVISION: 'Revision',
  COMPLETADA: 'Completada',
  CANCELADA: 'Cancelada',
};

const estadoBadge: Record<EstadoTarea, string> = {
  PENDIENTE: 'border-amber-300 bg-amber-50 text-amber-800',
  EN_PROGRESO: 'border-sky-300 bg-sky-50 text-sky-800',
  REVISION: 'border-violet-300 bg-violet-50 text-violet-800',
  COMPLETADA: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  CANCELADA: 'border-slate-300 bg-slate-100 text-slate-700',
};

const prioridadBadge: Record<Prioridad, string> = {
  BAJA: 'bg-slate-100 text-slate-700',
  MEDIA: 'bg-blue-100 text-blue-700',
  ALTA: 'bg-amber-100 text-amber-700',
  CRITICA: 'bg-rose-100 text-rose-700',
};

const sortOptions = [
  { value: 'avance_desc', label: 'Mayor avance' },
  { value: 'avance_asc', label: 'Menor avance' },
  { value: 'nombre_asc', label: 'Nombre A-Z' },
  { value: 'fecha_asc', label: 'Fecha fin cercana' },
] as const;

type SortValue = (typeof sortOptions)[number]['value'];

const initialFormTarea = {
  titulo: '',
  asignadoAId: '',
  prioridad: 'MEDIA' as Prioridad,
  estado: 'PENDIENTE' as EstadoTarea,
  estimacionHoras: '',
  fechaVencimiento: '',
};

const initialFormProyecto = {
  nombre: '',
  tipo: 'INTERNO' as TipoProyecto,
  estado: 'PLANIFICACION' as EstadoProyecto,
  responsableId: '',
  fechaInicio: '',
  fechaFinEsperada: '',
  prioridad: 'MEDIA' as Prioridad,
};

export default function ProyectosPage() {
  const queryClient = useQueryClient();
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState<Proyecto | null>(null);
  const [mostrarNuevaTarea, setMostrarNuevaTarea] = useState(false);
  const [mostrarProyectoForm, setMostrarProyectoForm] = useState(false);
  const [modoProyecto, setModoProyecto] = useState<'crear' | 'editar'>('crear');
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortValue>('avance_desc');
  const [prioridadFiltro, setPrioridadFiltro] = useState<'' | Prioridad>('');
  const [taskSearch, setTaskSearch] = useState('');
  const [tareaSeleccionadaId, setTareaSeleccionadaId] = useState<string | null>(null);
  const [comentarioTexto, setComentarioTexto] = useState('');
  const [horasInput, setHorasInput] = useState('');
  const [formTarea, setFormTarea] = useState(initialFormTarea);
  const [formProyecto, setFormProyecto] = useState(initialFormProyecto);

  const proyectosQuery = useQuery({
    queryKey: ['proyectos-list'],
    queryFn: async () => {
      const { data } = await api.get<Paginado<Proyecto>>('/proyectos', {
        params: { page: 1, limit: 150 },
      });
      return data;
    },
  });

  const kanbanQuery = useQuery({
    queryKey: ['proyectos-kanban', proyectoSeleccionado?.id],
    enabled: Boolean(proyectoSeleccionado?.id),
    queryFn: async () => {
      const { data } = await api.get<KanbanResponse>(
        `/proyectos/${proyectoSeleccionado?.id}/kanban`,
      );
      return data;
    },
  });

  const empleadosQuery = useQuery({
    queryKey: ['proyectos-empleados'],
    queryFn: async () => {
      const { data } = await api.get<Paginado<Empleado>>('/proyectos/empleados', {
        params: { page: 1, limit: 300 },
      });
      return data.items;
    },
  });

  const tareaDetalleQuery = useQuery({
    queryKey: ['proyectos-tarea-detalle', proyectoSeleccionado?.id, tareaSeleccionadaId],
    enabled: Boolean(proyectoSeleccionado?.id && tareaSeleccionadaId),
    queryFn: async () => {
      const { data } = await api.get<Tarea>(
        `/proyectos/${proyectoSeleccionado?.id}/tareas/${tareaSeleccionadaId}`,
      );
      return data;
    },
  });

  const refreshProyectoData = () => {
    if (!proyectoSeleccionado?.id) return;
    void queryClient.invalidateQueries({ queryKey: ['proyectos-list'] });
    void queryClient.invalidateQueries({ queryKey: ['proyectos-kanban', proyectoSeleccionado.id] });
    if (tareaSeleccionadaId) {
      void queryClient.invalidateQueries({
        queryKey: ['proyectos-tarea-detalle', proyectoSeleccionado.id, tareaSeleccionadaId],
      });
    }
  };

  const openCrearProyecto = () => {
    setModoProyecto('crear');
    setFormProyecto(initialFormProyecto);
    setMostrarProyectoForm(true);
  };

  const openEditarProyecto = (proyecto: Proyecto) => {
    setModoProyecto('editar');
    setFormProyecto({
      nombre: proyecto.nombre,
      tipo: proyecto.tipo,
      estado: proyecto.estado,
      responsableId: proyecto.responsableId ?? '',
      fechaInicio: proyecto.fechaInicio?.slice(0, 10) ?? '',
      fechaFinEsperada: proyecto.fechaFinEsperada?.slice(0, 10) ?? '',
      prioridad: proyecto.prioridad,
    });
    setMostrarProyectoForm(true);
  };

  const crearTareaMutation = useMutation({
    mutationFn: async () => {
      if (!proyectoSeleccionado) return;
      await api.post(`/proyectos/${proyectoSeleccionado.id}/tareas`, {
        titulo: formTarea.titulo,
        asignadoAId: formTarea.asignadoAId,
        prioridad: formTarea.prioridad,
        estado: formTarea.estado,
        estimacionHoras: formTarea.estimacionHoras ? Number(formTarea.estimacionHoras) : undefined,
        fechaVencimiento: formTarea.fechaVencimiento || undefined,
      });
    },
    onSuccess: () => {
      setMostrarNuevaTarea(false);
      setFormTarea(initialFormTarea);
      refreshProyectoData();
    },
  });

  const cambiarEstadoMutation = useMutation({
    mutationFn: async ({ tareaId, estado }: { tareaId: string; estado: EstadoTarea }) => {
      if (!proyectoSeleccionado?.id) return;
      await api.patch(`/proyectos/${proyectoSeleccionado.id}/tareas/${tareaId}/estado`, { estado });
    },
    onSuccess: () => {
      refreshProyectoData();
    },
  });

  const registrarHorasMutation = useMutation({
    mutationFn: async ({ tareaId, horas }: { tareaId: string; horas: number }) => {
      if (!proyectoSeleccionado?.id) return;
      await api.post(`/proyectos/${proyectoSeleccionado.id}/tareas/${tareaId}/registrar-horas`, {
        horas,
      });
    },
    onSuccess: () => {
      setHorasInput('');
      refreshProyectoData();
    },
  });

  const comentarMutation = useMutation({
    mutationFn: async ({ tareaId, texto }: { tareaId: string; texto: string }) => {
      if (!proyectoSeleccionado?.id) return;
      await api.post(`/proyectos/${proyectoSeleccionado.id}/tareas/${tareaId}/comentarios`, {
        texto,
      });
    },
    onSuccess: () => {
      setComentarioTexto('');
      refreshProyectoData();
    },
  });

  const crearProyectoMutation = useMutation({
    mutationFn: async () => {
      await api.post('/proyectos', formProyecto);
    },
    onSuccess: () => {
      setMostrarProyectoForm(false);
      setFormProyecto(initialFormProyecto);
      void queryClient.invalidateQueries({ queryKey: ['proyectos-list'] });
    },
  });

  const actualizarProyectoMutation = useMutation({
    mutationFn: async () => {
      if (!proyectoSeleccionado?.id) return;
      await api.put(`/proyectos/${proyectoSeleccionado.id}`, formProyecto);
    },
    onSuccess: () => {
      setMostrarProyectoForm(false);
      void queryClient.invalidateQueries({ queryKey: ['proyectos-list'] });
      if (proyectoSeleccionado?.id) {
        void queryClient.invalidateQueries({
          queryKey: ['proyectos-kanban', proyectoSeleccionado.id],
        });
      }
      if (proyectoSeleccionado) {
        setProyectoSeleccionado((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            ...formProyecto,
          };
        });
      }
    },
  });

  const recalcularAvanceMutation = useMutation({
    mutationFn: async () => {
      if (!proyectoSeleccionado?.id) return;
      await api.post(`/proyectos/${proyectoSeleccionado.id}/calcular-avance`);
    },
    onSuccess: () => {
      refreshProyectoData();
    },
  });

  const proyectosRaw = proyectosQuery.data?.items ?? [];

  const proyectos = useMemo(() => {
    const term = search.trim().toLowerCase();

    const filtered = proyectosRaw.filter((item) => {
      const okTerm =
        !term || item.nombre.toLowerCase().includes(term) || item.tipo.toLowerCase().includes(term);
      const okPrioridad = !prioridadFiltro || item.prioridad === prioridadFiltro;
      return okTerm && okPrioridad;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'avance_desc') return b.porcentajeAvance - a.porcentajeAvance;
      if (sortBy === 'avance_asc') return a.porcentajeAvance - b.porcentajeAvance;
      if (sortBy === 'nombre_asc') return a.nombre.localeCompare(b.nombre);
      const dateA = new Date(a.fechaFinEsperada ?? '').getTime() || Number.POSITIVE_INFINITY;
      const dateB = new Date(b.fechaFinEsperada ?? '').getTime() || Number.POSITIVE_INFINITY;
      return dateA - dateB;
    });
  }, [prioridadFiltro, proyectosRaw, search, sortBy]);

  const kanban = kanbanQuery.data;

  const totalTareasKanban = useMemo(
    () => estadosKanban.reduce((acc, estado) => acc + (kanban?.[estado]?.count ?? 0), 0),
    [kanban],
  );

  const horasEstimadasTotal = useMemo(
    () =>
      estadosKanban.reduce((acc, estado) => {
        return acc + Number(kanban?.[estado]?.horasEstimadas || 0);
      }, 0),
    [kanban],
  );

  const tareasFiltradas = useMemo(() => {
    const term = taskSearch.trim().toLowerCase();
    if (!term || !kanban) return kanban;

    const next: Partial<KanbanResponse> = {};
    estadosKanban.forEach((estado) => {
      const col = kanban[estado] ?? { count: 0, horasEstimadas: 0, items: [] };
      const items = col.items.filter((t) => t.titulo.toLowerCase().includes(term));
      next[estado] = {
        count: items.length,
        horasEstimadas: items.reduce((acc, t) => acc + Number(t.estimacionHoras || 0), 0),
        items,
      };
    });
    return next as KanbanResponse;
  }, [kanban, taskSearch]);

  const tareaDetalle = tareaDetalleQuery.data;
  const proyectoFormPending =
    modoProyecto === 'crear'
      ? crearProyectoMutation.isPending
      : actualizarProyectoMutation.isPending;

  return (
    <AppLayout>
      {!proyectoSeleccionado ? (
        <div className="space-y-6">
          <section className="rounded-3xl border border-outline-variant bg-gradient-to-br from-[#fff9f4] via-white to-[#f4faff] p-5 shadow-sm md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-on-secondary-fixed">
                  Proyectos
                </h1>
                <p className="mt-1 text-secondary">
                  Gestiona roadmap, carga operativa y seguimiento de tareas en un solo panel.
                </p>
              </div>
              <button
                onClick={openCrearProyecto}
                className="inline-flex h-max items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-on-primary"
              >
                <Plus className="h-4 w-4" /> Nuevo proyecto
              </button>
              <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-3">
                <div className="rounded-xl border border-outline-variant bg-white px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                    Total
                  </p>
                  <p className="text-xl font-black text-on-surface">{proyectosRaw.length}</p>
                </div>
                <div className="rounded-xl border border-outline-variant bg-white px-4 py-3">
                  <p className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                    <TrendingUp className="h-3.5 w-3.5" /> Activos
                  </p>
                  <p className="text-xl font-black text-on-surface">
                    {proyectosRaw.filter((p) => p.porcentajeAvance < 100).length}
                  </p>
                </div>
                <div className="rounded-xl border border-outline-variant bg-white px-4 py-3">
                  <p className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Cerrados
                  </p>
                  <p className="text-xl font-black text-on-surface">
                    {proyectosRaw.filter((p) => p.porcentajeAvance >= 100).length}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-outline-variant bg-white p-3 md:p-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-on-surface-variant" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nombre o tipo de proyecto"
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-low py-2 pl-9 pr-3 text-sm"
                />
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortValue)}
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowFilters((prev) => !prev)}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-sm font-semibold"
              >
                <Filter className="h-4 w-4" /> Filtros
              </button>
            </div>

            {showFilters && (
              <div className="mt-3 grid gap-3 rounded-lg border border-outline-variant bg-surface-container-low p-3 sm:grid-cols-2 lg:grid-cols-3">
                <select
                  value={prioridadFiltro}
                  onChange={(e) => setPrioridadFiltro(e.target.value as '' | Prioridad)}
                  className="rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm"
                >
                  <option value="">Prioridad (todas)</option>
                  <option value="BAJA">BAJA</option>
                  <option value="MEDIA">MEDIA</option>
                  <option value="ALTA">ALTA</option>
                  <option value="CRITICA">CRITICA</option>
                </select>
                <button
                  onClick={() => {
                    setPrioridadFiltro('');
                    setSearch('');
                    setSortBy('avance_desc');
                  }}
                  className="rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm font-semibold"
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {proyectos.map((proyecto) => {
              const progress = Math.max(0, Math.min(100, proyecto.porcentajeAvance));
              return (
                <button
                  key={proyecto.id}
                  onClick={() => {
                    setProyectoSeleccionado(proyecto);
                    setTareaSeleccionadaId(null);
                    setTaskSearch('');
                  }}
                  className="group rounded-2xl border border-outline-variant bg-white p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="line-clamp-2 text-lg font-black text-on-surface">
                      {proyecto.nombre}
                    </h2>
                    <span
                      className={`rounded-full px-2 py-1 text-[11px] font-bold ${prioridadBadge[proyecto.prioridad]}`}
                    >
                      {proyecto.prioridad}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-on-surface-variant">Tipo: {proyecto.tipo}</p>

                  <div className="mt-4">
                    <div className="mb-1 flex items-center justify-between text-xs font-bold text-secondary">
                      <span>Avance</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-primary to-amber-500 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-3 space-y-1 text-sm text-on-surface-variant">
                    <p>
                      Responsable:{' '}
                      {proyecto.responsable
                        ? `${proyecto.responsable.nombre} ${proyecto.responsable.apellido}`
                        : 'Sin asignar'}
                    </p>
                    <p className="inline-flex items-center gap-1">
                      <CalendarClock className="h-3.5 w-3.5" />
                      Fecha fin: {proyecto.fechaFinEsperada?.slice(0, 10) ?? '-'}
                    </p>
                  </div>
                </button>
              );
            })}
            {!proyectosQuery.isLoading && proyectos.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-outline-variant bg-white p-10 text-center text-sm text-on-surface-variant">
                No hay proyectos para los filtros aplicados.
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="space-y-5">
          <section className="rounded-3xl border border-outline-variant bg-gradient-to-br from-[#fff9f4] via-white to-[#f6fbff] p-5 shadow-sm md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <button
                  onClick={() => setProyectoSeleccionado(null)}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
                >
                  <ArrowLeft className="h-4 w-4" /> Volver a proyectos
                </button>
                <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-on-secondary-fixed">
                  {proyectoSeleccionado.nombre}
                </h1>
                <p className="mt-1 text-secondary">Tablero operativo y control de ejecucion.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => openEditarProyecto(proyectoSeleccionado)}
                  className="inline-flex items-center gap-2 rounded-xl border border-outline-variant px-4 py-2 text-sm font-bold text-on-surface"
                >
                  <PenSquare className="h-4 w-4" /> Editar proyecto
                </button>
                <button
                  onClick={() => recalcularAvanceMutation.mutate()}
                  disabled={recalcularAvanceMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-xl border border-outline-variant px-4 py-2 text-sm font-bold text-on-surface disabled:opacity-60"
                >
                  <RefreshCw className="h-4 w-4" />
                  {recalcularAvanceMutation.isPending ? 'Recalculando...' : 'Recalcular avance'}
                </button>
                <button
                  onClick={() => setMostrarNuevaTarea(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-on-primary"
                >
                  <Plus className="h-4 w-4" /> Agregar tarea
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-outline-variant bg-white p-3">
                <p className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                  <FolderKanban className="h-3.5 w-3.5" /> Tareas
                </p>
                <p className="text-2xl font-black text-on-surface">{totalTareasKanban}</p>
              </div>
              <div className="rounded-xl border border-outline-variant bg-white p-3">
                <p className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                  <Clock3 className="h-3.5 w-3.5" /> Horas estimadas
                </p>
                <p className="text-2xl font-black text-on-surface">
                  {horasEstimadasTotal.toFixed(1)}h
                </p>
              </div>
              <div className="rounded-xl border border-outline-variant bg-white p-3">
                <p className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                  <TrendingUp className="h-3.5 w-3.5" /> Avance
                </p>
                <p className="text-2xl font-black text-on-surface">
                  {Math.max(0, Math.min(100, proyectoSeleccionado.porcentajeAvance))}%
                </p>
              </div>
            </div>
          </section>

          <div className="relative rounded-2xl border border-outline-variant bg-white p-3">
            <Search className="pointer-events-none absolute left-6 top-[22px] h-4 w-4 text-on-surface-variant" />
            <input
              value={taskSearch}
              onChange={(e) => setTaskSearch(e.target.value)}
              placeholder="Buscar tareas en el tablero"
              className="w-full rounded-lg border border-outline-variant bg-surface-container-low py-2 pl-10 pr-3 text-sm"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
            <section className="grid gap-4 lg:grid-cols-3 xl:grid-cols-5">
              {estadosKanban.map((estado) => {
                const columna = tareasFiltradas?.[estado] ?? {
                  count: 0,
                  horasEstimadas: 0,
                  items: [],
                };

                return (
                  <div
                    key={estado}
                    className="rounded-2xl border border-outline-variant bg-white p-3"
                  >
                    <div className="mb-3 border-b border-outline-variant pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${estadoBadge[estado]}`}
                        >
                          {estadoLabel[estado]}
                        </p>
                        <p className="text-xs font-semibold text-on-surface-variant">
                          {columna.count}
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-on-surface-variant">
                        {Number(columna.horasEstimadas || 0).toFixed(1)}h estimadas
                      </p>
                    </div>

                    <div className="space-y-3">
                      {columna.items.map((tarea) => (
                        <button
                          key={tarea.id}
                          onClick={() => {
                            setTareaSeleccionadaId(tarea.id);
                            setComentarioTexto('');
                            setHorasInput('');
                          }}
                          className={`w-full rounded-xl border p-3 text-left transition ${
                            tareaSeleccionadaId === tarea.id
                              ? 'border-primary/60 bg-primary/5'
                              : 'border-outline-variant bg-surface-container-low hover:border-primary/40'
                          }`}
                        >
                          <p className="line-clamp-2 text-sm font-bold text-on-surface">
                            {tarea.titulo}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-bold">
                            <span
                              className={`rounded-full px-2 py-1 ${prioridadBadge[tarea.prioridad as Prioridad]}`}
                            >
                              {tarea.prioridad}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
                              {tarea.estimacionHoras ? `${tarea.estimacionHoras}h` : '-'}
                            </span>
                          </div>
                          <p className="mt-2 text-xs text-on-surface-variant">
                            {tarea.asignadoA
                              ? `${tarea.asignadoA.nombre} ${tarea.asignadoA.apellido}`
                              : 'Sin asignar'}
                          </p>
                        </button>
                      ))}
                      {!kanbanQuery.isLoading && columna.items.length === 0 && (
                        <div className="rounded-lg border border-dashed border-outline-variant p-3 text-center text-xs text-on-surface-variant">
                          Sin tareas
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </section>

            <aside className="h-max rounded-2xl border border-outline-variant bg-white p-4">
              <h2 className="text-sm font-black uppercase tracking-wide text-on-surface">
                Detalle de tarea
              </h2>

              {!tareaSeleccionadaId && (
                <p className="mt-3 text-sm text-on-surface-variant">
                  Selecciona una tarea para cambiar estado, registrar horas y dejar comentarios.
                </p>
              )}

              {tareaSeleccionadaId && (
                <div className="mt-3 space-y-4">
                  <div className="rounded-xl border border-outline-variant bg-surface-container-low p-3">
                    <p className="text-sm font-bold text-on-surface">
                      {tareaDetalle?.titulo ?? 'Cargando...'}
                    </p>
                    <p className="mt-1 text-xs text-on-surface-variant">
                      Prioridad: {tareaDetalle?.prioridad ?? '-'}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      Vence: {tareaDetalle?.fechaVencimiento?.slice(0, 10) ?? '-'}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      Horas reales: {Number(tareaDetalle?.horasReales || 0).toFixed(2)}h
                    </p>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                      Estado rapido
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {estadosKanban.map((estado) => (
                        <button
                          key={estado}
                          onClick={() =>
                            cambiarEstadoMutation.mutate({
                              tareaId: tareaSeleccionadaId,
                              estado,
                            })
                          }
                          disabled={cambiarEstadoMutation.isPending}
                          className={`rounded-lg border px-2 py-1.5 text-xs font-semibold ${estadoBadge[estado]}`}
                        >
                          {estadoLabel[estado]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      const parsed = Number(horasInput);
                      if (!Number.isFinite(parsed) || parsed <= 0) return;
                      registrarHorasMutation.mutate({
                        tareaId: tareaSeleccionadaId,
                        horas: parsed,
                      });
                    }}
                    className="space-y-2 rounded-xl border border-outline-variant p-3"
                  >
                    <p className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                      <Timer className="h-3.5 w-3.5" /> Registrar horas
                    </p>
                    <input
                      type="number"
                      min="0"
                      step="0.25"
                      value={horasInput}
                      onChange={(e) => setHorasInput(e.target.value)}
                      placeholder="Ejemplo: 1.5"
                      className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm"
                    />
                    <button
                      type="submit"
                      disabled={registrarHorasMutation.isPending}
                      className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-bold text-on-primary disabled:opacity-60"
                    >
                      Guardar horas
                    </button>
                  </form>

                  <form
                    onSubmit={(event: FormEvent) => {
                      event.preventDefault();
                      const txt = comentarioTexto.trim();
                      if (!txt) return;
                      comentarMutation.mutate({
                        tareaId: tareaSeleccionadaId,
                        texto: txt,
                      });
                    }}
                    className="space-y-2 rounded-xl border border-outline-variant p-3"
                  >
                    <p className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                      <MessageSquarePlus className="h-3.5 w-3.5" /> Comentario
                    </p>
                    <textarea
                      value={comentarioTexto}
                      onChange={(e) => setComentarioTexto(e.target.value)}
                      rows={3}
                      placeholder="Escribe un avance, bloqueo o nota..."
                      className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm"
                    />
                    <button
                      type="submit"
                      disabled={comentarMutation.isPending}
                      className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm font-bold"
                    >
                      Publicar comentario
                    </button>
                  </form>

                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                      Comentarios recientes
                    </p>
                    {(tareaDetalle?.comentarios ?? []).slice(0, 5).map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg border border-outline-variant p-2 text-xs"
                      >
                        <p className="text-on-surface">{item.texto}</p>
                        <p className="mt-1 text-on-surface-variant">
                          {new Date(item.createdAt).toLocaleString('es-CO')}
                        </p>
                      </div>
                    ))}
                    {!tareaDetalleQuery.isLoading &&
                      (tareaDetalle?.comentarios ?? []).length === 0 && (
                        <p className="text-xs text-on-surface-variant">
                          Sin comentarios registrados.
                        </p>
                      )}
                  </div>
                </div>
              )}
            </aside>
          </div>
        </div>
      )}

      {mostrarNuevaTarea && proyectoSeleccionado && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              crearTareaMutation.mutate();
            }}
            className="w-full max-w-2xl space-y-4 rounded-2xl border border-outline-variant bg-white p-5"
          >
            <h2 className="text-lg font-black text-on-surface">Nueva tarea</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                required
                value={formTarea.titulo}
                onChange={(e) => setFormTarea((prev) => ({ ...prev, titulo: e.target.value }))}
                placeholder="Titulo de la tarea"
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm md:col-span-2"
              />

              <select
                required
                value={formTarea.asignadoAId}
                onChange={(e) => setFormTarea((prev) => ({ ...prev, asignadoAId: e.target.value }))}
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              >
                <option value="">Asignado a</option>
                {(empleadosQuery.data ?? []).map((empleado) => (
                  <option key={empleado.id} value={empleado.id}>
                    {empleado.nombre} {empleado.apellido}
                  </option>
                ))}
              </select>

              <select
                value={formTarea.prioridad}
                onChange={(e) =>
                  setFormTarea((prev) => ({ ...prev, prioridad: e.target.value as Prioridad }))
                }
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              >
                {(['BAJA', 'MEDIA', 'ALTA', 'CRITICA'] as Prioridad[]).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>

              <select
                value={formTarea.estado}
                onChange={(e) =>
                  setFormTarea((prev) => ({ ...prev, estado: e.target.value as EstadoTarea }))
                }
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              >
                {estadosKanban.map((estado) => (
                  <option key={estado} value={estado}>
                    {estadoLabel[estado]}
                  </option>
                ))}
              </select>

              <input
                type="number"
                min="0"
                step="0.25"
                value={formTarea.estimacionHoras}
                onChange={(e) =>
                  setFormTarea((prev) => ({ ...prev, estimacionHoras: e.target.value }))
                }
                placeholder="Estimacion horas"
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              />

              <input
                type="date"
                value={formTarea.fechaVencimiento}
                onChange={(e) =>
                  setFormTarea((prev) => ({ ...prev, fechaVencimiento: e.target.value }))
                }
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMostrarNuevaTarea(false)}
                className="rounded-lg border border-outline-variant px-4 py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={crearTareaMutation.isPending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary disabled:opacity-60"
              >
                {crearTareaMutation.isPending ? 'Guardando...' : 'Crear tarea'}
              </button>
            </div>
          </form>
        </div>
      )}

      {mostrarProyectoForm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (modoProyecto === 'crear') {
                crearProyectoMutation.mutate();
                return;
              }
              actualizarProyectoMutation.mutate();
            }}
            className="w-full max-w-2xl space-y-4 rounded-2xl border border-outline-variant bg-white p-5"
          >
            <h2 className="text-lg font-black text-on-surface">
              {modoProyecto === 'crear' ? 'Nuevo proyecto' : 'Editar proyecto'}
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                required
                value={formProyecto.nombre}
                onChange={(e) => setFormProyecto((prev) => ({ ...prev, nombre: e.target.value }))}
                placeholder="Nombre del proyecto"
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm md:col-span-2"
              />

              <select
                value={formProyecto.tipo}
                onChange={(e) =>
                  setFormProyecto((prev) => ({ ...prev, tipo: e.target.value as TipoProyecto }))
                }
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              >
                <option value="INTERNO">INTERNO</option>
                <option value="CLIENTE">CLIENTE</option>
                <option value="INFRAESTRUCTURA">INFRAESTRUCTURA</option>
                <option value="MARKETING">MARKETING</option>
                <option value="TI">TI</option>
              </select>

              <select
                value={formProyecto.estado}
                onChange={(e) =>
                  setFormProyecto((prev) => ({ ...prev, estado: e.target.value as EstadoProyecto }))
                }
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              >
                <option value="PLANIFICACION">PLANIFICACION</option>
                <option value="EN_EJECUCION">EN_EJECUCION</option>
                <option value="PAUSADO">PAUSADO</option>
                <option value="COMPLETADO">COMPLETADO</option>
                <option value="CANCELADO">CANCELADO</option>
              </select>

              <select
                required
                value={formProyecto.responsableId}
                onChange={(e) =>
                  setFormProyecto((prev) => ({ ...prev, responsableId: e.target.value }))
                }
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm md:col-span-2"
              >
                <option value="">Responsable</option>
                {(empleadosQuery.data ?? []).map((empleado) => (
                  <option key={empleado.id} value={empleado.id}>
                    {empleado.nombre} {empleado.apellido}
                  </option>
                ))}
              </select>

              <input
                required
                type="date"
                value={formProyecto.fechaInicio}
                onChange={(e) =>
                  setFormProyecto((prev) => ({ ...prev, fechaInicio: e.target.value }))
                }
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              />

              <input
                required
                type="date"
                value={formProyecto.fechaFinEsperada}
                onChange={(e) =>
                  setFormProyecto((prev) => ({ ...prev, fechaFinEsperada: e.target.value }))
                }
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              />

              <select
                value={formProyecto.prioridad}
                onChange={(e) =>
                  setFormProyecto((prev) => ({ ...prev, prioridad: e.target.value as Prioridad }))
                }
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              >
                <option value="BAJA">BAJA</option>
                <option value="MEDIA">MEDIA</option>
                <option value="ALTA">ALTA</option>
                <option value="CRITICA">CRITICA</option>
              </select>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMostrarProyectoForm(false)}
                className="rounded-lg border border-outline-variant px-4 py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={proyectoFormPending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary disabled:opacity-60"
              >
                {proyectoFormPending
                  ? 'Guardando...'
                  : modoProyecto === 'crear'
                    ? 'Crear proyecto'
                    : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </div>
      )}
    </AppLayout>
  );
}
