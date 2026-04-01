import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

interface ProveedorSelectorProps {
  onProveedorSelected: (proveedorId: number) => void;
  selectedProveedorId?: number;
  disabled?: boolean;
}

export default function ProveedorSelector({
  onProveedorSelected,
  selectedProveedorId,
  disabled = false,
}: ProveedorSelectorProps) {
  const [proveedorId, setProveedorId] = useState(selectedProveedorId || null);
  const {
    data: proveedores = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['proveedores'],
    queryFn: async () => {
      const response = await apiClient.get('/proveedores');
      return response.data;
    },
  });

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
          const id = parseInt(e.target.value);
          if (!isNaN(id)) {
            setProveedorId(id);
            onProveedorSelected(id);
          }
        }}
        disabled={disabled || proveedores.length === 0}
        className={`w-full px-4 py-2 bg-surface-2 border border-outline-variant rounded-lg text-on-background placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary ${
          disabled || proveedores.length === 0 ? 'opacity-50' : ''
        }`}
      >
        <option value="">Seleccionar proveedor...</option>
        {proveedores.map((proveedor: any) => (
          <option key={proveedor.id} value={proveedor.id}>
            {proveedor.razonSocial}
            {proveedor.numeroDocumentoLegal && (
              <span className="text-xs text-on-surface-variant/70 ml-2">
                ({proveedor.numeroDocumentoLegal})
              </span>
            )}
          </option>
        ))}
      </select>
    </div>
  );
}
