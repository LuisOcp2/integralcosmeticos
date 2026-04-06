import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AppLayout from './components/AppLayout';
import api from '../lib/api';

type Tab = 'INMUEBLES' | 'CONTRATOS' | 'PAGOS';

type Inmueble = {
  id: string;
  codigo: string;
  tipo: string;
  negocio: string;
  estado: string;
  ciudad: string;
  direccion: string;
  valorArriendo?: number;
  valorVenta?: number;
};

type Contrato = {
  id: string;
  inmuebleId: string;
  fechaInicio: string;
  fechaFin: string;
  canonMensual: number;
  estado: string;
};

type PagoPendiente = {
  id: string;
  contratoId: string;
  mes: number;
  anio: number;
  monto: number;
  estado: string;
  fechaVencimiento: string;
};

const tabs: Array<{ key: Tab; label: string }> = [
  { key: 'INMUEBLES', label: 'Inmuebles' },
  { key: 'CONTRATOS', label: 'Contratos' },
  { key: 'PAGOS', label: 'Pagos' },
];

export default function InmobiliariaPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('INMUEBLES');

  const [nuevoInmueble, setNuevoInmueble] = useState({
    tipo: 'APARTAMENTO',
    negocio: 'ARRIENDO',
    direccion: '',
    ciudad: '',
    areaTotalM2: '',
  });

  const [nuevoContrato, setNuevoContrato] = useState({
    inmuebleId: '',
    arrendatarioId: '',
    propietarioId: '',
    fechaInicio: '',
    fechaFin: '',
    duracionMeses: '',
    canonMensual: '',
    deposito: '',
  });

  const [registroPago, setRegistroPago] = useState({
    contratoId: '',
    mes: '',
    anio: '',
    monto: '',
  });

  const inmueblesQuery = useQuery({
    queryKey: ['inmobiliaria', 'inmuebles'],
    queryFn: async () => {
      const { data } = await api.get<Inmueble[]>('/verticales/inmobiliaria/inmuebles');
      return data;
    },
  });

  const contratosQuery = useQuery({
    queryKey: ['inmobiliaria', 'contratos'],
    queryFn: async () => {
      const { data } = await api.get<Contrato[]>('/verticales/inmobiliaria/contratos');
      return data;
    },
  });

  const pagosPendientesQuery = useQuery({
    queryKey: ['inmobiliaria', 'pagos-pendientes'],
    queryFn: async () => {
      const { data } = await api.get<PagoPendiente[]>('/verticales/inmobiliaria/pagos/pendientes');
      return data;
    },
  });

  const crearInmuebleMutation = useMutation({
    mutationFn: async () => {
      await api.post('/verticales/inmobiliaria/inmuebles', {
        tipo: nuevoInmueble.tipo,
        negocio: nuevoInmueble.negocio,
        direccion: nuevoInmueble.direccion,
        ciudad: nuevoInmueble.ciudad,
        areaTotalM2: Number(nuevoInmueble.areaTotalM2 || 0),
      });
    },
    onSuccess: () => {
      setNuevoInmueble({
        tipo: 'APARTAMENTO',
        negocio: 'ARRIENDO',
        direccion: '',
        ciudad: '',
        areaTotalM2: '',
      });
      void queryClient.invalidateQueries({ queryKey: ['inmobiliaria', 'inmuebles'] });
    },
  });

  const crearContratoMutation = useMutation({
    mutationFn: async () => {
      await api.post('/verticales/inmobiliaria/contratos', {
        inmuebleId: nuevoContrato.inmuebleId,
        arrendatarioId: nuevoContrato.arrendatarioId,
        propietarioId: nuevoContrato.propietarioId,
        fechaInicio: nuevoContrato.fechaInicio,
        fechaFin: nuevoContrato.fechaFin,
        duracionMeses: Number(nuevoContrato.duracionMeses || 0),
        canonMensual: Number(nuevoContrato.canonMensual || 0),
        deposito: Number(nuevoContrato.deposito || 0),
      });
    },
    onSuccess: () => {
      setNuevoContrato({
        inmuebleId: '',
        arrendatarioId: '',
        propietarioId: '',
        fechaInicio: '',
        fechaFin: '',
        duracionMeses: '',
        canonMensual: '',
        deposito: '',
      });
      void queryClient.invalidateQueries({ queryKey: ['inmobiliaria', 'contratos'] });
    },
  });

  const registrarPagoMutation = useMutation({
    mutationFn: async () => {
      await api.post('/verticales/inmobiliaria/pagos/registrar', {
        contratoId: registroPago.contratoId,
        mes: Number(registroPago.mes || 0),
        anio: Number(registroPago.anio || 0),
        monto: Number(registroPago.monto || 0),
      });
    },
    onSuccess: () => {
      setRegistroPago({ contratoId: '', mes: '', anio: '', monto: '' });
      void queryClient.invalidateQueries({ queryKey: ['inmobiliaria', 'pagos-pendientes'] });
    },
  });

  const contratosMap = useMemo(() => {
    const map = new Map<string, Contrato>();
    (contratosQuery.data ?? []).forEach((contrato) => map.set(contrato.id, contrato));
    return map;
  }, [contratosQuery.data]);

  const onSubmitInmueble = (e: FormEvent) => {
    e.preventDefault();
    crearInmuebleMutation.mutate();
  };

  const onSubmitContrato = (e: FormEvent) => {
    e.preventDefault();
    crearContratoMutation.mutate();
  };

  const onSubmitPago = (e: FormEvent) => {
    e.preventDefault();
    registrarPagoMutation.mutate();
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-on-secondary-fixed">
            Inmobiliaria
          </h1>
          <p className="mt-1 text-secondary">
            Operación de inmuebles, contratos y recaudo de arriendos.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-lg px-4 py-2 text-sm font-bold ${
                activeTab === tab.key ? 'bg-primary text-on-primary' : 'bg-white text-on-surface'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'INMUEBLES' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <form
              onSubmit={onSubmitInmueble}
              className="space-y-3 rounded-xl border border-outline-variant bg-white p-4"
            >
              <h2 className="text-lg font-black text-on-surface">Nuevo inmueble</h2>
              <input
                className="w-full rounded-lg border border-outline-variant px-3 py-2"
                placeholder="Tipo"
                value={nuevoInmueble.tipo}
                onChange={(e) => setNuevoInmueble((prev) => ({ ...prev, tipo: e.target.value }))}
              />
              <input
                className="w-full rounded-lg border border-outline-variant px-3 py-2"
                placeholder="Negocio"
                value={nuevoInmueble.negocio}
                onChange={(e) => setNuevoInmueble((prev) => ({ ...prev, negocio: e.target.value }))}
              />
              <input
                className="w-full rounded-lg border border-outline-variant px-3 py-2"
                placeholder="Direccion"
                value={nuevoInmueble.direccion}
                onChange={(e) =>
                  setNuevoInmueble((prev) => ({ ...prev, direccion: e.target.value }))
                }
              />
              <input
                className="w-full rounded-lg border border-outline-variant px-3 py-2"
                placeholder="Ciudad"
                value={nuevoInmueble.ciudad}
                onChange={(e) => setNuevoInmueble((prev) => ({ ...prev, ciudad: e.target.value }))}
              />
              <input
                className="w-full rounded-lg border border-outline-variant px-3 py-2"
                placeholder="Area m2"
                value={nuevoInmueble.areaTotalM2}
                onChange={(e) =>
                  setNuevoInmueble((prev) => ({ ...prev, areaTotalM2: e.target.value }))
                }
              />
              <button
                className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary"
                type="submit"
              >
                Guardar inmueble
              </button>
            </form>

            <div className="space-y-3 rounded-xl border border-outline-variant bg-white p-4">
              <h2 className="text-lg font-black text-on-surface">Inventario</h2>
              {(inmueblesQuery.data ?? []).map((inmueble) => (
                <div key={inmueble.id} className="rounded-lg border border-outline-variant p-3">
                  <div className="font-bold text-on-surface">
                    {inmueble.codigo} - {inmueble.tipo}
                  </div>
                  <div className="text-sm text-on-surface-variant">
                    {inmueble.ciudad} | {inmueble.negocio} | {inmueble.estado}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'CONTRATOS' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <form
              onSubmit={onSubmitContrato}
              className="space-y-3 rounded-xl border border-outline-variant bg-white p-4"
            >
              <h2 className="text-lg font-black text-on-surface">Nuevo contrato</h2>
              <input
                className="w-full rounded-lg border border-outline-variant px-3 py-2"
                placeholder="Inmueble ID"
                value={nuevoContrato.inmuebleId}
                onChange={(e) =>
                  setNuevoContrato((prev) => ({ ...prev, inmuebleId: e.target.value }))
                }
              />
              <input
                className="w-full rounded-lg border border-outline-variant px-3 py-2"
                placeholder="Arrendatario ID"
                value={nuevoContrato.arrendatarioId}
                onChange={(e) =>
                  setNuevoContrato((prev) => ({ ...prev, arrendatarioId: e.target.value }))
                }
              />
              <input
                className="w-full rounded-lg border border-outline-variant px-3 py-2"
                placeholder="Propietario ID"
                value={nuevoContrato.propietarioId}
                onChange={(e) =>
                  setNuevoContrato((prev) => ({ ...prev, propietarioId: e.target.value }))
                }
              />
              <input
                className="w-full rounded-lg border border-outline-variant px-3 py-2"
                type="date"
                value={nuevoContrato.fechaInicio}
                onChange={(e) =>
                  setNuevoContrato((prev) => ({ ...prev, fechaInicio: e.target.value }))
                }
              />
              <input
                className="w-full rounded-lg border border-outline-variant px-3 py-2"
                type="date"
                value={nuevoContrato.fechaFin}
                onChange={(e) =>
                  setNuevoContrato((prev) => ({ ...prev, fechaFin: e.target.value }))
                }
              />
              <input
                className="w-full rounded-lg border border-outline-variant px-3 py-2"
                placeholder="Duracion meses"
                value={nuevoContrato.duracionMeses}
                onChange={(e) =>
                  setNuevoContrato((prev) => ({ ...prev, duracionMeses: e.target.value }))
                }
              />
              <input
                className="w-full rounded-lg border border-outline-variant px-3 py-2"
                placeholder="Canon mensual"
                value={nuevoContrato.canonMensual}
                onChange={(e) =>
                  setNuevoContrato((prev) => ({ ...prev, canonMensual: e.target.value }))
                }
              />
              <input
                className="w-full rounded-lg border border-outline-variant px-3 py-2"
                placeholder="Deposito"
                value={nuevoContrato.deposito}
                onChange={(e) =>
                  setNuevoContrato((prev) => ({ ...prev, deposito: e.target.value }))
                }
              />
              <button
                className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary"
                type="submit"
              >
                Guardar contrato
              </button>
            </form>

            <div className="space-y-3 rounded-xl border border-outline-variant bg-white p-4">
              <h2 className="text-lg font-black text-on-surface">Contratos vigentes</h2>
              {(contratosQuery.data ?? []).map((contrato) => (
                <div key={contrato.id} className="rounded-lg border border-outline-variant p-3">
                  <div className="font-bold text-on-surface">
                    Contrato {contrato.id.slice(0, 8)}
                  </div>
                  <div className="text-sm text-on-surface-variant">
                    Canon: ${Number(contrato.canonMensual).toLocaleString('es-CO')} | Estado:{' '}
                    {contrato.estado}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'PAGOS' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <form
              onSubmit={onSubmitPago}
              className="space-y-3 rounded-xl border border-outline-variant bg-white p-4"
            >
              <h2 className="text-lg font-black text-on-surface">Registrar pago</h2>
              <input
                className="w-full rounded-lg border border-outline-variant px-3 py-2"
                placeholder="Contrato ID"
                value={registroPago.contratoId}
                onChange={(e) =>
                  setRegistroPago((prev) => ({ ...prev, contratoId: e.target.value }))
                }
              />
              <input
                className="w-full rounded-lg border border-outline-variant px-3 py-2"
                placeholder="Mes"
                value={registroPago.mes}
                onChange={(e) => setRegistroPago((prev) => ({ ...prev, mes: e.target.value }))}
              />
              <input
                className="w-full rounded-lg border border-outline-variant px-3 py-2"
                placeholder="Ano"
                value={registroPago.anio}
                onChange={(e) => setRegistroPago((prev) => ({ ...prev, anio: e.target.value }))}
              />
              <input
                className="w-full rounded-lg border border-outline-variant px-3 py-2"
                placeholder="Monto"
                value={registroPago.monto}
                onChange={(e) => setRegistroPago((prev) => ({ ...prev, monto: e.target.value }))}
              />
              <button
                className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary"
                type="submit"
              >
                Registrar
              </button>
            </form>

            <div className="space-y-3 rounded-xl border border-outline-variant bg-white p-4">
              <h2 className="text-lg font-black text-on-surface">Pendientes</h2>
              {(pagosPendientesQuery.data ?? []).map((pago) => (
                <div key={pago.id} className="rounded-lg border border-outline-variant p-3">
                  <div className="font-bold text-on-surface">
                    {pago.mes}/{pago.anio} - ${Number(pago.monto).toLocaleString('es-CO')}
                  </div>
                  <div className="text-sm text-on-surface-variant">
                    Contrato:{' '}
                    {contratosMap.get(pago.contratoId)?.id.slice(0, 8) ??
                      pago.contratoId.slice(0, 8)}{' '}
                    | Vence: {pago.fechaVencimiento}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
