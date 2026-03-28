import { ReactNode, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ICategoria, IMarca, IProducto, IVariante } from '@cosmeticos/shared-types';
import AppLayout from './components/AppLayout';
import api from '../lib/api';
import { tokens } from '../styles/tokens';

const cop = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const S = {
  bgPage: tokens.color.bgPage,
  bgCard: tokens.color.bgCard,
  bgSoft: tokens.color.bgSoft,
  bgDark: tokens.color.bgDark,
  border: tokens.color.border,
  borderSoft: tokens.color.borderSoft,
  textStrong: tokens.color.textStrong,
  textMuted: tokens.color.textMuted,
  textSoft: tokens.color.textSoft,
  primary: tokens.color.primary,
  accent: tokens.color.accent,
  accentSoft: tokens.color.accentSoft,
  success: tokens.color.success,
  warning: tokens.color.warning,
  danger: tokens.color.danger,
};

type ProductoConVariantes = IProducto & {
  variantes?: IVariante[];
  categoria?: { nombre?: string; activo?: boolean };
  marca?: { nombre?: string; activo?: boolean };
};

type ProductoForm = {
  nombre: string;
  descripcion: string;
  imagenUrl: string;
  codigoInterno: string;
  categoriaId: string;
  marcaId: string;
  precioBase: string;
  precioCosto: string;
  iva: string;
};

type VarianteForm = {
  nombre: string;
  sku: string;
  codigoBarras: string;
  precioExtra: string;
  precioVenta: string;
  precioCosto: string;
  imagenUrl: string;
};

const EMPTY_PRODUCTO_FORM: ProductoForm = {
  nombre: '',
  descripcion: '',
  imagenUrl: '',
  codigoInterno: '',
  categoriaId: '',
  marcaId: '',
  precioBase: '0',
  precioCosto: '0',
  iva: '19',
};

const EMPTY_VARIANTE_FORM: VarianteForm = {
  nombre: '',
  sku: '',
  codigoBarras: '',
  precioExtra: '0',
  precioVenta: '',
  precioCosto: '',
  imagenUrl: '',
};

function generateReadableSkuSeed(producto: ProductoConVariantes, nombreVariante: string): string {
  const baseProducto = (producto.codigoInterno ?? producto.nombre)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.slice(0, 3))
    .join('');

  const baseVariante = nombreVariante
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.slice(0, 2))
    .join('');

  const seed = `${baseProducto || 'PRD'}${baseVariante || 'VAR'}`.slice(0, 8);
  const suffix = String((producto.variantes?.length ?? 0) + 1).padStart(2, '0');
  return `${seed}${suffix}`.slice(0, 12);
}

function marginPct(precioBase: number, precioCosto: number): number | null {
  if (precioBase <= 0 || precioCosto < 0) {
    return null;
  }
  return Number((((precioBase - precioCosto) / precioBase) * 100).toFixed(1));
}

function calcVariantePrecioVenta(variante: IVariante, producto: ProductoConVariantes): number {
  const override = Number(variante.precioVenta ?? NaN);
  if (!Number.isNaN(override) && override >= 0) {
    return override;
  }

  return Number(producto.precioBase ?? 0) + Number(variante.precioExtra ?? 0);
}

function calcVariantePrecioCosto(variante: IVariante, producto: ProductoConVariantes): number {
  const override = Number(variante.precioCosto ?? NaN);
  if (!Number.isNaN(override) && override >= 0) {
    return override;
  }

  return Number(producto.precioCosto ?? 0);
}

async function getCategorias(): Promise<ICategoria[]> {
  const { data } = await api.get('/categorias');
  return data;
}

async function getMarcas(): Promise<IMarca[]> {
  const { data } = await api.get('/marcas');
  return data;
}

async function getProductos(params: {
  categoriaId?: string;
  marcaId?: string;
  q?: string;
}): Promise<ProductoConVariantes[]> {
  const { data } = await api.get('/productos', {
    params: {
      categoriaId: params.categoriaId || undefined,
      marcaId: params.marcaId || undefined,
      q: params.q || undefined,
    },
  });
  return data;
}

function FieldLabel({ children }: { children: string }) {
  return (
    <span
      className="block text-[11px] font-bold uppercase tracking-[0.14em] mb-1.5"
      style={{ color: S.textMuted }}
    >
      {children}
    </span>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  min,
  max,
  step,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'number';
  min?: number;
  max?: number;
  step?: string;
}) {
  return (
    <input
      type={type}
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl px-3.5 py-2.5 bg-white border-2 focus:outline-none focus:border-primary transition-colors"
      style={{ borderColor: 'rgba(135,113,118,0.24)' }}
    />
  );
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl px-3.5 py-2.5 bg-white border-2 focus:outline-none focus:border-primary transition-colors"
      style={{ borderColor: 'rgba(135,113,118,0.24)' }}
    >
      {children}
    </select>
  );
}

function ProductoModal({
  producto,
  categorias,
  marcas,
  onClose,
  onSaved,
}: {
  producto: ProductoConVariantes | null;
  categorias: ICategoria[];
  marcas: IMarca[];
  onClose: () => void;
  onSaved: (saved?: ProductoConVariantes) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const [form, setForm] = useState<ProductoForm>(() => {
    if (!producto) {
      return {
        ...EMPTY_PRODUCTO_FORM,
        categoriaId: categorias[0]?.id ?? '',
        marcaId: marcas[0]?.id ?? '',
      };
    }

    return {
      nombre: producto.nombre,
      descripcion: producto.descripcion ?? '',
      imagenUrl: producto.imagenUrl ?? '',
      codigoInterno: producto.codigoInterno ?? '',
      categoriaId: producto.categoriaId,
      marcaId: producto.marcaId,
      precioBase: String(Number(producto.precioBase ?? 0)),
      precioCosto: String(Number(producto.precioCosto ?? 0)),
      iva: String(Number(producto.iva ?? 0)),
    };
  });

  useEffect(() => {
    if (producto) {
      setForm({
        nombre: producto.nombre,
        descripcion: producto.descripcion ?? '',
        imagenUrl: producto.imagenUrl ?? '',
        codigoInterno: producto.codigoInterno ?? '',
        categoriaId: producto.categoriaId,
        marcaId: producto.marcaId,
        precioBase: String(Number(producto.precioBase ?? 0)),
        precioCosto: String(Number(producto.precioCosto ?? 0)),
        iva: String(Number(producto.iva ?? 0)),
      });
      return;
    }

    setForm((prev) => ({
      ...prev,
      ...EMPTY_PRODUCTO_FORM,
    }));
  }, [producto?.id]);

  useEffect(() => {
    if (producto) {
      return;
    }

    setForm((prev) => ({
      ...prev,
      categoriaId: prev.categoriaId || categorias[0]?.id || '',
      marcaId: prev.marcaId || marcas[0]?.id || '',
    }));
  }, [categorias, marcas, producto]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const precioBase = Number(form.precioBase || 0);
      const precioCosto = Number(form.precioCosto || 0);
      const iva = Number(form.iva || 0);

      if (!form.nombre.trim()) {
        throw new Error('El nombre del producto es obligatorio.');
      }
      const categoriaId = form.categoriaId.trim();
      const marcaId = form.marcaId.trim();

      if (!categoriaId || !marcaId) {
        throw new Error('Debes seleccionar categoria y marca.');
      }
      if (precioBase < 0 || precioCosto < 0 || iva < 0 || iva > 100) {
        throw new Error('Verifica precios e IVA.');
      }
      if (precioCosto > precioBase) {
        throw new Error('El precio costo no puede ser mayor al precio base.');
      }

      const payload = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || undefined,
        imagenUrl: form.imagenUrl.trim() || undefined,
        codigoInterno: form.codigoInterno.trim() || undefined,
        categoriaId,
        marcaId,
        precioBase,
        precioCosto,
        iva,
      };

      if (producto) {
        const { data } = await api.patch(`/productos/${producto.id}`, payload);
        return data as ProductoConVariantes;
      }

      const { data } = await api.post('/productos', payload);
      return data as ProductoConVariantes;
    },
    onSuccess: (saved) => onSaved(saved),
    onError: (e: any) => {
      const backendMessage =
        e?.response?.data?.message && Array.isArray(e.response.data.message)
          ? e.response.data.message.join('. ')
          : e?.response?.data?.message;
      setError(backendMessage || e?.message || 'No se pudo guardar el producto.');
    },
  });

  const setField =
    <K extends keyof ProductoForm>(key: K) =>
    (value: ProductoForm[K]) =>
      setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (producto) {
      setForm((prev) => ({
        ...prev,
        categoriaId:
          prev.categoriaId && uuidRegex.test(prev.categoriaId)
            ? prev.categoriaId
            : (producto.categoriaId ?? ''),
        marcaId:
          prev.marcaId && uuidRegex.test(prev.marcaId) ? prev.marcaId : (producto.marcaId ?? ''),
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      categoriaId:
        prev.categoriaId && uuidRegex.test(prev.categoriaId)
          ? prev.categoriaId
          : (categorias[0]?.id ?? ''),
      marcaId: prev.marcaId && uuidRegex.test(prev.marcaId) ? prev.marcaId : (marcas[0]?.id ?? ''),
    }));
  }, [producto, categorias, marcas]);

  const categoriasOptions =
    producto && form.categoriaId && !categorias.some((c) => c.id === form.categoriaId)
      ? [
          ...categorias,
          {
            id: form.categoriaId,
            nombre: `${producto.categoria?.nombre ?? 'Categoria actual'} (inactiva)`,
            activo: false,
          },
        ]
      : categorias;

  const marcasOptions =
    producto && form.marcaId && !marcas.some((m) => m.id === form.marcaId)
      ? [
          ...marcas,
          {
            id: form.marcaId,
            nombre: `${producto.marca?.nombre ?? 'Marca actual'} (inactiva)`,
            activo: false,
          },
        ]
      : marcas;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5"
      style={{ backgroundColor: 'rgba(46,27,12,0.45)' }}
    >
      <div
        className="w-full max-w-3xl rounded-3xl overflow-hidden"
        style={{ backgroundColor: S.bgCard, boxShadow: '0 28px 64px rgba(42,23,9,0.22)' }}
      >
        <div
          className="px-5 sm:px-7 py-5 flex items-start justify-between"
          style={{ background: 'linear-gradient(135deg, #85264b 0%, #a43e63 100%)' }}
        >
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-white">
              {producto ? 'Editar Producto' : 'Nuevo Producto'}
            </h3>
            <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.84)' }}>
              Configuracion comercial y financiera del catalogo.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
            aria-label="Cerrar modal"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-5 sm:p-7 space-y-4" style={{ backgroundColor: '#fcf8fa' }}>
          {error && (
            <div
              className="rounded-xl px-4 py-3 text-sm font-semibold"
              style={{ backgroundColor: 'rgba(186,26,26,0.12)', color: S.danger }}
            >
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="md:col-span-2">
              <FieldLabel>Nombre</FieldLabel>
              <Input
                value={form.nombre}
                onChange={setField('nombre')}
                placeholder="Ej: Base Liquida HD"
              />
            </label>

            <label className="md:col-span-2">
              <FieldLabel>Descripcion</FieldLabel>
              <Input
                value={form.descripcion}
                onChange={setField('descripcion')}
                placeholder="Caracteristicas clave del producto"
              />
            </label>

            <label className="md:col-span-2">
              <FieldLabel>URL de Imagen</FieldLabel>
              <Input
                value={form.imagenUrl}
                onChange={setField('imagenUrl')}
                placeholder="https://..."
              />
            </label>

            <label>
              <FieldLabel>Codigo Interno (Opcional)</FieldLabel>
              <Input
                value={form.codigoInterno}
                onChange={setField('codigoInterno')}
                placeholder="PROD-BASE-HD-001"
              />
            </label>

            <label>
              <FieldLabel>IVA (%)</FieldLabel>
              <Input type="number" min={0} max={100} value={form.iva} onChange={setField('iva')} />
            </label>

            <label>
              <FieldLabel>Categoria</FieldLabel>
              <Select value={form.categoriaId} onChange={setField('categoriaId')}>
                {(categoriasOptions ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </Select>
            </label>

            <label>
              <FieldLabel>Marca</FieldLabel>
              <Select value={form.marcaId} onChange={setField('marcaId')}>
                {(marcasOptions ?? []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </Select>
            </label>

            <label>
              <FieldLabel>Precio Base</FieldLabel>
              <Input
                type="number"
                min={0}
                value={form.precioBase}
                onChange={setField('precioBase')}
              />
            </label>

            <label>
              <FieldLabel>Precio Costo</FieldLabel>
              <Input
                type="number"
                min={0}
                value={form.precioCosto}
                onChange={setField('precioCosto')}
              />
            </label>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="sm:flex-1 py-3 rounded-xl border-2 font-bold"
              style={{ borderColor: 'rgba(135,113,118,0.24)', color: S.textMuted }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                saveMutation.mutate();
              }}
              disabled={saveMutation.isPending}
              className="sm:flex-1 py-3 rounded-xl font-black text-white disabled:opacity-65"
              style={{ backgroundColor: S.bgDark }}
            >
              {saveMutation.isPending
                ? 'Guardando...'
                : producto
                  ? 'Guardar Cambios'
                  : 'Crear Producto'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function VariantesModal({
  producto,
  onClose,
  onSaved,
}: {
  producto: ProductoConVariantes;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [editingVarianteId, setEditingVarianteId] = useState<string | null>(null);
  const [form, setForm] = useState<VarianteForm>(EMPTY_VARIANTE_FORM);

  const variantes = producto.variantes ?? [];
  const varianteEditando = variantes.find((v) => v.id === editingVarianteId) ?? null;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.nombre.trim()) {
        throw new Error('Nombre de variante obligatorio. SKU y barras pueden autogenerarse.');
      }

      const precioExtra = Number(form.precioExtra || 0);
      const precioVenta = form.precioVenta.trim() ? Number(form.precioVenta) : undefined;
      const precioCosto = form.precioCosto.trim() ? Number(form.precioCosto) : undefined;

      if (
        precioExtra < 0 ||
        (precioVenta !== undefined && precioVenta < 0) ||
        (precioCosto !== undefined && precioCosto < 0)
      ) {
        throw new Error('Los precios deben ser valores positivos.');
      }

      if (precioVenta !== undefined && precioCosto !== undefined && precioCosto > precioVenta) {
        throw new Error('El precio costo no puede ser mayor al precio venta de la variante.');
      }

      const productoId = String(producto.id ?? '').trim();
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(productoId)) {
        throw new Error(
          'No se pudo determinar el ID del producto para la variante. Recarga la pagina e intenta de nuevo.',
        );
      }

      const payloadBase = {
        nombre: form.nombre.trim(),
        sku: form.sku.trim() || undefined,
        codigoBarras: form.codigoBarras.trim() || undefined,
        precioExtra,
        precioVenta,
        precioCosto,
        imagenUrl: form.imagenUrl.trim() || undefined,
      };

      if (editingVarianteId) {
        await api.patch(`/variantes/${editingVarianteId}`, payloadBase);
      } else {
        await api.post('/variantes', {
          ...payloadBase,
          productoId,
        });
      }
    },
    onSuccess: () => {
      setForm(EMPTY_VARIANTE_FORM);
      setEditingVarianteId(null);
      setError(null);
      onSaved();
    },
    onError: (e: any) => {
      const backendMessage =
        e?.response?.data?.message && Array.isArray(e.response.data.message)
          ? e.response.data.message.join('. ')
          : e?.response?.data?.message;
      setError(backendMessage || e?.message || 'No se pudo guardar la variante.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/variantes/${id}`);
    },
    onSuccess: () => {
      setEditingVarianteId(null);
      setForm(EMPTY_VARIANTE_FORM);
      setError(null);
      onSaved();
    },
    onError: (e: any) => {
      setError(e?.response?.data?.message || e?.message || 'No se pudo desactivar la variante.');
    },
  });

  const startEdit = (variante: IVariante) => {
    setEditingVarianteId(variante.id);
    setError(null);
    setForm({
      nombre: variante.nombre,
      sku: variante.sku,
      codigoBarras: variante.codigoBarras,
      precioExtra: String(Number(variante.precioExtra ?? 0)),
      precioVenta:
        variante.precioVenta !== undefined && variante.precioVenta !== null
          ? String(Number(variante.precioVenta))
          : '',
      precioCosto:
        variante.precioCosto !== undefined && variante.precioCosto !== null
          ? String(Number(variante.precioCosto))
          : '',
      imagenUrl: variante.imagenUrl ?? '',
    });
  };

  const clearForm = () => {
    setEditingVarianteId(null);
    setForm(EMPTY_VARIANTE_FORM);
    setError(null);
  };

  const triggerSkuQuick = () => {
    setForm((prev) => ({
      ...prev,
      sku: generateReadableSkuSeed(producto, prev.nombre),
    }));
  };

  const triggerAutoEan = () => {
    setForm((prev) => ({ ...prev, codigoBarras: '' }));
    setError('Al dejar codigo de barras vacio, el backend generara EAN-13 automaticamente.');
  };

  const handleScanOrPasteBarcode = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 14);
    setForm((prev) => ({ ...prev, codigoBarras: cleaned }));
  };

  return (
    <div
      className="fixed inset-0 z-50 p-3 sm:p-5"
      style={{ backgroundColor: 'rgba(46,27,12,0.45)' }}
    >
      <div
        className="h-full max-w-6xl mx-auto bg-white rounded-3xl overflow-hidden flex flex-col"
        style={{ boxShadow: '0 28px 64px rgba(42,23,9,0.24)' }}
      >
        <div
          className="px-5 sm:px-7 py-5 flex items-start justify-between"
          style={{ background: 'linear-gradient(135deg, #735946 0%, #2a1709 100%)' }}
        >
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-white">
              Variantes de {producto.nombre}
            </h3>
            <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.84)' }}>
              SKU, codigos y estructura de precios por presentacion.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-2 rounded-xl hover:bg-white/10"
            aria-label="Cerrar modal"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5 sm:p-7" style={{ backgroundColor: '#f6f2f4' }}>
          <div className="grid grid-cols-1 xl:grid-cols-[1.45fr_1fr] gap-5">
            <section className="rounded-2xl p-4 sm:p-5" style={{ backgroundColor: '#ffffff' }}>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h4
                  className="text-sm font-black uppercase tracking-[0.14em]"
                  style={{ color: S.textMuted }}
                >
                  Variantes Registradas
                </h4>
                <span className="text-sm font-bold" style={{ color: S.textSoft }}>
                  {variantes.length} activas
                </span>
              </div>

              {variantes.length === 0 ? (
                <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: '#fcf8fa' }}>
                  <span className="material-symbols-outlined text-5xl" style={{ color: '#877176' }}>
                    category
                  </span>
                  <p className="mt-2 text-sm font-bold" style={{ color: S.textMuted }}>
                    Aun no hay variantes en este producto.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {variantes.map((variante) => {
                    const venta = calcVariantePrecioVenta(variante, producto);
                    const costo = calcVariantePrecioCosto(variante, producto);
                    const margen = marginPct(venta, costo);

                    return (
                      <article
                        key={variante.id}
                        className="rounded-xl p-4"
                        style={{
                          backgroundColor:
                            editingVarianteId === variante.id ? '#f3eff1' : '#fcf8fa',
                          border:
                            editingVarianteId === variante.id
                              ? '2px solid rgba(133,38,75,0.28)'
                              : '1px solid rgba(135,113,118,0.2)',
                        }}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div>
                            <h5
                              className="font-black text-sm sm:text-base"
                              style={{ color: S.textStrong }}
                            >
                              {variante.nombre}
                            </h5>
                            <p className="text-xs mt-1" style={{ color: S.textMuted }}>
                              SKU: {variante.sku} · Barras: {variante.codigoBarras}
                            </p>
                            {variante.imagenUrl && (
                              <a
                                href={variante.imagenUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-bold mt-1"
                                style={{ color: S.primary }}
                              >
                                <span
                                  className="material-symbols-outlined"
                                  style={{ fontSize: 14 }}
                                >
                                  image
                                </span>
                                Ver imagen
                              </a>
                            )}
                          </div>

                          <div className="text-left sm:text-right">
                            <p
                              className="text-[11px] font-bold uppercase tracking-[0.14em]"
                              style={{ color: S.textMuted }}
                            >
                              Precio Venta
                            </p>
                            <p
                              className="text-base sm:text-lg font-black"
                              style={{ color: S.textStrong }}
                            >
                              {cop.format(venta)}
                            </p>
                            <p className="text-xs" style={{ color: S.textSoft }}>
                              Costo {cop.format(costo)} · Extra{' '}
                              {cop.format(Number(variante.precioExtra ?? 0))}
                            </p>
                            <p
                              className="text-xs font-black mt-1"
                              style={{
                                color:
                                  margen !== null && margen >= 20
                                    ? S.success
                                    : margen !== null && margen >= 10
                                      ? S.warning
                                      : S.danger,
                              }}
                            >
                              Margen {margen === null ? '-' : `${margen}%`}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-3">
                          <button
                            type="button"
                            onClick={() => startEdit(variante)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg"
                            style={{ backgroundColor: 'rgba(133,38,75,0.14)', color: S.primary }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                              edit
                            </span>
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteMutation.mutate(variante.id)}
                            disabled={deleteMutation.isPending}
                            className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-60"
                            style={{ backgroundColor: 'rgba(186,26,26,0.12)', color: S.danger }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                              delete
                            </span>
                            Desactivar
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-2xl p-4 sm:p-5" style={{ backgroundColor: '#ffffff' }}>
              <div className="flex items-center justify-between mb-4">
                <h4
                  className="text-sm font-black uppercase tracking-[0.14em]"
                  style={{ color: S.textMuted }}
                >
                  {varianteEditando ? 'Editar Variante' : 'Nueva Variante'}
                </h4>
                {varianteEditando && (
                  <button
                    type="button"
                    onClick={clearForm}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg"
                    style={{ backgroundColor: 'rgba(115,89,70,0.12)', color: S.textMuted }}
                  >
                    Cancelar edicion
                  </button>
                )}
              </div>

              {error && (
                <div
                  className="rounded-xl px-3.5 py-2.5 text-sm font-semibold mb-3"
                  style={{ backgroundColor: 'rgba(186,26,26,0.12)', color: S.danger }}
                >
                  {error}
                </div>
              )}

              <div className="space-y-3">
                <label>
                  <FieldLabel>Nombre Variante</FieldLabel>
                  <Input
                    value={form.nombre}
                    onChange={(value) => setForm((prev) => ({ ...prev, nombre: value }))}
                    placeholder="Ej: Tono Nude 01 - 50ml"
                  />
                </label>

                <label>
                  <FieldLabel>SKU</FieldLabel>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        value={form.sku}
                        onChange={(value) =>
                          setForm((prev) => ({
                            ...prev,
                            sku: value.toUpperCase().replace(/[^A-Z0-9]/g, ''),
                          }))
                        }
                        placeholder="Auto si se deja vacio"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={triggerSkuQuick}
                      className="px-3 py-2 rounded-xl text-xs font-black whitespace-nowrap"
                      style={{ backgroundColor: 'rgba(133,38,75,0.14)', color: S.primary }}
                    >
                      Generar
                    </button>
                  </div>
                </label>

                <label>
                  <FieldLabel>Codigo de Barras</FieldLabel>
                  <div className="space-y-2">
                    <Input
                      value={form.codigoBarras}
                      onChange={handleScanOrPasteBarcode}
                      placeholder="Escanea o pega codigo (vacio = EAN automatico)"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={triggerAutoEan}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold"
                        style={{ backgroundColor: 'rgba(115,89,70,0.12)', color: S.textMuted }}
                      >
                        EAN automatico
                      </button>
                      <span className="text-xs" style={{ color: S.textMuted }}>
                        Tip: usa lector USB y enfoca este campo para escanear rapido.
                      </span>
                    </div>
                  </div>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label>
                    <FieldLabel>Precio Extra</FieldLabel>
                    <Input
                      type="number"
                      min={0}
                      value={form.precioExtra}
                      onChange={(value) => setForm((prev) => ({ ...prev, precioExtra: value }))}
                    />
                  </label>

                  <label>
                    <FieldLabel>Precio Venta (Opcional)</FieldLabel>
                    <Input
                      type="number"
                      min={0}
                      value={form.precioVenta}
                      onChange={(value) => setForm((prev) => ({ ...prev, precioVenta: value }))}
                      placeholder="Override"
                    />
                  </label>
                </div>

                <label>
                  <FieldLabel>Precio Costo (Opcional)</FieldLabel>
                  <Input
                    type="number"
                    min={0}
                    value={form.precioCosto}
                    onChange={(value) => setForm((prev) => ({ ...prev, precioCosto: value }))}
                    placeholder="Override"
                  />
                </label>

                <label>
                  <FieldLabel>URL Imagen (Opcional)</FieldLabel>
                  <Input
                    value={form.imagenUrl}
                    onChange={(value) => setForm((prev) => ({ ...prev, imagenUrl: value }))}
                    placeholder="https://..."
                  />
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    saveMutation.mutate();
                  }}
                  disabled={saveMutation.isPending}
                  className="w-full py-3 rounded-xl font-black text-white disabled:opacity-65 mt-1"
                  style={{ backgroundColor: S.bgDark }}
                >
                  {saveMutation.isPending
                    ? 'Guardando...'
                    : varianteEditando
                      ? 'Guardar Variante'
                      : 'Crear Variante'}
                </button>
              </div>
            </section>
          </div>
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
  const [showProductoModal, setShowProductoModal] = useState(false);
  const [editingProducto, setEditingProducto] = useState<ProductoConVariantes | null>(null);
  const [productoVariantes, setProductoVariantes] = useState<ProductoConVariantes | null>(null);

  const categoriasQuery = useQuery({ queryKey: ['categorias'], queryFn: getCategorias });
  const marcasQuery = useQuery({ queryKey: ['marcas'], queryFn: getMarcas });
  const productosQuery = useQuery({
    queryKey: ['productos', categoriaId, marcaId, busqueda],
    queryFn: () =>
      getProductos({
        categoriaId,
        marcaId,
        q: busqueda.trim(),
      }),
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

  const stats = useMemo(() => {
    const totalVariantes = productos.reduce((acc, p) => acc + (p.variantes?.length ?? 0), 0);
    const margenes = productos
      .map((p) => marginPct(Number(p.precioBase), Number(p.precioCosto)))
      .filter((m): m is number => m !== null);
    const margenPromedio = margenes.length
      ? Number((margenes.reduce((acc, m) => acc + m, 0) / margenes.length).toFixed(1))
      : 0;

    return {
      totalProductos: productos.length,
      totalVariantes,
      categorias: categoriasQuery.data?.length ?? 0,
      marcas: marcasQuery.data?.length ?? 0,
      margenPromedio,
    };
  }, [productos, categoriasQuery.data, marcasQuery.data]);

  const closeProductoModal = () => {
    setShowProductoModal(false);
    setEditingProducto(null);
  };

  return (
    <AppLayout>
      {(showProductoModal || editingProducto) && (
        <ProductoModal
          producto={editingProducto}
          categorias={categoriasQuery.data ?? []}
          marcas={marcasQuery.data ?? []}
          onClose={closeProductoModal}
          onSaved={() => {
            closeProductoModal();
            void queryClient.invalidateQueries({ queryKey: ['productos'] });
          }}
        />
      )}

      {productoVariantes && (
        <VariantesModal
          producto={productoVariantes}
          onClose={() => setProductoVariantes(null)}
          onSaved={() => {
            void queryClient.invalidateQueries({ queryKey: ['productos'] });
            void queryClient
              .fetchQuery({
                queryKey: ['productos', categoriaId, marcaId, busqueda],
                queryFn: () =>
                  getProductos({
                    categoriaId,
                    marcaId,
                    q: busqueda.trim(),
                  }),
              })
              .then((updated) => {
                const recargado = (updated as ProductoConVariantes[]).find(
                  (p) => p.id === productoVariantes.id,
                );
                if (recargado) {
                  setProductoVariantes(recargado);
                }
              });
          }}
        />
      )}

      <div className="space-y-6 sm:space-y-8" style={{ backgroundColor: S.bgPage }}>
        <header
          className="rounded-3xl p-5 sm:p-7"
          style={{
            background: 'linear-gradient(125deg, #ffffff 0%, #f3eff1 50%, #f6f2f4 100%)',
            border: '1px solid rgba(218,192,197,0.45)',
          }}
        >
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <p
                className="text-xs font-black uppercase tracking-[0.2em]"
                style={{ color: S.textMuted }}
              >
                Modulo de Catalogo
              </p>
              <h1
                className="mt-1 text-3xl sm:text-4xl font-black leading-tight"
                style={{ color: S.textStrong }}
              >
                Productos y Variantes
              </h1>
              <p className="mt-2 text-sm sm:text-base max-w-2xl" style={{ color: S.textSoft }}>
                Gestion integral del portafolio comercial con estructura de precios, codificacion y
                variantes por presentacion.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowProductoModal(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-black text-sm text-white uppercase tracking-[0.12em]"
              style={{ background: 'linear-gradient(135deg, #85264b 0%, #a43e63 100%)' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                add
              </span>
              Nuevo Producto
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
          {[
            { label: 'Productos', value: stats.totalProductos, accent: S.primary },
            { label: 'Variantes', value: stats.totalVariantes, accent: S.accent },
            { label: 'Categorias', value: stats.categorias, accent: '#735946' },
            { label: 'Marcas', value: stats.marcas, accent: '#785d4a' },
            {
              label: 'Margen Promedio',
              value: `${stats.margenPromedio}%`,
              accent:
                stats.margenPromedio >= 20
                  ? S.success
                  : stats.margenPromedio >= 10
                    ? S.warning
                    : S.danger,
            },
          ].map((item) => (
            <article
              key={item.label}
              className="rounded-2xl p-4"
              style={{ backgroundColor: S.bgCard, border: '1px solid rgba(218,192,197,0.35)' }}
            >
              <p
                className="text-[11px] font-bold uppercase tracking-[0.14em]"
                style={{ color: S.textMuted }}
              >
                {item.label}
              </p>
              <p className="text-2xl font-black mt-1" style={{ color: item.accent }}>
                {item.value}
              </p>
            </article>
          ))}
        </section>

        <section
          className="rounded-2xl p-4 sm:p-5"
          style={{ backgroundColor: S.bgCard, border: '1px solid rgba(218,192,197,0.35)' }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr_1fr] gap-3">
            <div
              className="flex items-center rounded-xl px-3.5 gap-2 border-2 focus-within:border-primary transition-colors"
              style={{ borderColor: 'rgba(135,113,118,0.24)', backgroundColor: '#fff' }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 18, color: S.textMuted }}
              >
                search
              </span>
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre, SKU, codigo interno o codigo de barras"
                className="w-full bg-transparent py-2.5 text-sm font-medium focus:outline-none"
                style={{ color: S.textStrong }}
              />
            </div>

            <Select value={categoriaId} onChange={setCategoriaId}>
              <option value="">Todas las categorias</option>
              {(categoriasQuery.data ?? []).map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.nombre}
                </option>
              ))}
            </Select>

            <Select value={marcaId} onChange={setMarcaId}>
              <option value="">Todas las marcas</option>
              {(marcasQuery.data ?? []).map((marca) => (
                <option key={marca.id} value={marca.id}>
                  {marca.nombre}
                </option>
              ))}
            </Select>
          </div>
        </section>

        <section
          className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: S.bgCard, border: '1px solid rgba(218,192,197,0.35)' }}
        >
          {categoriasQuery.isLoading || marcasQuery.isLoading || productosQuery.isLoading ? (
            <div className="p-5 sm:p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="h-16 rounded-xl animate-pulse"
                  style={{ backgroundColor: '#f1edef' }}
                />
              ))}
            </div>
          ) : productos.length === 0 ? (
            <div className="py-16 px-4 text-center">
              <span className="material-symbols-outlined text-6xl" style={{ color: '#877176' }}>
                inventory_2
              </span>
              <p className="mt-2 text-base font-black" style={{ color: S.textMuted }}>
                No se encontraron productos con estos filtros.
              </p>
            </div>
          ) : (
            <>
              <div
                className="hidden xl:grid xl:grid-cols-[2.3fr_1.2fr_1.2fr_1.1fr_1fr_1fr] px-5 py-3"
                style={{ backgroundColor: '#f6f2f4' }}
              >
                {[
                  'Producto',
                  'Categoria / Marca',
                  'Precios',
                  'Margen',
                  'Variantes',
                  'Acciones',
                ].map((label) => (
                  <span
                    key={label}
                    className="text-[11px] font-black uppercase tracking-[0.14em]"
                    style={{ color: S.textMuted }}
                  >
                    {label}
                  </span>
                ))}
              </div>

              <div className="divide-y" style={{ borderColor: 'rgba(218,192,197,0.35)' }}>
                {productos.map((producto) => {
                  const margen = marginPct(
                    Number(producto.precioBase),
                    Number(producto.precioCosto),
                  );
                  const variantes = producto.variantes ?? [];
                  const categoriaNombre =
                    categoriasMap.get(producto.categoriaId) ?? producto.categoria?.nombre ?? '-';
                  const marcaNombre =
                    marcasMap.get(producto.marcaId) ?? producto.marca?.nombre ?? '-';
                  const categoriaInactiva = producto.categoria?.activo === false;
                  const marcaInactiva = producto.marca?.activo === false;
                  const tieneRelacionInactiva = categoriaInactiva || marcaInactiva;

                  return (
                    <article
                      key={producto.id}
                      className="px-4 sm:px-5 py-4 grid grid-cols-1 xl:grid-cols-[2.3fr_1.2fr_1.2fr_1.1fr_1fr_1fr] gap-3 xl:items-center"
                      style={{ backgroundColor: '#fff' }}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className="w-12 h-12 rounded-xl overflow-hidden shrink-0"
                          style={{
                            backgroundColor: '#f1edef',
                            border: '1px solid rgba(218,192,197,0.45)',
                          }}
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
                              style={{ color: '#877176' }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                                image
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="font-black truncate" style={{ color: S.textStrong }}>
                            {producto.nombre}
                          </p>
                          <p className="text-xs truncate" style={{ color: S.textMuted }}>
                            Codigo: {producto.codigoInterno ?? 'Auto-generado'} · IVA{' '}
                            {Number(producto.iva).toFixed(0)}%
                          </p>
                          {tieneRelacionInactiva && (
                            <p className="text-xs font-black mt-1" style={{ color: S.warning }}>
                              Atencion: relacionado con{' '}
                              {categoriaInactiva && marcaInactiva
                                ? 'categoria y marca desactivadas'
                                : categoriaInactiva
                                  ? 'categoria desactivada'
                                  : 'marca desactivada'}
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-bold" style={{ color: S.textStrong }}>
                          {categoriaNombre}
                        </p>
                        <p className="text-xs" style={{ color: S.textMuted }}>
                          {marcaNombre}
                        </p>
                        {tieneRelacionInactiva && (
                          <p className="text-[11px] font-bold mt-1" style={{ color: S.warning }}>
                            Estado catalogo: inconsistente
                          </p>
                        )}
                      </div>

                      <div>
                        <p className="text-sm font-black" style={{ color: S.textStrong }}>
                          {cop.format(Number(producto.precioBase))}
                        </p>
                        <p className="text-xs" style={{ color: S.textMuted }}>
                          Costo {cop.format(Number(producto.precioCosto))}
                        </p>
                      </div>

                      <div>
                        <p
                          className="text-base font-black"
                          style={{
                            color:
                              margen !== null && margen >= 20
                                ? S.success
                                : margen !== null && margen >= 10
                                  ? S.warning
                                  : S.danger,
                          }}
                        >
                          {margen === null ? '-' : `${margen}%`}
                        </p>
                      </div>

                      <div>
                        <button
                          type="button"
                          onClick={() => setProductoVariantes(producto)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
                          style={{ backgroundColor: 'rgba(133,38,75,0.14)', color: S.primary }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                            category
                          </span>
                          {variantes.length} variante{variantes.length === 1 ? '' : 's'}
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingProducto(producto)}
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: 'rgba(115,89,70,0.12)', color: S.textMuted }}
                          title="Editar producto"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                            edit
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteMutation.mutate(producto.id)}
                          disabled={deleteMutation.isPending}
                          className="p-2 rounded-lg disabled:opacity-60"
                          style={{ backgroundColor: 'rgba(186,26,26,0.12)', color: S.danger }}
                          title="Desactivar producto"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                            delete
                          </span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
