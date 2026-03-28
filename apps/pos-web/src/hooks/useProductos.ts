import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { ProductosPaginados } from '@/types';

interface ProductosParams {
  q?: string;
  categoriaId?: string | null;
  page?: number;
  limit?: number;
}

export function useProductos({ q = '', categoriaId, page = 1, limit = 24 }: ProductosParams) {
  return useQuery<ProductosPaginados>({
    queryKey: ['productos', q, categoriaId, page, limit],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit };
      if (q) params.q = q;
      if (categoriaId) params.categoriaId = categoriaId;
      const res = await apiClient.get<ProductosPaginados>('/productos', { params });
      return res.data;
    },
    placeholderData: (prev) => prev,
  });
}
