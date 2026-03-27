import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ICliente } from '@cosmeticos/shared-types';
import api from '../lib/api';
import AppLayout from './components/AppLayout';

async function getClientes(): Promise<ICliente[]> {
  const { data } = await api.get('/clientes');
  return data;
}

async function getClientePorDocumento(documento: string): Promise<ICliente | null> {
  if (!documento.trim()) {
    return null;
  }
  try {
    const { data } = await api.get(`/clientes/documento/${documento.trim()}`);
    return data;
  } catch {
    return null;
  }
}

export default function ClientesPage() {
  const [documento, setDocumento] = useState('');

  const clientesQuery = useQuery({
    queryKey: ['clientes'],
    queryFn: getClientes,
  });

  const clienteDocQuery = useQuery({
    queryKey: ['clientes', 'documento', documento],
    queryFn: () => getClientePorDocumento(documento),
    enabled: documento.trim().length >= 5,
  });

  const clientes = useMemo(() => {
    if (clienteDocQuery.data) {
      return [clienteDocQuery.data];
    }
    return clientesQuery.data ?? [];
  }, [clienteDocQuery.data, clientesQuery.data]);

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="rounded-xl border border-rose-100 bg-white p-4 shadow-sm">
          <h1 className="text-2xl font-semibold text-rose-900">Clientes</h1>
          <p className="text-sm text-rose-700/70">Busqueda por documento y listado activo.</p>
        </div>

        <div className="rounded-xl border border-rose-100 bg-white p-4 shadow-sm">
          <label className="mb-2 block text-sm text-rose-800">Buscar por documento</label>
          <input
            value={documento}
            onChange={(e) => setDocumento(e.target.value)}
            className="w-full rounded-lg border border-rose-200 px-3 py-2 focus:border-rose-400 focus:outline-none"
            placeholder="Ej: 1032456789"
          />
        </div>

        <div className="overflow-hidden rounded-xl border border-rose-100 bg-white shadow-sm">
          {clientesQuery.isLoading ? (
            <p className="p-4 text-rose-700/70">Cargando clientes...</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-rose-50 text-rose-800">
                <tr>
                  <th className="px-4 py-3 text-left">Nombre</th>
                  <th className="px-4 py-3 text-left">Documento</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Telefono</th>
                  <th className="px-4 py-3 text-left">Puntos</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((cliente) => (
                  <tr key={cliente.id} className="border-t border-rose-100">
                    <td className="px-4 py-3">
                      {cliente.nombre} {cliente.apellido}
                    </td>
                    <td className="px-4 py-3">
                      {cliente.tipoDocumento} {cliente.documento}
                    </td>
                    <td className="px-4 py-3">{cliente.email ?? '-'}</td>
                    <td className="px-4 py-3">{cliente.telefono ?? '-'}</td>
                    <td className="px-4 py-3">{cliente.puntosFidelidad}</td>
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
