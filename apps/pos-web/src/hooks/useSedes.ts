import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { Sede } from '@/types';

export function useSedes() {
  return useQuery<Sede[]>({
    queryKey: ['sedes'],
    queryFn: async () => {
      const res = await apiClient.get<Sede[]>('/sedes');
      return res.data;
    },
    staleTime: 1000 * 60 * 30,
  });
}
