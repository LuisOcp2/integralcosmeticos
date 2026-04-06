import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/api';
import type { CajaSesion, VentaCaja } from '@/types';

const fechaHoy = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export function useCajaActiva(sedeId: string) {
  return useQuery<CajaSesion | null>({
    queryKey: ['caja', 'activa', sedeId],
    queryFn: async () => {
      const res = await apiClient.get<CajaSesion | null>(`/caja/activa/${sedeId}`);
      return res.data;
    },
    enabled: Boolean(sedeId),
  });
}

export function useHistorialCaja(sedeId: string) {
  return useQuery<CajaSesion[]>({
    queryKey: ['caja', 'historial', sedeId],
    queryFn: async () => {
      const res = await apiClient.get<CajaSesion[]>(`/caja/historial/${sedeId}`);
      return res.data;
    },
    enabled: Boolean(sedeId),
  });
}

export function useVentasDiaCaja(sedeId: string, enabled: boolean) {
  return useQuery<VentaCaja[]>({
    queryKey: ['caja', 'ventas-dia', sedeId, fechaHoy()],
    queryFn: async () => {
      const res = await apiClient.get<VentaCaja[]>('/ventas', {
        params: { sedeId, fecha: fechaHoy() },
      });
      return res.data;
    },
    enabled: Boolean(sedeId) && enabled,
    refetchInterval: 20_000,
  });
}

export function useAbrirCaja(sedeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (montoInicial: number) => {
      const res = await apiClient.post<CajaSesion>('/caja/abrir', { montoApertura: montoInicial });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Caja abierta correctamente');
      void queryClient.invalidateQueries({ queryKey: ['caja', 'activa', sedeId] });
      void queryClient.invalidateQueries({ queryKey: ['caja', 'historial', sedeId] });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
          ?.message ?? 'No se pudo abrir la caja';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    },
  });
}

type CerrarCajaPayload = {
  montoCierre: number;
  cajaId?: string;
};

export function useCerrarCaja(sedeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ montoCierre, cajaId }: CerrarCajaPayload) => {
      if (cajaId) {
        try {
          const byId = await apiClient.post<CajaSesion>(`/caja/${cajaId}/cerrar`, { montoCierre });
          return byId.data;
        } catch {
          const bySede = await apiClient.post<CajaSesion>('/caja/cierre', { sedeId, montoCierre });
          return bySede.data;
        }
      }

      const bySede = await apiClient.post<CajaSesion>('/caja/cierre', { sedeId, montoCierre });
      return bySede.data;
    },
    onSuccess: () => {
      toast.success('Caja cerrada correctamente');
      void queryClient.invalidateQueries({ queryKey: ['caja', 'activa', sedeId] });
      void queryClient.invalidateQueries({ queryKey: ['caja', 'historial', sedeId] });
      void queryClient.invalidateQueries({ queryKey: ['caja', 'ventas-dia', sedeId] });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
          ?.message ?? 'No se pudo cerrar la caja';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    },
  });
}
