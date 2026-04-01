interface BadgeEstadoProps {
  activo: boolean;
  bloqueadoHasta?: string | null;
}

export const BadgeEstado = ({ activo, bloqueadoHasta }: BadgeEstadoProps) => {
  const bloqueado = Boolean(bloqueadoHasta && new Date(bloqueadoHasta) > new Date());
  if (bloqueado) {
    return (
      <span className="inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800">
        Bloqueado
      </span>
    );
  }
  if (!activo) {
    return (
      <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
        Inactivo
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">
      Activo
    </span>
  );
};
