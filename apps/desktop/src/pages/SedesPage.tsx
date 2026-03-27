import { useQuery } from '@tanstack/react-query';
import { ISede } from '@cosmeticos/shared-types';
import api from '../lib/api';

async function getSedes(): Promise<ISede[]> {
  const { data } = await api.get('/sedes');
  return data;
}

export default function SedesPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['sedes'],
    queryFn: getSedes,
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Sedes</h1>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {isLoading && <p className="p-6 text-gray-500">Cargando sedes...</p>}
          {isError && <p className="p-6 text-red-500">No fue posible cargar las sedes.</p>}

          {!isLoading && !isError && (
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="text-left px-4 py-3">Nombre</th>
                  <th className="text-left px-4 py-3">Ciudad</th>
                  <th className="text-left px-4 py-3">Direccion</th>
                  <th className="text-left px-4 py-3">Tipo</th>
                  <th className="text-left px-4 py-3">Telefono</th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((sede) => (
                  <tr key={sede.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 text-gray-800">{sede.nombre}</td>
                    <td className="px-4 py-3 text-gray-700">{sede.ciudad}</td>
                    <td className="px-4 py-3 text-gray-700">{sede.direccion}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-700">
                        {sede.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{sede.telefono ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
