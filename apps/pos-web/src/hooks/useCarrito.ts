import { useCallback, useState } from 'react';
import type { ItemCarrito, Producto, Variante } from '@/types';

function computeSubtotal(precio: number, cantidad: number, descuento: number) {
  return precio * cantidad * (1 - descuento / 100);
}

export function useCarrito() {
  const [items, setItems] = useState<ItemCarrito[]>([]);

  const getPrecioProducto = useCallback((producto: Producto) => {
    const precio = Number(producto.precio ?? producto.precioBase ?? 0);
    return Number.isFinite(precio) ? precio : 0;
  }, []);

  const agregarProducto = useCallback(
    (producto: Producto, variante?: Variante) => {
      const varianteId = variante?.id ?? producto.id;
      const key = variante ? `v:${variante.id}` : `p:${producto.id}`;
      const precioProducto = getPrecioProducto(producto);
      const precioVariante = Number(variante?.precioVenta);
      const precioUnitario = Number.isFinite(precioVariante)
        ? precioVariante
        : variante
          ? precioProducto + Number(variante.precioExtra ?? 0)
          : precioProducto;

      setItems((prev) => {
        const existing = prev.find((i) => i.key === key);
        if (existing) {
          return prev.map((i) =>
            i.key === key
              ? {
                  ...i,
                  cantidad: i.cantidad + 1,
                  subtotal: computeSubtotal(i.precioUnitario, i.cantidad + 1, i.descuentoItem),
                }
              : i,
          );
        }
        const newItem: ItemCarrito = {
          key,
          varianteId,
          productoId: producto.id,
          nombre: producto.nombre,
          variante: variante?.nombre ?? 'Estándar',
          imagenUrl: variante?.imagenUrl ?? producto.imagenUrl,
          precioUnitario,
          cantidad: 1,
          descuentoItem: 0,
          subtotal: precioUnitario,
        };
        return [...prev, newItem];
      });
    },
    [getPrecioProducto],
  );

  const quitarProducto = useCallback((key: string) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }, []);

  const cambiarCantidad = useCallback((key: string, cantidad: number) => {
    if (cantidad <= 0) {
      setItems((prev) => prev.filter((i) => i.key !== key));
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.key === key
          ? {
              ...i,
              cantidad,
              subtotal: computeSubtotal(i.precioUnitario, cantidad, i.descuentoItem),
            }
          : i,
      ),
    );
  }, []);

  const cambiarDescuentoItem = useCallback((key: string, descuento: number) => {
    const d = Math.min(100, Math.max(0, descuento));
    setItems((prev) =>
      prev.map((i) =>
        i.key === key
          ? { ...i, descuentoItem: d, subtotal: computeSubtotal(i.precioUnitario, i.cantidad, d) }
          : i,
      ),
    );
  }, []);

  const limpiarCarrito = useCallback(() => setItems([]), []);

  // Computed totals
  const subtotal = items.reduce((acc, i) => acc + i.subtotal, 0);
  const totalItems = items.reduce((acc, i) => acc + i.cantidad, 0);

  return {
    items,
    agregarProducto,
    quitarProducto,
    cambiarCantidad,
    cambiarDescuentoItem,
    limpiarCarrito,
    subtotal,
    totalItems,
  };
}
