import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { usuariosApi, type FiltrosUsuario, type UpdateUsuarioInput } from '../api/usuarios.api';

export const useUsuarios = (filtros?: FiltrosUsuario) =>
  useQuery({
    queryKey: ['usuarios', filtros],
    queryFn: () => usuariosApi.getAll(filtros),
    staleTime: 30_000,
  });

export const useUsuario = (id: string) =>
  useQuery({
    queryKey: ['usuario', id],
    queryFn: () => usuariosApi.getOne(id),
    enabled: !!id,
  });

export const useEstadisticasUsuarios = () =>
  useQuery({
    queryKey: ['usuarios-estadisticas'],
    queryFn: usuariosApi.getEstadisticas,
    staleTime: 60_000,
  });

export const useAuditoriaUsuario = (id: string, page = 1) =>
  useQuery({
    queryKey: ['auditoria-usuario', id, page],
    queryFn: () => usuariosApi.getAuditoria(id, page),
    enabled: !!id,
  });

export const usePermisosUsuario = (id: string) =>
  useQuery({
    queryKey: ['permisos-usuario', id],
    queryFn: () => usuariosApi.getPermisos(id),
    enabled: !!id,
  });

export const useCrearUsuario = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: usuariosApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success('Usuario creado exitosamente');
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Error al crear usuario'),
  });
};

export const useActualizarUsuario = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateUsuarioInput) => usuariosApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] });
      qc.invalidateQueries({ queryKey: ['usuario', id] });
      toast.success('Usuario actualizado');
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Error al actualizar'),
  });
};

export const useDesactivarUsuario = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: usuariosApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success('Usuario desactivado');
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Error'),
  });
};

export const useActivarUsuario = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: usuariosApi.activar,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success('Usuario activado');
    },
  });
};

export const useBloquearUsuario = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, minutos }: { id: string; minutos: number }) =>
      usuariosApi.bloquear(id, minutos),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success('Usuario bloqueado');
    },
  });
};

export const useDesbloquearUsuario = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: usuariosApi.desbloquear,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success('Usuario desbloqueado');
    },
  });
};

export const useResetPasswordAdmin = (id: string) =>
  useMutation({
    mutationFn: (data: any) => usuariosApi.resetPasswordAdmin(id, data),
    onSuccess: () => toast.success('Contrasena restablecida'),
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Error'),
  });

export const useCambiarPasswordPropia = (id: string) =>
  useMutation({
    mutationFn: (data: { passwordActual: string; passwordNuevo: string }) =>
      usuariosApi.cambiarPassword(id, data),
    onSuccess: () => toast.success('Contrasena actualizada'),
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Error al cambiar contrasena'),
  });

export const useSetPermisos = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => usuariosApi.setPermisos(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['permisos-usuario', id] });
      toast.success('Permisos actualizados');
    },
  });
};
