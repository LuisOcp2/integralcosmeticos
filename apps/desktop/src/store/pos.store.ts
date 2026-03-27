import { create } from 'zustand';
import { ICierreCaja, MetodoPago } from '@cosmeticos/shared-types';

export interface PosItem {
  varianteId: string;
  nombre: string;
  codigoBarras: string;
  precioUnitario: number;
  cantidad: number;
  descuentoItem: number; // porcentaje 0-100
  stockDisponible?: number;
}

export interface VentaSuspendida {
  id: string;
  items: PosItem[];
  clienteId: string | null;
  clienteNombre: string | null;
  observaciones: string;
  suspendidaEn: string;
}

export interface SplitPago {
  efectivo: number;
  tarjeta: number;
  transferencia: number;
}

interface PosState {
  // Carrito activo
  items: PosItem[];
  clienteId: string | null;
  clienteNombre: string | null;
  metodoPago: MetodoPago;
  splitPago: SplitPago | null;
  usarSplit: boolean;
  observaciones: string;
  descuentoGlobal: number; // porcentaje 0-100
  tipoDescuentoGlobal: 'porcentaje' | 'monto';
  cajaActiva: ICierreCaja | null;

  // Ventas suspendidas
  ventasSuspendidas: VentaSuspendida[];

  // Actions
  setCajaActiva: (caja: ICierreCaja | null) => void;
  agregarItem: (item: Omit<PosItem, 'cantidad' | 'descuentoItem'>, cantidad: number) => void;
  quitarItem: (varianteId: string) => void;
  actualizarCantidad: (varianteId: string, cantidad: number) => void;
  aplicarDescuentoItem: (varianteId: string, descuento: number) => void;
  setCliente: (clienteId: string | null, nombre?: string | null) => void;
  setMetodoPago: (metodo: MetodoPago) => void;
  setUsarSplit: (usar: boolean) => void;
  setSplitPago: (split: SplitPago) => void;
  setObservaciones: (observaciones: string) => void;
  setDescuentoGlobal: (valor: number, tipo: 'porcentaje' | 'monto') => void;
  limpiarCarrito: () => void;
  suspenderVenta: () => void;
  retomarVenta: (id: string) => void;
  eliminarSuspendida: (id: string) => void;
  calcularTotales: () => {
    subtotal: number;
    descuentoItems: number;
    descuentoGlobalMonto: number;
    descuento: number;
    impuesto: number;
    total: number;
  };
}

export const usePosStore = create<PosState>((set, get) => ({
  items: [],
  clienteId: null,
  clienteNombre: null,
  metodoPago: MetodoPago.EFECTIVO,
  splitPago: null,
  usarSplit: false,
  observaciones: '',
  descuentoGlobal: 0,
  tipoDescuentoGlobal: 'porcentaje',
  cajaActiva: null,
  ventasSuspendidas: [],

  setCajaActiva: (cajaActiva) => set({ cajaActiva }),

  agregarItem: (variante, cantidad) =>
    set((state) => {
      const existente = state.items.find((i) => i.varianteId === variante.varianteId);
      if (existente) {
        return {
          items: state.items.map((i) =>
            i.varianteId === variante.varianteId ? { ...i, cantidad: i.cantidad + cantidad } : i,
          ),
        };
      }
      return { items: [...state.items, { ...variante, cantidad, descuentoItem: 0 }] };
    }),

  quitarItem: (varianteId) =>
    set((state) => ({ items: state.items.filter((i) => i.varianteId !== varianteId) })),

  actualizarCantidad: (varianteId, cantidad) =>
    set((state) => ({
      items: state.items
        .map((i) => (i.varianteId === varianteId ? { ...i, cantidad } : i))
        .filter((i) => i.cantidad > 0),
    })),

  aplicarDescuentoItem: (varianteId, descuento) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.varianteId === varianteId ? { ...i, descuentoItem: Math.min(100, Math.max(0, descuento)) } : i,
      ),
    })),

  setCliente: (clienteId, nombre = null) => set({ clienteId, clienteNombre: nombre }),

  setMetodoPago: (metodoPago) => set({ metodoPago }),
  setUsarSplit: (usarSplit) => set({ usarSplit, splitPago: usarSplit ? { efectivo: 0, tarjeta: 0, transferencia: 0 } : null }),
  setSplitPago: (splitPago) => set({ splitPago }),
  setObservaciones: (observaciones) => set({ observaciones }),
  setDescuentoGlobal: (valor, tipo) => set({ descuentoGlobal: valor, tipoDescuentoGlobal: tipo }),

  limpiarCarrito: () =>
    set({
      items: [],
      clienteId: null,
      clienteNombre: null,
      metodoPago: MetodoPago.EFECTIVO,
      splitPago: null,
      usarSplit: false,
      observaciones: '',
      descuentoGlobal: 0,
      tipoDescuentoGlobal: 'porcentaje',
    }),

  suspenderVenta: () =>
    set((state) => {
      if (!state.items.length) return {};
      const nueva: VentaSuspendida = {
        id: `susp_${Date.now()}`,
        items: [...state.items],
        clienteId: state.clienteId,
        clienteNombre: state.clienteNombre,
        observaciones: state.observaciones,
        suspendidaEn: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      };
      return {
        ventasSuspendidas: [...state.ventasSuspendidas, nueva],
        items: [],
        clienteId: null,
        clienteNombre: null,
        observaciones: '',
        descuentoGlobal: 0,
      };
    }),

  retomarVenta: (id) =>
    set((state) => {
      const susp = state.ventasSuspendidas.find((v) => v.id === id);
      if (!susp) return {};
      return {
        items: susp.items,
        clienteId: susp.clienteId,
        clienteNombre: susp.clienteNombre,
        observaciones: susp.observaciones,
        ventasSuspendidas: state.ventasSuspendidas.filter((v) => v.id !== id),
      };
    }),

  eliminarSuspendida: (id) =>
    set((state) => ({ ventasSuspendidas: state.ventasSuspendidas.filter((v) => v.id !== id) })),

  calcularTotales: () => {
    const state = get();
    const subtotal = state.items.reduce((acc, i) => acc + i.precioUnitario * i.cantidad, 0);
    const descuentoItems = state.items.reduce(
      (acc, i) => acc + (i.precioUnitario * i.cantidad * i.descuentoItem) / 100,
      0,
    );
    const baseTrasDtos = subtotal - descuentoItems;
    const descuentoGlobalMonto =
      state.tipoDescuentoGlobal === 'porcentaje'
        ? (baseTrasDtos * state.descuentoGlobal) / 100
        : Math.min(state.descuentoGlobal, baseTrasDtos);
    const descuento = descuentoItems + descuentoGlobalMonto;
    const base = subtotal - descuento;
    const impuesto = base * 0.19;
    const total = base + impuesto;
    return { subtotal, descuentoItems, descuentoGlobalMonto, descuento, impuesto, total };
  },
}));
