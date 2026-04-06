import type { Categoria } from '@/types';

interface FiltrosCategoriasProps {
  categorias: Categoria[];
  selectedId: string | null;
  onSelect: (_id: string | null) => void;
}

export default function FiltrosCategorias({
  categorias,
  selectedId,
  onSelect,
}: FiltrosCategoriasProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      <style>{`.scrollbar-none::-webkit-scrollbar{display:none}`}</style>
      <Chip label="Todos" active={selectedId === null} onClick={() => onSelect(null)} />
      {categorias.map((cat) => (
        <Chip
          key={cat.id}
          label={cat.nombre}
          active={selectedId === cat.id}
          onClick={() => onSelect(cat.id)}
        />
      ))}
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-4 py-2 rounded-3xl text-sm font-semibold transition-all duration-200 border
        ${
          active
            ? 'bg-secondary-container text-on-secondary-container border-secondary-container'
            : 'bg-transparent text-on-surface-variant border-outline-variant hover:bg-surface-2'
        }`}
    >
      {label}
    </button>
  );
}
