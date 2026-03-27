import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ICliente } from '@cosmeticos/shared-types';
import api from '../lib/api';
import AppLayout from './components/AppLayout';

const cop = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

async function getClientes(): Promise<ICliente[]> {
  const { data } = await api.get('/clientes');
  return data;
}

async function getClientePorDocumento(documento: string): Promise<ICliente | null> {
  if (!documento.trim()) return null;
  try {
    const { data } = await api.get(`/clientes/documento/${documento.trim()}`);
    return data;
  } catch { return null; }
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-surface-container ${className ?? ''}`} />;
}

const nivelCliente = (puntos: number) => {
  if (puntos < 200) return { label: 'BRONCE', bg: '#fff8e1', color: '#e65100' };
  if (puntos < 800) return { label: 'PLATA', bg: '#f5f5f5', color: '#546e7a' };
  return { label: 'ORO', bg: '#fffde7', color: '#f9a825' };
};

type FormState = {
  nombre: string; apellido: string; documento: string;
  tipoDocumento: string; email: string; telefono: string;
};

const emptyForm: FormState = { nombre: '', apellido: '', documento: '', tipoDocumento: 'CC', email: '', telefono: '' };

function ClienteModal({ cliente, onClose, onSaved }: {
  cliente?: ICliente | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(cliente ? {
    nombre: cliente.nombre, apellido: cliente.apellido,
    documento: cliente.documento, tipoDocumento: cliente.tipoDocumento,
    email: cliente.email ?? '', telefono: cliente.telefono ?? '',
  } : emptyForm);

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

  const f = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(46,27,12,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-5 flex items-center justify-between" style={{ backgroundColor: '#2a1709' }}>
          <div>
            <h3 className="text-xl font-black text-white">{cliente ? 'Editar cliente' : 'Nuevo cliente'}</h3>
            <p className="text-sm mt-0.5" style={{ color: '#fba9e5' }}>Datos de contacto y documento</p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {(['nombre', 'apellido'] as const).map((field) => (
              <div key={field}>
                <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-1">{field}</label>
                <input value={form[field]} onChange={f(field)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm border-2 border-outline-variant/30 bg-surface-container-lowest focus:border-primary focus:outline-none"
                  placeholder={field === 'nombre' ? 'María' : 'González'} />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-1">Tipo doc.</label>
              <select value={form.tipoDocumento} onChange={f('tipoDocumento')}
                className="w-full rounded-xl px-3 py-2.5 text-sm border-2 border-outline-variant/30 bg-surface-container-lowest focus:border-primary focus:outline-none">
                {['CC', 'CE', 'NIT', 'PP'].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-1">Documento</label>
              <input value={form.documento} onChange={f('documento')}
                className="w-full rounded-xl px-3 py-2.5 text-sm border-2 border-outline-variant/30 bg-surface-container-lowest focus:border-primary focus:outline-none"
                placeholder="1032456789" />
            </div>
          </div>
          {(['email', 'telefono'] as const).map((field) => (
            <div key={field}>
              <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-1">{field}</label>
              <input value={form[field]} onChange={f(field)} type={field === 'email' ? 'email' : 'tel'}
                className="w-full rounded-xl px-3 py-2.5 text-sm border-2 border-outline-variant/30 bg-surface-container-lowest focus:border-primary focus:outline-none"
                placeholder={field === 'email' ? 'maria@gmail.com' : '300 123 4567'} />
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose}
              className="flex-1 py-3 rounded-xl font-bold text-sm border-2 border-outline-variant text-secondary hover:bg-surface-container transition-all">
              Cancelar
            </button>
            <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
              className="flex-1 py-3 rounded-xl font-black text-sm text-white disabled:opacity-60 transition-all"
              style={{ backgroundColor: '#2a1709' }}>
              {saveMutation.isPending ? 'Guardando...' : (cliente ? 'Guardar cambios' : 'Crear cliente')}
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

  const clientesQuery = useQuery({ queryKey: ['clientes'], queryFn: getClientes, refetchInterval: 60000 });

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
        (c) => c.nombre.toLowerCase().includes(q) || c.apellido.toLowerCase().includes(q) || c.documento.includes(q)
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
          onClose={() => { setModalOpen(false); setClienteEdit(null); }}
          onSaved={handleSaved}
        />
      )}

      <div className="space-y-8">
        {/* Header */}
        <header className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-extrabold text-on-secondary-fixed tracking-tight">Clientes</h1>
            <p className="text-secondary font-medium mt-1">Gestión de clientes y programa de fidelidad</p>
          </div>
          <button onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-black text-sm text-white uppercase tracking-widest transition-all"
            style={{ backgroundColor: '#2a1709' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person_add</span>
            Nuevo cliente
          </button>
        </header>

        {/* KPI rápido */}
        {!clientesQuery.isLoading && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-surface-container-low p-5 rounded-2xl border-l-4 border-primary">
              <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">Total clientes</p>
              <p className="text-2xl font-black text-on-secondary-fixed">{clientesQuery.data?.length ?? 0}</p>
            </div>
            <div className="bg-surface-container-low p-5 rounded-2xl border-l-4" style={{ borderColor: '#f9a825' }}>
              <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">Nivel Oro</p>
              <p className="text-2xl font-black text-on-secondary-fixed">{clientesQuery.data?.filter((c) => c.puntosFidelidad >= 800).length ?? 0}</p>
            </div>
            <div className="bg-surface-container-low p-5 rounded-2xl border-l-4 border-secondary">
              <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">Nivel Plata</p>
              <p className="text-2xl font-black text-on-secondary-fixed">{clientesQuery.data?.filter((c) => c.puntosFidelidad >= 200 && c.puntosFidelidad < 800).length ?? 0}</p>
            </div>
          </div>
        )}

        {/* Barra de búsqueda */}
        <div className="flex items-center bg-surface-container-lowest border-2 border-outline-variant/30 rounded-xl px-4 gap-3 focus-within:border-primary transition-colors">
          <span className="material-symbols-outlined text-secondary" style={{ fontSize: 20 }}>search</span>
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
            className="flex-1 bg-transparent py-3 text-sm font-medium text-on-surface placeholder-secondary/50 focus:outline-none"
            placeholder="Buscar por nombre, apellido o documento..." />
          {busqueda && (
            <button onClick={() => setBusqueda('')} className="text-secondary hover:text-on-surface transition-colors">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
            </button>
          )}
        </div>

        {/* Tabla */}
        <div className="overflow-hidden rounded-2xl shadow-sm border border-outline-variant/10">
          {clientesQuery.isLoading ? (
            <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : clientes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <span className="material-symbols-outlined text-5xl text-outline">person_search</span>
              <p className="text-sm font-bold text-secondary">No se encontraron clientes</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-highest text-on-surface-variant font-bold text-xs uppercase tracking-widest">
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
                    <tr key={cliente.id} className={`border-b border-outline-variant/5 ${i % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low'}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm text-white" style={{ backgroundColor: '#85264b' }}>
                            {cliente.nombre[0]}{cliente.apellido[0]}
                          </div>
                          <div>
                            <p className="font-bold text-on-surface">{cliente.nombre} {cliente.apellido}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-secondary">{cliente.tipoDocumento} {cliente.documento}</td>
                      <td className="px-6 py-4">
                        <p className="text-secondary">{cliente.email ?? '—'}</p>
                        <p className="text-secondary text-xs">{cliente.telefono ?? ''}</p>
                      </td>
                      <td className="px-6 py-4 text-right font-black text-primary">{cliente.puntosFidelidad.toLocaleString('es-CO')}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-3 py-1 rounded-full text-xs font-black" style={{ backgroundColor: nivel.bg, color: nivel.color }}>
                          {nivel.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button onClick={() => setClienteEdit(cliente)}
                          className="p-2 rounded-lg hover:bg-surface-container transition-colors text-secondary hover:text-primary">
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>
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
