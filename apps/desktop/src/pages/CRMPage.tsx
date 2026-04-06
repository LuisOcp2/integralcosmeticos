import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, DollarSign, Plus, UserRound } from 'lucide-react';
import AppLayout from './components/AppLayout';
import api from '../lib/api';
import { useAuthStore } from '../store/auth.store';

type VistaCRM = 'leads' | 'kanban';
type EtapaOportunidad = 'PROSPECTO' | 'PROPUESTA' | 'NEGOCIACION' | 'CIERRE' | 'GANADA' | 'PERDIDA';

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
  const queryClient = useQueryClient();
  const usuario = useAuthStore((state) => state.usuario);
  const [vista, setVista] = useState<VistaCRM>('leads');

  const [estadoFiltro, setEstadoFiltro] = useState<string>('');
  const [origenFiltro, setOrigenFiltro] = useState<string>('');
  const [asignadoFiltro, setAsignadoFiltro] = useState<string>('');

  const [leadModalAbierto, setLeadModalAbierto] = useState(false);
  const [actividadModalAbierto, setActividadModalAbierto] = useState(false);
  const [confirmModal, setConfirmModal] = useState<
    | { type: 'convertir'; leadId: string; nombre: string }
    | { type: 'etapa'; oportunidadId: string; titulo: string; etapa: EtapaOportunidad }
    | null
  >(null);
  const [actividadContexto, setActividadContexto] = useState<{
    leadId?: string;
    oportunidadId?: string;
  }>({});

  const [nuevoLead, setNuevoLead] = useState<CrearLeadPayload>({
    nombre: '',
    origen: 'WEB',
    estado: 'NUEVO',
    sedeId: usuario?.sedeId ?? '',
  });

  const [nuevaActividad, setNuevaActividad] = useState<CrearActividadPayload>({
    tipo: 'LLAMADA',
    asunto: '',
    fecha: new Date().toISOString().slice(0, 16),
    completada: false,
  });

  const { data: usuariosData } = useQuery({
    queryKey: ['desktop-crm-usuarios'],
    queryFn: async () => {
      const { data } = await api.get<UsuariosResponse>('/usuarios', {
        params: { page: 1, limit: 100 },
      });
      return data;
    },
  });

  const { data: leadsData, isLoading: leadsLoading } = useQuery({
    queryKey: ['desktop-crm-leads', estadoFiltro, origenFiltro, asignadoFiltro],
    queryFn: async () => {
      const { data } = await api.get<LeadsResponse>('/crm/leads', {
        params: {
          ...(estadoFiltro ? { estado: estadoFiltro } : {}),
          ...(origenFiltro ? { origen: origenFiltro } : {}),
          ...(asignadoFiltro ? { asignadoAId: asignadoFiltro } : {}),
          page: 1,
          limit: 50,
        },
      });
      return data;
    },
  });

  const { data: kanbanData, isLoading: kanbanLoading } = useQuery({
    queryKey: ['desktop-crm-kanban'],
    queryFn: async () => {
      const { data } = await api.get<KanbanResponse>('/crm/leads/kanban');
      return data;
    },
  });

  const crearLeadMutation = useMutation({
    mutationFn: async (payload: CrearLeadPayload) => {
      await api.post('/crm/leads', payload);
    },
    onSuccess: () => {
      setLeadModalAbierto(false);
      setNuevoLead({ nombre: '', origen: 'WEB', estado: 'NUEVO', sedeId: usuario?.sedeId ?? '' });
      void queryClient.invalidateQueries({ queryKey: ['desktop-crm-leads'] });
    },
  });

  const crearActividadMutation = useMutation({
    mutationFn: async (payload: CrearActividadPayload) => {
      await api.post('/crm/actividades', payload);
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
      void queryClient.invalidateQueries({ queryKey: ['desktop-crm-leads'] });
      void queryClient.invalidateQueries({ queryKey: ['desktop-crm-kanban'] });
    },
  });

  const convertirLeadMutation = useMutation({
    mutationFn: async (leadId: string) => {
      await api.post(`/crm/leads/${leadId}/convertir-cliente`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['desktop-crm-leads'] });
      void queryClient.invalidateQueries({ queryKey: ['desktop-crm-kanban'] });
    },
  });

  const cambiarEtapaMutation = useMutation({
    mutationFn: async ({ id, etapa }: { id: string; etapa: EtapaOportunidad }) => {
      await api.patch(`/crm/oportunidades/${id}/etapa`, { etapa });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['desktop-crm-kanban'] });
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

  const solicitarConversionLead = (lead: LeadItem) => {
    setConfirmModal({ type: 'convertir', leadId: lead.id, nombre: lead.nombre });
  };

  const solicitarCambioEtapa = (
    oportunidad: OportunidadItem,
    etapaActual: string,
    nuevaEtapa: EtapaOportunidad,
  ) => {
    if (nuevaEtapa === (etapaActual as EtapaOportunidad)) {
      return;
    }

    if (nuevaEtapa === 'GANADA' || nuevaEtapa === 'PERDIDA') {
      setConfirmModal({
        type: 'etapa',
        oportunidadId: oportunidad.id,
        titulo: oportunidad.titulo,
        etapa: nuevaEtapa,
      });
      return;
    }

    cambiarEtapaMutation.mutate({ id: oportunidad.id, etapa: nuevaEtapa });
  };

  const confirmarAccion = () => {
    if (!confirmModal) return;

    if (confirmModal.type === 'convertir') {
      convertirLeadMutation.mutate(confirmModal.leadId, {
        onSuccess: () => setConfirmModal(null),
      });
      return;
    }

    cambiarEtapaMutation.mutate(
      { id: confirmModal.oportunidadId, etapa: confirmModal.etapa },
      { onSuccess: () => setConfirmModal(null) },
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-on-secondary-fixed">CRM</h1>
            <p className="mt-1 font-medium text-secondary">Leads y oportunidades comerciales</p>
          </div>

          <div className="inline-flex rounded-xl border border-outline-variant bg-white p-1">
            <button
              onClick={() => setVista('leads')}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                vista === 'leads' ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
              }`}
            >
              Leads
            </button>
            <button
              onClick={() => setVista('kanban')}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                vista === 'kanban' ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
              }`}
            >
              Kanban
            </button>
          </div>
        </div>

        {vista === 'leads' ? (
          <>
            <div className="flex flex-col gap-3 rounded-xl border border-outline-variant bg-white p-4 md:flex-row md:items-end">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-secondary">
                  Estado
                </label>
                <select
                  value={estadoFiltro}
                  onChange={(e) => setEstadoFiltro(e.target.value)}
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
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
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-secondary">
                  Origen
                </label>
                <select
                  value={origenFiltro}
                  onChange={(e) => setOrigenFiltro(e.target.value)}
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
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
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-secondary">
                  Asignado
                </label>
                <select
                  value={asignadoFiltro}
                  onChange={(e) => setAsignadoFiltro(e.target.value)}
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
                >
                  <option value="">Todos</option>
                  {usuarios.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nombre} {u.apellido ?? ''}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setLeadModalAbierto(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary"
              >
                <Plus size={16} /> Nuevo Lead
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-outline-variant bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-surface-container text-left text-xs uppercase tracking-wide text-on-surface-variant">
                  <tr>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Empresa</th>
                    <th className="px-4 py-3">Origen</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Valor</th>
                    <th className="px-4 py-3">Asignado</th>
                    <th className="px-4 py-3">Próximo contacto</th>
                    <th className="px-4 py-3">Actividad</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id} className="border-t border-outline-variant/30">
                      <td className="px-4 py-3 font-semibold text-on-surface">{lead.nombre}</td>
                      <td className="px-4 py-3 text-on-surface-variant">{lead.empresa ?? '-'}</td>
                      <td className="px-4 py-3 text-on-surface-variant">{lead.origen}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-bold ${estadoClass[lead.estado]}`}
                        >
                          {lead.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {lead.valorEstimado ? formatCOP.format(lead.valorEstimado) : '-'}
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant">
                        {nombreUsuario(lead.asignadoA)}
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant">
                        {lead.fechaProximoContacto?.slice(0, 10) ?? '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => abrirModalActividad({ leadId: lead.id })}
                            className="rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-bold"
                          >
                            Nueva Actividad
                          </button>
                          <button
                            onClick={() => solicitarConversionLead(lead)}
                            disabled={lead.estado === 'GANADO' || convertirLeadMutation.isPending}
                            className="rounded-lg border border-primary px-3 py-1.5 text-xs font-bold text-primary disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {lead.estado === 'GANADO'
                              ? 'Convertido'
                              : convertirLeadMutation.isPending
                                ? 'Convirtiendo...'
                                : 'Convertir a cliente'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!leadsLoading && leads.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-on-surface-variant">
                        No hay leads para mostrar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-outline-variant bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-on-surface-variant">
                Valor total pipeline
              </p>
              <p className="text-2xl font-black text-on-surface">{formatCOP.format(totalKanban)}</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-3 xl:grid-cols-6">
              {ETAPAS_KANBAN.map((etapa) => {
                const columna = kanbanData?.[etapa] ?? { items: [], total: 0 };
                return (
                  <div
                    key={etapa}
                    className="rounded-xl border border-outline-variant bg-white p-3"
                  >
                    <div className="mb-3 border-b border-outline-variant pb-2">
                      <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                        {etapa}
                      </p>
                      <p className="text-sm font-black text-on-surface">
                        {formatCOP.format(columna.total)}
                      </p>
                    </div>

                    <div className="space-y-3">
                      {columna.items.map((item) => (
                        <div
                          key={item.id}
                          className="cursor-grab rounded-lg border border-outline-variant bg-surface-container-low p-3"
                        >
                          <p className="text-sm font-bold text-on-surface">{item.titulo}</p>
                          <p className="mt-1 text-xs text-on-surface-variant">
                            {item.cliente?.nombre || item.lead?.nombre || 'Sin relación'}
                          </p>
                          <div className="mt-3 space-y-1 text-xs text-on-surface-variant">
                            <p className="inline-flex items-center gap-1">
                              <DollarSign size={14} />
                              {formatCOP.format(item.valor)}
                            </p>
                            <p>{item.probabilidad}% probabilidad</p>
                          </div>
                          <div className="mt-3 flex items-center justify-between">
                            <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary-container text-xs font-black text-on-primary-container">
                              {(
                                item.asignadoA?.nombre?.[0] ||
                                item.asignadoA?.email?.[0] ||
                                'U'
                              ).toUpperCase()}
                            </div>
                            <button
                              onClick={() => abrirModalActividad({ oportunidadId: item.id })}
                              className="text-xs font-bold text-primary"
                            >
                              Actividad
                            </button>
                          </div>
                          <div className="mt-2">
                            <select
                              value={etapa}
                              disabled={cambiarEtapaMutation.isPending}
                              onChange={(e) => {
                                const nuevaEtapa = e.target.value as EtapaOportunidad;
                                solicitarCambioEtapa(item, etapa, nuevaEtapa);
                              }}
                              className="w-full rounded-lg border border-outline-variant bg-white px-2 py-1.5 text-xs"
                            >
                              {ETAPAS_KANBAN.map((opcion) => (
                                <option key={opcion} value={opcion}>
                                  Mover a {opcion}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))}
                      {!kanbanLoading && columna.items.length === 0 && (
                        <div className="rounded-lg border border-dashed border-outline-variant p-4 text-center text-xs text-on-surface-variant">
                          Sin oportunidades
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {leadModalAbierto && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <form
            onSubmit={submitNuevoLead}
            className="w-full max-w-xl space-y-4 rounded-2xl border border-outline-variant bg-white p-5"
          >
            <h2 className="text-lg font-black text-on-surface">Nuevo Lead</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                required
                placeholder="Nombre"
                value={nuevoLead.nombre}
                onChange={(e) => setNuevoLead((prev) => ({ ...prev, nombre: e.target.value }))}
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              />
              <input
                placeholder="Empresa"
                value={nuevoLead.empresa ?? ''}
                onChange={(e) => setNuevoLead((prev) => ({ ...prev, empresa: e.target.value }))}
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              />
              <input
                placeholder="Email"
                value={nuevoLead.email ?? ''}
                onChange={(e) => setNuevoLead((prev) => ({ ...prev, email: e.target.value }))}
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              />
              <input
                placeholder="Telefono"
                value={nuevoLead.telefono ?? ''}
                onChange={(e) => setNuevoLead((prev) => ({ ...prev, telefono: e.target.value }))}
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              />
              <select
                value={nuevoLead.origen}
                onChange={(e) =>
                  setNuevoLead((prev) => ({ ...prev, origen: e.target.value as LeadOrigen }))
                }
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
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
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
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
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              />
              <select
                value={nuevoLead.asignadoAId ?? ''}
                onChange={(e) =>
                  setNuevoLead((prev) => ({ ...prev, asignadoAId: e.target.value || undefined }))
                }
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              >
                <option value="">Sin asignar</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre} {u.apellido ?? ''}
                  </option>
                ))}
              </select>
              <label className="md:col-span-2">
                <span className="mb-1 block text-xs text-on-surface-variant">Próximo contacto</span>
                <input
                  type="date"
                  value={nuevoLead.fechaProximoContacto ?? ''}
                  onChange={(e) =>
                    setNuevoLead((prev) => ({
                      ...prev,
                      fechaProximoContacto: e.target.value || undefined,
                    }))
                  }
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
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
                className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary"
              >
                Crear Lead
              </button>
            </div>
          </form>
        </div>
      )}

      {actividadModalAbierto && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <form
            onSubmit={submitNuevaActividad}
            className="w-full max-w-lg space-y-4 rounded-2xl border border-outline-variant bg-white p-5"
          >
            <h2 className="text-lg font-black text-on-surface">Nueva Actividad</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <select
                value={nuevaActividad.tipo}
                onChange={(e) => setNuevaActividad((prev) => ({ ...prev, tipo: e.target.value }))}
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
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
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              />
              <label className="md:col-span-2">
                <span className="mb-1 inline-flex items-center gap-1 text-xs text-on-surface-variant">
                  <Calendar size={14} /> Fecha
                </span>
                <input
                  type="datetime-local"
                  value={nuevaActividad.fecha}
                  onChange={(e) =>
                    setNuevaActividad((prev) => ({ ...prev, fecha: e.target.value }))
                  }
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
                />
              </label>
              <label className="md:col-span-2">
                <span className="mb-1 inline-flex items-center gap-1 text-xs text-on-surface-variant">
                  <UserRound size={14} /> Asignado a
                </span>
                <select
                  value={nuevaActividad.realizadoPorId ?? ''}
                  onChange={(e) =>
                    setNuevaActividad((prev) => ({
                      ...prev,
                      realizadoPorId: e.target.value || undefined,
                    }))
                  }
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
                >
                  <option value="">Usuario actual</option>
                  {usuarios.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nombre} {u.apellido ?? ''}
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
                className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary"
              >
                Guardar Actividad
              </button>
            </div>
          </form>
        </div>
      )}

      {confirmModal && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/45 p-4">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-outline-variant bg-white p-5">
            <h3 className="text-lg font-black text-on-surface">Confirmar acción</h3>
            <p className="text-sm text-on-surface-variant">
              {confirmModal.type === 'convertir'
                ? `Vas a convertir el lead ${confirmModal.nombre} en cliente. Esta acción marcará el lead como GANADO.`
                : `Vas a mover la oportunidad ${confirmModal.titulo} a ${confirmModal.etapa}.`}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="rounded-lg border border-outline-variant px-4 py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarAccion}
                disabled={convertirLeadMutation.isPending || cambiarEtapaMutation.isPending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary disabled:opacity-60"
              >
                {convertirLeadMutation.isPending || cambiarEtapaMutation.isPending
                  ? 'Procesando...'
                  : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
