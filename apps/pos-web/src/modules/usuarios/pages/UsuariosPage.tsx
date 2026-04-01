import { useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import {
  useUsuarios,
  useEstadisticasUsuarios,
  useDesactivarUsuario,
  useActivarUsuario,
  useBloquearUsuario,
  useDesbloquearUsuario,
} from '../hooks/useUsuarios';
import { usePermisos } from '../hooks/usePermisos';
import { TablaUsuarios } from '../components/TablaUsuarios';
import { EstadisticasUsuarios } from '../components/EstadisticasUsuarios';
import { ModalCrearUsuario } from '../components/ModalCrearUsuario';
import { ModalEditarUsuario } from '../components/ModalEditarUsuario';
import { ModalGestionarPermisos } from '../components/ModalGestionarPermisos';
import { ModalResetPassword } from '../components/ModalResetPassword';
import { PanelAccionesRapidas } from '../components/PanelAccionesRapidas';
import { MatrizPermisos } from '../components/MatrizPermisos';
import { ModalAuditoriaGlobal } from '../components/ModalAuditoriaGlobal';
import { UsuarioDetallePage } from './UsuarioDetallePage';
import { MiPerfilPage } from './MiPerfilPage';
import type { FiltrosUsuario, Usuario } from '../api/usuarios.api';
import { Permiso } from '@cosmeticos/shared-types';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  onBackToPos: () => void;
}

export const UsuariosPage = ({ onBackToPos }: Props) => {
  const { user } = useAuth();
  const { tienePermiso } = usePermisos();

  const [filtros, setFiltros] = useState<FiltrosUsuario>({ page: 1, limit: 20, activo: true });
  const [modalCrear, setModalCrear] = useState(false);
  const [usuarioEditar, setUsuarioEditar] = useState<Usuario | null>(null);
  const [usuarioPermisos, setUsuarioPermisos] = useState<Usuario | null>(null);
  const [usuarioReset, setUsuarioReset] = useState<Usuario | null>(null);
  const [usuarioDetalle, setUsuarioDetalle] = useState<Usuario | null>(null);
  const [verMiPerfil, setVerMiPerfil] = useState(false);
  const [verMatriz, setVerMatriz] = useState(false);
  const [verAuditoriaGlobal, setVerAuditoriaGlobal] = useState(false);

  const { data, isLoading, refetch } = useUsuarios(filtros);
  const { data: stats } = useEstadisticasUsuarios();
  const desactivar = useDesactivarUsuario();
  const activar = useActivarUsuario();
  const bloquear = useBloquearUsuario();
  const desbloquear = useDesbloquearUsuario();

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-background">Gestion de Usuarios</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Administra usuarios, roles y permisos del sistema
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="btn btn-ghost btn-sm gap-1">
            <RefreshCw size={14} /> Actualizar
          </button>
          <button onClick={onBackToPos} className="btn btn-ghost btn-sm gap-1">
            Volver
          </button>
          <button onClick={() => setVerMiPerfil(true)} className="btn btn-ghost btn-sm gap-1">
            Mi perfil
          </button>
          {tienePermiso(Permiso.USUARIOS_CREAR) ? (
            <button onClick={() => setModalCrear(true)} className="btn btn-primary btn-sm gap-1">
              <Plus size={14} /> Nuevo Usuario
            </button>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-outline-variant bg-surface p-3 text-sm text-on-surface-variant">
        Haz clic en el nombre de un usuario para ver detalle y auditoria. Las acciones se habilitan
        segun tus permisos.
      </div>

      <PanelAccionesRapidas
        canCreate={tienePermiso(Permiso.USUARIOS_CREAR)}
        canViewAudit={tienePermiso(Permiso.USUARIOS_VER_AUDITORIA)}
        onCreate={() => setModalCrear(true)}
        onMyProfile={() => setVerMiPerfil(true)}
        onPermissionsMatrix={() => setVerMatriz(true)}
        onAuditGlobal={() => setVerAuditoriaGlobal(true)}
      />

      {stats ? <EstadisticasUsuarios stats={stats} /> : null}

      <TablaUsuarios
        data={data}
        isLoading={isLoading}
        filtros={filtros}
        onFiltrosChange={setFiltros}
        onEditar={tienePermiso(Permiso.USUARIOS_EDITAR) ? setUsuarioEditar : undefined}
        onDesactivar={
          tienePermiso(Permiso.USUARIOS_ELIMINAR) ? (id) => desactivar.mutate(id) : undefined
        }
        onActivar={tienePermiso(Permiso.USUARIOS_EDITAR) ? (id) => activar.mutate(id) : undefined}
        onBloquear={
          tienePermiso(Permiso.USUARIOS_EDITAR)
            ? (id) => bloquear.mutate({ id, minutos: 30 })
            : undefined
        }
        onDesbloquear={
          tienePermiso(Permiso.USUARIOS_EDITAR) ? (id) => desbloquear.mutate(id) : undefined
        }
        onGestionarPermisos={
          tienePermiso(Permiso.USUARIOS_CAMBIAR_ROL) ? setUsuarioPermisos : undefined
        }
        onResetPassword={
          tienePermiso(Permiso.USUARIOS_RESET_PASSWORD) ? setUsuarioReset : undefined
        }
        onVerDetalle={setUsuarioDetalle}
      />

      {modalCrear ? <ModalCrearUsuario onClose={() => setModalCrear(false)} /> : null}
      {usuarioEditar ? (
        <ModalEditarUsuario usuario={usuarioEditar} onClose={() => setUsuarioEditar(null)} />
      ) : null}
      {usuarioPermisos ? (
        <ModalGestionarPermisos
          usuario={usuarioPermisos}
          onClose={() => setUsuarioPermisos(null)}
        />
      ) : null}
      {usuarioReset ? (
        <ModalResetPassword usuario={usuarioReset} onClose={() => setUsuarioReset(null)} />
      ) : null}

      {usuarioDetalle ? (
        <div className="fixed inset-0 z-50 overflow-auto bg-black/50 p-6">
          <div className="mx-auto max-w-4xl rounded-2xl bg-background">
            <div className="flex justify-end p-2">
              <button className="btn btn-ghost btn-sm" onClick={() => setUsuarioDetalle(null)}>
                Cerrar
              </button>
            </div>
            <UsuarioDetallePage id={usuarioDetalle.id} />
          </div>
        </div>
      ) : null}

      {verMiPerfil && user ? (
        <div className="fixed inset-0 z-50 overflow-auto bg-black/50 p-6">
          <div className="mx-auto max-w-3xl rounded-2xl bg-background">
            <div className="flex justify-end p-2">
              <button className="btn btn-ghost btn-sm" onClick={() => setVerMiPerfil(false)}>
                Cerrar
              </button>
            </div>
            <MiPerfilPage />
          </div>
        </div>
      ) : null}

      {verMatriz ? (
        <div className="fixed inset-0 z-50 overflow-auto bg-black/50 p-6">
          <div className="mx-auto max-w-6xl rounded-2xl bg-background p-4">
            <div className="mb-3 flex justify-end">
              <button className="btn btn-ghost btn-sm" onClick={() => setVerMatriz(false)}>
                Cerrar
              </button>
            </div>
            <MatrizPermisos />
          </div>
        </div>
      ) : null}

      {verAuditoriaGlobal ? (
        <ModalAuditoriaGlobal
          usuarios={data?.data ?? []}
          onClose={() => setVerAuditoriaGlobal(false)}
        />
      ) : null}
    </div>
  );
};

export default UsuariosPage;
