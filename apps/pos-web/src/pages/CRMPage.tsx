import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, DollarSign, Plus, UserRound } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

type VistaCRM = 'leads' | 'kanban';

type LeadEstado =
  | 'NUEVO'
  | 'CONTACTADO'
  | 'CALIFICADO'
  | 'OPORTUNIDAD'
  | 'GANADO'
  | 'PERDIDO'
  | 'DESCARTADO';

type LeadOrigen =
  | 'REFERIDO'
  | 'WEB'
  | 'REDES_SOCIALES'
  | 'LLAMADA'
  | 'VISITA'
  | 'WHATSAPP'
  | 'OTRO';

type LeadItem = {
  id: string;
  nombre: string;
  empresa?: string | null;
  origen: LeadOrigen;
  estado: LeadEstado;
  valorEstimado?: number | null;
  asignadoA?: { id: string; nombre?: string; apellido?: string; email?: string } | null;
  fechaProximoContacto?: string | null;
};

type LeadsResponse = {
  items: LeadItem[];
  total: number;
};

type OportunidadItem = {
  id: string;
  titulo: string;
  valor: number;
  probabilidad: number;
  lead?: { nombre: string } | null;
  cliente?: { nombre: string } | null;
  asignadoA?: { nombre?: string; apellido?: string; email?: string } | null;
};

type KanbanColumn = {
  items: OportunidadItem[];
  total: number;
};

type KanbanResponse = Record<string, KanbanColumn>;

type UsuarioItem = {
  id: string;
  nombre: string;
  apellido?: string | null;
  email: string;
};

type UsuariosResponse = {
  items: UsuarioItem[];
};

type CrearLeadPayload = {
  nombre: string;
  empresa?: string;
  email?: string;
  telefono?: string;
  origen: LeadOrigen;
  estado: LeadEstado;
  valorEstimado?: number;
  asignadoAId?: string;
  fechaProximoContacto?: string;
  sedeId: string;
  notas?: string;
};

type CrearActividadPayload = {
  tipo: string;
  asunto: string;
  fecha: string;
  realizadoPorId?: string;
  completada: boolean;
  leadId?: string;
  oportunidadId?: string;
};

const ESTADOS: LeadEstado[] = [
  'NUEVO',
  'CONTACTADO',
  'CALIFICADO',
  'OPORTUNIDAD',
  'GANADO',
  'PERDIDO',
  'DESCARTADO',
];

const ORIGENES: LeadOrigen[] = [
  'REFERIDO',
  'WEB',
  'REDES_SOCIALES',
  'LLAMADA',
  'VISITA',
  'WHATSAPP',
  'OTRO',
];

const ETAPAS_KANBAN = ['PROSPECTO', 'PROPUESTA', 'NEGOCIACION', 'CIERRE', 'GANADA', 'PERDIDA'];

const TIPOS_ACTIVIDAD = ['LLAMADA', 'REUNION', 'EMAIL', 'WHATSAPP', 'TAREA', 'NOTA', 'VISITA'];

const estadoClass: Record<LeadEstado, string> = {
  NUEVO: 'bg-blue-100 text-blue-700',
  CONTACTADO: 'bg-cyan-100 text-cyan-700',
  CALIFICADO: 'bg-indigo-100 text-indigo-700',
  OPORTUNIDAD: 'bg-amber-100 text-amber-700',
  GANADO: 'bg-emerald-100 text-emerald-700',
  PERDIDO: 'bg-rose-100 text-rose-700',
  DESCARTADO: 'bg-slate-200 text-slate-700',
};

const formatCOP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

function nombreUsuario(usuario?: { nombre?: string; apellido?: string; email?: string } | null) {
  if (!usuario) return '-';
  const fullName = `${usuario.nombre ?? ''} ${usuario.apellido ?? ''}`.trim();
  return fullName || usuario.email || '-';
}

export default function CRMPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [vista, setVista] = useState<VistaCRM>('leads');

  const [estadoFiltro, setEstadoFiltro] = useState<string>('');
  const [origenFiltro, setOrigenFiltro] = useState<string>('');
  const [asignadoFiltro, setAsignadoFiltro] = useState<string>('');

  const [leadModalAbierto, setLeadModalAbierto] = useState(false);
  const [actividadModalAbierto, setActividadModalAbierto] = useState(false);
  const [actividadContexto, setActividadContexto] = useState<{
    leadId?: string;
    oportunidadId?: string;
  }>({});

  const [nuevoLead, setNuevoLead] = useState<CrearLeadPayload>({
    nombre: '',
    origen: 'WEB',
    estado: 'NUEVO',
    sedeId: user?.sedeId ?? '',
  });

  const [nuevaActividad, setNuevaActividad] = useState<CrearActividadPayload>({
    tipo: 'LLAMADA',
    asunto: '',
    fecha: new Date().toISOString().slice(0, 16),
    completada: false,
  });

  const { data: usuariosData } = useQuery({
    queryKey: ['crm-usuarios-select'],
    queryFn: async () => {
      const response = await apiClient.get<UsuariosResponse>('/usuarios', {
        params: { page: 1, limit: 100 },
      });
      return response.data;
    },
  });

  const { data: leadsData, isLoading: leadsLoading } = useQuery({
    queryKey: ['crm-leads', estadoFiltro, origenFiltro, asignadoFiltro],
    queryFn: async () => {
      const response = await apiClient.get<LeadsResponse>('/crm/leads', {
        params: {
          ...(estadoFiltro ? { estado: estadoFiltro } : {}),
          ...(origenFiltro ? { origen: origenFiltro } : {}),
          ...(asignadoFiltro ? { asignadoAId: asignadoFiltro } : {}),
          page: 1,
          limit: 50,
        },
      });
      return response.data;
    },
  });

  const { data: kanbanData, isLoading: kanbanLoading } = useQuery({
    queryKey: ['crm-kanban'],
    queryFn: async () => {
      const response = await apiClient.get<KanbanResponse>('/crm/leads/kanban');
      return response.data;
    },
  });

  const crearLeadMutation = useMutation({
    mutationFn: async (payload: CrearLeadPayload) => {
      await apiClient.post('/crm/leads', payload);
    },
    onSuccess: () => {
      setLeadModalAbierto(false);
      setNuevoLead({ nombre: '', origen: 'WEB', estado: 'NUEVO', sedeId: user?.sedeId ?? '' });
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
    },
  });

  const crearActividadMutation = useMutation({
    mutationFn: async (payload: CrearActividadPayload) => {
      await apiClient.post('/crm/actividades', payload);
    },
    onSuccess: () => {
      setActividadModalAbierto(false);
      setNuevaActividad({
        tipo: 'LLAMADA',
        asunto: '',
        fecha: new Date().toISOString().slice(0, 16),
        completada: false,
      });
      setActividadContexto({});
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['crm-kanban'] });
    },
  });

  const usuarios = usuariosData?.items ?? [];
  const leads = leadsData?.items ?? [];

  const totalKanban = useMemo(() => {
    if (!kanbanData) return 0;
    return ETAPAS_KANBAN.reduce((acc, etapa) => acc + (kanbanData[etapa]?.total ?? 0), 0);
  }, [kanbanData]);

  const abrirModalActividad = (contexto: { leadId?: string; oportunidadId?: string }) => {
    setActividadContexto(contexto);
    setNuevaActividad((prev) => ({ ...prev, ...contexto }));
    setActividadModalAbierto(true);
  };

  const submitNuevoLead = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    crearLeadMutation.mutate(nuevoLead);
  };

  const submitNuevaActividad = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    crearActividadMutation.mutate({
      ...nuevaActividad,
      ...actividadContexto,
      fecha: new Date(nuevaActividad.fecha).toISOString(),
    });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-on-background">CRM</h1>
            <p className="text-sm text-on-surface-variant">
              Leads y oportunidades comerciales en una sola vista.
            </p>
          </div>

          <div className="inline-flex rounded-xl border border-outline-variant bg-surface p-1">
            <button
              onClick={() => setVista('leads')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                vista === 'leads' ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
              }`}
            >
              Leads
            </button>
            <button
              onClick={() => setVista('kanban')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                vista === 'kanban' ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
              }`}
            >
              Kanban Oportunidades
            </button>
          </div>
        </div>

        {vista === 'leads' ? (
          <>
            <div className="flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface p-4 md:flex-row md:items-end">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  Estado
                </label>
                <select
                  value={estadoFiltro}
                  onChange={(e) => setEstadoFiltro(e.target.value)}
                  className="w-full rounded-lg border border-outline-variant bg-surface-2 px-3 py-2 text-sm"
                >
                  <option value="">Todos</option>
                  {ESTADOS.map((estado) => (
                    <option key={estado} value={estado}>
                      {estado}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  Origen
                </label>
                <select
                  value={origenFiltro}
                  onChange={(e) => setOrigenFiltro(e.target.value)}
                  className="w-full rounded-lg border border-outline-variant bg-surface-2 px-3 py-2 text-sm"
                >
                  <option value="">Todos</option>
                  {ORIGENES.map((origen) => (
                    <option key={origen} value={origen}>
                      {origen}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  Asignado
                </label>
                <select
                  value={asignadoFiltro}
                  onChange={(e) => setAsignadoFiltro(e.target.value)}
                  className="w-full rounded-lg border border-outline-variant bg-surface-2 px-3 py-2 text-sm"
                >
                  <option value="">Todos</option>
                  {usuarios.map((usuario) => (
                    <option key={usuario.id} value={usuario.id}>
                      {usuario.nombre} {usuario.apellido ?? ''}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setLeadModalAbierto(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary"
              >
                <Plus className="h-4 w-4" />
                Nuevo Lead
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-outline-variant bg-surface">
              <table className="min-w-full text-sm">
                <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-on-surface-variant">
                  <tr>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Empresa</th>
                    <th className="px-4 py-3">Origen</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Valor Estimado</th>
                    <th className="px-4 py-3">Asignado</th>
                    <th className="px-4 py-3">Proximo Contacto</th>
                    <th className="px-4 py-3">Actividad</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id} className="border-t border-outline-variant">
                      <td className="px-4 py-3 font-semibold text-on-background">{lead.nombre}</td>
                      <td className="px-4 py-3 text-on-surface-variant">{lead.empresa ?? '-'}</td>
                      <td className="px-4 py-3 text-on-surface-variant">{lead.origen}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${estadoClass[lead.estado]}`}
                        >
                          {lead.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-on-background">
                        {lead.valorEstimado ? formatCOP.format(lead.valorEstimado) : '-'}
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant">
                        {nombreUsuario(lead.asignadoA)}
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant">
                        {lead.fechaProximoContacto?.slice(0, 10) ?? '-'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => abrirModalActividad({ leadId: lead.id })}
                          className="rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-semibold text-on-surface"
                        >
                          Nueva Actividad
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!leadsLoading && leads.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-on-surface-variant">
                        No hay leads para mostrar.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-outline-variant bg-surface p-4">
              <p className="text-xs uppercase tracking-wide text-on-surface-variant">
                Valor total pipeline
              </p>
              <p className="text-2xl font-bold text-on-background">
                {formatCOP.format(totalKanban)}
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-3 xl:grid-cols-6">
              {ETAPAS_KANBAN.map((etapa) => {
                const columna = kanbanData?.[etapa] ?? { items: [], total: 0 };
                return (
                  <div
                    key={etapa}
                    className="rounded-xl border border-outline-variant bg-surface p-3"
                  >
                    <div className="mb-3 border-b border-outline-variant pb-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                        {etapa}
                      </p>
                      <p className="text-sm font-bold text-on-background">
                        {formatCOP.format(columna.total)}
                      </p>
                    </div>

                    <div className="space-y-3">
                      {columna.items.map((item) => (
                        <div
                          key={item.id}
                          className="cursor-grab rounded-lg border border-outline-variant bg-surface-2 p-3 active:cursor-grabbing"
                        >
                          <p className="text-sm font-semibold text-on-background">{item.titulo}</p>
                          <p className="mt-1 text-xs text-on-surface-variant">
                            {item.cliente?.nombre || item.lead?.nombre || 'Sin relacion'}
                          </p>
                          <div className="mt-3 space-y-1 text-xs text-on-surface-variant">
                            <p className="inline-flex items-center gap-1">
                              <DollarSign className="h-3.5 w-3.5" />
                              {formatCOP.format(item.valor)}
                            </p>
                            <p>{item.probabilidad}% probabilidad</p>
                          </div>
                          <div className="mt-3 flex items-center justify-between">
                            <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary-container text-xs font-bold text-on-primary-container">
                              {(
                                item.asignadoA?.nombre?.[0] ||
                                item.asignadoA?.email?.[0] ||
                                'U'
                              ).toUpperCase()}
                            </div>
                            <button
                              onClick={() => abrirModalActividad({ oportunidadId: item.id })}
                              className="text-xs font-semibold text-primary"
                            >
                              Actividad
                            </button>
                          </div>
                        </div>
                      ))}
                      {columna.items.length === 0 && !kanbanLoading ? (
                        <div className="rounded-lg border border-dashed border-outline-variant p-4 text-center text-xs text-on-surface-variant">
                          Sin oportunidades
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {leadModalAbierto ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <form
            onSubmit={submitNuevoLead}
            className="w-full max-w-xl space-y-4 rounded-2xl border border-outline-variant bg-surface p-5"
          >
            <h2 className="text-lg font-bold text-on-background">Nuevo Lead</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                required
                placeholder="Nombre"
                value={nuevoLead.nombre}
                onChange={(e) => setNuevoLead((prev) => ({ ...prev, nombre: e.target.value }))}
                className="rounded-lg border border-outline-variant bg-surface-2 px-3 py-2 text-sm"
              />
              <input
                placeholder="Empresa"
                value={nuevoLead.empresa ?? ''}
                onChange={(e) => setNuevoLead((prev) => ({ ...prev, empresa: e.target.value }))}
                className="rounded-lg border border-outline-variant bg-surface-2 px-3 py-2 text-sm"
              />
              <input
                placeholder="Email"
                value={nuevoLead.email ?? ''}
                onChange={(e) => setNuevoLead((prev) => ({ ...prev, email: e.target.value }))}
                className="rounded-lg border border-outline-variant bg-surface-2 px-3 py-2 text-sm"
              />
              <input
                placeholder="Telefono"
                value={nuevoLead.telefono ?? ''}
                onChange={(e) => setNuevoLead((prev) => ({ ...prev, telefono: e.target.value }))}
                className="rounded-lg border border-outline-variant bg-surface-2 px-3 py-2 text-sm"
              />

              <select
                value={nuevoLead.origen}
                onChange={(e) =>
                  setNuevoLead((prev) => ({ ...prev, origen: e.target.value as LeadOrigen }))
                }
                className="rounded-lg border border-outline-variant bg-surface-2 px-3 py-2 text-sm"
              >
                {ORIGENES.map((origen) => (
                  <option key={origen} value={origen}>
                    {origen}
                  </option>
                ))}
              </select>

              <select
                value={nuevoLead.estado}
                onChange={(e) =>
                  setNuevoLead((prev) => ({ ...prev, estado: e.target.value as LeadEstado }))
                }
                className="rounded-lg border border-outline-variant bg-surface-2 px-3 py-2 text-sm"
              >
                {ESTADOS.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </select>

              <input
                type="number"
                placeholder="Valor estimado"
                value={nuevoLead.valorEstimado ?? ''}
                onChange={(e) =>
                  setNuevoLead((prev) => ({
                    ...prev,
                    valorEstimado: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                className="rounded-lg border border-outline-variant bg-surface-2 px-3 py-2 text-sm"
              />

              <select
                value={nuevoLead.asignadoAId ?? ''}
                onChange={(e) =>
                  setNuevoLead((prev) => ({
                    ...prev,
                    asignadoAId: e.target.value || undefined,
                  }))
                }
                className="rounded-lg border border-outline-variant bg-surface-2 px-3 py-2 text-sm"
              >
                <option value="">Sin asignar</option>
                {usuarios.map((usuario) => (
                  <option key={usuario.id} value={usuario.id}>
                    {usuario.nombre} {usuario.apellido ?? ''}
                  </option>
                ))}
              </select>

              <label className="md:col-span-2">
                <span className="mb-1 block text-xs text-on-surface-variant">Proximo contacto</span>
                <input
                  type="date"
                  value={nuevoLead.fechaProximoContacto ?? ''}
                  onChange={(e) =>
                    setNuevoLead((prev) => ({
                      ...prev,
                      fechaProximoContacto: e.target.value || undefined,
                    }))
                  }
                  className="w-full rounded-lg border border-outline-variant bg-surface-2 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setLeadModalAbierto(false)}
                className="rounded-lg border border-outline-variant px-4 py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary"
              >
                Crear Lead
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {actividadModalAbierto ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <form
            onSubmit={submitNuevaActividad}
            className="w-full max-w-lg space-y-4 rounded-2xl border border-outline-variant bg-surface p-5"
          >
            <h2 className="text-lg font-bold text-on-background">Nueva Actividad</h2>

            <div className="grid gap-3 md:grid-cols-2">
              <select
                value={nuevaActividad.tipo}
                onChange={(e) => setNuevaActividad((prev) => ({ ...prev, tipo: e.target.value }))}
                className="rounded-lg border border-outline-variant bg-surface-2 px-3 py-2 text-sm"
              >
                {TIPOS_ACTIVIDAD.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>

              <input
                required
                placeholder="Asunto"
                value={nuevaActividad.asunto}
                onChange={(e) => setNuevaActividad((prev) => ({ ...prev, asunto: e.target.value }))}
                className="rounded-lg border border-outline-variant bg-surface-2 px-3 py-2 text-sm"
              />

              <label className="md:col-span-2">
                <span className="mb-1 inline-flex items-center gap-1 text-xs text-on-surface-variant">
                  <Calendar className="h-3.5 w-3.5" /> Fecha
                </span>
                <input
                  type="datetime-local"
                  value={nuevaActividad.fecha}
                  onChange={(e) =>
                    setNuevaActividad((prev) => ({ ...prev, fecha: e.target.value }))
                  }
                  className="w-full rounded-lg border border-outline-variant bg-surface-2 px-3 py-2 text-sm"
                />
              </label>

              <label className="md:col-span-2">
                <span className="mb-1 inline-flex items-center gap-1 text-xs text-on-surface-variant">
                  <UserRound className="h-3.5 w-3.5" /> Asignado a
                </span>
                <select
                  value={nuevaActividad.realizadoPorId ?? ''}
                  onChange={(e) =>
                    setNuevaActividad((prev) => ({
                      ...prev,
                      realizadoPorId: e.target.value || undefined,
                    }))
                  }
                  className="w-full rounded-lg border border-outline-variant bg-surface-2 px-3 py-2 text-sm"
                >
                  <option value="">Usuario actual</option>
                  {usuarios.map((usuario) => (
                    <option key={usuario.id} value={usuario.id}>
                      {usuario.nombre} {usuario.apellido ?? ''}
                    </option>
                  ))}
                </select>
              </label>

              <label className="md:col-span-2 inline-flex items-center gap-2 text-sm text-on-surface">
                <input
                  type="checkbox"
                  checked={nuevaActividad.completada}
                  onChange={(e) =>
                    setNuevaActividad((prev) => ({ ...prev, completada: e.target.checked }))
                  }
                />
                Marcar como completada
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActividadModalAbierto(false)}
                className="rounded-lg border border-outline-variant px-4 py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary"
              >
                Guardar Actividad
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
