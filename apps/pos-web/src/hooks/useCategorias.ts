import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { Categoria } from '@/types';

export function useCategorias() {
  return useQuery<Categoria[]>({
    queryKey: ['categorias'],
    queryFn: async () => {
      const res = await apiClient.get<Categoria[]>('/catalogo/categorias');
      return res.data;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes – categories rarely change
  });
}
