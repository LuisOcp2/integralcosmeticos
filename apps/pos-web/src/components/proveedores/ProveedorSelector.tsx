import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

type Proveedor = {
  id: string;
  nombre: string;
  nit: string;
  activo?: boolean;
};

type ProveedoresResponse = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  items: Proveedor[];
};

interface ProveedorSelectorProps {
  onProveedorSelected: (_proveedorId: string) => void;
  selectedProveedorId?: string;
  disabled?: boolean;
}

export default function ProveedorSelector({
  onProveedorSelected,
  selectedProveedorId,
  disabled = false,
}: ProveedorSelectorProps) {
  const [proveedorId, setProveedorId] = useState<string | null>(selectedProveedorId || null);
  const {
    data: proveedores = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['proveedores'],
    queryFn: async () => {
      const response = await apiClient.get<ProveedoresResponse>('/proveedores');
      return response.data.items;
    },
  });

  const proveedoresActivos = proveedores.filter((proveedor) => proveedor.activo !== false);

  useEffect(() => {
    if (selectedProveedorId !== undefined) {
      setProveedorId(selectedProveedorId);
    }
  }, [selectedProveedorId]);

  if (isLoading) return <div className="flex h-full items-center justify-center">Cargando...</div>;
  if (error) return <div className="text-red-500">Error al cargar proveedores</div>;

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-on-surface-variant mb-2">Proveedor</label>
      <select
        value={proveedorId || ''}
        onChange={(e) => {
          const id = e.target.value;
          if (id) {
            setProveedorId(id);
            onProveedorSelected(id);
          }
        }}
        disabled={disabled || proveedoresActivos.length === 0}
        className={`w-full px-4 py-2 bg-surface-2 border border-outline-variant rounded-lg text-on-background placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary ${
          disabled || proveedoresActivos.length === 0 ? 'opacity-50' : ''
        }`}
      >
        <option value="">Seleccionar proveedor...</option>
        {proveedoresActivos.map((proveedor) => (
          <option key={proveedor.id} value={proveedor.id}>
            {proveedor.nombre} ({proveedor.nit})
          </option>
        ))}
      </select>
    </div>
  );
}
