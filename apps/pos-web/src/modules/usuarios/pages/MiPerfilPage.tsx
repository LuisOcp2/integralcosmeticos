import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCambiarPasswordPropia } from '../hooks/useUsuarios';
import toast from 'react-hot-toast';

export const MiPerfilPage = () => {
  const { user } = useAuth();
  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNuevo, setPasswordNuevo] = useState('');
  const cambiarPassword = useCambiarPasswordPropia(user?.id ?? '');

  if (!user) {
    return <div className="p-6">No autenticado</div>;
  }

  return (
    <div className="max-w-2xl space-y-4 p-6">
      <div className="rounded-2xl border border-outline-variant bg-surface p-4">
        <h1 className="text-xl font-bold">Mi perfil</h1>
        <p className="mt-2 text-sm text-on-surface-variant">{user.email}</p>
        <p className="text-sm text-on-surface-variant">Rol: {user.rol}</p>
      </div>

      <div className="rounded-2xl border border-outline-variant bg-surface p-4">
        <h2 className="text-lg font-semibold">Cambiar contrasena</h2>
        <div className="mt-3 space-y-2">
          <input
            type="password"
            className="w-full rounded-xl border border-outline-variant px-3 py-2"
            placeholder="Contrasena actual"
            value={passwordActual}
            onChange={(e) => setPasswordActual(e.target.value)}
          />
          <input
            type="password"
            className="w-full rounded-xl border border-outline-variant px-3 py-2"
            placeholder="Nueva contrasena"
            value={passwordNuevo}
            onChange={(e) => setPasswordNuevo(e.target.value)}
          />
          <button
            className="rounded-xl bg-primary px-4 py-2 text-on-primary"
            onClick={async () => {
              try {
                await cambiarPassword.mutateAsync({ passwordActual, passwordNuevo });
                setPasswordActual('');
                setPasswordNuevo('');
              } catch (e: any) {
                toast.error(e.response?.data?.message ?? 'Error al cambiar contrasena');
              }
            }}
            disabled={cambiarPassword.isPending}
          >
            {cambiarPassword.isPending ? 'Actualizando...' : 'Actualizar contrasena'}
          </button>
        </div>
      </div>
    </div>
  );
};
