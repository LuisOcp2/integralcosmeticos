import { create } from 'zustand';
import { ICierreCaja, MetodoPago } from '@cosmeticos/shared-types';

export interface PosItem {
  varianteId: string;
  nombre: string;
  codigoBarras: string;
  precioUnitario: number;
  cantidad: number;
  descuentoItem: number;
}

interface PosState {
  items: PosItem[];
  clienteId: string | null;
  metodoPago: MetodoPago;
  observaciones: string;
  cajaActiva: ICierreCaja | null;
  setCajaActiva: (caja: ICierreCaja | null) => void;
  agregarItem: (item: Omit<PosItem, 'cantidad' | 'descuentoItem'>, cantidad: number) => void;
  quitarItem: (varianteId: string) => void;
  actualizarCantidad: (varianteId: string, cantidad: number) => void;
  aplicarDescuentoItem: (varianteId: string, descuento: number) => void;
  setCliente: (clienteId: string | null) => void;
  setMetodoPago: (metodo: MetodoPago) => void;
  setObservaciones: (observaciones: string) => void;
  limpiarCarrito: () => void;
  calcularTotales: () => { subtotal: number; descuento: number; impuesto: number; total: number };
}

export const usePosStore = create<PosState>((set, get) => ({
  items: [],
  clienteId: null,
  metodoPago: MetodoPago.EFECTIVO,
  observaciones: '',
  cajaActiva: null,
  setCajaActiva: (cajaActiva) => set({ cajaActiva }),
  agregarItem: (variante, cantidad) =>
    set((state) => {
      const existente = state.items.find((item) => item.varianteId === variante.varianteId);
      if (existente) {
        return {
          items: state.items.map((item) =>
            item.varianteId === variante.varianteId
              ? { ...item, cantidad: item.cantidad + cantidad }
              : item,
          ),
        };
      }

      return {
        items: [...state.items, { ...variante, cantidad, descuentoItem: 0 }],
      };
    }),
  quitarItem: (varianteId) =>
    set((state) => ({
      items: state.items.filter((item) => item.varianteId !== varianteId),
    })),
  actualizarCantidad: (varianteId, cantidad) =>
    set((state) => ({
      items: state.items
        .map((item) => (item.varianteId === varianteId ? { ...item, cantidad } : item))
        .filter((item) => item.cantidad > 0),
    })),
  aplicarDescuentoItem: (varianteId, descuento) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.varianteId === varianteId ? { ...item, descuentoItem: Math.max(0, descuento) } : item,
      ),
    })),
  setCliente: (clienteId) => set({ clienteId }),
  setMetodoPago: (metodoPago) => set({ metodoPago }),
  setObservaciones: (observaciones) => set({ observaciones }),
  limpiarCarrito: () =>
    set({
      items: [],
      clienteId: null,
      metodoPago: MetodoPago.EFECTIVO,
      observaciones: '',
    }),
  calcularTotales: () => {
    const subtotal = get().items.reduce(
      (acc, item) => acc + item.precioUnitario * item.cantidad,
      0,
    );
    const descuento = get().items.reduce((acc, item) => acc + item.descuentoItem, 0);
    const base = subtotal - descuento;
    const impuesto = base * 0.19;
    const total = base + impuesto;
    return {
      subtotal,
      descuento,
      impuesto,
      total,
    };
  },
}));
