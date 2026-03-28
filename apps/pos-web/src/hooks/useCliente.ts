import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { Cliente } from '@/types';

export function useCliente(documento: string) {
  return useQuery<Cliente | null>({
    queryKey: ['cliente', documento],
    queryFn: async () => {
      if (!documento || documento.length < 4) return null;
      try {
        const res = await apiClient.get<Cliente>(`/clientes/buscar?doc=${encodeURIComponent(documento)}`);
        return res.data;
      } catch {
        return null;
      }
    },
    enabled: documento.length >= 4,
    retry: false,
  });
}
