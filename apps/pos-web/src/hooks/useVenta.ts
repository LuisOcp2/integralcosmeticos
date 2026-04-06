import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/api';
import type { CreateVentaPayload, VentaCreada } from '@/types';

export function useVenta() {
  const [ultimaVentaId, setUltimaVentaId] = useState<string | null>(null);

  const { mutateAsync: cobrar, isPending: cobrando } = useMutation({
    mutationFn: async (payload: CreateVentaPayload) => {
      const res = await apiClient.post<VentaCreada>('/ventas', payload);
      return res.data;
    },
    onSuccess: (data) => {
      setUltimaVentaId(data.id);
      toast.success(`Venta #${data.id.substring(0, 8)} registrada con éxito`);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Error al registrar la venta';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    },
  });

  const imprimirTicket = useCallback(async (ventaId: string) => {
    try {
      const res = await apiClient.get<Blob>(`/ventas/${ventaId}/ticket`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ticket-${ventaId}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('No se pudo generar el ticket TXT');
    }
  }, []);

  return { cobrar, cobrando, ultimaVentaId, imprimirTicket };
}
