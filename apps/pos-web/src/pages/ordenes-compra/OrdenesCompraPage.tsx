import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import SearchBar from '@/components/SearchBar';
import OrdenCompraFormModal from '@/components/ordenes-compra/OrdenCompraFormModal';

interface OrdenCompra {
  id: string;
  numero: string;
  proveedorId: string;
  proveedor: {
    id: string;
    nombre: string;
    nit: string;
  };
  total: number;
  estado: string;
  fechaEsperada: string | null;
  createdAt: string;
  updatedAt: string;
}

type OrdenesCompraResponse = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  items: OrdenCompra[];
};

export default function OrdenesCompraPage() {
  const queryClient = useQueryClient();
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([]);
  const [editingOrden, setEditingOrden] = useState<OrdenCompra | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['ordenes-compra', searchTerm],
    queryFn: async () => {
      const params = searchTerm ? { q: searchTerm } : {};
      const response = await apiClient.get<OrdenesCompraResponse>('/ordenes-compra', { params });
      return response.data;
    },
  });

  useEffect(() => {
    if (data) {
      setOrdenes(data.items ?? []);
    }
  }, [data]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/ordenes-compra/${id}`);
      queryClient.invalidateQueries({ queryKey: ['ordenes-compra'] });
    } catch (err) {
      console.error('Error deleting purchase order:', err);
    }
  };

  const handleEdit = (orden: OrdenCompra) => {
    setEditingOrden({
      ...orden,
      proveedorId: orden.proveedor.id,
    });
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingOrden(null);
    setIsModalOpen(true);
  };

  if (isLoading) return <div className="flex h-full items-center justify-center">Cargando...</div>;
  if (error) return <div className="text-red-500">Error al cargar órdenes de compra</div>;

  return (
    <div className="p-6 bg-background min-h-screen">
      <div className="flex justify-between items-start mb-6">
        <h1 className="text-2xl font-bold text-on-background">Gestión de Órdenes de Compra</h1>
        <button
          onClick={handleCreate}
          className="bg-primary text-on-primary px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
        >
          Nueva Orden de Compra
        </button>
      </div>

      <SearchBar
        value={searchTerm}
        onChange={handleSearch}
        placeholder="Buscar órdenes de compra..."
      />

      {isModalOpen && (
        <OrdenCompraFormModal
          orden={editingOrden}
          onClose={() => {
            setEditingOrden(null);
            setIsModalOpen(false);
          }}
          onSave={() => {
            setEditingOrden(null);
            setIsModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['ordenes-compra'] });
          }}
        />
      )}

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full bg-surface rounded-xl overflow-hidden shadow-sm">
          <thead className="bg-surface-variant">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                Número de Orden
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                Proveedor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                Fecha Esperada
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-variant">
            {ordenes.map((orden) => (
              <tr key={orden.id} className="hover:bg-surface-2 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-on-background">{orden.numero}</td>
                <td className="px-6 py-4 text-sm text-on-surface-variant">
                  {orden.proveedor.nombre}
                  {orden.proveedor.nit && (
                    <span className="ml-2 text-xs text-on-surface-variant/70 bg-surface-2 px-2 py-0.5 rounded">
                      ({orden.proveedor.nit})
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-on-surface-variant">
                  ${orden.total.toFixed(2)}
                </td>
                <td className="px-6 py-4 text-sm">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      orden.estado === 'pendiente'
                        ? 'bg-warning/20 text-warning'
                        : orden.estado === 'aprobada'
                          ? 'bg-primary/20 text-primary'
                          : orden.estado === 'recibida'
                            ? 'bg-success/20 text-success'
                            : 'bg-error/20 text-error'
                    }`}
                  >
                    {orden.estado.charAt(0).toUpperCase() + orden.estado.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-on-surface-variant">
                  {orden.fechaEsperada ? new Date(orden.fechaEsperada).toLocaleDateString() : '-'}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-on-surface-variant space-x-2">
                  <button
                    onClick={() => handleEdit(orden)}
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
                    onClick={() => handleDelete(orden.id)}
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
                  <a
                    href={`/ordenes-compra/${orden.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-success/20 text-success hover:bg-success/30 rounded-lg p-2 transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M4 2a2 2 0 00-2 2v1a2 2 0 002 2h1a2 2 0 012 2v2.414l3.293 3.293a2 2 0 002.828 0l1.414-1.414A2 2 0 0112 10.414V10a2 2 0 012-2v-1a2 2 0 012-2h2a2 2 0 002-2V4a2 2 0 00-2-2h-3.293l-.707-.707A2 2 0 0012 1.293l-.707.707H9a2 2 0 00-2 2H4zm2 4a2 2 0 01-2 2v1a2 2 0 00-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h2a2 2 0 002 2zm4 0a2 2 0 01-2 2v1a2 2 0 00-2 2h-2a2 2 0 01-2-2v-1a2 2 0 002-2h1a2 2 0 012 2zm4 0a2 2 0 01-2 2v1a2 2 0 00-2 2h-2a2 2 0 01-2-2v-1a2 2 0 002-2h1a2 2 0 012 2z" />
                    </svg>
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
