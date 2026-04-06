import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { ProductosPaginados } from '@/types';

type ProductosResponse = ProductosPaginados | ProductosPaginados['data'];

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
      const res = await apiClient.get<ProductosResponse>('/productos', { params });
      if (Array.isArray(res.data)) {
        return {
          data: res.data,
          meta: {
            total: res.data.length,
            page,
            limit,
            totalPages: Math.max(1, Math.ceil(res.data.length / limit)),
          },
        };
      }

      return res.data;
    },
    placeholderData: (prev) => prev,
  });
}
