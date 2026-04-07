import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRightLeft,
  BadgeDollarSign,
  CalendarClock,
  FileClock,
  History,
  Plus,
  Search,
  ShieldAlert,
  Wallet,
  Wrench,
} from 'lucide-react';
import AppLayout from './components/AppLayout';
import api from '../lib/api';

type EstadoActivo = 'ACTIVO' | 'EN_MANTENIMIENTO' | 'DADO_DE_BAJA' | 'ROBADO';

type ActivoItem = {
  id: string;
  codigo: string;
  nombre: string;
  serial?: string | null;
  estado: EstadoActivo;
  valorActual: number;
  categoriaId: string;
  sedeId: string;
  custodioId?: string | null;
  fechaCompra: string;
  valorCompra: number;
  valorResidual: number;
  categoria?: { id: string; nombre: string } | null;
  sede?: { id: string; nombre: string } | null;
  custodio?: { id: string; nombre: string; apellido: string } | null;
  proximoMantenimiento?: string | null;
};

type CategoriaActivo = { id: string; nombre: string };
type SedeItem = { id: string; nombre: string };
type EmpleadoItem = { id: string; nombre: string; apellido: string };

type Paginado<T> = {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
};

type MovimientoActivo = {
  id: string;
  tipo: 'ALTA' | 'BAJA' | 'TRASLADO' | 'MANTENIMIENTO';
  descripcion: string;
  fecha: string;
  realizadoPor?: { nombre?: string; apellido?: string; email?: string } | null;
};

type ReporteRow = {
  categoriaId: string;
  categoriaNombre: string;
  cantidadActivos: number;
  valorCompraTotal: number;
  depreciacionAcumulada: number;
  valorActualTotal: number;
};

const formatCOP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const estadoClass: Record<EstadoActivo, string> = {
  ACTIVO: 'bg-emerald-100 text-emerald-700',
  EN_MANTENIMIENTO: 'bg-amber-100 text-amber-700',
  DADO_DE_BAJA: 'bg-slate-200 text-slate-700',
  ROBADO: 'bg-rose-100 text-rose-700',
};

export default function ActivosPage() {
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<'inventario' | 'mantenimientos' | 'reporte'>('inventario');
  const [search, setSearch] = useState('');
  const [filtros, setFiltros] = useState({
    estado: '' as '' | EstadoActivo,
    sedeId: '',
    categoriaId: '',
    custodioId: '',
  });

  const [showCrear, setShowCrear] = useState(false);
  const [activoTraslado, setActivoTraslado] = useState<ActivoItem | null>(null);
  const [activoBaja, setActivoBaja] = useState<ActivoItem | null>(null);
  const [activoDepreciacion, setActivoDepreciacion] = useState<ActivoItem | null>(null);
  const [activoHistorial, setActivoHistorial] = useState<ActivoItem | null>(null);

  const [crearForm, setCrearForm] = useState({
    nombre: '',
    categoriaId: '',
    sedeId: '',
    custodioId: '',
    fechaCompra: '',
    valorCompra: '',
    valorResidual: '',
    marca: '',
    modelo: '',
    serial: '',
    proximoMantenimiento: '',
    garantiaHasta: '',
    foto: '',
  });

  const [trasladoForm, setTrasladoForm] = useState({
    sedeDestinoId: '',
    custodioDestinoId: '',
    descripcion: '',
  });
  const [motivoBaja, setMotivoBaja] = useState('');
  const [depreciacionForm, setDepreciacionForm] = useState({
    mes: String(new Date().getMonth() + 1),
    anio: String(new Date().getFullYear()),
  });

  const activosQuery = useQuery({
    queryKey: ['activos-list', filtros],
    queryFn: async () => {
      const { data } = await api.get<Paginado<ActivoItem>>('/activos', {
        params: {
          page: 1,
          limit: 100,
          ...(filtros.estado ? { estado: filtros.estado } : {}),
          ...(filtros.sedeId ? { sedeId: filtros.sedeId } : {}),
          ...(filtros.categoriaId ? { categoriaId: filtros.categoriaId } : {}),
          ...(filtros.custodioId ? { custodioId: filtros.custodioId } : {}),
        },
      });
      return data;
    },
  });

  const reporteQuery = useQuery({
    queryKey: ['activos-reporte'],
    queryFn: async () => {
      const { data } = await api.get<ReporteRow[]>('/activos/reporte');
      return data;
    },
  });

  const mantenimientosQuery = useQuery({
    queryKey: ['activos-mantenimientos-proximos'],
    queryFn: async () => {
      const { data } = await api.get<ActivoItem[]>('/activos/mantenimientos-proximos', {
        params: { dias: 30 },
      });
      return data;
    },
  });

  const historialQuery = useQuery({
    queryKey: ['activo-historial', activoHistorial?.id],
    enabled: Boolean(activoHistorial?.id),
    queryFn: async () => {
      const { data } = await api.get<MovimientoActivo[]>(
        `/activos/${activoHistorial?.id}/historial`,
      );
      return data;
    },
  });

  const categoriasQuery = useQuery({
    queryKey: ['activos-categorias'],
    queryFn: async () => {
      const { data } = await api.get<CategoriaActivo[]>('/activos/categorias');
      return data;
    },
  });

  const sedesQuery = useQuery({
    queryKey: ['activos-sedes'],
    queryFn: async () => {
      const { data } = await api.get<SedeItem[]>('/sedes');
      return data;
    },
  });

  const empleadosQuery = useQuery({
    queryKey: ['activos-empleados'],
    queryFn: async () => {
      const { data } = await api.get<Paginado<EmpleadoItem>>('/activos/empleados', {
        params: { page: 1, limit: 200 },
      });
      return data.items;
    },
  });

  const crearMutation = useMutation({
    mutationFn: async () => {
      await api.post('/activos', {
        nombre: crearForm.nombre,
        categoriaId: crearForm.categoriaId,
        sedeId: crearForm.sedeId,
        custodioId: crearForm.custodioId || undefined,
        fechaCompra: crearForm.fechaCompra,
        valorCompra: Number(crearForm.valorCompra || 0),
        valorResidual: Number(crearForm.valorResidual || 0),
        marca: crearForm.marca || undefined,
        modelo: crearForm.modelo || undefined,
        serial: crearForm.serial || undefined,
        proximoMantenimiento: crearForm.proximoMantenimiento || undefined,
        garantiaHasta: crearForm.garantiaHasta || undefined,
        foto: crearForm.foto || undefined,
      });
    },
    onSuccess: () => {
      setShowCrear(false);
      setCrearForm({
        nombre: '',
        categoriaId: '',
        sedeId: '',
        custodioId: '',
        fechaCompra: '',
        valorCompra: '',
        valorResidual: '',
        marca: '',
        modelo: '',
        serial: '',
        proximoMantenimiento: '',
        garantiaHasta: '',
        foto: '',
      });
      void queryClient.invalidateQueries({ queryKey: ['activos-list'] });
      void queryClient.invalidateQueries({ queryKey: ['activos-reporte'] });
    },
  });

  const trasladarMutation = useMutation({
    mutationFn: async () => {
      if (!activoTraslado) return;
      await api.post(`/activos/${activoTraslado.id}/trasladar`, trasladoForm);
    },
    onSuccess: () => {
      setActivoTraslado(null);
      setTrasladoForm({ sedeDestinoId: '', custodioDestinoId: '', descripcion: '' });
      void queryClient.invalidateQueries({ queryKey: ['activos-list'] });
      void queryClient.invalidateQueries({ queryKey: ['activos-mantenimientos-proximos'] });
    },
  });

  const bajaMutation = useMutation({
    mutationFn: async () => {
      if (!activoBaja) return;
      await api.patch(`/activos/${activoBaja.id}/baja`, { motivo: motivoBaja });
    },
    onSuccess: () => {
      setActivoBaja(null);
      setMotivoBaja('');
      void queryClient.invalidateQueries({ queryKey: ['activos-list'] });
      void queryClient.invalidateQueries({ queryKey: ['activos-mantenimientos-proximos'] });
      void queryClient.invalidateQueries({ queryKey: ['activos-reporte'] });
    },
  });

  const depreciacionMutation = useMutation({
    mutationFn: async () => {
      if (!activoDepreciacion) return;
      await api.post(`/activos/${activoDepreciacion.id}/depreciacion`, {
        mes: Number(depreciacionForm.mes),
        anio: Number(depreciacionForm.anio),
      });
    },
    onSuccess: () => {
      setActivoDepreciacion(null);
      void queryClient.invalidateQueries({ queryKey: ['activos-list'] });
      void queryClient.invalidateQueries({ queryKey: ['activos-reporte'] });
    },
  });

  const activosRaw = activosQuery.data?.items ?? [];
  const activos = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return activosRaw;
    return activosRaw.filter(
      (a) =>
        a.codigo.toLowerCase().includes(term) ||
        a.nombre.toLowerCase().includes(term) ||
        (a.serial ?? '').toLowerCase().includes(term),
    );
  }, [activosRaw, search]);

  const mantenimientos = mantenimientosQuery.data ?? [];
  const reporte = reporteQuery.data ?? [];

  const totalActivos = activosRaw.length;
  const valorTotal = activosRaw.reduce((acc, item) => acc + Number(item.valorActual || 0), 0);
  const enMantenimiento = activosRaw.filter((item) => item.estado === 'EN_MANTENIMIENTO').length;
  const dadosBaja = activosRaw.filter((item) => item.estado === 'DADO_DE_BAJA').length;

  const submitTraslado = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    trasladarMutation.mutate();
  };

  const submitBaja = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    bajaMutation.mutate();
  };

  const submitCrear = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    crearMutation.mutate();
  };

  const submitDepreciacion = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    depreciacionMutation.mutate();
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <section className="rounded-2xl border border-outline-variant bg-gradient-to-br from-[#fff9f5] via-white to-[#f6fbff] p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-on-secondary-fixed">
                Activos
              </h1>
              <p className="mt-1 text-secondary">
                Gestión de activos, movimientos, depreciación y mantenimiento.
              </p>
            </div>
            <button
              onClick={() => setShowCrear(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary"
            >
              <Plus className="h-4 w-4" /> Nuevo activo
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-outline-variant bg-white p-3">
              <p className="text-xs font-bold uppercase text-on-surface-variant">Activos</p>
              <p className="mt-1 text-2xl font-black text-on-surface">{totalActivos}</p>
            </div>
            <div className="rounded-xl border border-outline-variant bg-white p-3">
              <p className="inline-flex items-center gap-1 text-xs font-bold uppercase text-on-surface-variant">
                <Wallet className="h-3.5 w-3.5" /> Valor total
              </p>
              <p className="mt-1 text-2xl font-black text-on-surface">
                {formatCOP.format(valorTotal)}
              </p>
            </div>
            <div className="rounded-xl border border-outline-variant bg-white p-3">
              <p className="inline-flex items-center gap-1 text-xs font-bold uppercase text-on-surface-variant">
                <Wrench className="h-3.5 w-3.5" /> En mantenimiento
              </p>
              <p className="mt-1 text-2xl font-black text-amber-600">{enMantenimiento}</p>
            </div>
            <div className="rounded-xl border border-outline-variant bg-white p-3">
              <p className="inline-flex items-center gap-1 text-xs font-bold uppercase text-on-surface-variant">
                <ShieldAlert className="h-3.5 w-3.5" /> Baja
              </p>
              <p className="mt-1 text-2xl font-black text-slate-700">{dadosBaja}</p>
            </div>
          </div>
        </section>

        <div className="inline-flex rounded-xl border border-outline-variant bg-white p-1">
          {(
            [
              ['inventario', 'Inventario'],
              ['mantenimientos', 'Mantenimientos'],
              ['reporte', 'Reporte'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-lg px-4 py-2 text-sm font-bold ${tab === key ? 'bg-primary text-on-primary' : 'text-on-surface-variant'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'inventario' && (
          <>
            <div className="grid gap-3 rounded-xl border border-outline-variant bg-white p-3 md:grid-cols-5">
              <div className="relative md:col-span-2">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-on-surface-variant" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por código, nombre o serial"
                  className="w-full rounded-lg border border-outline-variant py-2 pl-9 pr-3 text-sm"
                />
              </div>
              <select
                value={filtros.estado}
                onChange={(e) =>
                  setFiltros((p) => ({ ...p, estado: e.target.value as '' | EstadoActivo }))
                }
                className="rounded-lg border border-outline-variant px-3 py-2 text-sm"
              >
                <option value="">Estado</option>
                <option value="ACTIVO">ACTIVO</option>
                <option value="EN_MANTENIMIENTO">EN_MANTENIMIENTO</option>
                <option value="DADO_DE_BAJA">DADO_DE_BAJA</option>
                <option value="ROBADO">ROBADO</option>
              </select>
              <select
                value={filtros.sedeId}
                onChange={(e) => setFiltros((p) => ({ ...p, sedeId: e.target.value }))}
                className="rounded-lg border border-outline-variant px-3 py-2 text-sm"
              >
                <option value="">Sede</option>
                {(sedesQuery.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
              <select
                value={filtros.categoriaId}
                onChange={(e) => setFiltros((p) => ({ ...p, categoriaId: e.target.value }))}
                className="rounded-lg border border-outline-variant px-3 py-2 text-sm"
              >
                <option value="">Categoría</option>
                {(categoriasQuery.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto rounded-xl border border-outline-variant bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-surface-container text-left text-xs uppercase tracking-wide text-on-surface-variant">
                  <tr>
                    <th className="px-4 py-3">Activo</th>
                    <th className="px-4 py-3">Categoría</th>
                    <th className="px-4 py-3">Sede</th>
                    <th className="px-4 py-3">Custodio</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Valor actual</th>
                    <th className="px-4 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {activos.map((activo) => (
                    <tr key={activo.id} className="border-t border-outline-variant/30">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-on-surface">
                          {activo.codigo} - {activo.nombre}
                        </div>
                        <div className="text-xs text-on-surface-variant">
                          Compra: {activo.fechaCompra?.slice(0, 10)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant">
                        {activo.categoria?.nombre ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant">
                        {activo.sede?.nombre ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant">
                        {activo.custodio
                          ? `${activo.custodio.nombre} ${activo.custodio.apellido}`
                          : 'Sin custodio'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-bold ${estadoClass[activo.estado]}`}
                        >
                          {activo.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-on-surface">
                        {formatCOP.format(Number(activo.valorActual || 0))}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => {
                              setActivoTraslado(activo);
                              setTrasladoForm((prev) => ({
                                ...prev,
                                descripcion: `Traslado de ${activo.codigo}`,
                              }));
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-primary px-3 py-1.5 text-xs font-bold text-primary"
                          >
                            <ArrowRightLeft className="h-3.5 w-3.5" />
                            Trasladar
                          </button>
                          <button
                            onClick={() => setActivoDepreciacion(activo)}
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-bold text-amber-700"
                          >
                            <BadgeDollarSign className="h-3.5 w-3.5" />
                            Depreciar
                          </button>
                          <button
                            onClick={() => setActivoBaja(activo)}
                            className="rounded-lg border border-error px-3 py-1.5 text-xs font-bold text-error"
                          >
                            Baja
                          </button>
                          <button
                            onClick={() => setActivoHistorial(activo)}
                            className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-bold"
                          >
                            <History className="h-3.5 w-3.5" />
                            Historial
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!activosQuery.isLoading && activos.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-on-surface-variant">
                        No hay activos para mostrar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'mantenimientos' && (
          <div className="space-y-3">
            {mantenimientos.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
              >
                <p className="inline-flex items-center gap-2 font-bold">
                  <FileClock className="h-4 w-4" />
                  {item.codigo} - {item.nombre}
                </p>
                <p className="mt-0.5">
                  Sede: {item.sede?.nombre ?? '-'} | Fecha mantenimiento:{' '}
                  {item.proximoMantenimiento?.slice(0, 10) ?? '-'}
                </p>
              </div>
            ))}
            {!mantenimientosQuery.isLoading && mantenimientos.length === 0 && (
              <div className="rounded-xl border border-outline-variant bg-white px-4 py-8 text-center text-on-surface-variant">
                No hay mantenimientos próximos en los próximos 30 días.
              </div>
            )}
          </div>
        )}

        {tab === 'reporte' && (
          <div className="rounded-xl border border-outline-variant bg-white p-4">
            <h2 className="mb-3 inline-flex items-center gap-2 text-sm font-black uppercase tracking-wide text-on-surface">
              <Wallet className="h-4 w-4" />
              Valorización por categoría
            </h2>
            <div className="space-y-2">
              {reporte.map((row) => (
                <div
                  key={row.categoriaId}
                  className="rounded-lg border border-outline-variant p-3 text-sm"
                >
                  <p className="font-bold text-on-surface">{row.categoriaNombre}</p>
                  <p className="mt-1 text-on-surface-variant">
                    Activos: {row.cantidadActivos} | Compra:{' '}
                    {formatCOP.format(row.valorCompraTotal)} | Depreciación:{' '}
                    {formatCOP.format(row.depreciacionAcumulada)} | Actual:{' '}
                    {formatCOP.format(row.valorActualTotal)}
                  </p>
                </div>
              ))}
              {!reporteQuery.isLoading && reporte.length === 0 && (
                <p className="text-sm text-on-surface-variant">Sin datos de reporte.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {showCrear && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <form
            onSubmit={submitCrear}
            className="w-full max-w-2xl space-y-4 rounded-2xl border border-outline-variant bg-white p-5"
          >
            <h2 className="text-lg font-black text-on-surface">Nuevo activo</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                required
                value={crearForm.nombre}
                onChange={(e) => setCrearForm((p) => ({ ...p, nombre: e.target.value }))}
                placeholder="Nombre"
                className="rounded-lg border border-outline-variant px-3 py-2 text-sm"
              />
              <select
                required
                value={crearForm.categoriaId}
                onChange={(e) => setCrearForm((p) => ({ ...p, categoriaId: e.target.value }))}
                className="rounded-lg border border-outline-variant px-3 py-2 text-sm"
              >
                <option value="">Categoría</option>
                {(categoriasQuery.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
              <select
                required
                value={crearForm.sedeId}
                onChange={(e) => setCrearForm((p) => ({ ...p, sedeId: e.target.value }))}
                className="rounded-lg border border-outline-variant px-3 py-2 text-sm"
              >
                <option value="">Sede</option>
                {(sedesQuery.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
              <select
                value={crearForm.custodioId}
                onChange={(e) => setCrearForm((p) => ({ ...p, custodioId: e.target.value }))}
                className="rounded-lg border border-outline-variant px-3 py-2 text-sm"
              >
                <option value="">Custodio</option>
                {(empleadosQuery.data ?? []).map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre} {e.apellido}
                  </option>
                ))}
              </select>
              <input
                required
                type="date"
                value={crearForm.fechaCompra}
                onChange={(e) => setCrearForm((p) => ({ ...p, fechaCompra: e.target.value }))}
                className="rounded-lg border border-outline-variant px-3 py-2 text-sm"
              />
              <input
                required
                type="number"
                min="0"
                value={crearForm.valorCompra}
                onChange={(e) => setCrearForm((p) => ({ ...p, valorCompra: e.target.value }))}
                placeholder="Valor compra"
                className="rounded-lg border border-outline-variant px-3 py-2 text-sm"
              />
              <input
                type="number"
                min="0"
                value={crearForm.valorResidual}
                onChange={(e) => setCrearForm((p) => ({ ...p, valorResidual: e.target.value }))}
                placeholder="Valor residual"
                className="rounded-lg border border-outline-variant px-3 py-2 text-sm"
              />
              <input
                value={crearForm.serial}
                onChange={(e) => setCrearForm((p) => ({ ...p, serial: e.target.value }))}
                placeholder="Serial"
                className="rounded-lg border border-outline-variant px-3 py-2 text-sm"
              />
              <input
                value={crearForm.marca}
                onChange={(e) => setCrearForm((p) => ({ ...p, marca: e.target.value }))}
                placeholder="Marca"
                className="rounded-lg border border-outline-variant px-3 py-2 text-sm"
              />
              <input
                value={crearForm.modelo}
                onChange={(e) => setCrearForm((p) => ({ ...p, modelo: e.target.value }))}
                placeholder="Modelo"
                className="rounded-lg border border-outline-variant px-3 py-2 text-sm"
              />
              <input
                type="date"
                value={crearForm.proximoMantenimiento}
                onChange={(e) =>
                  setCrearForm((p) => ({ ...p, proximoMantenimiento: e.target.value }))
                }
                className="rounded-lg border border-outline-variant px-3 py-2 text-sm"
              />
              <input
                type="date"
                value={crearForm.garantiaHasta}
                onChange={(e) => setCrearForm((p) => ({ ...p, garantiaHasta: e.target.value }))}
                className="rounded-lg border border-outline-variant px-3 py-2 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCrear(false)}
                className="rounded-lg border border-outline-variant px-4 py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={crearMutation.isPending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary disabled:opacity-60"
              >
                {crearMutation.isPending ? 'Guardando...' : 'Crear activo'}
              </button>
            </div>
          </form>
        </div>
      )}

      {activoTraslado && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <form
            onSubmit={submitTraslado}
            className="w-full max-w-lg space-y-4 rounded-2xl border border-outline-variant bg-white p-5"
          >
            <h2 className="text-lg font-black text-on-surface">
              Trasladar activo {activoTraslado.codigo}
            </h2>
            <div className="grid gap-3">
              <select
                required
                value={trasladoForm.sedeDestinoId}
                onChange={(e) => setTrasladoForm((p) => ({ ...p, sedeDestinoId: e.target.value }))}
                className="rounded-lg border border-outline-variant px-3 py-2 text-sm"
              >
                <option value="">Sede destino</option>
                {(sedesQuery.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
              <select
                required
                value={trasladoForm.custodioDestinoId}
                onChange={(e) =>
                  setTrasladoForm((p) => ({ ...p, custodioDestinoId: e.target.value }))
                }
                className="rounded-lg border border-outline-variant px-3 py-2 text-sm"
              >
                <option value="">Custodio destino</option>
                {(empleadosQuery.data ?? []).map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre} {e.apellido}
                  </option>
                ))}
              </select>
              <textarea
                required
                value={trasladoForm.descripcion}
                onChange={(e) => setTrasladoForm((p) => ({ ...p, descripcion: e.target.value }))}
                rows={4}
                className="rounded-lg border border-outline-variant px-3 py-2 text-sm"
                placeholder="Descripción"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActivoTraslado(null)}
                className="rounded-lg border border-outline-variant px-4 py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={trasladarMutation.isPending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary disabled:opacity-60"
              >
                Confirmar traslado
              </button>
            </div>
          </form>
        </div>
      )}

      {activoBaja && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <form
            onSubmit={submitBaja}
            className="w-full max-w-md space-y-4 rounded-2xl border border-outline-variant bg-white p-5"
          >
            <h2 className="text-lg font-black text-on-surface">Dar de baja {activoBaja.codigo}</h2>
            <textarea
              required
              value={motivoBaja}
              onChange={(e) => setMotivoBaja(e.target.value)}
              rows={4}
              placeholder="Motivo"
              className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActivoBaja(null)}
                className="rounded-lg border border-outline-variant px-4 py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={bajaMutation.isPending}
                className="rounded-lg bg-error px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                Confirmar baja
              </button>
            </div>
          </form>
        </div>
      )}

      {activoDepreciacion && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <form
            onSubmit={submitDepreciacion}
            className="w-full max-w-md space-y-4 rounded-2xl border border-outline-variant bg-white p-5"
          >
            <h2 className="text-lg font-black text-on-surface">
              Depreciar {activoDepreciacion.codigo}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <input
                required
                type="number"
                min="1"
                max="12"
                value={depreciacionForm.mes}
                onChange={(e) => setDepreciacionForm((p) => ({ ...p, mes: e.target.value }))}
                placeholder="Mes"
                className="rounded-lg border border-outline-variant px-3 py-2 text-sm"
              />
              <input
                required
                type="number"
                min="2000"
                max="9999"
                value={depreciacionForm.anio}
                onChange={(e) => setDepreciacionForm((p) => ({ ...p, anio: e.target.value }))}
                placeholder="Año"
                className="rounded-lg border border-outline-variant px-3 py-2 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActivoDepreciacion(null)}
                className="rounded-lg border border-outline-variant px-4 py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={depreciacionMutation.isPending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary disabled:opacity-60"
              >
                Aplicar
              </button>
            </div>
          </form>
        </div>
      )}

      {activoHistorial && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-outline-variant bg-white p-5">
            <h2 className="text-lg font-black text-on-surface">
              Historial {activoHistorial.codigo}
            </h2>
            <div className="mt-4 max-h-[60vh] space-y-3 overflow-auto">
              {(historialQuery.data ?? []).map((mov) => (
                <div
                  key={mov.id}
                  className="rounded-lg border border-outline-variant px-3 py-2 text-sm"
                >
                  <p className="font-bold text-on-surface">{mov.tipo}</p>
                  <p className="mt-0.5 text-on-surface-variant">{mov.descripcion}</p>
                  <p className="mt-1 text-xs text-on-surface-variant">
                    {new Date(mov.fecha).toLocaleString('es-CO')} -
                    {` ${mov.realizadoPor?.nombre ?? ''} ${mov.realizadoPor?.apellido ?? ''}`.trim() ||
                      mov.realizadoPor?.email ||
                      ' Usuario'}
                  </p>
                </div>
              ))}
              {!historialQuery.isLoading && (historialQuery.data ?? []).length === 0 && (
                <p className="text-sm text-on-surface-variant">Sin movimientos registrados.</p>
              )}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setActivoHistorial(null)}
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
