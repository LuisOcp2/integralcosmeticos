import { useEffect, useState } from 'react';
import { Permiso } from '@cosmeticos/shared-types';
import type { Usuario } from '../api/usuarios.api';
import { usePermisosUsuario, useSetPermisos } from '../hooks/useUsuarios';
import { MatrizPermisos } from './MatrizPermisos';

interface Props {
  usuario: Usuario;
  onClose: () => void;
}

export const ModalGestionarPermisos = ({ usuario, onClose }: Props) => {
  const { data } = usePermisosUsuario(usuario.id);
  const setPermisos = useSetPermisos(usuario.id);
  const [motivo, setMotivo] = useState('');
  const [permisosExtra, setPermisosExtra] = useState<string[]>(data?.permisosExtra ?? []);
  const [permisosRevocados, setPermisosRevocados] = useState<string[]>(
    data?.permisosRevocados ?? [],
  );

  useEffect(() => {
    if (data) {
      setPermisosExtra(data.permisosExtra ?? []);
      setPermisosRevocados(data.permisosRevocados ?? []);
    }
  }, [data]);

  const toggle = (list: string[], value: string, setter: (v: string[]) => void) => {
    if (list.includes(value)) {
      setter(list.filter((p) => p !== value));
      return;
    }
    setter([...list, value]);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-outline-variant bg-surface p-5">
        <h3 className="text-lg font-bold">Permisos de {usuario.nombre}</h3>
        <div className="mt-3 rounded-xl bg-surface-2 p-3 text-sm text-on-surface-variant">
          Actuales: {(data?.permisosEfectivos ?? []).length} permisos efectivos
        </div>
        <div className="mt-4 rounded-xl border border-outline-variant p-2">
          <MatrizPermisos />
        </div>
        <div className="mt-4 grid max-h-[35vh] grid-cols-1 gap-2 overflow-auto md:grid-cols-2">
          {Object.values(Permiso).map((p) => (
            <div key={p} className="rounded-xl border border-outline-variant p-2 text-sm">
              <p className="font-medium">{p}</p>
              <div className="mt-2 flex gap-2">
                <button
                  className={`rounded-lg px-2 py-1 text-xs ${permisosExtra.includes(p) ? 'bg-primary text-on-primary' : 'bg-surface-3'}`}
                  onClick={() => toggle(permisosExtra, p, setPermisosExtra)}
                >
                  Extra
                </button>
                <button
                  className={`rounded-lg px-2 py-1 text-xs ${permisosRevocados.includes(p) ? 'bg-error text-white' : 'bg-surface-3'}`}
                  onClick={() => toggle(permisosRevocados, p, setPermisosRevocados)}
                >
                  Revocar
                </button>
              </div>
            </div>
          ))}
        </div>
        <textarea
          className="mt-3 w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm"
          placeholder="Motivo"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
        <div className="mt-4 flex gap-2">
          <button className="flex-1 rounded-xl bg-surface-3 px-3 py-2" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="flex-1 rounded-xl bg-primary px-3 py-2 text-on-primary"
            onClick={() =>
              setPermisos.mutate(
                { permisosExtra, permisosRevocados, motivo },
                {
                  onSuccess: onClose,
                },
              )
            }
            disabled={setPermisos.isPending}
          >
            {setPermisos.isPending ? 'Guardando...' : 'Guardar permisos'}
          </button>
        </div>
      </div>
    </div>
  );
};
