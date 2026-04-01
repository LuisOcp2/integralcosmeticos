import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import ProveedorSelector from '@/components/proveedores/ProveedorSelector';

interface OrdenCompraFormModalProps {
  orden: {
    id: number;
    numeroOrden: string;
    proveedorId: number;
    total: number;
    estado: string;
    fechaEntregaEsperada: string | null;
  } | null;
  onClose: () => void;
  onSave: () => void;
}

export default function OrdenCompraFormModal({
  orden,
  onClose,
  onSave,
}: OrdenCompraFormModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    numeroOrden: orden?.numeroOrden || '',
    proveedorId: orden?.proveedorId ?? undefined,
    total: orden?.total ? orden.total.toString() : '',
    estado: orden?.estado || 'pendiente',
    fechaEntregaEsperada: orden?.fechaEntregaEsperada || '',
  });

  const { mutate: updateOrden, isIdle: isUpdateIdle } = useMutation({
    mutationFn: (data: any) => apiClient.put(`/orden-compras/${orden?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordenes-compra'] });
      onClose();
      onSave();
    },
  });

  const { mutate: createOrden, isIdle: isCreateIdle } = useMutation({
    mutationFn: (data: any) => apiClient.post('/orden-compras', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordenes-compra'] });
      onClose();
      onSave();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...formData,
      total: parseFloat(formData.total),
      fechaEntregaEsperada: formData.fechaEntregaEsperada
        ? new Date(formData.fechaEntregaEsperada).toISOString()
        : null,
    };
    if (orden?.id) {
      updateOrden(data);
    } else {
      createOrden(data);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold text-on-background">
            {orden ? 'Editar Orden de Compra' : 'Nueva Orden de Compra'}
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
            <label className="block text-sm font-medium text-on-surface-variant mb-1">
              Número de Orden
            </label>
            <input
              type="text"
              value={formData.numeroOrden}
              onChange={(e) => setFormData({ ...formData, numeroOrden: e.target.value })}
              className="w-full px-4 py-2 bg-surface-2 border border-outline-variant rounded-lg text-on-background placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">
              Proveedor
            </label>
            <ProveedorSelector
              selectedProveedorId={formData.proveedorId}
              onProveedorSelected={(id) => setFormData({ ...formData, proveedorId: id })}
              disabled={!!orden?.id} // Disable changing proveedor when editing
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Total</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.total}
              onChange={(e) => setFormData({ ...formData, total: e.target.value })}
              className="w-full px-4 py-2 bg-surface-2 border border-outline-variant rounded-lg text-on-background placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Estado</label>
            <select
              value={formData.estado}
              onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
              className="w-full px-4 py-2 bg-surface-2 border border-outline-variant rounded-lg text-on-background placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="pendiente">Pendiente</option>
              <option value="aprobada">Aprobada</option>
              <option value="recibida">Recibida</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">
              Fecha de Entrega Esperada
            </label>
            <input
              type="date"
              value={formData.fechaEntregaEsperada}
              onChange={(e) => setFormData({ ...formData, fechaEntregaEsperada: e.target.value })}
              className="w-full px-4 py-2 bg-surface-2 border border-outline-variant rounded-lg text-on-background placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
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
