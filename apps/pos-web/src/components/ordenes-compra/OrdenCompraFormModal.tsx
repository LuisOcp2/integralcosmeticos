import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import ProveedorSelector from '@/components/proveedores/ProveedorSelector';

interface OrdenCompraFormModalProps {
  orden: {
    id: string;
    numero: string;
    proveedorId: string;
    total: number;
    estado: string;
    fechaEsperada: string | null;
  } | null;
  onClose: () => void;
  onSave: () => void;
}

type VarianteOption = {
  id: string;
  nombre: string;
  sku: string;
  codigoBarras?: string | null;
  precioVenta?: number | null;
  precio?: number | null;
  producto?: {
    nombre: string;
  };
};

type DetalleDraft = {
  varianteId: string;
  varianteLabel: string;
  cantidadPedida: number;
  precioUnitario: number;
};

const DEFAULT_SEDE_ID = (() => {
  const envSede = import.meta.env.VITE_DEFAULT_SEDE_ID;
  if (envSede) {
    return envSede;
  }
  try {
    const raw = localStorage.getItem('pos_user');
    if (!raw) {
      return '';
    }
    const parsed = JSON.parse(raw) as { sedeId?: string };
    return parsed.sedeId ?? '';
  } catch {
    return '';
  }
})();

const formatCOP = (v: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(v);

export default function OrdenCompraFormModal({
  orden,
  onClose,
  onSave,
}: OrdenCompraFormModalProps) {
  const isEditing = Boolean(orden?.id);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    proveedorId: orden?.proveedorId ?? undefined,
    sedeId: DEFAULT_SEDE_ID,
    notas: '',
    fechaEsperada: orden?.fechaEsperada ? orden.fechaEsperada.slice(0, 10) : '',
    detalles: [] as DetalleDraft[],
  });
  const [varianteSearch, setVarianteSearch] = useState('');
  const [selectedVarianteId, setSelectedVarianteId] = useState('');
  const [cantidadDraft, setCantidadDraft] = useState('1');
  const [precioDraft, setPrecioDraft] = useState('0');

  const variantesQuery = useQuery({
    queryKey: ['variantes-picker', varianteSearch],
    enabled: !isEditing,
    queryFn: async () => {
      const params = varianteSearch.trim() ? { q: varianteSearch.trim() } : undefined;
      const response = await apiClient.get<VarianteOption[]>('/variantes', { params });
      return response.data;
    },
  });

  const varianteSeleccionada = useMemo(
    () => (variantesQuery.data ?? []).find((item) => item.id === selectedVarianteId),
    [variantesQuery.data, selectedVarianteId],
  );

  const totalDraft = useMemo(
    () =>
      formData.detalles.reduce(
        (acc, item) => acc + item.cantidadPedida * Number(item.precioUnitario || 0),
        0,
      ),
    [formData.detalles],
  );

  const { mutate: updateOrden, isIdle: isUpdateIdle } = useMutation({
    mutationFn: (data: { proveedorId?: string; fechaEsperada?: string }) =>
      apiClient.put(`/ordenes-compra/${orden?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordenes-compra'] });
      onClose();
      onSave();
    },
  });

  const { mutate: createOrden, isIdle: isCreateIdle } = useMutation({
    mutationFn: (data: {
      proveedorId: string;
      sedeId: string;
      notas?: string;
      fechaEsperada?: string;
      detalles: Array<{
        varianteId: string;
        cantidadPedida: number;
        precioUnitario: number;
      }>;
    }) => apiClient.post('/ordenes-compra', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordenes-compra'] });
      onClose();
      onSave();
    },
  });

  const addDetalle = () => {
    if (!varianteSeleccionada) {
      return;
    }

    const cantidadPedida = Number(cantidadDraft);
    const precioUnitario = Number(precioDraft);
    if (!Number.isFinite(cantidadPedida) || cantidadPedida <= 0) {
      return;
    }
    if (!Number.isFinite(precioUnitario) || precioUnitario < 0) {
      return;
    }

    if (formData.detalles.some((item) => item.varianteId === varianteSeleccionada.id)) {
      return;
    }

    const label = `${varianteSeleccionada.producto?.nombre ?? 'Producto'} - ${varianteSeleccionada.nombre}`;

    setFormData((prev) => ({
      ...prev,
      detalles: [
        ...prev.detalles,
        {
          varianteId: varianteSeleccionada.id,
          varianteLabel: label,
          cantidadPedida,
          precioUnitario,
        },
      ],
    }));

    setSelectedVarianteId('');
    setCantidadDraft('1');
    setPrecioDraft('0');
  };

  const removeDetalle = (varianteId: string) => {
    setFormData((prev) => ({
      ...prev,
      detalles: prev.detalles.filter((item) => item.varianteId !== varianteId),
    }));
  };

  const updateDetalleCantidad = (varianteId: string, cantidadPedida: number) => {
    setFormData((prev) => ({
      ...prev,
      detalles: prev.detalles.map((item) =>
        item.varianteId === varianteId
          ? { ...item, cantidadPedida: Math.max(1, cantidadPedida) }
          : item,
      ),
    }));
  };

  const updateDetallePrecio = (varianteId: string, precioUnitario: number) => {
    setFormData((prev) => ({
      ...prev,
      detalles: prev.detalles.map((item) =>
        item.varianteId === varianteId
          ? { ...item, precioUnitario: Math.max(0, precioUnitario) }
          : item,
      ),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditing) {
      const data = {
        proveedorId: formData.proveedorId,
        fechaEsperada: formData.fechaEsperada
          ? new Date(formData.fechaEsperada).toISOString()
          : undefined,
      };
      updateOrden(data);
    } else {
      if (!formData.proveedorId) {
        return;
      }
      if (formData.detalles.length === 0) {
        return;
      }
      const data = {
        proveedorId: formData.proveedorId,
        sedeId: formData.sedeId,
        notas: formData.notas || undefined,
        fechaEsperada: formData.fechaEsperada
          ? new Date(formData.fechaEsperada).toISOString()
          : undefined,
        detalles: formData.detalles.map((item) => ({
          varianteId: item.varianteId,
          cantidadPedida: item.cantidadPedida,
          precioUnitario: item.precioUnitario,
        })),
      };
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
              value={orden?.numero ?? 'Se genera automaticamente al guardar'}
              className="w-full px-4 py-2 bg-surface-2 border border-outline-variant rounded-lg text-on-background placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              disabled
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
              value={isEditing ? (orden?.total?.toString() ?? '0') : totalDraft.toString()}
              className="w-full px-4 py-2 bg-surface-2 border border-outline-variant rounded-lg text-on-background placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              disabled
            />
            {!isEditing ? (
              <p className="mt-1 text-xs text-on-surface-variant">
                Total calculado: {formatCOP(totalDraft)}
              </p>
            ) : null}
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Estado</label>
            <select
              value={orden?.estado ?? 'BORRADOR'}
              className="w-full px-4 py-2 bg-surface-2 border border-outline-variant rounded-lg text-on-background placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              disabled
            >
              <option value="BORRADOR">Borrador</option>
              <option value="ENVIADA">Enviada</option>
              <option value="RECIBIDA_PARCIAL">Recibida parcial</option>
              <option value="RECIBIDA_TOTAL">Recibida total</option>
              <option value="CANCELADA">Cancelada</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">
              Fecha de Entrega Esperada
            </label>
            <input
              type="date"
              value={formData.fechaEsperada}
              onChange={(e) => setFormData({ ...formData, fechaEsperada: e.target.value })}
              className="w-full px-4 py-2 bg-surface-2 border border-outline-variant rounded-lg text-on-background placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          {!isEditing ? (
            <div className="rounded-xl border border-outline-variant bg-surface-2 p-3 space-y-3">
              <h3 className="text-sm font-semibold text-on-background">Detalles de orden</h3>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-on-surface-variant">
                  Buscar variante
                </label>
                <input
                  type="text"
                  value={varianteSearch}
                  onChange={(e) => setVarianteSearch(e.target.value)}
                  placeholder="Nombre, SKU o codigo de barras"
                  className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-sm text-on-background"
                />

                <select
                  value={selectedVarianteId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedVarianteId(id);
                    const item = (variantesQuery.data ?? []).find((opt) => opt.id === id);
                    if (item) {
                      const precioSugerido = Number(item.precioVenta ?? item.precio ?? 0);
                      setPrecioDraft(precioSugerido.toString());
                    }
                  }}
                  className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-sm text-on-background"
                >
                  <option value="">Seleccionar variante...</option>
                  {(variantesQuery.data ?? []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {(item.producto?.nombre ?? 'Producto') + ' - ' + item.nombre} | {item.sku}
                    </option>
                  ))}
                </select>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min={1}
                    value={cantidadDraft}
                    onChange={(e) => setCantidadDraft(e.target.value)}
                    placeholder="Cantidad"
                    className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-sm text-on-background"
                  />
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={precioDraft}
                    onChange={(e) => setPrecioDraft(e.target.value)}
                    placeholder="Precio unitario"
                    className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-sm text-on-background"
                  />
                </div>

                <button
                  type="button"
                  onClick={addDetalle}
                  disabled={!selectedVarianteId || variantesQuery.isFetching}
                  className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-on-primary disabled:opacity-50"
                >
                  Agregar detalle
                </button>
              </div>

              {formData.detalles.length > 0 ? (
                <div className="space-y-2 max-h-56 overflow-auto">
                  {formData.detalles.map((item) => (
                    <div
                      key={item.varianteId}
                      className="rounded-lg border border-outline-variant bg-surface p-2 space-y-2"
                    >
                      <p className="text-xs font-medium text-on-background">{item.varianteLabel}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          min={1}
                          value={item.cantidadPedida}
                          onChange={(e) =>
                            updateDetalleCantidad(item.varianteId, Number(e.target.value || 1))
                          }
                          className="w-full px-2 py-1.5 bg-surface-2 border border-outline-variant rounded text-xs text-on-background"
                        />
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.precioUnitario}
                          onChange={(e) =>
                            updateDetallePrecio(item.varianteId, Number(e.target.value || 0))
                          }
                          className="w-full px-2 py-1.5 bg-surface-2 border border-outline-variant rounded text-xs text-on-background"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-on-surface-variant">
                          Subtotal: {formatCOP(item.cantidadPedida * item.precioUnitario)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeDetalle(item.varianteId)}
                          className="text-xs text-error hover:underline"
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-on-surface-variant">
                  Agrega al menos un detalle para crear la orden.
                </p>
              )}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={
              (!isUpdateIdle && !isCreateIdle) ||
              (!isEditing && (!formData.proveedorId || formData.detalles.length === 0))
            }
            className="w-full bg-primary text-on-primary px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {!isUpdateIdle && !isCreateIdle ? 'Guardando...' : 'Guardar'}
          </button>
        </form>
      </div>
    </div>
  );
}
