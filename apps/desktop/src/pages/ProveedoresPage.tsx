import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2, X, Truck } from 'lucide-react';
import AppLayout from './components/AppLayout';
import api from '../lib/api';
import { tokens } from '../styles/tokens';

type Proveedor = {
  id: string;
  nombre: string;
  nit: string;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  contactoNombre: string | null;
  ciudad: string | null;
  notas: string | null;
  activo: boolean;
  diasCredito: number;
  limiteCredito: number;
  createdAt: string;
  updatedAt: string;
};

type ProveedoresResponse = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  items: Proveedor[];
};

type ProveedorForm = {
  nombre: string;
  nit: string;
  telefono: string;
  email: string;
  direccion: string;
  contactoNombre: string;
  ciudad: string;
  notas: string;
  diasCredito: string;
  limiteCredito: string;
  activo: boolean;
};

const EMPTY_FORM: ProveedorForm = {
  nombre: '',
  nit: '',
  telefono: '',
  email: '',
  direccion: '',
  contactoNombre: '',
  ciudad: '',
  notas: '',
  diasCredito: '0',
  limiteCredito: '0',
  activo: true,
};

function buildForm(p?: Proveedor | null): ProveedorForm {
  if (!p) return { ...EMPTY_FORM };
  return {
    nombre: p.nombre,
    nit: p.nit,
    telefono: p.telefono ?? '',
    email: p.email ?? '',
    direccion: p.direccion ?? '',
    contactoNombre: p.contactoNombre ?? '',
    ciudad: p.ciudad ?? '',
    notas: p.notas ?? '',
    diasCredito: String(Number(p.diasCredito ?? 0)),
    limiteCredito: String(Number(p.limiteCredito ?? 0)),
    activo: p.activo,
  };
}

async function getProveedores(q: string): Promise<ProveedoresResponse> {
  const params = q.trim() ? { q: q.trim() } : undefined;
  const { data } = await api.get('/proveedores', { params });
  return data;
}

function ProveedorModal({
  proveedor,
  onClose,
  onSaved,
}: {
  proveedor: Proveedor | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<ProveedorForm>(() => buildForm(proveedor));
  const [error, setError] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.nombre.trim() || !form.nit.trim()) {
        throw new Error('Nombre y NIT son obligatorios.');
      }

      const payload = {
        nombre: form.nombre.trim(),
        nit: form.nit.trim(),
        telefono: form.telefono.trim() || undefined,
        email: form.email.trim() || undefined,
        direccion: form.direccion.trim() || undefined,
        contactoNombre: form.contactoNombre.trim() || undefined,
        ciudad: form.ciudad.trim() || undefined,
        notas: form.notas.trim() || undefined,
        diasCredito: Number(form.diasCredito || 0),
        limiteCredito: Number(form.limiteCredito || 0),
        activo: form.activo,
      };

      if (proveedor) {
        await api.put(`/proveedores/${proveedor.id}`, payload);
      } else {
        await api.post('/proveedores', payload);
      }
    },
    onSuccess: onSaved,
    onError: (e: any) => {
      const backend = Array.isArray(e?.response?.data?.message)
        ? e.response.data.message.join('. ')
        : e?.response?.data?.message;
      setError(backend || e?.message || 'No se pudo guardar el proveedor.');
    },
  });

  const onField =
    <K extends keyof ProveedorForm>(key: K) =>
    (value: ProveedorForm[K]) =>
      setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4"
      style={{ background: 'rgba(46,27,12,0.48)' }}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl"
        style={{ backgroundColor: tokens.color.bgCard }}
      >
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ backgroundColor: tokens.color.bgDark }}
        >
          <div>
            <h3 className="text-xl font-black text-white">
              {proveedor ? 'Editar proveedor' : 'Nuevo proveedor'}
            </h3>
            <p className="text-sm" style={{ color: tokens.color.accentSoft }}>
              Datos legales y comerciales del proveedor
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-white/80 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
          <label className="md:col-span-2">
            <span
              className="mb-1 block text-xs font-bold uppercase tracking-wider"
              style={{ color: tokens.color.textMuted }}
            >
              Nombre
            </span>
            <input
              value={form.nombre}
              onChange={(e) => onField('nombre')(e.target.value)}
              className="w-full rounded-xl border px-3 py-2.5"
              style={{ borderColor: tokens.color.border }}
            />
          </label>
          <label>
            <span
              className="mb-1 block text-xs font-bold uppercase tracking-wider"
              style={{ color: tokens.color.textMuted }}
            >
              NIT
            </span>
            <input
              value={form.nit}
              onChange={(e) => onField('nit')(e.target.value)}
              className="w-full rounded-xl border px-3 py-2.5"
              style={{ borderColor: tokens.color.border }}
            />
          </label>
          <label>
            <span
              className="mb-1 block text-xs font-bold uppercase tracking-wider"
              style={{ color: tokens.color.textMuted }}
            >
              Contacto
            </span>
            <input
              value={form.contactoNombre}
              onChange={(e) => onField('contactoNombre')(e.target.value)}
              className="w-full rounded-xl border px-3 py-2.5"
              style={{ borderColor: tokens.color.border }}
            />
          </label>
          <label>
            <span
              className="mb-1 block text-xs font-bold uppercase tracking-wider"
              style={{ color: tokens.color.textMuted }}
            >
              Telefono
            </span>
            <input
              value={form.telefono}
              onChange={(e) => onField('telefono')(e.target.value)}
              className="w-full rounded-xl border px-3 py-2.5"
              style={{ borderColor: tokens.color.border }}
            />
          </label>
          <label>
            <span
              className="mb-1 block text-xs font-bold uppercase tracking-wider"
              style={{ color: tokens.color.textMuted }}
            >
              Email
            </span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => onField('email')(e.target.value)}
              className="w-full rounded-xl border px-3 py-2.5"
              style={{ borderColor: tokens.color.border }}
            />
          </label>
          <label>
            <span
              className="mb-1 block text-xs font-bold uppercase tracking-wider"
              style={{ color: tokens.color.textMuted }}
            >
              Ciudad
            </span>
            <input
              value={form.ciudad}
              onChange={(e) => onField('ciudad')(e.target.value)}
              className="w-full rounded-xl border px-3 py-2.5"
              style={{ borderColor: tokens.color.border }}
            />
          </label>
          <label className="md:col-span-2">
            <span
              className="mb-1 block text-xs font-bold uppercase tracking-wider"
              style={{ color: tokens.color.textMuted }}
            >
              Direccion
            </span>
            <input
              value={form.direccion}
              onChange={(e) => onField('direccion')(e.target.value)}
              className="w-full rounded-xl border px-3 py-2.5"
              style={{ borderColor: tokens.color.border }}
            />
          </label>
          <label>
            <span
              className="mb-1 block text-xs font-bold uppercase tracking-wider"
              style={{ color: tokens.color.textMuted }}
            >
              Dias credito
            </span>
            <input
              type="number"
              min={0}
              value={form.diasCredito}
              onChange={(e) => onField('diasCredito')(e.target.value)}
              className="w-full rounded-xl border px-3 py-2.5"
              style={{ borderColor: tokens.color.border }}
            />
          </label>
          <label>
            <span
              className="mb-1 block text-xs font-bold uppercase tracking-wider"
              style={{ color: tokens.color.textMuted }}
            >
              Limite credito
            </span>
            <input
              type="number"
              min={0}
              value={form.limiteCredito}
              onChange={(e) => onField('limiteCredito')(e.target.value)}
              className="w-full rounded-xl border px-3 py-2.5"
              style={{ borderColor: tokens.color.border }}
            />
          </label>
          <label className="md:col-span-2">
            <span
              className="mb-1 block text-xs font-bold uppercase tracking-wider"
              style={{ color: tokens.color.textMuted }}
            >
              Notas
            </span>
            <textarea
              value={form.notas}
              onChange={(e) => onField('notas')(e.target.value)}
              rows={3}
              className="w-full rounded-xl border px-3 py-2.5"
              style={{ borderColor: tokens.color.border }}
            />
          </label>
          <label
            className="inline-flex items-center gap-2 text-sm font-semibold"
            style={{ color: tokens.color.textStrong }}
          >
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(e) => onField('activo')(e.target.checked)}
            />
            Proveedor activo
          </label>
        </div>

        {error && (
          <p className="px-6 pb-2 text-sm font-semibold" style={{ color: tokens.color.danger }}>
            {error}
          </p>
        )}

        <div className="flex gap-3 px-6 pb-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border py-3 font-bold"
            style={{ borderColor: tokens.color.border, color: tokens.color.textMuted }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="flex-1 rounded-xl py-3 font-black text-white disabled:opacity-70"
            style={{ backgroundColor: tokens.color.bgDark }}
          >
            {saveMutation.isPending ? 'Guardando...' : 'Guardar proveedor'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProveedoresPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Proveedor | null>(null);

  const proveedoresQuery = useQuery({
    queryKey: ['proveedores', search],
    queryFn: () => getProveedores(search),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/proveedores/${id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['proveedores'] });
    },
  });

  const proveedores = proveedoresQuery.data?.items ?? [];
  const activos = useMemo(() => proveedores.filter((p) => p.activo).length, [proveedores]);

  return (
    <AppLayout>
      {(showModal || editing) && (
        <ProveedorModal
          proveedor={editing}
          onClose={() => {
            setShowModal(false);
            setEditing(null);
          }}
          onSaved={() => {
            setShowModal(false);
            setEditing(null);
            void queryClient.invalidateQueries({ queryKey: ['proveedores'] });
          }}
        />
      )}

      <div className="space-y-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-on-secondary-fixed">
              Proveedores
            </h1>
            <p className="mt-1 font-medium text-secondary">
              Gestión de aliados comerciales y compras
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-black uppercase tracking-wider text-white"
            style={{ backgroundColor: tokens.color.bgDark }}
          >
            <Plus size={18} /> Nuevo proveedor
          </button>
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border-l-4 border-primary bg-surface-container-low p-5">
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-secondary">
              Total proveedores
            </p>
            <p className="text-2xl font-black text-on-secondary-fixed">{proveedores.length}</p>
          </div>
          <div
            className="rounded-2xl border-l-4 p-5"
            style={{ backgroundColor: tokens.color.successBg, borderColor: tokens.color.success }}
          >
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-secondary">
              Activos
            </p>
            <p className="text-2xl font-black" style={{ color: tokens.color.success }}>
              {activos}
            </p>
          </div>
          <div className="rounded-2xl border-l-4 border-secondary bg-surface-container-low p-5">
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-secondary">
              Inactivos
            </p>
            <p className="text-2xl font-black text-on-secondary-fixed">
              {proveedores.length - activos}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-outline-variant/20 bg-white p-4">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, NIT, email o ciudad"
              className="w-full rounded-xl border py-2.5 pl-10 pr-3"
              style={{ borderColor: tokens.color.border }}
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-outline-variant/10 shadow-sm">
          {proveedoresQuery.isLoading ? (
            <div className="grid grid-cols-1 gap-3 p-6">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-surface-container" />
              ))}
            </div>
          ) : !proveedores.length ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <Truck size={48} className="text-outline" />
              <p className="text-sm font-bold text-secondary">No hay proveedores para mostrar</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-surface-container-highest text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  <th className="px-6 py-4">Proveedor</th>
                  <th className="px-6 py-4">Contacto</th>
                  <th className="px-6 py-4">Condiciones</th>
                  <th className="px-6 py-4 text-center">Estado</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {proveedores.map((proveedor, index) => (
                  <tr
                    key={proveedor.id}
                    className={`border-b border-outline-variant/10 ${index % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low'}`}
                  >
                    <td className="px-6 py-4">
                      <p className="font-bold text-on-surface">{proveedor.nombre}</p>
                      <p className="text-xs text-secondary">NIT: {proveedor.nit}</p>
                    </td>
                    <td className="px-6 py-4 text-secondary">
                      <p>{proveedor.contactoNombre || '-'}</p>
                      <p>{proveedor.telefono || '-'}</p>
                      <p>{proveedor.email || '-'}</p>
                    </td>
                    <td className="px-6 py-4 text-secondary">
                      <p>Dias credito: {proveedor.diasCredito}</p>
                      <p>Limite: ${Number(proveedor.limiteCredito ?? 0).toLocaleString('es-CO')}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className="rounded-full px-3 py-1 text-xs font-bold"
                        style={
                          proveedor.activo
                            ? {
                                backgroundColor: tokens.color.successBg,
                                color: tokens.color.success,
                              }
                            : { backgroundColor: '#fde7e9', color: tokens.color.danger }
                        }
                      >
                        {proveedor.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          title="Editar"
                          className="rounded-lg p-2 hover:bg-surface-container"
                          onClick={() => setEditing(proveedor)}
                        >
                          <Pencil size={18} style={{ color: tokens.color.textMuted }} />
                        </button>
                        <button
                          type="button"
                          title="Desactivar"
                          className="rounded-lg p-2 hover:bg-surface-container"
                          disabled={removeMutation.isPending}
                          onClick={() => removeMutation.mutate(proveedor.id)}
                        >
                          <Trash2 size={18} style={{ color: tokens.color.danger }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
