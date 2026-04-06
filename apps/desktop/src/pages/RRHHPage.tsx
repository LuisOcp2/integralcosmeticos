import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Rol } from '@cosmeticos/shared-types';
import api from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import AppLayout from './components/AppLayout';

type TabRrhh = 'empleados' | 'asistencia' | 'vacaciones' | 'nomina';

type Area = { id: string; nombre: string };
type Cargo = { id: string; nombre: string; areaId: string };
type Sede = { id: string; nombre: string };

type Empleado = {
  id: string;
  nombre: string;
  apellido: string;
  tipoContrato: string;
  estado: string;
  area?: Area;
  cargo?: Cargo;
  salarioBase: number;
};

type EstadoDiaAsistencia = {
  empleado: {
    id: string;
    nombre: string;
    area: string | null;
    cargo: string | null;
  };
  fecha: string;
  estado: 'SIN_REGISTRO' | 'ENTRO' | 'SALIO';
  horaEntrada: string | null;
  horaSalida: string | null;
};

type Vacacion = {
  id: string;
  fechaInicio: string;
  fechaFin: string;
  diasHabiles: number;
  estado: 'SOLICITADA' | 'APROBADA' | 'RECHAZADA' | 'EN_CURSO' | 'COMPLETADA';
  motivoRechazo?: string | null;
  empleado?: { id: string; nombre: string; apellido: string };
};

type Liquidacion = {
  id: string;
  empleado?: { id: string; nombre: string; apellido: string };
  totalDevengado: number;
  totalDeducciones: number;
  netoPagar: number;
  estado: string;
};

type NominaColectiva = {
  id: string;
  mes: number;
  ano: number;
  estado: string;
  totalEmpleados: number;
  totalDevengado: number;
  totalDeducciones: number;
  totalNeto: number;
  sede?: { id: string; nombre: string };
  liquidaciones?: Liquidacion[];
};

type Paginado<T> = { items: T[] };

function extraerItems<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object' && 'items' in payload) {
    return (payload as Paginado<T>).items;
  }
  return [];
}

const cop = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

function toDateInput(value?: string | null) {
  if (!value) return '';
  return value.slice(0, 10);
}

function hhmm(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

export default function RRHHPage() {
  const queryClient = useQueryClient();
  const usuario = useAuthStore((state) => state.usuario);
  const [tab, setTab] = useState<TabRrhh>('empleados');

  const [filtroArea, setFiltroArea] = useState('');
  const [filtroCargo, setFiltroCargo] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  const [showNuevoEmpleado, setShowNuevoEmpleado] = useState(false);
  const [showColilla, setShowColilla] = useState(false);
  const [colillaTexto, setColillaTexto] = useState('');
  const [fechaAsistencia, setFechaAsistencia] = useState(new Date().toISOString().slice(0, 10));

  const [nominaMes, setNominaMes] = useState(new Date().getMonth() + 1);
  const [nominaAno, setNominaAno] = useState(new Date().getFullYear());
  const [nominaSedeId, setNominaSedeId] = useState('');
  const [nominaSeleccionadaId, setNominaSeleccionadaId] = useState('');

  const [vacacionesForm, setVacacionesForm] = useState({
    empleadoId: '',
    fechaInicio: new Date().toISOString().slice(0, 10),
    fechaFin: new Date().toISOString().slice(0, 10),
  });

  const [nuevoEmpleado, setNuevoEmpleado] = useState({
    tipoDocumento: 'CC',
    numeroDocumento: '',
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    fechaNacimiento: '',
    genero: '',
    cargoId: '',
    areaId: '',
    sedeId: '',
    tipoContrato: 'INDEFINIDO',
    fechaIngreso: new Date().toISOString().slice(0, 10),
    salarioBase: '',
    auxilioTransporte: true,
    eps: '',
    arl: '',
    fondoPension: '',
    cuentaBancaria: '',
  });

  const { data: areas = [] } = useQuery({
    queryKey: ['rrhh', 'areas'],
    queryFn: async () => {
      const { data } = await api.get('/rrhh/areas', { params: { page: 1, limit: 200 } });
      return extraerItems<Area>(data);
    },
  });

  const { data: cargos = [] } = useQuery({
    queryKey: ['rrhh', 'cargos', filtroArea],
    queryFn: async () => {
      const { data } = await api.get('/rrhh/cargos', {
        params: { page: 1, limit: 200, areaId: filtroArea || undefined },
      });
      return extraerItems<Cargo>(data);
    },
  });

  const { data: sedes = [] } = useQuery({
    queryKey: ['rrhh', 'sedes'],
    queryFn: async () => {
      const { data } = await api.get<Sede[]>('/sedes');
      return data;
    },
  });

  const { data: empleados = [] } = useQuery({
    queryKey: ['rrhh', 'empleados', filtroArea, filtroCargo, filtroEstado],
    queryFn: async () => {
      const { data } = await api.get('/rrhh/empleados', {
        params: {
          page: 1,
          limit: 200,
          areaId: filtroArea || undefined,
          cargoId: filtroCargo || undefined,
          estado: filtroEstado || undefined,
        },
      });
      return extraerItems<Empleado>(data);
    },
  });

  const { data: asistenciaDia = [] } = useQuery({
    queryKey: ['rrhh', 'asistencia-dia', fechaAsistencia],
    queryFn: async () => {
      const { data } = await api.get<EstadoDiaAsistencia[]>('/rrhh/asistencia/estado-dia', {
        params: { fecha: fechaAsistencia },
      });
      return data;
    },
  });

  const { data: vacaciones = [] } = useQuery({
    queryKey: ['rrhh', 'vacaciones'],
    queryFn: async () => {
      const { data } = await api.get<Vacacion[]>('/rrhh/vacaciones');
      return data;
    },
  });

  const { data: nominas = [] } = useQuery({
    queryKey: ['rrhh', 'nominas-colectivas'],
    queryFn: async () => {
      const { data } = await api.get<NominaColectiva[]>('/rrhh/nomina/colectivas');
      return data;
    },
  });

  const { data: nominaDetalle } = useQuery({
    queryKey: ['rrhh', 'nomina-colectiva', nominaSeleccionadaId],
    queryFn: async () => {
      if (!nominaSeleccionadaId) return null;
      const { data } = await api.get<NominaColectiva>(
        `/rrhh/nomina/colectivas/${nominaSeleccionadaId}`,
      );
      return data;
    },
    enabled: Boolean(nominaSeleccionadaId),
  });

  const createEmpleadoMutation = useMutation({
    mutationFn: async () => {
      await api.post('/rrhh/empleados', {
        ...nuevoEmpleado,
        salarioBase: Number(nuevoEmpleado.salarioBase),
        email: nuevoEmpleado.email || undefined,
        telefono: nuevoEmpleado.telefono || undefined,
        fechaNacimiento: nuevoEmpleado.fechaNacimiento || undefined,
        genero: nuevoEmpleado.genero || undefined,
        eps: nuevoEmpleado.eps || undefined,
        arl: nuevoEmpleado.arl || undefined,
        fondoPension: nuevoEmpleado.fondoPension || undefined,
        cuentaBancaria: nuevoEmpleado.cuentaBancaria || undefined,
      });
    },
    onSuccess: () => {
      setShowNuevoEmpleado(false);
      setNuevoEmpleado({
        tipoDocumento: 'CC',
        numeroDocumento: '',
        nombre: '',
        apellido: '',
        email: '',
        telefono: '',
        fechaNacimiento: '',
        genero: '',
        cargoId: '',
        areaId: '',
        sedeId: '',
        tipoContrato: 'INDEFINIDO',
        fechaIngreso: new Date().toISOString().slice(0, 10),
        salarioBase: '',
        auxilioTransporte: true,
        eps: '',
        arl: '',
        fondoPension: '',
        cuentaBancaria: '',
      });
      void queryClient.invalidateQueries({ queryKey: ['rrhh', 'empleados'] });
    },
  });

  const registrarEntradaMutation = useMutation({
    mutationFn: async (empleadoId: string) => {
      await api.post('/rrhh/asistencia/entrada', { empleadoId });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['rrhh', 'asistencia-dia'] });
    },
  });

  const registrarSalidaMutation = useMutation({
    mutationFn: async (empleadoId: string) => {
      await api.post('/rrhh/asistencia/salida', { empleadoId });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['rrhh', 'asistencia-dia'] });
    },
  });

  const solicitarVacacionesMutation = useMutation({
    mutationFn: async () => {
      await api.post('/rrhh/vacaciones', vacacionesForm);
    },
    onSuccess: () => {
      setVacacionesForm((prev) => ({
        ...prev,
        empleadoId: '',
        fechaInicio: new Date().toISOString().slice(0, 10),
        fechaFin: new Date().toISOString().slice(0, 10),
      }));
      void queryClient.invalidateQueries({ queryKey: ['rrhh', 'vacaciones'] });
    },
  });

  const aprobarVacacionesMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/rrhh/vacaciones/${id}/aprobar`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['rrhh', 'vacaciones'] });
    },
  });

  const rechazarVacacionesMutation = useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) => {
      await api.patch(`/rrhh/vacaciones/${id}/rechazar`, { motivo });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['rrhh', 'vacaciones'] });
    },
  });

  const calcularNominaMutation = useMutation({
    mutationFn: async () => {
      await api.post('/rrhh/nomina/calcular', {
        mes: nominaMes,
        ano: nominaAno,
        sedeId: nominaSedeId || undefined,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['rrhh', 'nominas-colectivas'] });
      const latest = await queryClient.fetchQuery({
        queryKey: ['rrhh', 'nominas-colectivas'],
        queryFn: async () => {
          const { data } = await api.get<NominaColectiva[]>('/rrhh/nomina/colectivas');
          return data;
        },
      });
      if (latest[0]?.id) {
        setNominaSeleccionadaId(latest[0].id);
      }
    },
  });

  const aprobarNominaMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/rrhh/nomina/colectivas/${id}/aprobar`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['rrhh', 'nominas-colectivas'] });
      if (nominaSeleccionadaId) {
        void queryClient.invalidateQueries({
          queryKey: ['rrhh', 'nomina-colectiva', nominaSeleccionadaId],
        });
      }
    },
  });

  const liquidacionesActivas = nominaDetalle?.liquidaciones ?? [];

  const canGestionarVacaciones = useMemo(
    () => usuario?.rol === Rol.ADMIN || usuario?.rol === Rol.SUPERVISOR,
    [usuario?.rol],
  );
  const canAprobarNomina = usuario?.rol === Rol.ADMIN;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-on-secondary-fixed">Recursos Humanos</h1>
            <p className="mt-1 text-sm font-medium text-secondary">
              Gestion de empleados, asistencia, vacaciones y nomina.
            </p>
          </div>
          <div className="inline-flex rounded-xl border border-outline-variant bg-white p-1">
            {(['empleados', 'asistencia', 'vacaciones', 'nomina'] as TabRrhh[]).map((item) => (
              <button
                key={item}
                onClick={() => setTab(item)}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                  tab === item ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
                }`}
              >
                {item === 'nomina' ? 'Nomina' : item[0].toUpperCase() + item.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {tab === 'empleados' && (
          <div className="space-y-4">
            <div className="grid gap-3 rounded-xl border border-outline-variant bg-white p-4 md:grid-cols-5">
              <select
                value={filtroArea}
                onChange={(e) => {
                  setFiltroArea(e.target.value);
                  setFiltroCargo('');
                }}
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              >
                <option value="">Todas las areas</option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.nombre}
                  </option>
                ))}
              </select>

              <select
                value={filtroCargo}
                onChange={(e) => setFiltroCargo(e.target.value)}
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              >
                <option value="">Todos los cargos</option>
                {cargos.map((cargo) => (
                  <option key={cargo.id} value={cargo.id}>
                    {cargo.nombre}
                  </option>
                ))}
              </select>

              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              >
                <option value="">Todos los estados</option>
                {['ACTIVO', 'RETIRADO', 'SUSPENDIDO', 'VACACIONES'].map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </select>

              <div className="md:col-span-2 flex justify-end">
                <button
                  onClick={() => setShowNuevoEmpleado(true)}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary"
                >
                  Nuevo Empleado
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {empleados.map((empleado) => {
                const inicial = empleado.nombre?.trim()?.[0]?.toUpperCase() || '?';
                return (
                  <article
                    key={empleado.id}
                    className="rounded-2xl border border-outline-variant bg-white p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="grid h-12 w-12 place-items-center rounded-full bg-primary-container font-black text-on-primary-container">
                        {inicial}
                      </div>
                      <div>
                        <h3 className="text-base font-black text-on-surface">
                          {empleado.nombre} {empleado.apellido}
                        </h3>
                        <p className="text-sm text-on-surface-variant">
                          {empleado.cargo?.nombre ?? '-'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-1 text-sm text-on-surface-variant">
                      <p>
                        <span className="font-semibold text-on-surface">Area:</span>{' '}
                        {empleado.area?.nombre ?? '-'}
                      </p>
                      <p>
                        <span className="font-semibold text-on-surface">Contrato:</span>{' '}
                        {empleado.tipoContrato}
                      </p>
                      <p>
                        <span className="font-semibold text-on-surface">Salario:</span>{' '}
                        {cop.format(Number(empleado.salarioBase || 0))}
                      </p>
                    </div>

                    <div className="mt-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-bold ${
                          empleado.estado === 'ACTIVO'
                            ? 'bg-green-100 text-green-700'
                            : empleado.estado === 'VACACIONES'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {empleado.estado}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'asistencia' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-outline-variant bg-white p-4">
              <label className="text-sm font-semibold text-on-surface">Fecha</label>
              <input
                type="date"
                value={fechaAsistencia}
                onChange={(e) => setFechaAsistencia(e.target.value)}
                className="ml-3 rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              />
            </div>

            <div className="overflow-x-auto rounded-xl border border-outline-variant bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-surface-container text-left text-xs uppercase tracking-wide text-on-surface-variant">
                  <tr>
                    <th className="px-4 py-3">Empleado</th>
                    <th className="px-4 py-3">Area / Cargo</th>
                    <th className="px-4 py-3">Entrada</th>
                    <th className="px-4 py-3">Salida</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {asistenciaDia.map((fila) => (
                    <tr key={fila.empleado.id} className="border-t border-outline-variant/30">
                      <td className="px-4 py-3 font-semibold">{fila.empleado.nombre}</td>
                      <td className="px-4 py-3 text-on-surface-variant">
                        {fila.empleado.area ?? '-'} / {fila.empleado.cargo ?? '-'}
                      </td>
                      <td className="px-4 py-3">{hhmm(fila.horaEntrada)}</td>
                      <td className="px-4 py-3">{hhmm(fila.horaSalida)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-bold ${
                            fila.estado === 'SIN_REGISTRO'
                              ? 'bg-gray-100 text-gray-700'
                              : fila.estado === 'ENTRO'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {fila.estado === 'SIN_REGISTRO'
                            ? 'Sin registro'
                            : fila.estado === 'ENTRO'
                              ? 'Entro'
                              : 'Salio'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            disabled={fila.estado !== 'SIN_REGISTRO'}
                            onClick={() => registrarEntradaMutation.mutate(fila.empleado.id)}
                            className="rounded-lg border border-primary px-2 py-1 text-xs font-bold text-primary disabled:opacity-40"
                          >
                            Entrada
                          </button>
                          <button
                            disabled={fila.estado !== 'ENTRO'}
                            onClick={() => registrarSalidaMutation.mutate(fila.empleado.id)}
                            className="rounded-lg border border-secondary px-2 py-1 text-xs font-bold text-secondary disabled:opacity-40"
                          >
                            Salida
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'vacaciones' && (
          <div className="space-y-4">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                solicitarVacacionesMutation.mutate();
              }}
              className="grid gap-3 rounded-xl border border-outline-variant bg-white p-4 md:grid-cols-4"
            >
              <select
                required
                value={vacacionesForm.empleadoId}
                onChange={(e) =>
                  setVacacionesForm((prev) => ({ ...prev, empleadoId: e.target.value }))
                }
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              >
                <option value="">Selecciona empleado</option>
                {empleados.map((empleado) => (
                  <option key={empleado.id} value={empleado.id}>
                    {empleado.nombre} {empleado.apellido}
                  </option>
                ))}
              </select>

              <input
                required
                type="date"
                value={vacacionesForm.fechaInicio}
                onChange={(e) =>
                  setVacacionesForm((prev) => ({ ...prev, fechaInicio: e.target.value }))
                }
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              />

              <input
                required
                type="date"
                value={vacacionesForm.fechaFin}
                onChange={(e) =>
                  setVacacionesForm((prev) => ({ ...prev, fechaFin: e.target.value }))
                }
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              />

              <button className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary">
                Solicitar
              </button>
            </form>

            <div className="overflow-x-auto rounded-xl border border-outline-variant bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-surface-container text-left text-xs uppercase tracking-wide text-on-surface-variant">
                  <tr>
                    <th className="px-4 py-3">Empleado</th>
                    <th className="px-4 py-3">Fechas</th>
                    <th className="px-4 py-3">Dias</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {vacaciones.map((item) => (
                    <tr key={item.id} className="border-t border-outline-variant/30">
                      <td className="px-4 py-3 font-semibold">
                        {item.empleado ? `${item.empleado.nombre} ${item.empleado.apellido}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant">
                        {toDateInput(item.fechaInicio)} - {toDateInput(item.fechaFin)}
                      </td>
                      <td className="px-4 py-3">{item.diasHabiles}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-bold ${
                            item.estado === 'APROBADA'
                              ? 'bg-green-100 text-green-700'
                              : item.estado === 'RECHAZADA'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {item.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {canGestionarVacaciones ? (
                          <div className="flex gap-2">
                            <button
                              disabled={item.estado !== 'SOLICITADA'}
                              onClick={() => aprobarVacacionesMutation.mutate(item.id)}
                              className="rounded-lg border border-green-600 px-2 py-1 text-xs font-bold text-green-700 disabled:opacity-40"
                            >
                              Aprobar
                            </button>
                            <button
                              disabled={item.estado !== 'SOLICITADA'}
                              onClick={() => {
                                const motivo = window.prompt('Motivo de rechazo:')?.trim();
                                if (motivo) {
                                  rechazarVacacionesMutation.mutate({ id: item.id, motivo });
                                }
                              }}
                              className="rounded-lg border border-red-600 px-2 py-1 text-xs font-bold text-red-700 disabled:opacity-40"
                            >
                              Rechazar
                            </button>
                          </div>
                        ) : (
                          <span className="text-on-surface-variant">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'nomina' && (
          <div className="space-y-4">
            <div className="grid gap-3 rounded-xl border border-outline-variant bg-white p-4 md:grid-cols-5">
              <input
                type="number"
                min={1}
                max={12}
                value={nominaMes}
                onChange={(e) => setNominaMes(Number(e.target.value || 1))}
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              />
              <input
                type="number"
                min={2000}
                max={2100}
                value={nominaAno}
                onChange={(e) => setNominaAno(Number(e.target.value || new Date().getFullYear()))}
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              />
              <select
                value={nominaSedeId}
                onChange={(e) => setNominaSedeId(e.target.value)}
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              >
                <option value="">Todas las sedes activas</option>
                {sedes.map((sede) => (
                  <option key={sede.id} value={sede.id}>
                    {sede.nombre}
                  </option>
                ))}
              </select>

              <button
                onClick={() => calcularNominaMutation.mutate()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary"
              >
                Calcular Nomina
              </button>

              <select
                value={nominaSeleccionadaId}
                onChange={(e) => setNominaSeleccionadaId(e.target.value)}
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              >
                <option value="">Seleccionar nomina</option>
                {nominas.map((nomina) => (
                  <option key={nomina.id} value={nomina.id}>
                    {String(nomina.mes).padStart(2, '0')}/{nomina.ano} -{' '}
                    {nomina.sede?.nombre ?? 'Sede'}
                  </option>
                ))}
              </select>
            </div>

            {nominaDetalle && (
              <div className="rounded-xl border border-outline-variant bg-white p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-on-surface">Nomina seleccionada</p>
                    <p className="text-on-surface-variant">
                      Periodo {String(nominaDetalle.mes).padStart(2, '0')}/{nominaDetalle.ano} -{' '}
                      {nominaDetalle.sede?.nombre ?? 'Sede'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-primary-container px-2 py-1 text-xs font-bold text-on-primary-container">
                      {nominaDetalle.estado}
                    </span>
                    {canAprobarNomina && nominaDetalle.estado !== 'APROBADA' && (
                      <button
                        onClick={() => aprobarNominaMutation.mutate(nominaDetalle.id)}
                        className="rounded-lg border border-primary px-3 py-2 text-xs font-bold text-primary"
                      >
                        Aprobar Nomina
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-outline-variant p-3">
                    <p className="text-xs uppercase text-on-surface-variant">Devengado</p>
                    <p className="text-lg font-black text-on-surface">
                      {cop.format(Number(nominaDetalle.totalDevengado || 0))}
                    </p>
                  </div>
                  <div className="rounded-lg border border-outline-variant p-3">
                    <p className="text-xs uppercase text-on-surface-variant">Deducciones</p>
                    <p className="text-lg font-black text-on-surface">
                      {cop.format(Number(nominaDetalle.totalDeducciones || 0))}
                    </p>
                  </div>
                  <div className="rounded-lg border border-outline-variant p-3">
                    <p className="text-xs uppercase text-on-surface-variant">Neto</p>
                    <p className="text-lg font-black text-on-surface">
                      {cop.format(Number(nominaDetalle.totalNeto || 0))}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-x-auto rounded-xl border border-outline-variant bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-surface-container text-left text-xs uppercase tracking-wide text-on-surface-variant">
                  <tr>
                    <th className="px-4 py-3">Empleado</th>
                    <th className="px-4 py-3">Devengado</th>
                    <th className="px-4 py-3">Deducciones</th>
                    <th className="px-4 py-3">Neto</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Colilla</th>
                  </tr>
                </thead>
                <tbody>
                  {liquidacionesActivas.map((liq) => (
                    <tr key={liq.id} className="border-t border-outline-variant/30">
                      <td className="px-4 py-3 font-semibold">
                        {liq.empleado ? `${liq.empleado.nombre} ${liq.empleado.apellido}` : '-'}
                      </td>
                      <td className="px-4 py-3">{cop.format(Number(liq.totalDevengado || 0))}</td>
                      <td className="px-4 py-3">{cop.format(Number(liq.totalDeducciones || 0))}</td>
                      <td className="px-4 py-3 font-bold">
                        {cop.format(Number(liq.netoPagar || 0))}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-primary-container px-2 py-1 text-xs font-bold text-on-primary-container">
                          {liq.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={async () => {
                            const { data } = await api.get<string>(
                              `/rrhh/nomina/liquidaciones/${liq.id}/colilla`,
                            );
                            setColillaTexto(data);
                            setShowColilla(true);
                          }}
                          className="rounded-lg border border-outline-variant px-2 py-1 text-xs font-bold"
                        >
                          Ver Colilla
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showNuevoEmpleado && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <form
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              createEmpleadoMutation.mutate();
            }}
            className="w-full max-w-5xl space-y-4 rounded-2xl border border-outline-variant bg-white p-5"
          >
            <h3 className="text-lg font-black text-on-surface">Nuevo Empleado</h3>

            <div className="grid gap-3 md:grid-cols-4">
              <select
                value={nuevoEmpleado.tipoDocumento}
                onChange={(e) =>
                  setNuevoEmpleado((prev) => ({ ...prev, tipoDocumento: e.target.value }))
                }
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              >
                {['CC', 'CE', 'PASAPORTE'].map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
              <input
                required
                value={nuevoEmpleado.numeroDocumento}
                onChange={(e) =>
                  setNuevoEmpleado((prev) => ({ ...prev, numeroDocumento: e.target.value }))
                }
                placeholder="Numero documento"
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              />
              <input
                required
                value={nuevoEmpleado.nombre}
                onChange={(e) => setNuevoEmpleado((prev) => ({ ...prev, nombre: e.target.value }))}
                placeholder="Nombre"
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              />
              <input
                required
                value={nuevoEmpleado.apellido}
                onChange={(e) =>
                  setNuevoEmpleado((prev) => ({ ...prev, apellido: e.target.value }))
                }
                placeholder="Apellido"
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              />

              <input
                value={nuevoEmpleado.email}
                onChange={(e) => setNuevoEmpleado((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="Email"
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              />
              <input
                value={nuevoEmpleado.telefono}
                onChange={(e) =>
                  setNuevoEmpleado((prev) => ({ ...prev, telefono: e.target.value }))
                }
                placeholder="Telefono"
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              />
              <input
                type="date"
                value={nuevoEmpleado.fechaNacimiento}
                onChange={(e) =>
                  setNuevoEmpleado((prev) => ({ ...prev, fechaNacimiento: e.target.value }))
                }
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              />
              <input
                value={nuevoEmpleado.genero}
                onChange={(e) => setNuevoEmpleado((prev) => ({ ...prev, genero: e.target.value }))}
                placeholder="Genero"
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              />

              <select
                required
                value={nuevoEmpleado.areaId}
                onChange={(e) =>
                  setNuevoEmpleado((prev) => ({ ...prev, areaId: e.target.value, cargoId: '' }))
                }
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              >
                <option value="">Area</option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.nombre}
                  </option>
                ))}
              </select>
              <select
                required
                value={nuevoEmpleado.cargoId}
                onChange={(e) => setNuevoEmpleado((prev) => ({ ...prev, cargoId: e.target.value }))}
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              >
                <option value="">Cargo</option>
                {cargos
                  .filter((cargo) => !nuevoEmpleado.areaId || cargo.areaId === nuevoEmpleado.areaId)
                  .map((cargo) => (
                    <option key={cargo.id} value={cargo.id}>
                      {cargo.nombre}
                    </option>
                  ))}
              </select>
              <select
                required
                value={nuevoEmpleado.sedeId}
                onChange={(e) => setNuevoEmpleado((prev) => ({ ...prev, sedeId: e.target.value }))}
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              >
                <option value="">Sede</option>
                {sedes.map((sede) => (
                  <option key={sede.id} value={sede.id}>
                    {sede.nombre}
                  </option>
                ))}
              </select>
              <select
                value={nuevoEmpleado.tipoContrato}
                onChange={(e) =>
                  setNuevoEmpleado((prev) => ({ ...prev, tipoContrato: e.target.value }))
                }
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              >
                {['INDEFINIDO', 'FIJO', 'OBRA_LABOR', 'PRESTACION_SERVICIOS', 'APRENDIZ'].map(
                  (tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ),
                )}
              </select>

              <input
                type="date"
                value={nuevoEmpleado.fechaIngreso}
                onChange={(e) =>
                  setNuevoEmpleado((prev) => ({ ...prev, fechaIngreso: e.target.value }))
                }
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              />
              <input
                required
                type="number"
                min={0}
                value={nuevoEmpleado.salarioBase}
                onChange={(e) =>
                  setNuevoEmpleado((prev) => ({ ...prev, salarioBase: e.target.value }))
                }
                placeholder="Salario base"
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              />
              <input
                value={nuevoEmpleado.eps}
                onChange={(e) => setNuevoEmpleado((prev) => ({ ...prev, eps: e.target.value }))}
                placeholder="EPS"
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              />
              <input
                value={nuevoEmpleado.arl}
                onChange={(e) => setNuevoEmpleado((prev) => ({ ...prev, arl: e.target.value }))}
                placeholder="ARL"
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              />

              <input
                value={nuevoEmpleado.fondoPension}
                onChange={(e) =>
                  setNuevoEmpleado((prev) => ({ ...prev, fondoPension: e.target.value }))
                }
                placeholder="Fondo pension"
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              />
              <input
                value={nuevoEmpleado.cuentaBancaria}
                onChange={(e) =>
                  setNuevoEmpleado((prev) => ({ ...prev, cuentaBancaria: e.target.value }))
                }
                placeholder="Cuenta bancaria"
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
              />
              <label className="flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={nuevoEmpleado.auxilioTransporte}
                  onChange={(e) =>
                    setNuevoEmpleado((prev) => ({ ...prev, auxilioTransporte: e.target.checked }))
                  }
                />
                Auxilio transporte
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNuevoEmpleado(false)}
                className="rounded-lg border border-outline-variant px-4 py-2 text-sm"
              >
                Cancelar
              </button>
              <button className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary">
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}

      {showColilla && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-outline-variant bg-white p-5">
            <h3 className="mb-3 text-lg font-black text-on-surface">Colilla de Pago</h3>
            <pre className="max-h-[70vh] overflow-auto rounded-lg bg-surface-container-low p-4 text-xs">
              {colillaTexto}
            </pre>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setShowColilla(false);
                  setColillaTexto('');
                }}
                className="rounded-lg border border-outline-variant px-4 py-2 text-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
