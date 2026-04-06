import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AppLayout from './components/AppLayout';
import api from '../lib/api';

type EstadoTarea = 'PENDIENTE' | 'EN_PROGRESO' | 'REVISION' | 'COMPLETADA' | 'CANCELADA';

type Proyecto = {
  id: string;
  nombre: string;
  tipo: string;
  porcentajeAvance: number;
  fechaFinEsperada: string;
  prioridad: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  responsable?: { nombre: string; apellido: string } | null;
};

type Tarea = {
  id: string;
  titulo: string;
  estado: EstadoTarea;
  prioridad: string;
  estimacionHoras?: number | null;
  asignadoA?: { nombre: string; apellido: string } | null;
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

const estadosKanban: EstadoTarea[] = [
  'PENDIENTE',
  'EN_PROGRESO',
  'REVISION',
  'COMPLETADA',
  'CANCELADA',
];

const prioridadClass: Record<Proyecto['prioridad'], string> = {
  BAJA: 'bg-slate-200 text-slate-700',
  MEDIA: 'bg-blue-100 text-blue-700',
  ALTA: 'bg-amber-100 text-amber-700',
  CRITICA: 'bg-rose-100 text-rose-700',
};

export default function ProyectosPage() {
  const queryClient = useQueryClient();
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState<Proyecto | null>(null);
  const [mostrarNuevaTarea, setMostrarNuevaTarea] = useState(false);
  const [formTarea, setFormTarea] = useState({
    titulo: '',
    asignadoAId: '',
    prioridad: 'MEDIA',
    estado: 'PENDIENTE',
    estimacionHoras: '',
  });

  const proyectosQuery = useQuery({
    queryKey: ['proyectos-list'],
    queryFn: async () => {
      const { data } = await api.get<Paginado<Proyecto>>('/proyectos', {
        params: { page: 1, limit: 100 },
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
        params: { page: 1, limit: 200 },
      });
      return data.items;
    },
  });

  const crearTareaMutation = useMutation({
    mutationFn: async () => {
      if (!proyectoSeleccionado) return;
      await api.post(`/proyectos/${proyectoSeleccionado.id}/tareas`, {
        titulo: formTarea.titulo,
        asignadoAId: formTarea.asignadoAId,
        prioridad: formTarea.prioridad,
        estado: formTarea.estado,
        estimacionHoras: formTarea.estimacionHoras ? Number(formTarea.estimacionHoras) : undefined,
      });
    },
    onSuccess: () => {
      setMostrarNuevaTarea(false);
      setFormTarea({
        titulo: '',
        asignadoAId: '',
        prioridad: 'MEDIA',
        estado: 'PENDIENTE',
        estimacionHoras: '',
      });
      void queryClient.invalidateQueries({
        queryKey: ['proyectos-kanban', proyectoSeleccionado?.id],
      });
      if (proyectoSeleccionado?.id) {
        void queryClient.invalidateQueries({ queryKey: ['proyectos-list'] });
      }
    },
  });

  const proyectos = proyectosQuery.data?.items ?? [];
  const kanban = kanbanQuery.data;

  const totalTareasKanban = useMemo(
    () =>
      estadosKanban.reduce((acc, estado) => {
        return acc + (kanban?.[estado]?.count ?? 0);
      }, 0),
    [kanban],
  );

  return (
    <AppLayout>
      {!proyectoSeleccionado ? (
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-on-secondary-fixed">
              Proyectos
            </h1>
            <p className="mt-1 font-medium text-secondary">Seguimiento de proyectos y tareas.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {proyectos.map((proyecto) => (
              <button
                key={proyecto.id}
                onClick={() => setProyectoSeleccionado(proyecto)}
                className="rounded-2xl border border-outline-variant bg-white p-5 text-left transition hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-black text-on-surface">{proyecto.nombre}</h2>
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-bold ${prioridadClass[proyecto.prioridad]}`}
                  >
                    {proyecto.prioridad}
                  </span>
                </div>
                <p className="mt-1 text-sm text-on-surface-variant">Tipo: {proyecto.tipo}</p>

                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-xs font-bold text-secondary">
                    <span>Progreso</span>
                    <span>{proyecto.porcentajeAvance}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${Math.max(0, Math.min(100, proyecto.porcentajeAvance))}%` }}
                    />
                  </div>
                </div>

                <p className="mt-3 text-sm text-on-surface-variant">
                  Responsable:{' '}
                  {proyecto.responsable
                    ? `${proyecto.responsable.nombre} ${proyecto.responsable.apellido}`
                    : '-'}
                </p>
                <p className="mt-0.5 text-sm text-on-surface-variant">
                  Fecha fin: {proyecto.fechaFinEsperada?.slice(0, 10) ?? '-'}
                </p>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <button
                onClick={() => setProyectoSeleccionado(null)}
                className="text-sm font-bold text-primary"
              >
                Volver a proyectos
              </button>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-on-secondary-fixed">
                {proyectoSeleccionado.nombre}
              </h1>
              <p className="text-sm text-secondary">
                {totalTareasKanban} tareas en tablero kanban.
              </p>
            </div>
            <button
              onClick={() => setMostrarNuevaTarea(true)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary"
            >
              Agregar Tarea
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-3 xl:grid-cols-5">
            {estadosKanban.map((estado) => {
              const columna = kanban?.[estado] ?? { count: 0, horasEstimadas: 0, items: [] };
              return (
                <div key={estado} className="rounded-xl border border-outline-variant bg-white p-3">
                  <div className="mb-3 border-b border-outline-variant pb-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                      {estado}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      {columna.count} tareas | {Number(columna.horasEstimadas || 0).toFixed(2)}h
                    </p>
                  </div>

                  <div className="space-y-3">
                    {columna.items.map((tarea) => (
                      <div
                        key={tarea.id}
                        className="rounded-lg border border-outline-variant bg-surface-container-low p-3"
                      >
                        <p className="text-sm font-bold text-on-surface">{tarea.titulo}</p>
                        <p className="mt-1 text-xs text-on-surface-variant">
                          {tarea.asignadoA
                            ? `${tarea.asignadoA.nombre} ${tarea.asignadoA.apellido}`
                            : 'Sin asignar'}
                        </p>
                        <p className="mt-1 text-xs text-on-surface-variant">
                          Prioridad: {tarea.prioridad} | Estimado:{' '}
                          {tarea.estimacionHoras ? `${tarea.estimacionHoras}h` : '-'}
                        </p>
                      </div>
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
            className="w-full max-w-lg space-y-4 rounded-2xl border border-outline-variant bg-white p-5"
          >
            <h2 className="text-lg font-black text-on-surface">Nueva tarea</h2>
            <div className="grid gap-3">
              <input
                required
                value={formTarea.titulo}
                onChange={(e) => setFormTarea((prev) => ({ ...prev, titulo: e.target.value }))}
                placeholder="Titulo"
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
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

              <div className="grid grid-cols-2 gap-3">
                <select
                  value={formTarea.prioridad}
                  onChange={(e) => setFormTarea((prev) => ({ ...prev, prioridad: e.target.value }))}
                  className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
                >
                  {['BAJA', 'MEDIA', 'ALTA', 'CRITICA'].map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>

                <select
                  value={formTarea.estado}
                  onChange={(e) => setFormTarea((prev) => ({ ...prev, estado: e.target.value }))}
                  className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
                >
                  {estadosKanban.map((estado) => (
                    <option key={estado} value={estado}>
                      {estado}
                    </option>
                  ))}
                </select>
              </div>

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
    </AppLayout>
  );
}
