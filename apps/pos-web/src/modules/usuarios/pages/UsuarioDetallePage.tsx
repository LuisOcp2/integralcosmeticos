import { useUsuario, useAuditoriaUsuario } from '../hooks/useUsuarios';
import { TarjetaUsuario } from '../components/TarjetaUsuario';
import { ListaAuditoria } from '../components/ListaAuditoria';

interface Props {
  id: string;
}

export const UsuarioDetallePage = ({ id }: Props) => {
  const { data: usuario, isLoading } = useUsuario(id);
  const { data: auditoria, isLoading: loadingAuditoria } = useAuditoriaUsuario(id);

  if (isLoading || !usuario) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <div className="space-y-4 p-6">
      <TarjetaUsuario usuario={usuario} />
      <div>
        <h2 className="mb-2 text-lg font-bold">Auditoria</h2>
        {loadingAuditoria ? (
          <p className="mb-2 text-sm text-on-surface-variant">Cargando auditoria...</p>
        ) : null}
        <ListaAuditoria eventos={auditoria?.data ?? []} />
      </div>
    </div>
  );
};
