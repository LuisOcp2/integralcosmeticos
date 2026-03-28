import { Banknote, CreditCard, BadgeCheck, Landmark } from 'lucide-react';
import type { MetodoPago } from '@/types';
import type { LucideIcon } from 'lucide-react';

interface MetodoPagoSelectorProps {
  selected: MetodoPago;
  onChange: (m: MetodoPago) => void;
}

const METODOS: { value: MetodoPago; label: string; icon: LucideIcon }[] = [
  { value: 'EFECTIVO', label: 'Efectivo', icon: Banknote },
  { value: 'TARJETA_CREDITO', label: 'T. Crédito', icon: CreditCard },
  { value: 'TARJETA_DEBITO', label: 'T. Débito', icon: BadgeCheck },
  { value: 'TRANSFERENCIA', label: 'Transferencia', icon: Landmark },
];

export default function MetodoPagoSelector({ selected, onChange }: MetodoPagoSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {METODOS.map((m) => {
        const active = selected === m.value;
        const Icon = m.icon;
        return (
          <button
            key={m.value}
            onClick={() => onChange(m.value)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl border text-left transition-all duration-200
              ${active
                ? 'bg-primary-container border-primary text-on-primary-container shadow-elevation1'
                : 'bg-surface-2 border-outline-variant text-on-surface-variant hover:border-outline hover:bg-surface-3'
              }`}
          >
            <Icon className="w-5 h-5 shrink-0" />
            <span className="text-xs font-semibold leading-tight">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}
