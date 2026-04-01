import { useState } from 'react';
import type { Usuario } from '../api/usuarios.api';
import { useResetPasswordAdmin } from '../hooks/useUsuarios';

interface Props {
  usuario: Usuario;
  onClose: () => void;
}

export const ModalResetPassword = ({ usuario, onClose }: Props) => {
  const mutation = useResetPasswordAdmin(usuario.id);
  const [passwordNuevo, setPasswordNuevo] = useState('');
  const [motivo, setMotivo] = useState('');
  const [forzarCambio, setForzarCambio] = useState(true);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-outline-variant bg-surface p-5">
        <h3 className="text-lg font-bold">Reset password</h3>
        <p className="mt-1 text-sm text-on-surface-variant">Usuario: {usuario.email}</p>
        <input
          className="mt-4 w-full rounded-xl border border-outline-variant px-3 py-2"
          type="password"
          placeholder="Nueva contrasena temporal"
          value={passwordNuevo}
          onChange={(e) => setPasswordNuevo(e.target.value)}
        />
        <p className="mt-1 text-xs text-on-surface-variant">
          Minimo 8 caracteres, 1 mayuscula, 1 numero y 1 caracter especial.
        </p>
        <textarea
          className="mt-2 w-full rounded-xl border border-outline-variant px-3 py-2"
          placeholder="Motivo"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={forzarCambio}
            onChange={(e) => setForzarCambio(e.target.checked)}
          />
          Forzar cambio en siguiente login
        </label>

        <div className="mt-4 flex gap-2">
          <button className="flex-1 rounded-xl bg-surface-3 px-3 py-2" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="flex-1 rounded-xl bg-primary px-3 py-2 text-on-primary"
            onClick={() =>
              mutation.mutate(
                { passwordNuevo, motivo, forzarCambio },
                {
                  onSuccess: onClose,
                },
              )
            }
            disabled={mutation.isPending || !passwordNuevo}
          >
            {mutation.isPending ? 'Procesando...' : 'Restablecer'}
          </button>
        </div>
      </div>
    </div>
  );
};
