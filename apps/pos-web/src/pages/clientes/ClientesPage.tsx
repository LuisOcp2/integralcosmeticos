import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import SearchBar from '@/components/SearchBar';

type Cliente = {
  id: string;
  nombre: string;
  apellido?: string | null;
  numeroDocumento: string;
  tipoDocumento: string;
  telefono?: string | null;
  celular?: string | null;
  email?: string | null;
  ciudad?: string | null;
  puntos: number;
  activo: boolean;
};

type ClientesResponse = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  items: Cliente[];
};

export default function ClientesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [clientes, setClientes] = useState<Cliente[]>([]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['clientes', searchTerm],
    queryFn: async () => {
      const params = searchTerm.trim() ? { q: searchTerm.trim() } : undefined;
      const response = await apiClient.get<ClientesResponse>('/clientes', { params });
      return response.data;
    },
  });

  useEffect(() => {
    setClientes(data?.items ?? []);
  }, [data]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-on-background">Clientes</h1>
            <p className="text-sm text-on-surface-variant">
              Consulta y busqueda de clientes registrados.
            </p>
          </div>
        </div>

        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Buscar por nombre, documento, telefono o email..."
        />

        {isLoading ? (
          <div className="text-sm text-on-surface-variant">Cargando clientes...</div>
        ) : null}
        {isError ? (
          <div className="rounded-lg border border-error/40 bg-error/10 p-3 text-sm text-error">
            No se pudieron cargar los clientes.
          </div>
        ) : null}

        <div className="overflow-x-auto rounded-xl border border-outline-variant bg-surface">
          <table className="min-w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-on-surface-variant">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Documento</th>
                <th className="px-4 py-3">Contacto</th>
                <th className="px-4 py-3">Ciudad</th>
                <th className="px-4 py-3">Puntos</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((cliente) => (
                <tr key={cliente.id} className="border-t border-outline-variant">
                  <td className="px-4 py-3 text-on-background">
                    {cliente.nombre} {cliente.apellido ?? ''}
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">
                    {cliente.tipoDocumento} {cliente.numeroDocumento}
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">
                    {cliente.telefono || cliente.celular || cliente.email || '-'}
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">{cliente.ciudad || '-'}</td>
                  <td className="px-4 py-3 font-semibold text-on-background">{cliente.puntos}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        cliente.activo ? 'bg-success/15 text-success' : 'bg-error/15 text-error'
                      }`}
                    >
                      {cliente.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                </tr>
              ))}
              {clientes.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-on-surface-variant">
                    No hay clientes para mostrar.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
