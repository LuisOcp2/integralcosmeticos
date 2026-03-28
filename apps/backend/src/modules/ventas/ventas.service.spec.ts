import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EstadoVenta, MetodoPago, TipoMovimiento } from '@cosmeticos/shared-types';
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

function createCajaQueryBuilder(result: unknown) {
  return {
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(result),
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
  const variantesRepository = createRepoMock();
  const productosRepository = createRepoMock();
  const clientesRepository = createRepoMock();
  const sedesRepository = createRepoMock();

  const inventarioService = {
    registrarMovimientoConManager: jest.fn(),
  };

  const dataSource = {
    transaction: jest.fn(),
  };

  let service: VentasService;

  beforeEach(async () => {
    jest.clearAllMocks();

    cajaRepository.createQueryBuilder.mockReturnValue(createCajaQueryBuilder(null));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: VentasService,
          useFactory: () =>
            new VentasService(
              ventasRepository as any,
              detalleVentasRepository as any,
              cajaRepository as any,
              variantesRepository as any,
              productosRepository as any,
              clientesRepository as any,
              sedesRepository as any,
              inventarioService as any,
              dataSource as any,
            ),
        },
      ],
    }).compile();

    service = module.get(VentasService);
  });

  function setupTransactionRepos(overrides?: {
    ultimaVentaNumero?: string | null;
    variante?: any;
    producto?: any;
    stockCantidad?: number;
    cliente?: any;
    ventaFinal?: any;
  }) {
    const ventaRepo = {
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest
          .fn()
          .mockResolvedValue(
            overrides?.ultimaVentaNumero ? { numero: overrides.ultimaVentaNumero } : null,
          ),
      })),
      create: jest.fn((data) => data),
      save: jest
        .fn()
        .mockResolvedValueOnce({ id: 'venta-1' })
        .mockResolvedValueOnce({
          id: 'venta-1',
          numero: 'VTA-2026-00001',
          total: 12000,
          subtotal: 12000,
          impuesto: 0,
          descuento: 0,
          estado: EstadoVenta.COMPLETADA,
          ...(overrides?.ventaFinal ?? {}),
        }),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue({
        id: 'venta-1',
        numero: 'VTA-2026-00001',
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
          precioExtra: 0,
          activo: true,
        },
      ),
    };

    const productoRepo = {
      findOne: jest.fn().mockResolvedValue(
        overrides?.producto ?? {
          id: 'p1',
          precioBase: 12000,
          precioCosto: 7000,
          iva: 0,
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

    const clienteRepo = {
      findOne: jest.fn().mockResolvedValue(overrides?.cliente ?? null),
      save: jest.fn().mockImplementation(async (value) => value),
    };

    const sesionCajaRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 'sesion-caja-1', activo: true }),
      save: jest.fn().mockResolvedValue({}),
    };

    const repoByEntityName: Record<string, any> = {
      Venta: ventaRepo,
      DetalleVenta: detalleRepo,
      Variante: varianteRepo,
      Producto: productoRepo,
      StockSede: stockRepo,
      Cliente: clienteRepo,
      SesionCaja: sesionCajaRepo,
    };

    dataSource.transaction.mockImplementation(async (cb: any) =>
      cb({
        getRepository: (entity: { name: string }) => repoByEntityName[entity.name],
      }),
    );

    return { ventaRepo, detalleRepo, varianteRepo, productoRepo, clienteRepo, stockRepo };
  }

  describe('crearVenta', () => {
    it('debe lanzar error si no hay caja abierta en la sede', async () => {
      cajaRepository.createQueryBuilder.mockReturnValue(createCajaQueryBuilder(null));

      await expect(
        service.crearVenta(
          {
            sedeId: 's1',
            metodoPago: MetodoPago.EFECTIVO,
            items: [{ varianteId: 'v1', cantidad: 1 }],
          } as any,
          'u1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('debe crear venta y descontar inventario por cada variante', async () => {
      cajaRepository.createQueryBuilder.mockReturnValue(
        createCajaQueryBuilder({ id: 'sesion-caja-1', activa: true }),
      );
      setupTransactionRepos();
      jest.spyOn(service, 'getVentaById').mockResolvedValue({ id: 'venta-1' } as any);

      await service.crearVenta(
        {
          sedeId: 's1',
          metodoPago: MetodoPago.EFECTIVO,
          items: [{ varianteId: 'v1', cantidad: 2 }],
        } as any,
        'u1',
      );

      expect(inventarioService.registrarMovimientoConManager).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: TipoMovimiento.SALIDA,
          varianteId: 'v1',
          cantidad: 2,
          sedeId: 's1',
        }),
        'u1',
        expect.anything(),
      );
    });

    it('debe asignar monto efectivo igual al total para pago en efectivo', async () => {
      cajaRepository.createQueryBuilder.mockReturnValue(
        createCajaQueryBuilder({ id: 'sesion-caja-1', activa: true }),
      );
      const { ventaRepo } = setupTransactionRepos();
      jest.spyOn(service, 'getVentaById').mockResolvedValue({ id: 'venta-1' } as any);

      await service.crearVenta(
        {
          sedeId: 's1',
          metodoPago: MetodoPago.EFECTIVO,
          items: [{ varianteId: 'v1', cantidad: 1 }],
        } as any,
        'u1',
      );

      expect(ventaRepo.save).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ montoEfectivo: 12000, montoTarjeta: 0, montoTransferencia: 0 }),
      );
    });

    it('debe asignar monto tarjeta para pago con tarjeta credito', async () => {
      cajaRepository.createQueryBuilder.mockReturnValue(
        createCajaQueryBuilder({ id: 'sesion-caja-1', activa: true }),
      );
      const { ventaRepo } = setupTransactionRepos();
      jest.spyOn(service, 'getVentaById').mockResolvedValue({ id: 'venta-1' } as any);

      await service.crearVenta(
        {
          sedeId: 's1',
          metodoPago: MetodoPago.TARJETA_CREDITO,
          items: [{ varianteId: 'v1', cantidad: 1 }],
        } as any,
        'u1',
      );

      expect(ventaRepo.save).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ montoEfectivo: 0, montoTarjeta: 12000, montoTransferencia: 0 }),
      );
    });

    it('debe validar que splitPago coincida con total cuando metodo es COMBINADO', async () => {
      cajaRepository.createQueryBuilder.mockReturnValue(
        createCajaQueryBuilder({ id: 'sesion-caja-1', activa: true }),
      );
      setupTransactionRepos();

      await expect(
        service.crearVenta(
          {
            sedeId: 's1',
            metodoPago: MetodoPago.COMBINADO,
            splitPago: { efectivo: 5000, tarjeta: 2000, transferencia: 1000 },
            items: [{ varianteId: 'v1', cantidad: 1 }],
          } as any,
          'u1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('debe rechazar splitPago cuando metodo no es COMBINADO', async () => {
      cajaRepository.createQueryBuilder.mockReturnValue(
        createCajaQueryBuilder({ id: 'sesion-caja-1', activa: true }),
      );
      setupTransactionRepos();

      await expect(
        service.crearVenta(
          {
            sedeId: 's1',
            metodoPago: MetodoPago.EFECTIVO,
            splitPago: { efectivo: 12000, tarjeta: 0, transferencia: 0 },
            items: [{ varianteId: 'v1', cantidad: 1 }],
          } as any,
          'u1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('debe rechazar descuento general mayor que subtotal + impuesto', async () => {
      cajaRepository.createQueryBuilder.mockReturnValue(
        createCajaQueryBuilder({ id: 'sesion-caja-1', activa: true }),
      );
      setupTransactionRepos();

      await expect(
        service.crearVenta(
          {
            sedeId: 's1',
            metodoPago: MetodoPago.EFECTIVO,
            descuento: 15000,
            items: [{ varianteId: 'v1', cantidad: 1 }],
          } as any,
          'u1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('debe acumular cantidades de items repetidos para validar stock', async () => {
      cajaRepository.createQueryBuilder.mockReturnValue(
        createCajaQueryBuilder({ id: 'sesion-caja-1', activa: true }),
      );
      const { stockRepo } = setupTransactionRepos({ stockCantidad: 3 });

      await expect(
        service.crearVenta(
          {
            sedeId: 's1',
            metodoPago: MetodoPago.EFECTIVO,
            items: [
              { varianteId: 'v1', cantidad: 2 },
              { varianteId: 'v1', cantidad: 2 },
            ],
          } as any,
          'u1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(stockRepo.createQueryBuilder).toHaveBeenCalledTimes(1);
    });

    it('debe generar numero correlativo VTA-YYYY-NNNNN', async () => {
      cajaRepository.createQueryBuilder.mockReturnValue(
        createCajaQueryBuilder({ id: 'sesion-caja-1', activa: true }),
      );
      const currentYear = new Date().getFullYear();
      const { ventaRepo } = setupTransactionRepos({
        ultimaVentaNumero: `VTA-${currentYear}-00007`,
      });
      jest.spyOn(service, 'getVentaById').mockResolvedValue({ id: 'venta-1' } as any);

      await service.crearVenta(
        {
          sedeId: 's1',
          metodoPago: MetodoPago.EFECTIVO,
          items: [{ varianteId: 'v1', cantidad: 1 }],
        } as any,
        'u1',
      );

      expect(ventaRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ numero: `VTA-${currentYear}-00008` }),
      );
    });

    it('debe sumar puntos de fidelidad cuando hay cliente', async () => {
      cajaRepository.createQueryBuilder.mockReturnValue(
        createCajaQueryBuilder({ id: 'sesion-caja-1', activa: true }),
      );

      const cliente = { id: 'cl-1', activo: true, puntosFidelidad: 4 };
      const { clienteRepo } = setupTransactionRepos({
        cliente,
        ventaFinal: { total: 3500, numero: 'VTA-2026-00002' },
        producto: { id: 'p1', precioBase: 3500, precioCosto: 2000, iva: 0, activo: true },
      });

      jest.spyOn(service, 'getVentaById').mockResolvedValue({ id: 'venta-1' } as any);

      await service.crearVenta(
        {
          sedeId: 's1',
          clienteId: 'cl-1',
          metodoPago: MetodoPago.EFECTIVO,
          items: [{ varianteId: 'v1', cantidad: 1 }],
        } as any,
        'u1',
      );

      expect(cliente.puntosFidelidad).toBe(7);
      expect(clienteRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ puntosFidelidad: 7 }),
      );
    });

    it('debe lanzar error si cliente no existe cuando se envia clienteId', async () => {
      cajaRepository.createQueryBuilder.mockReturnValue(
        createCajaQueryBuilder({ id: 'sesion-caja-1', activa: true }),
      );
      setupTransactionRepos({ cliente: null });

      await expect(
        service.crearVenta(
          {
            sedeId: 's1',
            clienteId: 'cl-not-found',
            metodoPago: MetodoPago.EFECTIVO,
            items: [{ varianteId: 'v1', cantidad: 1 }],
          } as any,
          'u1',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('anularVenta', () => {
    it('debe anular venta, devolver inventario y reversar puntos del cliente', async () => {
      const venta = {
        id: 'venta-1',
        numero: 'VTA-2026-00001',
        sedeId: 's1',
        cajaId: 'sesion-caja-1',
        clienteId: 'cl-1',
        total: 3500,
        estado: EstadoVenta.COMPLETADA,
        observaciones: null,
        detalles: [{ varianteId: 'v1', cantidad: 2 }],
      };

      const cliente = { id: 'cl-1', puntosFidelidad: 10 };

      const ventaRepo = {
        findOne: jest.fn().mockResolvedValue(venta),
        save: jest.fn().mockImplementation(async (value) => value),
        find: jest.fn().mockResolvedValue([]),
      };

      const cajaRepo = {
        findOne: jest.fn().mockResolvedValue({ id: 'sesion-caja-1', activo: true }),
        save: jest.fn().mockResolvedValue({}),
      };

      const clienteRepo = {
        findOne: jest.fn().mockResolvedValue(cliente),
        save: jest.fn().mockImplementation(async (value) => value),
      };

      dataSource.transaction.mockImplementation(async (cb: any) =>
        cb({
          getRepository: (entity: { name: string }) => {
            if (entity.name === 'Venta') return ventaRepo;
            if (entity.name === 'SesionCaja') return cajaRepo;
            if (entity.name === 'Cliente') return clienteRepo;
            return null;
          },
        }),
      );

      const result = await service.anularVenta('venta-1', { motivo: 'Error cajero' } as any, 'u1');

      expect(result.estado).toBe(EstadoVenta.ANULADA);
      expect(inventarioService.registrarMovimientoConManager).toHaveBeenCalledWith(
        expect.objectContaining({ tipo: TipoMovimiento.DEVOLUCION, varianteId: 'v1', cantidad: 2 }),
        'u1',
        expect.anything(),
      );
      expect(clienteRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ puntosFidelidad: 7 }),
      );
    });

    it('debe rechazar anulacion cuando la venta ya esta anulada', async () => {
      const ventaRepo = {
        findOne: jest.fn().mockResolvedValue({
          id: 'venta-1',
          estado: EstadoVenta.ANULADA,
          detalles: [],
        }),
      };

      dataSource.transaction.mockImplementation(async (cb: any) =>
        cb({
          getRepository: (entity: { name: string }) => {
            if (entity.name === 'Venta') return ventaRepo;
            return { findOne: jest.fn(), save: jest.fn(), find: jest.fn() };
          },
        }),
      );

      await expect(
        service.anularVenta('venta-1', { motivo: 'Duplicada' } as any, 'u1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
