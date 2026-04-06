import { Phone, MapPin, Calendar, Clock, ShieldAlert } from 'lucide-react';
import type { Usuario } from '../api/usuarios.api';
import { BadgeRol } from './BadgeRol';
import { BadgeEstado } from './BadgeEstado';

interface Props {
  usuario: Usuario;
  sedeNombre?: string | null;
}

const fmt = (d: string) =>
  new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });

export const TarjetaUsuario = ({ usuario, sedeNombre }: Props) => {
  const isBloqueado = Boolean(
    usuario.bloqueadoHasta && new Date(usuario.bloqueadoHasta) > new Date(),
  );

  const initials = `${usuario.nombre[0] ?? ''}${usuario.apellido[0] ?? ''}`.toUpperCase();

  return (
    <div className="rounded-2xl border border-outline-variant bg-surface p-5">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-xl font-bold text-primary">
          {initials}
        </div>

        {/* Info principal */}
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-on-background">
              {usuario.nombre} {usuario.apellido}
            </h3>
            <BadgeRol rol={usuario.rol} />
            <BadgeEstado activo={usuario.activo} bloqueadoHasta={usuario.bloqueadoHasta} />
          </div>
          <p className="mt-0.5 text-sm text-on-surface-variant">{usuario.email}</p>

          {usuario.forzarCambioPassword && (
            <p className="mt-1 flex items-center gap-1 text-xs font-medium text-warning">
              <ShieldAlert size={12} /> Debe cambiar su contraseña en el próximo login
            </p>
          )}
        </div>
      </div>

      {/* Detalles secundarios */}
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
        {usuario.telefono && (
          <div className="flex items-center gap-1.5 text-on-surface-variant">
            <Phone size={12} />
            {usuario.telefono}
          </div>
        )}
        {usuario.sedeId && (
          <div className="flex items-center gap-1.5 text-on-surface-variant">
            <MapPin size={12} />
            {sedeNombre ?? 'Sede asignada'}
          </div>
        )}
        <div className="flex items-center gap-1.5 text-on-surface-variant">
          <Calendar size={12} />
          Creado: {fmt(usuario.createdAt)}
        </div>
        <div className="flex items-center gap-1.5 text-on-surface-variant">
          <Clock size={12} />
          {usuario.ultimoLogin ? `Último login: ${fmt(usuario.ultimoLogin)}` : 'Nunca ha ingresado'}
        </div>
      </div>

      {usuario.intentosFallidos > 0 && (
        <div
          className={`mt-3 rounded-xl px-3 py-2 text-xs font-medium ${
            usuario.intentosFallidos >= 5 ? 'bg-error/10 text-error' : 'bg-warning/10 text-warning'
          }`}
        >
          {usuario.intentosFallidos} intentos de login fallidos
          {isBloqueado && usuario.bloqueadoHasta && (
            <> · Bloqueado hasta {new Date(usuario.bloqueadoHasta).toLocaleString('es-CO')}</>
          )}
        </div>
      )}

      {usuario.notas && (
        <div className="mt-3 rounded-xl bg-surface-2 px-3 py-2 text-xs italic text-on-surface-variant">
          {usuario.notas}
        </div>
      )}
    </div>
  );
};
