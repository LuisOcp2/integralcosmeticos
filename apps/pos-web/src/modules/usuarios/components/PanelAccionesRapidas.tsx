import { Plus, UserCircle2, ShieldCheck, FileText } from 'lucide-react';

interface Props {
  canCreate: boolean;
  canViewAudit: boolean;
  onCreate: () => void;
  onMyProfile: () => void;
  onPermissionsMatrix: () => void;
  onAuditGlobal: () => void;
}

export const PanelAccionesRapidas = ({
  canCreate,
  canViewAudit,
  onCreate,
  onMyProfile,
  onPermissionsMatrix,
  onAuditGlobal,
}: Props) => {
  return (
    <div className="rounded-2xl border border-outline-variant bg-surface p-4">
      <h2 className="mb-3 text-sm font-semibold text-on-surface-variant">Acciones rapidas</h2>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
        <button
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-on-primary disabled:opacity-50"
          onClick={onCreate}
          disabled={!canCreate}
        >
          <Plus size={16} /> Crear usuario
        </button>

        <button
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-surface-3 px-4 py-3 text-sm font-semibold"
          onClick={onMyProfile}
        >
          <UserCircle2 size={16} /> Mi perfil
        </button>

        <button
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-surface-3 px-4 py-3 text-sm font-semibold"
          onClick={onPermissionsMatrix}
        >
          <ShieldCheck size={16} /> Matriz permisos
        </button>

        <button
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-surface-3 px-4 py-3 text-sm font-semibold disabled:opacity-50"
          onClick={onAuditGlobal}
          disabled={!canViewAudit}
        >
          <FileText size={16} /> Auditoria global
        </button>
      </div>
    </div>
  );
};
