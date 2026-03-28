import { useState, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import type { Cliente } from '@/types';
import { useCliente } from '@/hooks/useCliente';

interface ClienteSelectorProps {
  clienteSeleccionado: Cliente | null;
  onSeleccionar: (c: Cliente | null) => void;
}

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function ClienteSelector({ clienteSeleccionado, onSeleccionar }: ClienteSelectorProps) {
  const [busqueda, setBusqueda] = useState('');
  const debouncedDoc = useDebounce(busqueda, 500);
  const { data: cliente, isFetching } = useCliente(debouncedDoc);

  // Auto-select when found
  useEffect(() => {
    if (cliente && !clienteSeleccionado) {
      onSeleccionar(cliente);
      setBusqueda('');
    }
  }, [cliente, clienteSeleccionado, onSeleccionar]);

  if (clienteSeleccionado) {
    return (
      <div className="flex items-center gap-2 bg-primary-container rounded-2xl px-3 py-2">
        <span className="material-icon text-on-primary-container text-lg filled">person</span>
        <div className="flex-1 min-w-0">
          <p className="text-on-primary-container text-sm font-semibold truncate">
            {clienteSeleccionado.nombre} {clienteSeleccionado.apellido}
          </p>
          <p className="text-on-primary-container/70 text-[11px]">
            {clienteSeleccionado.documento} · {clienteSeleccionado.puntosFidelidad} pts
          </p>
        </div>
        <button
          onClick={() => onSeleccionar(null)}
          className="shrink-0 hover:opacity-60 transition-opacity"
        >
          <span className="material-icon text-on-primary-container text-lg">close</span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 bg-surface-2 rounded-2xl px-3 h-11 border border-outline-variant focus-within:border-primary transition-colors">
        <span className="material-icon text-outline text-lg">person_search</span>
        <input
          type="text"
          value={busqueda}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setBusqueda(e.target.value)}
          placeholder="Buscar cliente por documento…"
          className="flex-1 bg-transparent text-on-background text-sm placeholder-outline focus:outline-none"
        />
        {isFetching && (
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        )}
      </div>
      {/* Not found hint */}
      {debouncedDoc.length >= 4 && !isFetching && !cliente && (
        <p className="text-outline text-[11px] mt-1 px-1">No se encontró cliente con ese documento</p>
      )}
    </div>
  );
}
