import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import SearchBar from '@/components/SearchBar';
import ProveedorFormModal from '@/components/proveedores/ProveedorFormModal';

interface Proveedor {
  id: number;
  razonSocial: string;
  numeroDocumentoLegal: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

export default function ProveedoresPage() {
  const queryClient = useQueryClient();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [editingProveedor, setEditingProveedor] = useState<Proveedor | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['proveedores', searchTerm],
    queryFn: async () => {
      const params = searchTerm ? { search: searchTerm } : {};
      const response = await apiClient.get('/proveedores', { params });
      return response.data;
    },
  });

  useEffect(() => {
    if (data) {
      setProveedores(data);
    }
  }, [data]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const handleDelete = async (id: number) => {
    try {
      await apiClient.delete(`/proveedores/${id}`);
      queryClient.invalidateQueries({ queryKey: ['proveedores'] });
    } catch (err) {
      console.error('Error deleting supplier:', err);
    }
  };

  const handleEdit = (proveedor: Proveedor) => {
    setEditingProveedor(proveedor);
  };

  const handleCreate = () => {
    setEditingProveedor(null);
  };

  if (isLoading) return <div className="flex h-full items-center justify-center">Cargando...</div>;
  if (error) return <div className="text-red-500">Error al cargar proveedores</div>;

  return (
    <div className="p-6 bg-background min-h-screen">
      <div className="flex justify-between items-start mb-6">
        <h1 className="text-2xl font-bold text-on-background">Gestión de Proveedores</h1>
        <button
          onClick={handleCreate}
          className="bg-primary text-on-primary px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
        >
          Nuevo Proveedor
        </button>
      </div>

      <SearchBar value={searchTerm} onChange={handleSearch} placeholder="Buscar proveedores..." />

      {editingProveedor && (
        <ProveedorFormModal
          proveedor={editingProveedor}
          onClose={() => setEditingProveedor(null)}
          onSave={() => {
            setEditingProveedor(null);
            queryClient.invalidateQueries({ queryKey: ['proveedores'] });
          }}
        />
      )}

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full bg-surface rounded-xl overflow-hidden shadow-sm">
          <thead className="bg-surface-variant">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                Nombre
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                Documento Legal
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                Teléfono
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-variant">
            {proveedores.map((proveedor) => (
              <tr key={proveedor.id} className="hover:bg-surface-2 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-on-background">
                  {proveedor.razonSocial}
                </td>
                <td className="px-6 py-4 text-sm text-on-surface-variant">
                  {proveedor.numeroDocumentoLegal || '-'}
                </td>
                <td className="px-6 py-4 text-sm text-on-surface-variant">
                  {proveedor.telefono || '-'}
                </td>
                <td className="px-6 py-4 text-sm text-on-surface-variant">
                  {proveedor.email || '-'}
                </td>
                <td className="px-6 py-4 text-sm">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      proveedor.activo ? 'bg-success/20 text-success' : 'bg-error/20 text-error'
                    }`}
                  >
                    {proveedor.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-medium text-on-surface-variant space-x-2">
                  <button
                    onClick={() => handleEdit(proveedor)}
                    className="bg-primary/20 text-primary hover:bg-primary/30 rounded-lg p-2 transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(proveedor.id)}
                    className="bg-error/20 text-error hover:bg-error/30 rounded-lg p-2 transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 01-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 002 0V8a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
