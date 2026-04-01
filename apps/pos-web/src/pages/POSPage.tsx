import { useState, useCallback } from 'react';
import { ShoppingCart, Trash2, CreditCard, Percent } from 'lucide-react';
import type { MetodoPago, Producto, Cliente } from '@/types';
import { useCarrito } from '@/hooks/useCarrito';
import { useProductos } from '@/hooks/useProductos';
import { useCategorias } from '@/hooks/useCategorias';
import { useVenta } from '@/hooks/useVenta';
import { useAuth } from '@/hooks/useAuth';
import type { AuthUser } from '@/hooks/useAuth';
import SearchBar from '@/components/SearchBar';
import FiltrosCategorias from '@/components/FiltrosCategorias';
import ProductoGrid from '@/components/ProductoGrid';
import CarritoItem from '@/components/CarritoItem';
import ClienteSelector from '@/components/ClienteSelector';
import MetodoPagoSelector from '@/components/MetodoPagoSelector';
import ModalCobro from '@/components/ModalCobro';
import SideNav from '@/components/SideNav';

const IVA_RATE = 0.19;
const formatCOP = (v: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(v);

interface POSPageProps {
  user: AuthUser;
  sedeId: string;
  onOpenCaja: () => void;
  onOpenUsuarios: () => void;
}

export default function POSPage({ user, sedeId, onOpenCaja, onOpenUsuarios }: POSPageProps) {
  const { logout } = useAuth();
  const [busqueda, setBusqueda] = useState('');
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('EFECTIVO');
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [descuentoGlobal, setDescuentoGlobal] = useState(0);
  const [showModal, setShowModal] = useState(false);

  const { data: categorias = [] } = useCategorias();
  const { data: productosData, isLoading } = useProductos({ q: busqueda, categoriaId });
  const {
    items,
    agregarProducto,
    quitarProducto,
    cambiarCantidad,
    cambiarDescuentoItem,
    limpiarCarrito,
    subtotal,
    totalItems,
  } = useCarrito();
  const { cobrar, cobrando } = useVenta();

  const handleAgregarProducto = useCallback(
    (producto: Producto) => {
      agregarProducto(producto);
    },
    [agregarProducto],
  );

  const baseImponible = subtotal * (1 - descuentoGlobal / 100);
  const iva = baseImponible * IVA_RATE;
  const total = baseImponible + iva;

  const handleCobrar = async (_montoRecibido: number | null) => {
    setShowModal(false);
    await cobrar({
      sedeId,
      clienteId: cliente?.id,
      metodoPago,
      descuento: descuentoGlobal,
      items: items.map((i) => ({
        varianteId: i.varianteId,
        cantidad: i.cantidad,
        descuentoItem: i.descuentoItem,
      })),
    });
    limpiarCarrito();
    setCliente(null);
    setDescuentoGlobal(0);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background font-sans">
      {/* Side Navigation */}
      <SideNav
        user={user}
        onLogout={logout}
        currentView="pos"
        onNavigate={(view) => {
          if (view === 'caja') onOpenCaja();
          if (view === 'usuarios') onOpenUsuarios();
        }}
      />

      {/* ── Product catalog ─────────────────────────── */}
      <main className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center gap-4 px-5 py-4 bg-surface border-b border-outline-variant shrink-0">
          <div className="flex-1">
            <SearchBar value={busqueda} onChange={setBusqueda} />
          </div>
          <div className="shrink-0">
            <div className="flex items-center gap-2 bg-primary-container rounded-2xl px-4 py-2">
              <CreditCard className="w-5 h-5 text-on-primary-container" />
              <span className="text-on-primary-container text-sm font-semibold hidden md:block">
                POS Terminal
              </span>
            </div>
          </div>
        </div>

        {/* Categorías */}
        <div className="px-5 py-3 border-b border-outline-variant bg-surface shrink-0">
          <FiltrosCategorias
            categorias={categorias}
            selectedId={categoriaId}
            onSelect={setCategoriaId}
          />
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <ProductoGrid
            productos={productosData?.data ?? []}
            loading={isLoading}
            onAgregar={handleAgregarProducto}
            emptyMessage={
              busqueda
                ? `No se encontraron productos para "${busqueda}"`
                : 'No hay productos disponibles'
            }
          />
        </div>
      </main>

      {/* ── Cart / Checkout Panel ──────────────────── */}
      <aside className="w-80 xl:w-96 flex flex-col bg-surface border-l border-outline-variant h-full shrink-0">
        {/* Cart header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-on-background" />
            <h2 className="text-on-background font-bold text-lg">Carrito</h2>
            {totalItems > 0 && (
              <span className="bg-primary text-on-primary text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </div>
          {items.length > 0 && (
            <button
              onClick={limpiarCarrito}
              className="text-on-surface-variant text-xs hover:text-error transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" />
              Vaciar
            </button>
          )}
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto px-5">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-on-surface-variant">
              <ShoppingCart className="w-16 h-16 opacity-20" />
              <p className="text-sm font-medium">El carrito está vacío</p>
              <p className="text-xs text-center opacity-70">Agrega productos desde el catálogo</p>
            </div>
          ) : (
            <div>
              {items.map((item) => (
                <CarritoItem
                  key={item.key}
                  item={item}
                  onCambiarCantidad={cambiarCantidad}
                  onCambiarDescuento={cambiarDescuentoItem}
                  onQuitar={quitarProducto}
                />
              ))}
            </div>
          )}
        </div>

        {/* Checkout panel – only show if items exist */}
        {items.length > 0 && (
          <div className="px-5 pb-5 pt-3 border-t border-outline-variant flex flex-col gap-4 shrink-0 bg-surface-1">
            {/* Cliente */}
            <ClienteSelector clienteSeleccionado={cliente} onSeleccionar={setCliente} />

            {/* Discounted subtotal */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant text-xs">Subtotal</span>
                <span className="text-on-background text-sm font-semibold">
                  {formatCOP(subtotal)}
                </span>
              </div>
              {/* Global discount */}
              <div className="flex items-center gap-2">
                <span className="text-on-surface-variant text-xs flex-1">Dcto. global (%)</span>
                <div className="flex items-center gap-1 bg-surface-2 border border-outline-variant rounded-2xl px-3 py-1">
                  <Percent className="w-3.5 h-3.5 text-outline" />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={descuentoGlobal || ''}
                    placeholder="0"
                    onChange={(e) =>
                      setDescuentoGlobal(Math.min(100, Math.max(0, Number(e.target.value))))
                    }
                    className="w-10 bg-transparent text-on-background text-xs font-medium text-center focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant text-xs">IVA 19%</span>
                <span className="text-on-background text-sm font-semibold">{formatCOP(iva)}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-outline-variant">
                <span className="text-on-background font-bold text-sm">Total</span>
                <span className="text-primary font-extrabold text-xl">{formatCOP(total)}</span>
              </div>
            </div>

            {/* Método pago */}
            <MetodoPagoSelector selected={metodoPago} onChange={setMetodoPago} />

            {/* Cobrar */}
            <button
              onClick={() => setShowModal(true)}
              disabled={cobrando}
              className="h-14 bg-primary text-on-primary font-bold text-base rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-98 transition-all disabled:opacity-60 shadow-elevation2"
            >
              {cobrando ? (
                <div className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CreditCard className="w-6 h-6" />
                  Cobrar {formatCOP(total)}
                </>
              )}
            </button>
          </div>
        )}
      </aside>

      {/* Confirmation modal */}
      {showModal && (
        <ModalCobro
          subtotal={subtotal}
          descuentoGlobal={descuentoGlobal}
          metodoPago={metodoPago}
          onConfirmar={handleCobrar}
          onCancelar={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
