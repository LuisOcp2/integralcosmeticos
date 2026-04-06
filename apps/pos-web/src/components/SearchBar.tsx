import type { ChangeEvent } from 'react';
import { Search, X, ScanBarcode } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (_value: string) => void;
  onBarcodeScan?: () => void;
  placeholder?: string;
}

export default function SearchBar({
  value,
  onChange,
  onBarcodeScan,
  placeholder = 'Buscar productos, código de barras…',
}: SearchBarProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value);

  return (
    <div className="flex items-center gap-2 bg-surface-2 rounded-2xl px-4 h-14 border border-outline-variant focus-within:border-primary focus-within:bg-surface transition-all duration-200">
      <Search className="w-5 h-5 text-on-surface-variant shrink-0" />
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-on-background placeholder-outline text-sm font-medium focus:outline-none"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="text-on-surface-variant hover:text-on-background transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      )}
      {onBarcodeScan && (
        <button
          onClick={onBarcodeScan}
          title="Escanear código de barras"
          className="text-on-surface-variant hover:text-primary transition-colors"
        >
          <ScanBarcode className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
