import type { MetodoPago } from '@/types';

interface MetodoPagoSelectorProps {
  selected: MetodoPago;
  onChange: (m: MetodoPago) => void;
}

const METODOS: { value: MetodoPago; label: string; icon: string }[] = [
  { value: 'EFECTIVO', label: 'Efectivo', icon: 'payments' },
  { value: 'TARJETA_CREDITO', label: 'T. Crédito', icon: 'credit_card' },
  { value: 'TARJETA_DEBITO', label: 'T. Débito', icon: 'credit_score' },
  { value: 'TRANSFERENCIA', label: 'Transferencia', icon: 'account_balance' },
];

export default function MetodoPagoSelector({ selected, onChange }: MetodoPagoSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {METODOS.map((m) => {
        const active = selected === m.value;
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
            <span className={`material-icon text-xl shrink-0 ${active ? 'filled' : ''}`}>{m.icon}</span>
            <span className="text-xs font-semibold leading-tight">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}
