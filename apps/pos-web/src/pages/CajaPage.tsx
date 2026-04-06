import { useMemo, useState } from 'react';
import { Banknote, CreditCard, ReceiptText, Wallet } from 'lucide-react';
import {
  useAbrirCaja,
  useCajaActiva,
  useCerrarCaja,
  useHistorialCaja,
  useVentasDiaCaja,
} from '@/hooks/useCaja';

const formatCOP = (v: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(v);

interface CajaPageProps {
  sedeId: string;
}

export default function CajaPage({ sedeId }: CajaPageProps) {
  const [montoInicial, setMontoInicial] = useState('0');
  const [montoFinal, setMontoFinal] = useState('0');
  const [confirmandoCierre, setConfirmandoCierre] = useState(false);

  const cajaActivaQuery = useCajaActiva(sedeId);
  const cajaActiva = cajaActivaQuery.data;

  const historialQuery = useHistorialCaja(sedeId);
  const ventasDiaQuery = useVentasDiaCaja(sedeId, Boolean(cajaActiva));

  const abrirCaja = useAbrirCaja(sedeId);
  const cerrarCaja = useCerrarCaja(sedeId);

  const ventasHoy = useMemo(() => ventasDiaQuery.data ?? [], [ventasDiaQuery.data]);

  const totalVentasDia = useMemo(
    () => ventasHoy.reduce((acc, venta) => acc + Number(venta.total), 0),
    [ventasHoy],
  );

  const totalTarjetaDia = useMemo(
    () =>
      ventasHoy
        .filter((venta) => venta.metodoPago !== 'EFECTIVO')
        .reduce((acc, venta) => acc + Number(venta.total), 0),
    [ventasHoy],
  );

  const esperado = Number(cajaActiva?.montoSistema ?? 0);
  const diferencia = Number(montoFinal || 0) - esperado;
  const puedeAbrir = Number(montoInicial || 0) >= 0;
  const montoFinalNumero = Number(montoFinal);
  const puedeCerrar = Number.isFinite(montoFinalNumero) && montoFinalNumero >= 0;

  return (
    <div className="h-full w-full overflow-y-auto p-5 bg-background">
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="rounded-3xl border border-outline-variant bg-surface-1 p-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-on-surface-variant font-bold">
                Modulo Caja
              </p>
              <h1 className="text-3xl font-extrabold text-on-background mt-1">
                Apertura y cierre de turno
              </h1>
              <p className="text-sm text-on-surface-variant mt-1">
                Control de efectivo, transacciones del dia y arqueo final por sede.
              </p>
            </div>
            <div
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${
                cajaActiva
                  ? 'bg-tertiary-container text-on-tertiary-container'
                  : 'bg-secondary-container text-on-secondary-container'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-current" />
              {cajaActiva ? 'Caja activa' : 'Caja cerrada'}
            </div>
          </div>
        </div>

        {cajaActiva ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="rounded-3xl border border-outline-variant bg-surface p-4">
                <p className="text-xs uppercase tracking-wide text-on-surface-variant font-semibold">
                  Monto inicial
                </p>
                <p className="text-2xl font-extrabold text-on-background mt-1">
                  {formatCOP(Number(cajaActiva.montoInicial))}
                </p>
              </div>
              <div className="rounded-3xl border border-outline-variant bg-surface p-4">
                <p className="text-xs uppercase tracking-wide text-on-surface-variant font-semibold">
                  Efectivo acumulado
                </p>
                <p className="text-2xl font-extrabold text-on-background mt-1">
                  {formatCOP(Number(cajaActiva.totalEfectivo))}
                </p>
              </div>
              <div className="rounded-3xl border border-outline-variant bg-surface p-4">
                <p className="text-xs uppercase tracking-wide text-on-surface-variant font-semibold">
                  Total ventas dia
                </p>
                <p className="text-2xl font-extrabold text-on-background mt-1">
                  {formatCOP(totalVentasDia)}
                </p>
              </div>
              <div className="rounded-3xl border border-outline-variant bg-surface p-4">
                <p className="text-xs uppercase tracking-wide text-on-surface-variant font-semibold">
                  Esperado en caja
                </p>
                <p className="text-2xl font-extrabold text-on-background mt-1">
                  {formatCOP(esperado)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
              <div className="xl:col-span-2 rounded-3xl border border-outline-variant bg-surface overflow-hidden">
                <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between">
                  <h2 className="text-lg font-bold text-on-background">Transacciones del dia</h2>
                  <span className="text-sm text-on-surface-variant font-medium">
                    {ventasHoy.length} ventas
                  </span>
                </div>

                {ventasDiaQuery.isLoading ? (
                  <div className="p-5 text-sm text-on-surface-variant">Cargando ventas...</div>
                ) : ventasHoy.length === 0 ? (
                  <div className="p-10 flex flex-col items-center gap-2 text-on-surface-variant">
                    <ReceiptText className="w-10 h-10 opacity-40" />
                    <p className="font-medium">No hay ventas registradas hoy</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-surface-2 text-on-surface-variant uppercase text-xs tracking-wide">
                        <tr>
                          <th className="text-left px-5 py-3">Venta</th>
                          <th className="text-left px-5 py-3">Metodo</th>
                          <th className="text-left px-5 py-3">Hora</th>
                          <th className="text-right px-5 py-3">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ventasHoy.map((venta) => (
                          <tr key={venta.id} className="border-t border-outline-variant">
                            <td className="px-5 py-3 font-semibold text-on-background">
                              {venta.numero}
                            </td>
                            <td className="px-5 py-3 text-on-surface-variant">
                              {venta.metodoPago}
                            </td>
                            <td className="px-5 py-3 text-on-surface-variant">
                              {new Date(venta.createdAt).toLocaleTimeString('es-CO', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="px-5 py-3 text-right font-bold text-on-background">
                              {formatCOP(Number(venta.total))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-outline-variant bg-surface p-5 space-y-4">
                <h2 className="text-lg font-bold text-on-background">Cierre de caja</h2>
                <div className="rounded-2xl bg-surface-2 p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-on-surface-variant">Ventas efectivo</span>
                    <span className="font-bold text-on-background">
                      {formatCOP(Number(cajaActiva.totalEfectivo))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-on-surface-variant">Ventas tarjeta/transf.</span>
                    <span className="font-bold text-on-background">
                      {formatCOP(totalTarjetaDia)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-on-surface-variant">Esperado</span>
                    <span className="font-bold text-on-background">{formatCOP(esperado)}</span>
                  </div>
                </div>

                <label className="text-sm font-medium text-on-surface-variant">
                  Monto contado en caja
                </label>
                <input
                  type="number"
                  min={0}
                  value={montoFinal}
                  onChange={(e) => setMontoFinal(e.target.value)}
                  className="w-full h-12 rounded-2xl border border-outline-variant bg-surface-2 px-4 text-on-background font-semibold"
                />

                <div
                  className={`rounded-2xl p-3 text-sm ${
                    diferencia >= 0
                      ? 'bg-tertiary-container text-on-tertiary-container'
                      : 'bg-error-container text-on-error-container'
                  }`}
                >
                  Diferencia: {diferencia >= 0 ? '+' : ''}
                  {formatCOP(diferencia)}
                </div>

                {confirmandoCierre ? (
                  <div className="rounded-2xl border border-outline-variant p-3 space-y-3">
                    <p className="text-sm text-on-surface-variant">
                      Confirmas el cierre de caja para este turno?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmandoCierre(false)}
                        className="flex-1 h-11 rounded-2xl border border-outline-variant text-sm font-semibold text-on-surface-variant"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={async () => {
                          if (!puedeCerrar) {
                            return;
                          }
                          try {
                            await cerrarCaja.mutateAsync({
                              montoCierre: montoFinalNumero,
                              cajaId: cajaActiva?.id,
                            });
                            setConfirmandoCierre(false);
                            setMontoFinal('0');
                          } catch {
                            // El toast de useCerrarCaja muestra el error del backend.
                          }
                        }}
                        disabled={cerrarCaja.isPending || !puedeCerrar}
                        className="flex-1 h-11 rounded-2xl bg-primary text-on-primary text-sm font-bold disabled:opacity-60"
                      >
                        {cerrarCaja.isPending ? 'Cerrando...' : 'Confirmar'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmandoCierre(true)}
                    className="w-full h-12 rounded-2xl bg-primary text-on-primary font-bold"
                  >
                    Cerrar caja
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <div className="rounded-3xl border border-outline-variant bg-surface p-5 space-y-4">
              <h2 className="text-xl font-bold text-on-background">Apertura de caja</h2>
              <p className="text-sm text-on-surface-variant">
                Registra el fondo inicial para comenzar ventas del turno.
              </p>
              <label className="text-sm font-medium text-on-surface-variant">Monto inicial</label>
              <input
                type="number"
                min={0}
                value={montoInicial}
                onChange={(e) => setMontoInicial(e.target.value)}
                className="w-full h-12 rounded-2xl border border-outline-variant bg-surface-2 px-4 text-on-background font-semibold"
              />
              <div className="rounded-2xl bg-surface-2 p-3 text-sm text-on-surface-variant">
                Monto a registrar:{' '}
                <strong className="text-on-background">
                  {formatCOP(Number(montoInicial || 0))}
                </strong>
              </div>
              <button
                onClick={async () => {
                  try {
                    await abrirCaja.mutateAsync(Number(montoInicial || 0));
                  } catch {
                    // El toast de useAbrirCaja muestra el error del backend.
                  }
                }}
                disabled={abrirCaja.isPending || !puedeAbrir}
                className="w-full h-12 rounded-2xl bg-primary text-on-primary font-bold disabled:opacity-60"
              >
                {abrirCaja.isPending ? 'Abriendo...' : 'Abrir caja'}
              </button>
            </div>

            <div className="rounded-3xl border border-outline-variant bg-surface p-5">
              <h2 className="text-xl font-bold text-on-background">Resumen reciente</h2>
              <p className="text-sm text-on-surface-variant mt-1 mb-4">
                Ultimos cierres registrados en esta sede.
              </p>

              {historialQuery.isLoading ? (
                <p className="text-sm text-on-surface-variant">Cargando historial...</p>
              ) : (historialQuery.data ?? []).length === 0 ? (
                <div className="rounded-2xl bg-surface-2 p-4 text-sm text-on-surface-variant">
                  No existen cierres previos para esta sede.
                </div>
              ) : (
                <div className="space-y-3">
                  {(historialQuery.data ?? []).slice(0, 5).map((sesion) => (
                    <div key={sesion.id} className="rounded-2xl border border-outline-variant p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-on-background">
                          {new Date(sesion.fechaApertura).toLocaleDateString('es-CO')}
                        </p>
                        <span className="text-xs text-on-surface-variant">{sesion.estado}</span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <div className="inline-flex items-center gap-1 text-on-surface-variant">
                          <Wallet className="w-3.5 h-3.5" /> Ini:{' '}
                          {formatCOP(Number(sesion.montoApertura ?? sesion.montoInicial))}
                        </div>
                        <div className="inline-flex items-center gap-1 text-on-surface-variant">
                          <Banknote className="w-3.5 h-3.5" /> Efec:{' '}
                          {formatCOP(Number(sesion.totalEfectivo ?? 0))}
                        </div>
                        <div className="inline-flex items-center gap-1 text-on-surface-variant">
                          <CreditCard className="w-3.5 h-3.5" /> Ventas:{' '}
                          {formatCOP(Number(sesion.totalVentas ?? 0))}
                        </div>
                        <div className="text-on-surface-variant">
                          Dif: {formatCOP(Number(sesion.diferencia ?? 0))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
