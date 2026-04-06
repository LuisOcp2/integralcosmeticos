import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

interface ProveedorFormModalProps {
  proveedor: {
    id: string;
    nombre: string;
    nit: string;
    telefono: string | null;
    email: string | null;
    direccion: string | null;
    activo: boolean;
  } | null;
  onClose: () => void;
  onSave: () => void;
}

export default function ProveedorFormModal({
  proveedor,
  onClose,
  onSave,
}: ProveedorFormModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    nombre: proveedor?.nombre || '',
    nit: proveedor?.nit || '',
    telefono: proveedor?.telefono || '',
    email: proveedor?.email || '',
    direccion: proveedor?.direccion || '',
    activo: proveedor?.activo ?? true,
  });

  const { mutate: updateProveedor, isIdle: isUpdateIdle } = useMutation({
    mutationFn: (data: any) => apiClient.put(`/proveedores/${proveedor?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proveedores'] });
      onClose();
      onSave();
    },
  });

  const { mutate: createProveedor, isIdle: isCreateIdle } = useMutation({
    mutationFn: (data: any) => apiClient.post('/proveedores', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proveedores'] });
      onClose();
      onSave();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (proveedor?.id) {
      updateProveedor(formData);
    } else {
      createProveedor(formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold text-on-background">
            {proveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}
          </h2>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-background">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Nombre</label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              className="w-full px-4 py-2 bg-surface-2 border border-outline-variant rounded-lg text-on-background placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">NIT</label>
            <input
              type="text"
              value={formData.nit}
              onChange={(e) => setFormData({ ...formData, nit: e.target.value })}
              className="w-full px-4 py-2 bg-surface-2 border border-outline-variant rounded-lg text-on-background placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">
              Teléfono
            </label>
            <input
              type="tel"
              value={formData.telefono}
              onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              className="w-full px-4 py-2 bg-surface-2 border border-outline-variant rounded-lg text-on-background placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 bg-surface-2 border border-outline-variant rounded-lg text-on-background placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">
              Dirección
            </label>
            <input
              type="text"
              value={formData.direccion}
              onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
              className="w-full px-4 py-2 bg-surface-2 border border-outline-variant rounded-lg text-on-background placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={formData.activo}
              onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
              className="h-4 w-4 text-primary focus:ring-primary border-outline-variant rounded"
            />
            <label className="text-sm text-on-surface-variant">Activo</label>
          </div>

          <button
            type="submit"
            disabled={!isUpdateIdle && !isCreateIdle}
            className="w-full bg-primary text-on-primary px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {!isUpdateIdle && !isCreateIdle ? 'Guardando...' : 'Guardar'}
          </button>
        </form>
      </div>
    </div>
  );
}
