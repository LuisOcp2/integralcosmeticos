import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IMovimientoInventario, IStockSede, ISede, TipoMovimiento } from '@cosmeticos/shared-types';
import {
  ArrowUpDown,
  CheckCircle,
  CheckSquare,
  Download,
  Filter,
  History,
  Package,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Square,
  TriangleAlert,
  X,
} from 'lucide-react';
import api from '../lib/api';
import AppLayout from './components/AppLayout';
import { tokens } from '../styles/tokens';

type StockConAlerta = IStockSede & {
  alertaStockMinimo: boolean;
  nombreVariante?: string;
  nombreProducto?: string;
  skuVariante?: string;
  codigoBarrasVariante?: string;
};
type MovimientoInventarioUi = IMovimientoInventario & {
  numeroDoc?: string;
  stockAnterior?: number;
  stockNuevo?: number;
  nombreVariante?: string;
  nombreProducto?: string;
  skuVariante?: string;
  codigoBarrasVariante?: string;
};

type EstadoFiltro = 'TODOS' | 'ALERTA' | 'OK';
type OrdenStock = 'CRITICIDAD' | 'CANTIDAD_ASC' | 'CANTIDAD_DESC' | 'VARIANTE';
type Criticidad = 'CRITICO' | 'MEDIO' | 'SANO';

function getCriticidad(stock: Pick<StockConAlerta, 'cantidad' | 'stockMinimo'>): Criticidad {
  if (stock.cantidad <= 0) return 'CRITICO';
  if (stock.stockMinimo <= 0) return 'SANO';
  if (stock.cantidad < stock.stockMinimo * 0.6) return 'CRITICO';
  if (stock.cantidad <= stock.stockMinimo) return 'MEDIO';
  return 'SANO';
}

function criticidadPriority(criticidad: Criticidad): number {
  if (criticidad === 'CRITICO') return 1;
  if (criticidad === 'MEDIO') return 2;
  return 3;
}

async function getSedes(): Promise<ISede[]> {
  const { data } = await api.get('/sedes');
  return data;
}

async function getStockPorSede(sedeId: string): Promise<StockConAlerta[]> {
  if (!sedeId) return [];
  const { data } = await api.get(`/inventario/stock/${sedeId}`);
  return data;
}

async function getMovimientos(): Promise<MovimientoInventarioUi[]> {
  const { data } = await api.get('/inventario/movimientos');
  return data;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-surface-container ${className ?? ''}`} />;
}

function AjusteModal({
  stock,
  onClose,
  onSaved,
}: {
  stock: StockConAlerta;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [cantidad, setCantidad] = useState('0');
  const [motivo, setMotivo] = useState('INGRESO');
  const [nota, setNota] = useState('');
  const [error, setError] = useState<string | null>(null);

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
    onSuccess: () => {
      setError(null);
      onSaved();
    },
    onError: (e: any) => {
      const backendMessage =
        e?.response?.data?.message && Array.isArray(e.response.data.message)
          ? e.response.data.message.join('. ')
          : e?.response?.data?.message;
      setError(backendMessage || e?.message || 'No se pudo aplicar el ajuste de stock.');
    },
  });

  const cantidadNumerica = Number(cantidad || 0);
  const direccion = motivo === 'MERMA' ? -1 : 1;
  const nuevoStockEstimado =
    stock.cantidad + (cantidadNumerica > 0 ? cantidadNumerica * direccion : 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(46,27,12,0.5)' }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div
          className="px-6 py-5 flex items-center justify-between"
          style={{ backgroundColor: '#2a1709' }}
        >
          <div>
            <h3 className="text-xl font-black text-white">Ajuste de stock</h3>
            <p className="text-sm mt-0.5" style={{ color: '#fba9e5' }}>
              {stock.nombreProducto ?? 'Producto'} - {stock.nombreVariante ?? stock.varianteId}
            </p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <X size={22} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {error && (
            <div
              className="rounded-xl px-4 py-3 text-sm font-semibold"
              style={{ backgroundColor: 'rgba(186,26,26,0.12)', color: '#ba1a1a' }}
            >
              {error}
            </div>
          )}
          <div className="p-4 rounded-xl bg-surface-container flex justify-between">
            <span className="text-sm text-secondary font-medium">Existencias actuales</span>
            <span className="font-black text-on-secondary-fixed text-lg">{stock.cantidad}</span>
          </div>
          <div>
            <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-1">
              Tipo de ajuste
            </label>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm border-2 border-outline-variant/30 bg-surface-container-lowest focus:border-primary focus:outline-none"
            >
              {['INGRESO', 'MERMA', 'DEVOLUCION', 'CONTEO'].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-1">
              Cantidad
            </label>
            <input
              type="number"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm border-2 border-outline-variant/30 bg-surface-container-lowest focus:border-primary focus:outline-none"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {[1, 3, 5, 10].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setCantidad(String(v))}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold border border-outline-variant/30 text-secondary hover:bg-surface-container"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-xl px-4 py-3" style={{ backgroundColor: '#f6f2f4' }}>
            <p className="text-xs font-bold uppercase tracking-wider text-secondary">Preview</p>
            <p className="text-sm font-semibold text-on-surface mt-1">
              Stock estimado luego del ajuste:{' '}
              <span className="font-black">
                {Number.isFinite(nuevoStockEstimado) ? nuevoStockEstimado : stock.cantidad}
              </span>
            </p>
          </div>
          <div>
            <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-1">
              Nota (opcional)
            </label>
            <input
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm border-2 border-outline-variant/30 bg-surface-container-lowest focus:border-primary focus:outline-none"
              placeholder="Motivo del ajuste..."
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl font-bold text-sm border-2 border-outline-variant text-secondary hover:bg-surface-container transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                setError(null);
                mutation.mutate();
              }}
              disabled={
                mutation.isPending || !Number.isFinite(cantidadNumerica) || cantidadNumerica < 1
              }
              className="flex-1 py-3 rounded-xl font-black text-sm text-white disabled:opacity-60 transition-all"
              style={{ backgroundColor: tokens.color.bgDark }}
            >
              {mutation.isPending ? 'Guardando...' : 'Aplicar ajuste'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AjusteMasivoModal({
  stocks,
  onClose,
  onSaved,
}: {
  stocks: StockConAlerta[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [modo, setModo] = useState<'DELTA' | 'ABSOLUTO'>('DELTA');
  const [cantidad, setCantidad] = useState('1');
  const [stockObjetivo, setStockObjetivo] = useState('0');
  const [motivo, setMotivo] = useState('INGRESO');
  const [nota, setNota] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const cantidadNum = Number(cantidad);
      const objetivoNum = Number(stockObjetivo);

      if (modo === 'DELTA' && (!Number.isFinite(cantidadNum) || cantidadNum < 1)) {
        throw new Error('La cantidad debe ser mayor a cero.');
      }

      if (modo === 'ABSOLUTO' && (!Number.isFinite(objetivoNum) || objetivoNum < 0)) {
        throw new Error('El stock objetivo no puede ser negativo.');
      }

      const fallos: string[] = [];
      await Promise.all(
        stocks.map(async (stock) => {
          const payload =
            modo === 'DELTA'
              ? {
                  varianteId: stock.varianteId,
                  sedeId: stock.sedeId,
                  cantidad: cantidadNum,
                  motivo,
                  nota,
                }
              : (() => {
                  const diff = objetivoNum - stock.cantidad;
                  if (diff === 0) return null;
                  return {
                    varianteId: stock.varianteId,
                    sedeId: stock.sedeId,
                    cantidad: Math.abs(diff),
                    motivo: diff > 0 ? 'INGRESO' : 'MERMA',
                    nota: nota?.trim()
                      ? `CONTEO ABSOLUTO (${objetivoNum}): ${nota.trim()}`
                      : `CONTEO ABSOLUTO (${objetivoNum})`,
                  };
                })();

          if (!payload) {
            return;
          }

          try {
            await api.post('/inventario/ajuste', payload);
          } catch (e: any) {
            const backendMessage =
              e?.response?.data?.message && Array.isArray(e.response.data.message)
                ? e.response.data.message.join('. ')
                : e?.response?.data?.message;
            const nombre = stock.nombreVariante ?? stock.varianteId;
            fallos.push(`${nombre}: ${backendMessage || e?.message || 'error'}`);
          }
        }),
      );

      if (fallos.length) {
        throw new Error(`No se pudieron ajustar ${fallos.length} variantes. ${fallos[0]}`);
      }
    },
    onSuccess: () => {
      setError(null);
      onSaved();
    },
    onError: (e: any) => {
      setError(e?.message || 'No se pudo aplicar el ajuste masivo.');
    },
  });

  const cantidadNumerica = Number(cantidad || 0);
  const objetivoNumerico = Number(stockObjetivo || 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(46,27,12,0.5)' }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div
          className="px-6 py-5 flex items-center justify-between"
          style={{ backgroundColor: '#2a1709' }}
        >
          <div>
            <h3 className="text-xl font-black text-white">Ajuste masivo de stock</h3>
            <p className="text-sm mt-0.5" style={{ color: '#fba9e5' }}>
              {stocks.length} variantes seleccionadas
            </p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <X size={22} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div
              className="rounded-xl px-4 py-3 text-sm font-semibold"
              style={{ backgroundColor: 'rgba(186,26,26,0.12)', color: '#ba1a1a' }}
            >
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-1">
                Modo
              </label>
              <select
                value={modo}
                onChange={(e) => setModo(e.target.value as 'DELTA' | 'ABSOLUTO')}
                className="w-full rounded-xl px-3 py-2.5 text-sm border-2 border-outline-variant/30 bg-surface-container-lowest focus:border-primary focus:outline-none"
              >
                <option value="DELTA">Delta (+/- cantidad)</option>
                <option value="ABSOLUTO">Absoluto (dejar en X)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-1">
                Tipo de ajuste
              </label>
              <select
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                disabled={modo === 'ABSOLUTO'}
                className="w-full rounded-xl px-3 py-2.5 text-sm border-2 border-outline-variant/30 bg-surface-container-lowest focus:border-primary focus:outline-none disabled:opacity-60"
              >
                {['INGRESO', 'MERMA', 'DEVOLUCION', 'CONTEO'].map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>
            {modo === 'DELTA' ? (
              <div>
                <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-1">
                  Cantidad
                </label>
                <input
                  type="number"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm border-2 border-outline-variant/30 bg-surface-container-lowest focus:border-primary focus:outline-none"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-1">
                  Stock objetivo (X)
                </label>
                <input
                  type="number"
                  value={stockObjetivo}
                  onChange={(e) => setStockObjetivo(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm border-2 border-outline-variant/30 bg-surface-container-lowest focus:border-primary focus:outline-none"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-1">
              Nota (opcional)
            </label>
            <input
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm border-2 border-outline-variant/30 bg-surface-container-lowest focus:border-primary focus:outline-none"
              placeholder="Motivo del ajuste masivo..."
            />
          </div>

          <div className="max-h-48 overflow-auto rounded-xl border border-outline-variant/20">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-surface-container-highest text-on-surface-variant font-bold text-xs uppercase tracking-widest">
                  <th className="px-3 py-2">Variante</th>
                  <th className="px-3 py-2 text-right">Actual</th>
                  <th className="px-3 py-2 text-right">Ajuste</th>
                  <th className="px-3 py-2 text-right">Nuevo</th>
                </tr>
              </thead>
              <tbody>
                {stocks.map((s) => {
                  const delta =
                    modo === 'DELTA'
                      ? motivo === 'MERMA'
                        ? -cantidadNumerica
                        : cantidadNumerica
                      : objetivoNumerico - s.cantidad;
                  const nuevo = modo === 'DELTA' ? s.cantidad + delta : objetivoNumerico;
                  return (
                    <tr key={s.id} className="border-t border-outline-variant/10">
                      <td className="px-3 py-2">
                        <p className="font-semibold text-on-surface">
                          {s.nombreVariante ?? s.varianteId}
                        </p>
                        <p className="text-xs text-secondary">{s.nombreProducto ?? s.varianteId}</p>
                      </td>
                      <td className="px-3 py-2 text-right font-bold">{s.cantidad}</td>
                      <td
                        className={`px-3 py-2 text-right font-bold ${delta >= 0 ? 'text-green-700' : 'text-error'}`}
                      >
                        {Number.isFinite(delta) ? `${delta >= 0 ? '+' : ''}${delta}` : '-'}
                      </td>
                      <td className="px-3 py-2 text-right text-secondary">
                        {Number.isFinite(nuevo) ? nuevo : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl font-bold text-sm border-2 border-outline-variant text-secondary hover:bg-surface-container transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                setError(null);
                mutation.mutate();
              }}
              disabled={
                mutation.isPending ||
                (modo === 'DELTA' &&
                  (!Number.isFinite(cantidadNumerica) || cantidadNumerica < 1)) ||
                (modo === 'ABSOLUTO' &&
                  (!Number.isFinite(objetivoNumerico) || objetivoNumerico < 0))
              }
              className="flex-1 py-3 rounded-xl font-black text-sm text-white disabled:opacity-60 transition-all"
              style={{ backgroundColor: tokens.color.bgDark }}
            >
              {mutation.isPending
                ? 'Aplicando...'
                : modo === 'DELTA'
                  ? 'Aplicar ajuste masivo'
                  : 'Aplicar conteo absoluto'}
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
  const [seleccionados, setSeleccionados] = useState<Record<string, boolean>>({});
  const [mostrarAjusteMasivo, setMostrarAjusteMasivo] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>('TODOS');
  const [orden, setOrden] = useState<OrdenStock>('CRITICIDAD');
  const [pagina, setPagina] = useState(1);
  const [tamanoPagina, setTamanoPagina] = useState(10);
  const [filtroMovimiento, setFiltroMovimiento] = useState<'TODOS' | TipoMovimiento>('TODOS');

  const sedesQuery = useQuery({ queryKey: ['sedes', 'inventario'], queryFn: getSedes });
  const stockQuery = useQuery({
    queryKey: ['inventario', 'stock', sedeId],
    queryFn: () => getStockPorSede(sedeId),
    enabled: Boolean(sedeId),
    refetchInterval: 30000,
  });
  const movimientosQuery = useQuery({
    queryKey: ['inventario', 'movimientos'],
    queryFn: getMovimientos,
    refetchInterval: 30000,
  });

  const sedeSeleccionada = useMemo(
    () => (sedesQuery.data ?? []).find((s) => s.id === sedeId),
    [sedesQuery.data, sedeId],
  );

  const stockFiltrado = useMemo(() => {
    const base = stockQuery.data ?? [];
    const q = busqueda.trim().toLowerCase();

    const filtrado = base
      .filter((s) => (soloBajoMinimo ? s.cantidad <= s.stockMinimo : true))
      .filter((s) => {
        if (estadoFiltro === 'ALERTA') return s.cantidad <= s.stockMinimo;
        if (estadoFiltro === 'OK') return s.cantidad > s.stockMinimo;
        return true;
      })
      .filter((s) => {
        if (!q) return true;
        const indexable = [
          s.varianteId,
          s.nombreVariante ?? '',
          s.nombreProducto ?? '',
          s.skuVariante ?? '',
          s.codigoBarrasVariante ?? '',
        ]
          .join(' ')
          .toLowerCase();
        return indexable.includes(q);
      });

    return filtrado.sort((a, b) => {
      if (orden === 'CANTIDAD_ASC') return a.cantidad - b.cantidad;
      if (orden === 'CANTIDAD_DESC') return b.cantidad - a.cantidad;
      if (orden === 'VARIANTE') return a.varianteId.localeCompare(b.varianteId);

      const prioridadA = criticidadPriority(getCriticidad(a));
      const prioridadB = criticidadPriority(getCriticidad(b));
      if (prioridadA !== prioridadB) return prioridadA - prioridadB;

      const deficitA = a.cantidad - a.stockMinimo;
      const deficitB = b.cantidad - b.stockMinimo;
      if (deficitA !== deficitB) return deficitA - deficitB;
      return a.varianteId.localeCompare(b.varianteId);
    });
  }, [stockQuery.data, soloBajoMinimo, busqueda, estadoFiltro, orden]);

  const totalPaginas = Math.max(1, Math.ceil(stockFiltrado.length / tamanoPagina));
  const paginaSegura = Math.min(pagina, totalPaginas);

  const stockPaginado = useMemo(() => {
    const inicio = (paginaSegura - 1) * tamanoPagina;
    return stockFiltrado.slice(inicio, inicio + tamanoPagina);
  }, [paginaSegura, stockFiltrado, tamanoPagina]);

  const seleccionadosLista = useMemo(
    () => stockFiltrado.filter((s) => seleccionados[s.id]),
    [stockFiltrado, seleccionados],
  );

  const allPageSelected =
    stockPaginado.length > 0 && stockPaginado.every((s) => Boolean(seleccionados[s.id]));

  const movimientosFiltrados = useMemo(() => {
    const movimientos = movimientosQuery.data ?? [];
    return movimientos
      .filter((m) => (sedeId ? m.sedeId === sedeId || m.sedeDestinoId === sedeId : true))
      .filter((m) => (filtroMovimiento === 'TODOS' ? true : m.tipo === filtroMovimiento))
      .slice(0, 8);
  }, [movimientosQuery.data, sedeId, filtroMovimiento]);

  const totalAlertas = (stockQuery.data ?? []).filter((s) => s.cantidad <= s.stockMinimo).length;
  const totalOk = (stockQuery.data ?? []).filter((s) => s.cantidad > s.stockMinimo).length;
  const totalAgotados = (stockQuery.data ?? []).filter((s) => s.cantidad === 0).length;

  const coberturaPromedio = (() => {
    const data = stockQuery.data ?? [];
    if (!data.length) return 0;
    const total = data.reduce((acc, item) => {
      if (item.stockMinimo <= 0) return acc + 100;
      return acc + Math.max(0, Math.round((item.cantidad / item.stockMinimo) * 100));
    }, 0);
    return Math.round(total / data.length);
  })();

  const exportCSV = () => {
    const headers = ['VarianteId', 'Cantidad', 'StockMinimo', 'Estado'];
    const rows = stockFiltrado.map((s) => [
      s.varianteId,
      String(s.cantidad),
      String(s.stockMinimo),
      s.cantidad <= s.stockMinimo ? 'ALERTA' : 'OK',
    ]);
    const content = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `stock-${sedeId}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const limpiarFiltros = () => {
    setBusqueda('');
    setEstadoFiltro('TODOS');
    setOrden('CRITICIDAD');
    setSoloBajoMinimo(false);
    setPagina(1);
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
            void queryClient.invalidateQueries({ queryKey: ['inventario', 'movimientos'] });
          }}
        />
      )}
      {mostrarAjusteMasivo && seleccionadosLista.length > 0 && (
        <AjusteMasivoModal
          stocks={seleccionadosLista}
          onClose={() => setMostrarAjusteMasivo(false)}
          onSaved={() => {
            setMostrarAjusteMasivo(false);
            setSeleccionados({});
            void queryClient.invalidateQueries({ queryKey: ['inventario', 'stock', sedeId] });
            void queryClient.invalidateQueries({ queryKey: ['inventario', 'movimientos'] });
          }}
        />
      )}

      <div className="space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-on-secondary-fixed tracking-tight">
              Inventario
            </h1>
            <p className="text-secondary font-medium mt-1">
              Existencias por sede, ajustes operativos y trazabilidad de movimientos
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={sedeId}
              onChange={(e) => {
                setSedeId(e.target.value);
                setPagina(1);
              }}
              className="bg-surface-container-lowest border border-outline-variant/30 px-4 py-2.5 rounded-xl shadow-sm text-sm font-semibold text-on-surface min-w-[220px]"
            >
              <option value="">- Seleccionar sede -</option>
              {(sedesQuery.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre} ({s.ciudad})
                </option>
              ))}
            </select>
            {sedeId && (
              <>
                <button
                  onClick={() => {
                    setSoloBajoMinimo((p) => !p);
                    setPagina(1);
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border-2 transition-all ${
                    soloBajoMinimo
                      ? 'bg-error/10 border-error text-error'
                      : 'border-outline-variant/30 text-secondary'
                  }`}
                >
                  <TriangleAlert size={18} />
                  {soloBajoMinimo ? 'Ver todo' : 'Solo alertas'}
                </button>
                <button
                  onClick={exportCSV}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white transition-all"
                  style={{ backgroundColor: tokens.color.primary }}
                >
                  <Download size={18} />
                  CSV
                </button>
                <button
                  onClick={() => setMostrarAjusteMasivo(true)}
                  disabled={seleccionadosLista.length === 0}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border-2 disabled:opacity-45"
                  style={{
                    borderColor: 'rgba(133,38,75,0.35)',
                    color: tokens.color.primary,
                    backgroundColor: 'rgba(133,38,75,0.08)',
                  }}
                >
                  <CheckSquare size={16} /> Ajuste masivo ({seleccionadosLista.length})
                </button>
              </>
            )}
          </div>
        </header>

        {!sedeId ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Package size={64} className="text-outline" />
            <p className="text-lg font-bold text-secondary">
              Selecciona una sede para ver el inventario
            </p>
          </div>
        ) : (
          <>
            {stockQuery.data && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-surface-container-low p-5 rounded-2xl border-l-4 border-primary">
                  <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">
                    Productos en {sedeSeleccionada?.nombre}
                  </p>
                  <p className="text-2xl font-black text-on-secondary-fixed">
                    {stockQuery.data.length}
                  </p>
                </div>
                <div
                  className="p-5 rounded-2xl border-l-4"
                  style={{ backgroundColor: '#ffdad6', borderColor: '#ba1a1a' }}
                >
                  <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">
                    Alertas de stock
                  </p>
                  <p className="text-2xl font-black" style={{ color: '#ba1a1a' }}>
                    {totalAlertas}
                  </p>
                </div>
                <div
                  className="p-5 rounded-2xl border-l-4"
                  style={{ backgroundColor: '#fff3e0', borderColor: '#e65100' }}
                >
                  <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">
                    Agotados
                  </p>
                  <p className="text-2xl font-black" style={{ color: '#e65100' }}>
                    {totalAgotados}
                  </p>
                </div>
                <div
                  className="p-5 rounded-2xl border-l-4"
                  style={{ backgroundColor: '#e8f5e9', borderColor: '#2e7d32' }}
                >
                  <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">
                    Cobertura promedio
                  </p>
                  <p className="text-2xl font-black" style={{ color: '#2e7d32' }}>
                    {coberturaPromedio}%
                  </p>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-4 sm:p-5">
              <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
                <div className="flex items-center gap-2 text-secondary">
                  <Filter size={16} />
                  <p className="text-sm font-bold uppercase tracking-wider">Filtros y orden</p>
                </div>
                <button
                  onClick={limpiarFiltros}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-outline-variant/30 text-xs font-bold text-secondary hover:bg-surface-container"
                >
                  <RotateCcw size={14} /> Limpiar
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mt-3">
                <label className="rounded-xl border border-outline-variant/30 bg-white px-3 py-2.5 flex items-center gap-2">
                  <Search size={16} className="text-secondary" />
                  <input
                    value={busqueda}
                    onChange={(e) => {
                      setBusqueda(e.target.value);
                      setPagina(1);
                    }}
                    className="w-full bg-transparent outline-none text-sm"
                    placeholder="Buscar por ID, nombre, SKU o codigo"
                  />
                </label>

                <select
                  value={estadoFiltro}
                  onChange={(e) => {
                    setEstadoFiltro(e.target.value as EstadoFiltro);
                    setPagina(1);
                  }}
                  className="rounded-xl border border-outline-variant/30 bg-white px-3 py-2.5 text-sm font-semibold"
                >
                  <option value="TODOS">Estado: Todos</option>
                  <option value="ALERTA">Solo alertas</option>
                  <option value="OK">Solo OK</option>
                </select>

                <label className="rounded-xl border border-outline-variant/30 bg-white px-3 py-2.5 text-sm font-semibold flex items-center gap-2">
                  <ArrowUpDown size={14} className="text-secondary" />
                  <select
                    value={orden}
                    onChange={(e) => setOrden(e.target.value as OrdenStock)}
                    className="w-full bg-transparent outline-none"
                  >
                    <option value="CRITICIDAD">Orden: Criticidad</option>
                    <option value="CANTIDAD_ASC">Cantidad ascendente</option>
                    <option value="CANTIDAD_DESC">Cantidad descendente</option>
                    <option value="VARIANTE">Variante (A-Z)</option>
                  </select>
                </label>

                <select
                  value={tamanoPagina}
                  onChange={(e) => {
                    setTamanoPagina(Number(e.target.value));
                    setPagina(1);
                  }}
                  className="rounded-xl border border-outline-variant/30 bg-white px-3 py-2.5 text-sm font-semibold"
                >
                  <option value={10}>10 por pagina</option>
                  <option value={20}>20 por pagina</option>
                  <option value={50}>50 por pagina</option>
                </select>
              </div>

              <p className="text-xs text-secondary mt-3">
                Mostrando {stockPaginado.length} de {stockFiltrado.length} registros filtrados (
                {totalOk} sin alerta / {totalAlertas} alertas)
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl shadow-sm border border-outline-variant/10">
              {stockQuery.isLoading ? (
                <div className="p-6 space-y-3">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : stockPaginado.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <CheckCircle size={48} className="text-outline" />
                  <p className="text-sm font-bold text-secondary">
                    No hay datos para los filtros aplicados
                  </p>
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-surface-container-highest text-on-surface-variant font-bold text-xs uppercase tracking-widest">
                      <th className="px-4 py-4 text-center">
                        <button
                          onClick={() => {
                            if (allPageSelected) {
                              setSeleccionados((prev) => {
                                const next = { ...prev };
                                stockPaginado.forEach((s) => {
                                  delete next[s.id];
                                });
                                return next;
                              });
                            } else {
                              setSeleccionados((prev) => {
                                const next = { ...prev };
                                stockPaginado.forEach((s) => {
                                  next[s.id] = true;
                                });
                                return next;
                              });
                            }
                          }}
                          className="p-1 rounded hover:bg-surface-container"
                          title={allPageSelected ? 'Deseleccionar pagina' : 'Seleccionar pagina'}
                        >
                          {allPageSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                        </button>
                      </th>
                      <th className="px-6 py-4">Producto / Variante</th>
                      <th className="px-6 py-4 text-right">Existencias actuales</th>
                      <th className="px-6 py-4 text-right">Minimo</th>
                      <th className="px-6 py-4 text-center">Criticidad</th>
                      <th className="px-6 py-4 text-center">Estado</th>
                      <th className="px-6 py-4 text-center">Ajuste</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {stockPaginado.map((stock, i) => {
                      const alerta = stock.cantidad <= stock.stockMinimo;
                      const deficit = stock.cantidad - stock.stockMinimo;
                      const criticidad = getCriticidad(stock);
                      return (
                        <tr
                          key={stock.id}
                          className={`border-b border-outline-variant/5 ${i % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low'}`}
                        >
                          <td className="px-4 py-4 text-center">
                            <button
                              onClick={() =>
                                setSeleccionados((prev) => ({
                                  ...prev,
                                  [stock.id]: !prev[stock.id],
                                }))
                              }
                              className="p-1 rounded hover:bg-surface-container"
                              title={seleccionados[stock.id] ? 'Deseleccionar' : 'Seleccionar'}
                            >
                              {seleccionados[stock.id] ? (
                                <CheckSquare size={16} />
                              ) : (
                                <Square size={16} />
                              )}
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-bold text-on-surface">
                              {stock.nombreVariante ?? stock.varianteId}
                            </p>
                            <p className="text-xs text-secondary">
                              {stock.nombreProducto ?? stock.varianteId}
                            </p>
                            {(stock.skuVariante || stock.codigoBarrasVariante) && (
                              <p
                                className="text-[11px] text-secondary/80"
                                title={`SKU: ${stock.skuVariante ?? '-'} | Barras: ${stock.codigoBarrasVariante ?? '-'}`}
                              >
                                SKU: {stock.skuVariante ?? '-'} | Barras:{' '}
                                {stock.codigoBarrasVariante ?? '-'}
                              </p>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span
                              className={`text-lg font-black ${alerta ? 'text-error' : 'text-on-surface'}`}
                            >
                              {stock.cantidad}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right text-secondary">
                            {stock.stockMinimo}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span
                              className="px-3 py-1 rounded-full text-xs font-bold"
                              style={
                                criticidad === 'CRITICO'
                                  ? { backgroundColor: '#ffdad6', color: '#ba1a1a' }
                                  : criticidad === 'MEDIO'
                                    ? { backgroundColor: '#fff3e0', color: '#e65100' }
                                    : { backgroundColor: '#e8f5e9', color: '#2e7d32' }
                              }
                            >
                              {criticidad === 'CRITICO'
                                ? '🔴 Critico'
                                : criticidad === 'MEDIO'
                                  ? '🟡 Medio'
                                  : '🟢 Sano'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span
                              className="px-3 py-1 rounded-full text-xs font-bold"
                              style={
                                alerta
                                  ? { backgroundColor: '#ffdad6', color: '#ba1a1a' }
                                  : { backgroundColor: '#e8f5e9', color: '#2e7d32' }
                              }
                            >
                              {alerta ? `Alerta (${Math.abs(deficit)} faltante)` : 'OK'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => setStockAjuste(stock)}
                              className="p-2 rounded-lg hover:bg-surface-container text-secondary hover:text-primary transition-colors"
                            >
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

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-secondary">
                Pagina {paginaSegura} de {totalPaginas}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  disabled={paginaSegura <= 1}
                  className="px-3 py-1.5 rounded-lg border border-outline-variant/30 text-sm font-bold text-secondary disabled:opacity-40"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                  disabled={paginaSegura >= totalPaginas}
                  className="px-3 py-1.5 rounded-lg border border-outline-variant/30 text-sm font-bold text-secondary disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            </div>

            <section className="rounded-2xl border border-outline-variant/20 overflow-hidden">
              <div
                className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                style={{ backgroundColor: '#f6f2f4' }}
              >
                <div className="flex items-center gap-2">
                  <History size={18} className="text-secondary" />
                  <h3 className="text-sm font-black uppercase tracking-wider text-on-secondary-fixed">
                    Movimientos recientes
                  </h3>
                </div>
                <select
                  value={filtroMovimiento}
                  onChange={(e) => setFiltroMovimiento(e.target.value as 'TODOS' | TipoMovimiento)}
                  className="rounded-lg border border-outline-variant/30 bg-white px-3 py-2 text-sm font-semibold"
                >
                  <option value="TODOS">Todos los tipos</option>
                  <option value={TipoMovimiento.ENTRADA}>Entradas</option>
                  <option value={TipoMovimiento.SALIDA}>Salidas</option>
                  <option value={TipoMovimiento.AJUSTE}>Ajustes</option>
                  <option value={TipoMovimiento.DEVOLUCION}>Devoluciones</option>
                  <option value={TipoMovimiento.TRASLADO}>Traslados</option>
                </select>
              </div>

              <div className="overflow-auto">
                {movimientosQuery.isLoading ? (
                  <div className="p-5 space-y-2">
                    {[...Array(4)].map((_, i) => (
                      <Skeleton key={i} className="h-10" />
                    ))}
                  </div>
                ) : movimientosFiltrados.length === 0 ? (
                  <div className="p-8 text-center text-sm font-semibold text-secondary">
                    No hay movimientos para los filtros seleccionados.
                  </div>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-surface-container-highest text-on-surface-variant font-bold text-xs uppercase tracking-widest">
                        <th className="px-5 py-3">Fecha</th>
                        <th className="px-5 py-3">Tipo</th>
                        <th className="px-5 py-3">Producto / Variante</th>
                        <th className="px-5 py-3 text-right">Cantidad</th>
                        <th className="px-5 py-3">Motivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movimientosFiltrados.map((m, idx) => {
                        const esEntrada = [
                          TipoMovimiento.ENTRADA,
                          TipoMovimiento.AJUSTE,
                          TipoMovimiento.DEVOLUCION,
                        ].includes(m.tipo);
                        return (
                          <tr
                            key={m.id}
                            className={`border-t border-outline-variant/10 ${idx % 2 === 0 ? 'bg-white' : 'bg-surface-container-lowest'}`}
                          >
                            <td className="px-5 py-3 text-secondary">
                              {new Date(m.createdAt).toLocaleString('es-CO')}
                            </td>
                            <td className="px-5 py-3 font-bold text-on-surface">{m.tipo}</td>
                            <td className="px-5 py-3">
                              <p className="font-semibold text-on-surface">
                                {m.nombreVariante ?? m.varianteId}
                              </p>
                              <p className="text-xs text-secondary">
                                {m.nombreProducto ?? m.varianteId}
                              </p>
                              {(m.skuVariante || m.codigoBarrasVariante) && (
                                <p
                                  className="text-[11px] text-secondary/80"
                                  title={`SKU: ${m.skuVariante ?? '-'} | Barras: ${m.codigoBarrasVariante ?? '-'}`}
                                >
                                  SKU: {m.skuVariante ?? '-'} | Barras:{' '}
                                  {m.codigoBarrasVariante ?? '-'}
                                </p>
                              )}
                            </td>
                            <td
                              className={`px-5 py-3 text-right font-black ${esEntrada ? 'text-green-700' : 'text-error'}`}
                            >
                              {esEntrada ? '+' : '-'}
                              {m.cantidad}
                            </td>
                            <td className="px-5 py-3 text-secondary">{m.motivo || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
}
