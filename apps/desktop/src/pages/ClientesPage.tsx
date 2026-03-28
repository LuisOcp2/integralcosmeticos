import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ICliente, ITipoDocumentoConfiguracion } from '@cosmeticos/shared-types';
import api from '../lib/api';
import AppLayout from './components/AppLayout';

const cop = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const S = {
  primary: '#85264b',
  accent: '#a43e63',
  textStrong: '#2a1709',
  textMuted: '#735946',
  surface: '#f1edef',
  card: '#FFFFFF',
  border: '#dac0c5',
  success: '#2e7d32',
  successBg: '#e8f5e9',
  info: '#3949ab',
  infoBg: '#e8eaf6',
  warning: '#e65100',
  warningBg: '#fff8e1',
  danger: '#B91C1C',
  dangerBg: '#FEE2E2',
  panel: '#fcf8fa',
  backdrop: 'rgba(46, 27, 12, 0.5)',
  heroFrom: '#fcf8fa',
  heroVia: '#f6f2f4',
  heroTo: '#f1edef',
};

async function getClientes(): Promise<ICliente[]> {
  const { data } = await api.get('/clientes');
  return data;
}

async function getClientePorDocumento(documento: string): Promise<ICliente | null> {
  if (!documento.trim()) return null;
  try {
    const { data } = await api.get(`/clientes/documento/${documento.trim()}`);
    return data;
  } catch {
    return null;
  }
}

async function getTiposDocumento(): Promise<ITipoDocumentoConfiguracion[]> {
  const { data } = await api.get('/configuraciones/tipos-documento');
  return data;
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl ${className ?? ''}`}
      style={{ backgroundColor: S.surface }}
    />
  );
}

const nivelCliente = (puntos: number) => {
  if (puntos < 200) return { label: 'BRONCE', bg: '#fff8e1', color: '#e65100' };
  if (puntos < 800) return { label: 'PLATA', bg: '#f5f5f5', color: '#546e7a' };
  return { label: 'ORO', bg: '#fffde7', color: '#f9a825' };
};

type FormState = {
  nombre: string;
  apellido: string;
  documento: string;
  tipoDocumento: string;
  email: string;
  telefono: string;
};

const emptyForm: FormState = {
  nombre: '',
  apellido: '',
  documento: '',
  tipoDocumento: 'CC',
  email: '',
  telefono: '',
};

function ClienteModal({
  cliente,
  tiposDocumento,
  onClose,
  onSaved,
}: {
  cliente?: ICliente | null;
  tiposDocumento: ITipoDocumentoConfiguracion[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(
    cliente
      ? {
          nombre: cliente.nombre,
          apellido: cliente.apellido,
          documento: cliente.documento,
          tipoDocumento: cliente.tipoDocumento,
          email: cliente.email ?? '',
          telefono: cliente.telefono ?? '',
        }
      : emptyForm,
  );

  const opcionesTipoDocumento = tiposDocumento.length
    ? tiposDocumento
    : [
        { id: 'legacy-cc', codigo: 'CC', nombre: 'Cedula de Ciudadania' },
        { id: 'legacy-nit', codigo: 'NIT', nombre: 'Numero de Identificacion Tributaria' },
      ];

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (cliente) {
        await api.put(`/clientes/${cliente.id}`, form);
      } else {
        await api.post('/clientes', form);
      }
    },
    onSuccess: onSaved,
  });

  const f =
    (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((p) => ({ ...p, [field]: e.target.value }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4"
      style={{ backgroundColor: S.backdrop }}
    >
      <div
        className="max-h-[92dvh] w-full max-w-md overflow-hidden rounded-2xl shadow-2xl"
        style={{ backgroundColor: S.card }}
      >
        <div
          className="px-6 py-5 flex items-center justify-between"
          style={{ backgroundColor: S.textStrong }}
        >
          <div>
            <h3 className="text-xl font-black text-white">
              {cliente ? 'Editar cliente' : 'Nuevo cliente'}
            </h3>
            <p className="text-sm mt-0.5" style={{ color: '#BFDBFE' }}>
              Datos de contacto y documento
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
            aria-label="Cerrar formulario de cliente"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="max-h-[calc(92dvh-5rem)] space-y-4 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-3">
            {(['nombre', 'apellido'] as const).map((field) => (
              <div key={field}>
                <label
                  className="mb-1 block text-xs font-bold uppercase tracking-widest"
                  style={{ color: S.textMuted }}
                >
                  {field}
                </label>
                <input
                  value={form[field]}
                  onChange={f(field)}
                  className="min-h-11 w-full rounded-xl border-2 px-3 py-2.5 text-sm focus:outline-none"
                  style={{ borderColor: S.border, backgroundColor: S.panel, color: S.textStrong }}
                  placeholder={field === 'nombre' ? 'María' : 'González'}
                />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label
                className="mb-1 block text-xs font-bold uppercase tracking-widest"
                style={{ color: S.textMuted }}
              >
                Tipo doc.
              </label>
              <select
                value={form.tipoDocumento}
                onChange={f('tipoDocumento')}
                className="min-h-11 w-full rounded-xl border-2 px-3 py-2.5 text-sm focus:outline-none"
                style={{ borderColor: S.border, backgroundColor: S.panel, color: S.textStrong }}
              >
                {opcionesTipoDocumento.map((tipo) => (
                  <option key={tipo.id} value={tipo.codigo}>
                    {tipo.codigo}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label
                className="mb-1 block text-xs font-bold uppercase tracking-widest"
                style={{ color: S.textMuted }}
              >
                Documento
              </label>
              <input
                value={form.documento}
                onChange={f('documento')}
                className="min-h-11 w-full rounded-xl border-2 px-3 py-2.5 text-sm focus:outline-none"
                style={{ borderColor: S.border, backgroundColor: S.panel, color: S.textStrong }}
                placeholder="1032456789"
              />
            </div>
          </div>
          {(['email', 'telefono'] as const).map((field) => (
            <div key={field}>
              <label
                className="mb-1 block text-xs font-bold uppercase tracking-widest"
                style={{ color: S.textMuted }}
              >
                {field}
              </label>
              <input
                value={form[field]}
                onChange={f(field)}
                type={field === 'email' ? 'email' : 'tel'}
                className="min-h-11 w-full rounded-xl border-2 px-3 py-2.5 text-sm focus:outline-none"
                style={{ borderColor: S.border, backgroundColor: S.panel, color: S.textStrong }}
                placeholder={field === 'email' ? 'maria@gmail.com' : '300 123 4567'}
              />
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 flex-1 rounded-xl border-2 py-3 text-sm font-bold transition-all"
              style={{ borderColor: S.border, color: S.textMuted }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="min-h-11 flex-1 rounded-2xl py-3 text-sm font-black text-white disabled:opacity-60 transition-all"
              style={{ backgroundColor: S.primary }}
            >
              {saveMutation.isPending
                ? 'Guardando...'
                : cliente
                  ? 'Guardar cambios'
                  : 'Crear cliente'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ClientesPage() {
  const queryClient = useQueryClient();
  const [busqueda, setBusqueda] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [clienteEdit, setClienteEdit] = useState<ICliente | null>(null);

  const clientesQuery = useQuery({
    queryKey: ['clientes'],
    queryFn: getClientes,
    refetchInterval: 60000,
  });

  const tiposDocumentoQuery = useQuery({
    queryKey: ['configuraciones', 'tipos-documento'],
    queryFn: getTiposDocumento,
    staleTime: 120000,
  });

  const clienteDocQuery = useQuery({
    queryKey: ['clientes', 'documento', busqueda],
    queryFn: () => getClientePorDocumento(busqueda),
    enabled: busqueda.trim().length >= 5,
  });

  const clientes = useMemo(() => {
    if (clienteDocQuery.data) return [clienteDocQuery.data];
    if (busqueda.trim().length > 0) {
      const q = busqueda.toLowerCase();
      return (clientesQuery.data ?? []).filter(
        (c) =>
          c.nombre.toLowerCase().includes(q) ||
          c.apellido.toLowerCase().includes(q) ||
          c.documento.includes(q),
      );
    }
    return clientesQuery.data ?? [];
  }, [clienteDocQuery.data, clientesQuery.data, busqueda]);

  const handleSaved = () => {
    setModalOpen(false);
    setClienteEdit(null);
    void queryClient.invalidateQueries({ queryKey: ['clientes'] });
  };

  return (
    <AppLayout>
      {(modalOpen || clienteEdit) && (
        <ClienteModal
          cliente={clienteEdit}
          tiposDocumento={tiposDocumentoQuery.data ?? []}
          onClose={() => {
            setModalOpen(false);
            setClienteEdit(null);
          }}
          onSaved={handleSaved}
        />
      )}

      <div className="space-y-8">
        {/* Header */}
        <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: S.textStrong }}>
              Clientes
            </h1>
            <p className="mt-1 font-medium" style={{ color: S.textMuted }}>
              Gestión de clientes y programa de fidelidad
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex min-h-11 items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black uppercase tracking-widest text-white transition-all"
            style={{ backgroundColor: S.primary }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              person_add
            </span>
            Nuevo cliente
          </button>
        </header>

        <div
          className="rounded-2xl border p-4"
          style={{
            borderColor: S.border,
            background: `linear-gradient(135deg, ${S.heroFrom} 0%, ${S.heroVia} 52%, ${S.heroTo} 100%)`,
          }}
        >
          <p
            className="text-xs font-extrabold uppercase tracking-[0.18em]"
            style={{ color: S.textMuted }}
          >
            CRM en Caja
          </p>
          <p className="mt-1 text-sm font-semibold" style={{ color: S.textStrong }}>
            Consulta, registra y edita clientes durante la venta sin salir del flujo
          </p>
        </div>

        {/* KPI rápido */}
        {!clientesQuery.isLoading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div
              className="rounded-2xl border-l-4 p-5"
              style={{ backgroundColor: S.card, borderLeftColor: S.primary }}
            >
              <p
                className="mb-1 text-xs font-bold uppercase tracking-widest"
                style={{ color: S.textMuted }}
              >
                Total clientes
              </p>
              <p className="text-2xl font-black" style={{ color: S.textStrong }}>
                {clientesQuery.data?.length ?? 0}
              </p>
            </div>
            <div
              className="rounded-2xl border-l-4 p-5"
              style={{ backgroundColor: S.card, borderLeftColor: S.warning }}
            >
              <p
                className="mb-1 text-xs font-bold uppercase tracking-widest"
                style={{ color: S.textMuted }}
              >
                Nivel Oro
              </p>
              <p className="text-2xl font-black" style={{ color: S.textStrong }}>
                {clientesQuery.data?.filter((c) => c.puntosFidelidad >= 800).length ?? 0}
              </p>
            </div>
            <div
              className="rounded-2xl border-l-4 p-5"
              style={{ backgroundColor: S.card, borderLeftColor: S.info }}
            >
              <p
                className="mb-1 text-xs font-bold uppercase tracking-widest"
                style={{ color: S.textMuted }}
              >
                Nivel Plata
              </p>
              <p className="text-2xl font-black" style={{ color: S.textStrong }}>
                {clientesQuery.data?.filter(
                  (c) => c.puntosFidelidad >= 200 && c.puntosFidelidad < 800,
                ).length ?? 0}
              </p>
            </div>
          </div>
        )}

        {/* Barra de búsqueda */}
        <div
          className="flex items-center gap-3 rounded-xl border px-4 transition-colors"
          style={{ backgroundColor: S.card, borderColor: S.border }}
        >
          <span className="material-symbols-outlined" style={{ color: S.textMuted, fontSize: 20 }}>
            search
          </span>
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="min-h-11 flex-1 bg-transparent py-3 text-sm font-medium focus:outline-none"
            style={{ color: S.textStrong }}
            placeholder="Buscar por nombre, apellido o documento..."
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda('')}
              className="transition-colors"
              style={{ color: S.textMuted }}
              aria-label="Limpiar búsqueda"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                close
              </span>
            </button>
          )}
        </div>

        {/* Tabla */}
        <div
          className="overflow-x-auto rounded-2xl border shadow-sm"
          style={{ borderColor: S.border, backgroundColor: S.card }}
        >
          {clientesQuery.isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : clientes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <span className="material-symbols-outlined text-5xl" style={{ color: S.border }}>
                person_search
              </span>
              <p className="text-sm font-bold" style={{ color: S.textMuted }}>
                No se encontraron clientes
              </p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr
                  className="text-xs font-bold uppercase tracking-widest"
                  style={{ backgroundColor: S.surface, color: S.textMuted }}
                >
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Documento</th>
                  <th className="px-6 py-4">Contacto</th>
                  <th className="px-6 py-4 text-right">Puntos</th>
                  <th className="px-6 py-4 text-center">Nivel</th>
                  <th className="px-6 py-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {clientes.map((cliente, i) => {
                  const nivel = nivelCliente(cliente.puntosFidelidad);
                  return (
                    <tr
                      key={cliente.id}
                      style={{
                        borderBottom: `1px solid ${S.border}`,
                        backgroundColor: i % 2 === 0 ? S.card : S.panel,
                      }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm text-white"
                            style={{ backgroundColor: S.primary }}
                          >
                            {cliente.nombre[0]}
                            {cliente.apellido[0]}
                          </div>
                          <div>
                            <p className="font-bold" style={{ color: S.textStrong }}>
                              {cliente.nombre} {cliente.apellido}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4" style={{ color: S.textMuted }}>
                        {cliente.tipoDocumento} {cliente.documento}
                      </td>
                      <td className="px-6 py-4">
                        <p style={{ color: S.textMuted }}>{cliente.email ?? '—'}</p>
                        <p className="text-xs" style={{ color: S.textMuted }}>
                          {cliente.telefono ?? ''}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right font-black" style={{ color: S.primary }}>
                        {cliente.puntosFidelidad.toLocaleString('es-CO')}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className="px-3 py-1 rounded-full text-xs font-black"
                          style={{ backgroundColor: nivel.bg, color: nivel.color }}
                        >
                          {nivel.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => setClienteEdit(cliente)}
                          className="min-h-11 min-w-11 rounded-lg p-2 transition-colors"
                          style={{ color: S.textMuted }}
                          aria-label="Editar cliente"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                            edit
                          </span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
