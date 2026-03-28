import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IStockSede, ISede } from '@cosmeticos/shared-types';
import { X, TriangleAlert, Download, Package, SlidersHorizontal, CheckCircle } from 'lucide-react';
import api from '../lib/api';
import AppLayout from './components/AppLayout';
import { tokens } from '../styles/tokens';

type StockConAlerta = IStockSede & { alertaStockMinimo: boolean };

async function getSedes(): Promise<ISede[]> {
  const { data } = await api.get('/sedes');
  return data;
}

async function getStockPorSede(sedeId: string): Promise<StockConAlerta[]> {
  if (!sedeId) return [];
  const { data } = await api.get(`/inventario/stock/${sedeId}`);
  return data;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-surface-container ${className ?? ''}`} />;
}

function AjusteModal({ stock, onClose, onSaved }: {
  stock: StockConAlerta; onClose: () => void; onSaved: () => void;
}) {
  const [cantidad, setCantidad] = useState('0');
  const [motivo, setMotivo] = useState('INGRESO');
  const [nota, setNota] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      await api.post('/inventario/ajuste', {
        varianteId: stock.varianteId,
        sedeId: stock.sedeId,
        cantidad: Number(cantidad),
        motivo,
        nota,
      });
    },
    onSuccess: onSaved,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(46,27,12,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="px-6 py-5 flex items-center justify-between" style={{ backgroundColor: '#2a1709' }}>
          <div>
            <h3 className="text-xl font-black text-white">Ajuste de stock</h3>
            <p className="text-sm mt-0.5" style={{ color: '#fba9e5' }}>Variante: {stock.varianteId}</p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <X size={22} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="p-4 rounded-xl bg-surface-container flex justify-between">
            <span className="text-sm text-secondary font-medium">Existencias actuales</span>
            <span className="font-black text-on-secondary-fixed text-lg">{stock.cantidad}</span>
          </div>
          <div>
            <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-1">Tipo de ajuste</label>
            <select value={motivo} onChange={(e) => setMotivo(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm border-2 border-outline-variant/30 bg-surface-container-lowest focus:border-primary focus:outline-none">
              {['INGRESO', 'MERMA', 'DEVOLUCION', 'CONTEO'].map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-1">Cantidad</label>
            <input type="number" value={cantidad} onChange={(e) => setCantidad(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm border-2 border-outline-variant/30 bg-surface-container-lowest focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-1">Nota (opcional)</label>
            <input value={nota} onChange={(e) => setNota(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm border-2 border-outline-variant/30 bg-surface-container-lowest focus:border-primary focus:outline-none"
              placeholder="Motivo del ajuste..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl font-bold text-sm border-2 border-outline-variant text-secondary hover:bg-surface-container transition-all">
              Cancelar
            </button>
            <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
              className="flex-1 py-3 rounded-xl font-black text-sm text-white disabled:opacity-60 transition-all"
              style={{ backgroundColor: tokens.color.bgDark }}>
              {mutation.isPending ? 'Guardando...' : 'Aplicar ajuste'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InventarioPage() {
  const queryClient = useQueryClient();
  const [sedeId, setSedeId] = useState('');
  const [soloBajoMinimo, setSoloBajoMinimo] = useState(false);
  const [stockAjuste, setStockAjuste] = useState<StockConAlerta | null>(null);

  const sedesQuery = useQuery({ queryKey: ['sedes', 'inventario'], queryFn: getSedes });
  const stockQuery = useQuery({
    queryKey: ['inventario', 'stock', sedeId],
    queryFn: () => getStockPorSede(sedeId),
    enabled: Boolean(sedeId),
    refetchInterval: 30000,
  });

  const sedeSeleccionada = useMemo(
    () => (sedesQuery.data ?? []).find((s) => s.id === sedeId),
    [sedesQuery.data, sedeId],
  );

  const stockFiltrado = useMemo(() => {
    const base = stockQuery.data ?? [];
    return soloBajoMinimo ? base.filter((s) => s.cantidad <= s.stockMinimo) : base;
  }, [stockQuery.data, soloBajoMinimo]);

  const totalAlertas = (stockQuery.data ?? []).filter((s) => s.cantidad <= s.stockMinimo).length;
  const totalOk = (stockQuery.data ?? []).filter((s) => s.cantidad > s.stockMinimo).length;

  const exportCSV = () => {
    const headers = ['VarianteId', 'Cantidad', 'StockMinimo', 'Alerta'];
    const rows = stockFiltrado.map((s) => [
      s.varianteId,
      String(s.cantidad),
      String(s.stockMinimo),
      s.cantidad <= s.stockMinimo ? 'SI' : 'NO',
    ]);
    const content = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `stock-${sedeId}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <AppLayout>
      {stockAjuste && (
        <AjusteModal
          stock={stockAjuste}
          onClose={() => setStockAjuste(null)}
          onSaved={() => {
            setStockAjuste(null);
            void queryClient.invalidateQueries({ queryKey: ['inventario', 'stock', sedeId] });
          }}
        />
      )}

      <div className="space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-on-secondary-fixed tracking-tight">Inventario</h1>
            <p className="text-secondary font-medium mt-1">Existencias por sede y alertas de reposición</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <select value={sedeId} onChange={(e) => setSedeId(e.target.value)}
              className="bg-surface-container-lowest border border-outline-variant/30 px-4 py-2.5 rounded-xl shadow-sm text-sm font-semibold text-on-surface min-w-[200px]">
              <option value="">— Seleccionar sede —</option>
              {(sedesQuery.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.nombre} ({s.ciudad})</option>
              ))}
            </select>
            {sedeId && (
              <>
                <button
                  onClick={() => setSoloBajoMinimo((p) => !p)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border-2 transition-all ${
                    soloBajoMinimo ? 'bg-error/10 border-error text-error' : 'border-outline-variant/30 text-secondary'
                  }`}
                >
                  <TriangleAlert size={18} />
                  {soloBajoMinimo ? 'Ver todo' : 'Solo alertas'}
                </button>
                <button onClick={exportCSV}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white transition-all"
                  style={{ backgroundColor: tokens.color.primary }}>
                  <Download size={18} />
                  CSV
                </button>
              </>
            )}
          </div>
        </header>

        {!sedeId ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Package size={64} className="text-outline" />
            <p className="text-lg font-bold text-secondary">Selecciona una sede para ver el inventario</p>
          </div>
        ) : (
          <>
            {stockQuery.data && (
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-surface-container-low p-5 rounded-2xl border-l-4 border-primary">
                  <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">
                    Productos en {sedeSeleccionada?.nombre}
                  </p>
                  <p className="text-2xl font-black text-on-secondary-fixed">{stockQuery.data.length}</p>
                </div>
                <div className="p-5 rounded-2xl border-l-4" style={{ backgroundColor: '#ffdad6', borderColor: '#ba1a1a' }}>
                  <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">Alertas de stock</p>
                  <p className="text-2xl font-black" style={{ color: '#ba1a1a' }}>{totalAlertas}</p>
                </div>
                <div className="p-5 rounded-2xl border-l-4" style={{ backgroundColor: '#e8f5e9', borderColor: '#2e7d32' }}>
                  <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">Sin alerta</p>
                  <p className="text-2xl font-black" style={{ color: '#2e7d32' }}>{totalOk}</p>
                </div>
              </div>
            )}

            <div className="overflow-hidden rounded-2xl shadow-sm border border-outline-variant/10">
              {stockQuery.isLoading ? (
                <div className="p-6 space-y-3">
                  {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12" />)}
                </div>
              ) : stockFiltrado.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <CheckCircle size={48} className="text-outline" />
                  <p className="text-sm font-bold text-secondary">No hay alertas de stock para esta sede</p>
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-surface-container-highest text-on-surface-variant font-bold text-xs uppercase tracking-widest">
                      <th className="px-6 py-4">Variante</th>
                      <th className="px-6 py-4 text-right">Existencias actuales</th>
                      <th className="px-6 py-4 text-right">Mínimo</th>
                      <th className="px-6 py-4 text-center">Estado</th>
                      <th className="px-6 py-4 text-center">Ajuste</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {stockFiltrado.map((stock, i) => {
                      const alerta = stock.cantidad <= stock.stockMinimo;
                      return (
                        <tr key={stock.id} className={`border-b border-outline-variant/5 ${i % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low'}`}>
                          <td className="px-6 py-4 font-bold text-on-surface">{stock.varianteId}</td>
                          <td className="px-6 py-4 text-right">
                            <span className={`text-lg font-black ${alerta ? 'text-error' : 'text-on-surface'}`}>
                              {stock.cantidad}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right text-secondary">{stock.stockMinimo}</td>
                          <td className="px-6 py-4 text-center">
                            <span className="px-3 py-1 rounded-full text-xs font-bold"
                              style={alerta ? { backgroundColor: '#ffdad6', color: '#ba1a1a' } : { backgroundColor: '#e8f5e9', color: '#2e7d32' }}>
                              {alerta ? '⚠ Alerta' : '✓ OK'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button onClick={() => setStockAjuste(stock)}
                              className="p-2 rounded-lg hover:bg-surface-container text-secondary hover:text-primary transition-colors">
                              <SlidersHorizontal size={18} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
