import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { IStockSede, ISede } from '@cosmeticos/shared-types';
import api from '../lib/api';

type StockConAlerta = IStockSede & {
  alertaStockMinimo: boolean;
};

async function getSedes(): Promise<ISede[]> {
  const { data } = await api.get('/sedes');
  return data;
}

async function getStockPorSede(sedeId: string): Promise<StockConAlerta[]> {
  if (!sedeId) {
    return [];
  }
  const { data } = await api.get(`/inventario/stock/${sedeId}`);
  return data;
}

export default function InventarioPage() {
  const [sedeId, setSedeId] = useState('');

  const sedesQuery = useQuery({
    queryKey: ['sedes', 'inventario'],
    queryFn: getSedes,
  });

  const stockQuery = useQuery({
    queryKey: ['inventario', 'stock', sedeId],
    queryFn: () => getStockPorSede(sedeId),
    enabled: Boolean(sedeId),
  });

  const sedeSeleccionada = useMemo(
    () => (sedesQuery.data ?? []).find((sede) => sede.id === sedeId),
    [sedesQuery.data, sedeId],
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Inventario por sede</h1>

        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <label className="block text-sm text-gray-600 mb-2">Selecciona una sede</label>
          <select
            value={sedeId}
            onChange={(e) => setSedeId(e.target.value)}
            className="w-full md:w-96 border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="">-- Seleccionar --</option>
            {(sedesQuery.data ?? []).map((sede) => (
              <option key={sede.id} value={sede.id}>
                {sede.nombre} ({sede.ciudad})
              </option>
            ))}
          </select>
        </div>

        {sedeSeleccionada && (
          <p className="text-sm text-gray-600 mb-3">
            Mostrando stock de: <span className="font-semibold">{sedeSeleccionada.nombre}</span>
          </p>
        )}

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {sedesQuery.isLoading && <p className="p-6 text-gray-500">Cargando sedes...</p>}
          {sedesQuery.isError && (
            <p className="p-6 text-red-500">No fue posible cargar las sedes.</p>
          )}

          {!sedeId && !sedesQuery.isLoading && !sedesQuery.isError && (
            <p className="p-6 text-gray-500">Selecciona una sede para consultar el inventario.</p>
          )}

          {sedeId && stockQuery.isLoading && <p className="p-6 text-gray-500">Cargando stock...</p>}
          {sedeId && stockQuery.isError && (
            <p className="p-6 text-red-500">No fue posible cargar el stock de la sede.</p>
          )}

          {sedeId && !stockQuery.isLoading && !stockQuery.isError && (
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="text-left px-4 py-3">Variante ID</th>
                  <th className="text-left px-4 py-3">Cantidad</th>
                  <th className="text-left px-4 py-3">Stock Minimo</th>
                  <th className="text-left px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {(stockQuery.data ?? []).map((stock) => {
                  const bajoMinimo = stock.cantidad < stock.stockMinimo;

                  return (
                    <tr key={stock.id} className="border-t border-gray-100">
                      <td className="px-4 py-3 text-gray-700">{stock.varianteId}</td>
                      <td className="px-4 py-3 text-gray-800 font-medium">{stock.cantidad}</td>
                      <td className="px-4 py-3 text-gray-700">{stock.stockMinimo}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            bajoMinimo ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {bajoMinimo ? 'Stock bajo' : 'OK'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
