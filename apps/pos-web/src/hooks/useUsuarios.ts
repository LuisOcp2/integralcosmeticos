import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { UsuariosPaginados } from '@/types';

interface UsuariosParams {
  q?: string;
  rol?: string;
  activo?: boolean;
  page?: number;
  limit?: number;
}

export function useUsuarios(params: UsuariosParams) {
  return useQuery<UsuariosPaginados>({
    queryKey: ['usuarios', params],
    queryFn: async () => {
      const res = await apiClient.get<UsuariosPaginados>('/usuarios', { params });
      return res.data;
    },
  });
}

export function useToggleUsuarioEstado() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }) => {
      await apiClient.patch(`/usuarios/${id}/estado`, { activo });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
  });
}

export function useCreateUsuarioAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      nombre: string;
      apellido: string;
      email: string;
      rol: string;
      sedeId?: string;
      telefono?: string;
      temporaryPassword?: string;
    }) => {
      const res = await apiClient.post('/usuarios/admin-create', payload);
      return res.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
  });
}
