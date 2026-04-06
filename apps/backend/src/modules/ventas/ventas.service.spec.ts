import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EstadoCaja, EstadoVenta, MetodoPago, Rol, TipoMovimiento } from '@cosmeticos/shared-types';
import { VentasService } from './ventas.service';

type RepoMock = {
  findOne: jest.Mock;
  find: jest.Mock;
  save: jest.Mock;
  create: jest.Mock;
  createQueryBuilder: jest.Mock;
};

function createRepoMock(): RepoMock {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn((input) => input),
    createQueryBuilder: jest.fn(),
  };
}

function createStockQueryBuilder(result: unknown) {
  return {
    setLock: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(result),
  };
}

describe('VentasService', () => {
  const ventasRepository = createRepoMock();
  const detalleVentasRepository = createRepoMock();
  const cajaRepository = createRepoMock();
  const cajasRepository = createRepoMock();
  const variantesRepository = createRepoMock();
  const productosRepository = createRepoMock();
  const sedesRepository = createRepoMock();
  const usuariosRepository = createRepoMock();

  const inventarioService = {
    registrarMovimientoConManager: jest.fn(),
  };

  const clientesService = {
    sumarPuntosConManager: jest.fn(),
  };

  const contabilidadService = {
    generarAsientoVenta: jest.fn().mockResolvedValue({ id: 'asiento-1' }),
    generarAsientoReversionVenta: jest.fn().mockResolvedValue({ id: 'asiento-reversa-1' }),
    validarPeriodoAbiertoPorFecha: jest.fn().mockResolvedValue(undefined),
  };

  const workflowEngine = {
    dispararEvento: jest.fn().mockResolvedValue({ workflowsEjecutados: 0 }),
  };

  const dataSource = {
    transaction: jest.fn(),
  };

  let service: VentasService;

  beforeEach(async () => {
    jest.clearAllMocks();
    cajasRepository.findOne.mockResolvedValue({ id: 'caja-1', sedeId: 's1', activo: true });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: VentasService,
          useFactory: () =>
            new VentasService(
              ventasRepository as any,
              detalleVentasRepository as any,
              cajaRepository as any,
              cajasRepository as any,
              variantesRepository as any,
              productosRepository as any,
              sedesRepository as any,
              usuariosRepository as any,
              inventarioService as any,
              clientesService as any,
              contabilidadService as any,
              workflowEngine as any,
              dataSource as any,
            ),
        },
      ],
    }).compile();

    service = module.get(VentasService);
  });

  function setupTransactionRepos(overrides?: {
    variante?: any;
    producto?: any;
    stockCantidad?: number;
    ventaFinal?: any;
  }) {
    const ventaRepo = {
      create: jest.fn((data) => data),
      save: jest
        .fn()
        .mockResolvedValueOnce({ id: 'venta-1' })
        .mockResolvedValueOnce({
          id: 'venta-1',
          numero: 'VEN-2026-000001',
          total: 12000,
          subtotal: 12000,
          impuestos: 0,
          descuento: 0,
          estado: EstadoVenta.COMPLETADA,
          ...(overrides?.ventaFinal ?? {}),
        }),
      findOne: jest.fn().mockResolvedValue({
        id: 'venta-1',
        numero: 'VEN-2026-000001',
        total: 12000,
        detalles: [],
      }),
    };

    const detalleRepo = {
      create: jest.fn((data) => data),
      save: jest.fn().mockResolvedValue({}),
    };

    const varianteRepo = {
      findOne: jest.fn().mockResolvedValue(
        overrides?.variante ?? {
          id: 'v1',
          productoId: 'p1',
          precioVenta: 12000,
          sku: 'SKU-1',
          activo: true,
        },
      ),
    };

    const productoRepo = {
      findOne: jest.fn().mockResolvedValue(
        overrides?.producto ?? {
          id: 'p1',
          nombre: 'Shampoo',
          precio: 12000,
          impuesto: 0,
          permitirVentaSinStock: false,
          activo: true,
        },
      ),
    };

    const stockRepo = {
      createQueryBuilder: jest.fn(() =>
        createStockQueryBuilder({
          id: 'stock-1',
          varianteId: 'v1',
          sedeId: 's1',
          cantidad: overrides?.stockCantidad ?? 5,
        }),
      ),
    };

    const repoByEntityName: Record<string, any> = {
      Venta: ventaRepo,
      DetalleVenta: detalleRepo,
      Variante: varianteRepo,
      Producto: productoRepo,
      StockSede: stockRepo,
    };

    dataSource.transaction.mockImplementation(async (cb: any) =>
      cb({
        query: jest
          .fn()
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce([{ seq: '000001' }]),
        getRepository: (entity: { name: string }) => repoByEntityName[entity.name],
      }),
    );

    return { ventaRepo, stockRepo };
  }

  describe('crearVenta', () => {
    it('debe lanzar error si no hay sedeId en el usuario', async () => {
      await expect(
        service.crearVenta(
          {
            metodoPago: MetodoPago.EFECTIVO,
            montoPagado: 10000,
            items: [{ varianteId: 'v1', cantidad: 1 }],
          } as any,
          'u1',
          null,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('debe lanzar error si no hay caja abierta para cajero y sede', async () => {
      cajaRepository.findOne.mockResolvedValue(null);

      await expect(
        service.crearVenta(
          {
            metodoPago: MetodoPago.EFECTIVO,
            montoPagado: 10000,
            items: [{ varianteId: 'v1', cantidad: 1 }],
          } as any,
          'u1',
          's1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('debe crear venta y descontar inventario', async () => {
      cajaRepository.findOne.mockResolvedValue({
        id: 'sesion-caja-1',
        cajaId: 'caja-1',
        estado: EstadoCaja.ABIERTA,
      });
      setupTransactionRepos();
      jest.spyOn(service, 'getVentaById').mockResolvedValue({ id: 'venta-1' } as any);

      await service.crearVenta(
        {
          metodoPago: MetodoPago.EFECTIVO,
          montoPagado: 24000,
          items: [{ varianteId: 'v1', cantidad: 2 }],
        } as any,
        'u1',
        's1',
      );

      expect(inventarioService.registrarMovimientoConManager).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: TipoMovimiento.SALIDA,
          varianteId: 'v1',
          cantidad: 2,
          sedeOrigenId: 's1',
        }),
        'u1',
        expect.anything(),
      );
      expect(contabilidadService.generarAsientoVenta).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'venta-1' }),
        expect.anything(),
      );
      expect(contabilidadService.validarPeriodoAbiertoPorFecha).toHaveBeenCalled();
    });

    it('debe impedir venta sin stock cuando producto no lo permite', async () => {
      cajaRepository.findOne.mockResolvedValue({
        id: 'sesion-caja-1',
        cajaId: 'caja-1',
        estado: EstadoCaja.ABIERTA,
      });
      setupTransactionRepos({
        stockCantidad: 0,
        producto: {
          id: 'p1',
          nombre: 'Crema',
          precio: 10000,
          impuesto: 19,
          permitirVentaSinStock: false,
          activo: true,
        },
      });

      await expect(
        service.crearVenta(
          {
            metodoPago: MetodoPago.EFECTIVO,
            montoPagado: 12000,
            items: [{ varianteId: 'v1', cantidad: 1 }],
          } as any,
          'u1',
          's1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('debe sumar puntos al cliente cuando aplica', async () => {
      cajaRepository.findOne.mockResolvedValue({
        id: 'sesion-caja-1',
        cajaId: 'caja-1',
        estado: EstadoCaja.ABIERTA,
      });
      setupTransactionRepos({
        ventaFinal: { total: 3500, numero: 'VEN-2026-000002' },
        variante: {
          id: 'v1',
          productoId: 'p1',
          precioVenta: 3500,
          sku: 'SKU-1',
          activo: true,
        },
        producto: {
          id: 'p1',
          nombre: 'Crema',
          precio: 3500,
          impuesto: 0,
          permitirVentaSinStock: false,
          activo: true,
        },
      });
      jest.spyOn(service, 'getVentaById').mockResolvedValue({ id: 'venta-1' } as any);

      await service.crearVenta(
        {
          clienteId: 'cl-1',
          metodoPago: MetodoPago.EFECTIVO,
          montoPagado: 3500,
          items: [{ varianteId: 'v1', cantidad: 1 }],
        } as any,
        'u1',
        's1',
      );

      expect(clientesService.sumarPuntosConManager).toHaveBeenCalledWith(
        'cl-1',
        3,
        expect.anything(),
        3500,
      );
    });

    it('debe fallar si monto pagado es menor al total', async () => {
      cajaRepository.findOne.mockResolvedValue({
        id: 'sesion-caja-1',
        cajaId: 'caja-1',
        estado: EstadoCaja.ABIERTA,
      });
      setupTransactionRepos();

      await expect(
        service.crearVenta(
          {
            metodoPago: MetodoPago.EFECTIVO,
            montoPagado: 1000,
            items: [{ varianteId: 'v1', cantidad: 1 }],
          } as any,
          'u1',
          's1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('anularVenta', () => {
    it('debe bloquear anulacion para rol no autorizado', async () => {
      await expect(
        service.anularVenta('venta-1', { motivo: 'Error' } as any, 'u1', Rol.CAJERO),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('debe anular venta y devolver inventario', async () => {
      const venta = {
        id: 'venta-1',
        numero: 'VEN-2026-000001',
        sedeId: 's1',
        total: 3500,
        estado: EstadoVenta.COMPLETADA,
        createdAt: new Date('2026-03-01T10:00:00.000Z'),
        detalles: [{ varianteId: 'v1', cantidad: 2 }],
      };

      const ventaRepo = {
        findOne: jest.fn().mockResolvedValue(venta),
        save: jest.fn().mockImplementation(async (value) => value),
      };

      dataSource.transaction.mockImplementation(async (cb: any) =>
        cb({
          getRepository: (entity: { name: string }) => {
            if (entity.name === 'Venta') return ventaRepo;
            return null;
          },
        }),
      );

      const result = await service.anularVenta(
        'venta-1',
        { motivo: 'Error cajero' } as any,
        'u1',
        Rol.ADMIN,
      );

      expect(result.estado).toBe(EstadoVenta.ANULADA);
      expect(inventarioService.registrarMovimientoConManager).toHaveBeenCalledWith(
        expect.objectContaining({ tipo: TipoMovimiento.DEVOLUCION, varianteId: 'v1', cantidad: 2 }),
        'u1',
        expect.anything(),
      );
      expect(result.motivoAnulacion).toBe('Error cajero');
      expect(contabilidadService.generarAsientoReversionVenta).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'venta-1' }),
        'u1',
        'Error cajero',
        expect.anything(),
      );
    });
  });
});
