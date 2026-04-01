import type { Usuario } from '../api/usuarios.api';
import { BadgeRol } from './BadgeRol';
import { BadgeEstado } from './BadgeEstado';

interface Props {
  usuario: Usuario;
}

export const TarjetaUsuario = ({ usuario }: Props) => (
  <div className="rounded-2xl border border-outline-variant bg-surface p-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="text-lg font-bold text-on-background">
          {usuario.nombre} {usuario.apellido}
        </h3>
        <p className="text-sm text-on-surface-variant">{usuario.email}</p>
      </div>
      <BadgeRol rol={usuario.rol} />
    </div>
    <div className="mt-3">
      <BadgeEstado activo={usuario.activo} bloqueadoHasta={usuario.bloqueadoHasta} />
    </div>
  </div>
);
