import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ICategoria, IMarca, IProducto } from '@cosmeticos/shared-types';
import api from '../lib/api';
import AppLayout from './components/AppLayout';
import { tokens } from '../styles/tokens';

const cop = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

type ProductoForm = {
  nombre: string;
  descripcion: string;
  imagenUrl: string;
  categoriaId: string;
  marcaId: string;
  precioBase: string;
  precioCosto: string;
  iva: string;
};

const emptyForm: ProductoForm = {
  nombre: '',
  descripcion: '',
  imagenUrl: '',
  categoriaId: '',
  marcaId: '',
  precioBase: '0',
  precioCosto: '0',
  iva: '19',
};

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
    params: { categoriaId: categoriaId || undefined, marcaId: marcaId || undefined },
  });
  return data;
}

type ProductoConVariantes = IProducto & {
  variantes?: Array<{
    id: string;
    nombre: string;
    sku?: string;
    precioVenta?: number;
    precioExtra: number;
  }>;
};

function VariantesModal({
  producto,
  onClose,
}: {
  producto: ProductoConVariantes;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4"
      style={{ backgroundColor: 'rgba(46,27,12,0.5)' }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div
          className="px-6 py-5 flex items-center justify-between"
          style={{ backgroundColor: tokens.color.bgDark }}
        >
          <div>
            <h3 className="text-xl font-black text-white">{producto.nombre}</h3>
            <p className="text-sm mt-0.5" style={{ color: tokens.color.accentSoft }}>
              Variantes del producto
            </p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white" type="button">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-6">
          {producto.variantes && producto.variantes.length > 0 ? (
            <div className="space-y-3">
              {producto.variantes.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-surface-container"
                >
                  <div>
                    <p className="font-bold text-on-surface text-sm">{v.nombre}</p>
                    <p className="text-xs text-secondary mt-0.5">SKU: {v.sku ?? '-'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-on-secondary-fixed">
                      {cop.format(Number(v.precioVenta ?? 0))}
                    </p>
                    {v.precioExtra > 0 && (
                      <p className="text-xs text-secondary">+{cop.format(Number(v.precioExtra))}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-8 gap-2">
              <span className="material-symbols-outlined text-4xl text-outline">category</span>
              <p className="text-sm text-secondary font-bold">Sin variantes registradas</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductoModal({
  producto,
  categorias,
  marcas,
  onClose,
  onSaved,
}: {
  producto: IProducto | null;
  categorias: ICategoria[];
  marcas: IMarca[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<ProductoForm>(() =>
    producto
      ? {
          nombre: producto.nombre,
          descripcion: producto.descripcion ?? '',
          imagenUrl: producto.imagenUrl ?? '',
          categoriaId: producto.categoriaId,
          marcaId: producto.marcaId,
          precioBase: String(Number(producto.precioBase)),
          precioCosto: String(Number(producto.precioCosto)),
          iva: String(Number(producto.iva)),
        }
      : {
          ...emptyForm,
          categoriaId: categorias[0]?.id ?? '',
          marcaId: marcas[0]?.id ?? '',
        },
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || undefined,
        imagenUrl: form.imagenUrl.trim() || undefined,
        categoriaId: form.categoriaId,
        marcaId: form.marcaId,
        precioBase: Number(form.precioBase || 0),
        precioCosto: Number(form.precioCosto || 0),
        iva: Number(form.iva || 0),
      };

      if (producto) {
        await api.patch(`/productos/${producto.id}`, payload);
      } else {
        await api.post('/productos', payload);
      }
    },
    onSuccess: onSaved,
  });

  const setField =
    <K extends keyof ProductoForm>(key: K) =>
    (value: ProductoForm[K]) =>
      setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4"
      style={{ background: 'rgba(46,27,12,0.5)' }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden"
        style={{ backgroundColor: tokens.color.bgCard }}
      >
        <div
          className="px-6 py-5 flex items-center justify-between"
          style={{ backgroundColor: tokens.color.bgDark }}
        >
          <div>
            <h3 className="text-xl font-black text-white">
              {producto ? 'Editar producto' : 'Nuevo producto'}
            </h3>
            <p className="text-sm" style={{ color: tokens.color.accentSoft }}>
              Catalogo comercial y financiero
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-white/80 hover:text-white">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="md:col-span-2">
            <span
              className="block text-xs font-bold uppercase tracking-wider mb-1"
              style={{ color: tokens.color.textMuted }}
            >
              Nombre
            </span>
            <input
              value={form.nombre}
              onChange={(e) => setField('nombre')(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 border"
              style={{ borderColor: tokens.color.border }}
            />
          </label>

          <label className="md:col-span-2">
            <span
              className="block text-xs font-bold uppercase tracking-wider mb-1"
              style={{ color: tokens.color.textMuted }}
            >
              Descripcion
            </span>
            <input
              value={form.descripcion}
              onChange={(e) => setField('descripcion')(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 border"
              style={{ borderColor: tokens.color.border }}
            />
          </label>

          <label className="md:col-span-2">
            <span
              className="block text-xs font-bold uppercase tracking-wider mb-1"
              style={{ color: tokens.color.textMuted }}
            >
              URL de imagen
            </span>
            <input
              value={form.imagenUrl}
              onChange={(e) => setField('imagenUrl')(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 border"
              style={{ borderColor: tokens.color.border }}
              placeholder="https://..."
            />
          </label>

          <label>
            <span
              className="block text-xs font-bold uppercase tracking-wider mb-1"
              style={{ color: tokens.color.textMuted }}
            >
              Categoria
            </span>
            <select
              value={form.categoriaId}
              onChange={(e) => setField('categoriaId')(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 border"
              style={{ borderColor: tokens.color.border }}
            >
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span
              className="block text-xs font-bold uppercase tracking-wider mb-1"
              style={{ color: tokens.color.textMuted }}
            >
              Marca
            </span>
            <select
              value={form.marcaId}
              onChange={(e) => setField('marcaId')(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 border"
              style={{ borderColor: tokens.color.border }}
            >
              {marcas.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span
              className="block text-xs font-bold uppercase tracking-wider mb-1"
              style={{ color: tokens.color.textMuted }}
            >
              Precio base
            </span>
            <input
              type="number"
              min={0}
              value={form.precioBase}
              onChange={(e) => setField('precioBase')(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 border"
              style={{ borderColor: tokens.color.border }}
            />
          </label>

          <label>
            <span
              className="block text-xs font-bold uppercase tracking-wider mb-1"
              style={{ color: tokens.color.textMuted }}
            >
              Precio costo
            </span>
            <input
              type="number"
              min={0}
              value={form.precioCosto}
              onChange={(e) => setField('precioCosto')(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 border"
              style={{ borderColor: tokens.color.border }}
            />
          </label>

          <label className="md:col-span-2">
            <span
              className="block text-xs font-bold uppercase tracking-wider mb-1"
              style={{ color: tokens.color.textMuted }}
            >
              IVA (%)
            </span>
            <input
              type="number"
              min={0}
              max={100}
              value={form.iva}
              onChange={(e) => setField('iva')(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 border"
              style={{ borderColor: tokens.color.border }}
            />
          </label>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border font-bold"
            style={{ borderColor: tokens.color.border, color: tokens.color.textMuted }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="flex-1 py-3 rounded-xl font-black text-white disabled:opacity-70"
            style={{ backgroundColor: tokens.color.bgDark }}
          >
            {saveMutation.isPending
              ? 'Guardando...'
              : producto
                ? 'Guardar cambios'
                : 'Crear producto'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProductosPage() {
  const queryClient = useQueryClient();
  const [categoriaId, setCategoriaId] = useState('');
  const [marcaId, setMarcaId] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [productoVariantes, setProductoVariantes] = useState<ProductoConVariantes | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<IProducto | null>(null);

  const categoriasQuery = useQuery({ queryKey: ['categorias'], queryFn: getCategorias });
  const marcasQuery = useQuery({ queryKey: ['marcas'], queryFn: getMarcas });
  const productosQuery = useQuery({
    queryKey: ['productos', categoriaId, marcaId],
    queryFn: () => getProductos(categoriaId, marcaId),
    refetchInterval: 60000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/productos/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['productos'] });
    },
  });

  const productos = (productosQuery.data ?? []) as ProductoConVariantes[];

  const categoriasMap = useMemo(
    () => new Map((categoriasQuery.data ?? []).map((c) => [c.id, c.nombre])),
    [categoriasQuery.data],
  );

  const marcasMap = useMemo(
    () => new Map((marcasQuery.data ?? []).map((m) => [m.id, m.nombre])),
    [marcasQuery.data],
  );

  const productosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return productos;
    const q = busqueda.toLowerCase();
    return productos.filter((p) => p.nombre.toLowerCase().includes(q));
  }, [productos, busqueda]);

  const margen = (precioBase: number, precioCosto: number) =>
    precioBase > 0 && precioCosto > 0
      ? (((precioBase - precioCosto) / precioBase) * 100).toFixed(0)
      : '-';

  return (
    <AppLayout>
      {productoVariantes && (
        <VariantesModal producto={productoVariantes} onClose={() => setProductoVariantes(null)} />
      )}
      {(showModal || editing) && (
        <ProductoModal
          producto={editing}
          categorias={categoriasQuery.data ?? []}
          marcas={marcasQuery.data ?? []}
          onClose={() => {
            setShowModal(false);
            setEditing(null);
          }}
          onSaved={() => {
            setShowModal(false);
            setEditing(null);
            void queryClient.invalidateQueries({ queryKey: ['productos'] });
          }}
        />
      )}

      <div className="space-y-8">
        <header className="flex justify-between items-start gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-on-secondary-fixed tracking-tight">
              Productos
            </h1>
            <p className="text-secondary font-medium mt-1">Catalogo de productos y variantes</p>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="px-5 py-3 rounded-xl font-black text-sm text-white uppercase tracking-wider"
            style={{ backgroundColor: tokens.color.bgDark }}
          >
            Nuevo producto
          </button>
        </header>

        {!productosQuery.isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-surface-container-low p-5 rounded-2xl border-l-4 border-primary">
              <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">
                Total productos
              </p>
              <p className="text-2xl font-black text-on-secondary-fixed">{productos.length}</p>
            </div>
            <div className="bg-surface-container-low p-5 rounded-2xl border-l-4 border-tertiary">
              <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">
                Categorias
              </p>
              <p className="text-2xl font-black text-on-secondary-fixed">
                {categoriasQuery.data?.length ?? 0}
              </p>
            </div>
            <div className="bg-surface-container-low p-5 rounded-2xl border-l-4 border-secondary">
              <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">
                Marcas
              </p>
              <p className="text-2xl font-black text-on-secondary-fixed">
                {marcasQuery.data?.length ?? 0}
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <div className="flex items-center bg-surface-container-lowest border-2 border-outline-variant/30 rounded-xl px-4 gap-2 focus-within:border-primary transition-colors flex-1 min-w-[200px]">
            <span className="material-symbols-outlined text-secondary" style={{ fontSize: 18 }}>
              search
            </span>
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="flex-1 bg-transparent py-2.5 text-sm font-medium text-on-surface placeholder-secondary/50 focus:outline-none"
              placeholder="Buscar producto..."
            />
          </div>
          <select
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
            className="bg-surface-container-lowest border border-outline-variant/30 px-4 py-2.5 rounded-xl text-sm font-semibold text-on-surface min-w-[180px]"
          >
            <option value="">Todas las categorias</option>
            {(categoriasQuery.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
          <select
            value={marcaId}
            onChange={(e) => setMarcaId(e.target.value)}
            className="bg-surface-container-lowest border border-outline-variant/30 px-4 py-2.5 rounded-xl text-sm font-semibold text-on-surface min-w-[160px]"
          >
            <option value="">Todas las marcas</option>
            {(marcasQuery.data ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-hidden rounded-2xl shadow-sm border border-outline-variant/10">
          {categoriasQuery.isLoading || marcasQuery.isLoading || productosQuery.isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse rounded-xl h-14 bg-surface-container" />
              ))}
            </div>
          ) : productosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <span className="material-symbols-outlined text-5xl text-outline">inventory</span>
              <p className="text-sm font-bold text-secondary">No se encontraron productos</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-highest text-on-surface-variant font-bold text-xs uppercase tracking-widest">
                  <th className="px-6 py-4">Producto</th>
                  <th className="px-6 py-4">Categoria</th>
                  <th className="px-6 py-4">Marca</th>
                  <th className="px-6 py-4 text-center">Imagen</th>
                  <th className="px-6 py-4 text-right">Precio venta</th>
                  <th className="px-6 py-4 text-right">Precio costo</th>
                  <th className="px-6 py-4 text-right">Margen</th>
                  <th className="px-6 py-4 text-center">IVA</th>
                  <th className="px-6 py-4 text-center">Variantes</th>
                  <th className="px-6 py-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {productosFiltrados.map((producto, i) => (
                  <tr
                    key={producto.id}
                    className={`border-b border-outline-variant/5 ${i % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low'}`}
                  >
                    <td className="px-6 py-4">
                      <p className="font-bold text-on-surface">{producto.nombre}</p>
                    </td>
                    <td className="px-6 py-4 text-secondary">
                      {categoriasMap.get(producto.categoriaId) ?? '-'}
                    </td>
                    <td className="px-6 py-4 text-secondary">
                      {marcasMap.get(producto.marcaId) ?? '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div
                        className="w-11 h-11 rounded-lg overflow-hidden mx-auto border"
                        style={{ borderColor: tokens.color.borderSoft }}
                      >
                        {producto.imagenUrl ? (
                          <img
                            src={producto.imagenUrl}
                            alt={producto.nombre}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div
                            className="w-full h-full grid place-items-center"
                            style={{
                              backgroundColor: tokens.color.bgSoft,
                              color: tokens.color.textMuted,
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                              image
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-on-surface">
                      {cop.format(Number(producto.precioBase))}
                    </td>
                    <td className="px-6 py-4 text-right text-secondary">
                      {cop.format(Number(producto.precioCosto))}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className="font-black"
                        style={{
                          color:
                            Number(
                              margen(Number(producto.precioBase), Number(producto.precioCosto)),
                            ) >= 20
                              ? tokens.color.success
                              : Number(
                                    margen(
                                      Number(producto.precioBase),
                                      Number(producto.precioCosto),
                                    ),
                                  ) >= 10
                                ? tokens.color.warning
                                : tokens.color.danger,
                        }}
                      >
                        {margen(Number(producto.precioBase), Number(producto.precioCosto))}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className="px-2 py-1 rounded-full text-xs font-bold"
                        style={{ backgroundColor: tokens.color.infoBg, color: tokens.color.info }}
                      >
                        {Number(producto.iva).toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setProductoVariantes(producto)}
                        className="flex items-center gap-1 mx-auto px-3 py-1.5 rounded-lg text-xs font-bold border border-outline-variant/30 text-secondary hover:bg-surface-container hover:text-primary transition-colors"
                        type="button"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                          category
                        </span>
                        {producto.variantes?.length ?? 0}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditing(producto)}
                          className="p-2 rounded-lg hover:bg-surface-container"
                          title="Editar producto"
                        >
                          <span
                            className="material-symbols-outlined"
                            style={{ fontSize: 18, color: tokens.color.textMuted }}
                          >
                            edit
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteMutation.mutate(producto.id)}
                          className="p-2 rounded-lg hover:bg-surface-container"
                          title="Desactivar producto"
                          disabled={deleteMutation.isPending}
                        >
                          <span
                            className="material-symbols-outlined"
                            style={{ fontSize: 18, color: tokens.color.danger }}
                          >
                            delete
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
