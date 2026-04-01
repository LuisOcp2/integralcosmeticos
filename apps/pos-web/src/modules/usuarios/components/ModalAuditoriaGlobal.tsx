import { useMemo, useState } from 'react';
import type { Usuario } from '../api/usuarios.api';
import { useAuditoriaUsuario } from '../hooks/useUsuarios';
import { ListaAuditoria } from './ListaAuditoria';

interface Props {
  usuarios: Usuario[];
  onClose: () => void;
}

export const ModalAuditoriaGlobal = ({ usuarios, onClose }: Props) => {
  const [usuarioId, setUsuarioId] = useState(usuarios[0]?.id ?? '');
  const [page, setPage] = useState(1);

  const usuarioActivo = useMemo(
    () => usuarios.find((u) => u.id === usuarioId),
    [usuarios, usuarioId],
  );
  const { data, isLoading } = useAuditoriaUsuario(usuarioId, page);

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-black/50 p-6">
      <div className="mx-auto max-w-4xl rounded-2xl border border-outline-variant bg-background p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold">Auditoria de usuarios</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto]">
          <select
            className="rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm"
            value={usuarioId}
            onChange={(e) => {
              setUsuarioId(e.target.value);
              setPage(1);
            }}
          >
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre} {u.apellido} - {u.email}
              </option>
            ))}
          </select>
          <button
            className="rounded-xl bg-surface-3 px-3 py-2 text-sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </button>
          <button
            className="rounded-xl bg-surface-3 px-3 py-2 text-sm"
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente
          </button>
        </div>

        {usuarioActivo ? (
          <p className="mb-3 text-sm text-on-surface-variant">
            Mostrando eventos de:{' '}
            <strong>
              {usuarioActivo.nombre} {usuarioActivo.apellido}
            </strong>
          </p>
        ) : null}

        {isLoading ? (
          <p className="text-sm text-on-surface-variant">Cargando auditoria...</p>
        ) : (
          <ListaAuditoria eventos={data?.data ?? []} />
        )}
      </div>
    </div>
  );
};
