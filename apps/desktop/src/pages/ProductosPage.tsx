import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ICategoria, IMarca, IProducto } from '@cosmeticos/shared-types';
import api from '../lib/api';

async function getCategorias(): Promise<ICategoria[]> {
  const { data } = await api.get('/categorias');
  return data;
}

async function getMarcas(): Promise<IMarca[]> {
  const { data } = await api.get('/marcas');
  return data;
}

async function getProductos(categoriaId?: string, marcaId?: string): Promise<IProducto[]> {
  const { data } = await api.get('/productos', {
    params: {
      categoriaId: categoriaId || undefined,
      marcaId: marcaId || undefined,
    },
  });
  return data;
}

export default function ProductosPage() {
  const [categoriaId, setCategoriaId] = useState('');
  const [marcaId, setMarcaId] = useState('');

  const categoriasQuery = useQuery({ queryKey: ['categorias'], queryFn: getCategorias });
  const marcasQuery = useQuery({ queryKey: ['marcas'], queryFn: getMarcas });

  const productosQuery = useQuery({
    queryKey: ['productos', categoriaId, marcaId],
    queryFn: () => getProductos(categoriaId, marcaId),
  });

  const filtrosActivos = useMemo(() => ({ categoriaId, marcaId }), [categoriaId, marcaId]);
  const categoriasMap = useMemo(
    () =>
      new Map((categoriasQuery.data ?? []).map((categoria) => [categoria.id, categoria.nombre])),
    [categoriasQuery.data],
  );
  const marcasMap = useMemo(
    () => new Map((marcasQuery.data ?? []).map((marca) => [marca.id, marca.nombre])),
    [marcasQuery.data],
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Productos</h1>

        <div className="bg-white rounded-xl shadow-sm p-4 mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <select
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="">Todas las categorias</option>
            {(categoriasQuery.data ?? []).map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.nombre}
              </option>
            ))}
          </select>

          <select
            value={marcaId}
            onChange={(e) => setMarcaId(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="">Todas las marcas</option>
            {(marcasQuery.data ?? []).map((marca) => (
              <option key={marca.id} value={marca.id}>
                {marca.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {(categoriasQuery.isLoading || marcasQuery.isLoading || productosQuery.isLoading) && (
            <p className="p-6 text-gray-500">Cargando productos...</p>
          )}

          {(categoriasQuery.isError || marcasQuery.isError || productosQuery.isError) && (
            <p className="p-6 text-red-500">No fue posible cargar el catalogo.</p>
          )}

          {!categoriasQuery.isLoading &&
            !marcasQuery.isLoading &&
            !productosQuery.isLoading &&
            !categoriasQuery.isError &&
            !marcasQuery.isError &&
            !productosQuery.isError && (
              <>
                <div className="px-4 py-3 bg-gray-100 text-xs text-gray-600">
                  Filtros: categoria={filtrosActivos.categoriaId || 'todas'} | marca=
                  {filtrosActivos.marcaId || 'todas'}
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="text-left px-4 py-3">Nombre</th>
                      <th className="text-left px-4 py-3">Categoria</th>
                      <th className="text-left px-4 py-3">Marca</th>
                      <th className="text-left px-4 py-3">Precio Base</th>
                      <th className="text-left px-4 py-3">Precio Costo</th>
                      <th className="text-left px-4 py-3">IVA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(productosQuery.data ?? []).map((producto) => (
                      <tr key={producto.id} className="border-t border-gray-100">
                        <td className="px-4 py-3 text-gray-800">{producto.nombre}</td>
                        <td className="px-4 py-3 text-gray-700">
                          {categoriasMap.get(producto.categoriaId) ?? producto.categoriaId}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {marcasMap.get(producto.marcaId) ?? producto.marcaId}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          ${Number(producto.precioBase).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          ${Number(producto.precioCosto).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {Number(producto.iva).toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
        </div>
      </div>
    </div>
  );
}
