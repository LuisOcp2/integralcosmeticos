import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TipoMovimiento } from '@cosmeticos/shared-types';
import { InventarioService } from './inventario.service';

describe('InventarioService', () => {
  const stockRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const movimientoRepository = {
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const alertaRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const variantesRepository = {
    findOne: jest.fn(),
  };

  const sedesRepository = {
    findOne: jest.fn(),
  };

  const manager = {
    getRepository: jest.fn(),
  };

  const dataSource = {
    transaction: jest.fn(),
  };

  const workflowEngine = {
    dispararEvento: jest.fn().mockResolvedValue({ workflowsEjecutados: 0 }),
  };

  let service: InventarioService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: InventarioService,
          useFactory: () =>
            new InventarioService(
              stockRepository as any,
              movimientoRepository as any,
              alertaRepository as any,
              variantesRepository as any,
              sedesRepository as any,
              dataSource as any,
              workflowEngine as any,
            ),
        },
      ],
    }).compile();

    service = module.get(InventarioService);

    variantesRepository.findOne.mockResolvedValue({
      id: 'v1',
      activo: true,
      producto: { id: 'p1', activo: true },
    });
    sedesRepository.findOne.mockResolvedValue({ id: 's1', activo: true });
    alertaRepository.findOne.mockResolvedValue(null);
    alertaRepository.find.mockResolvedValue([]);
    alertaRepository.create.mockImplementation((value) => value);
    alertaRepository.save.mockImplementation(async (value) => value);
  });

  describe('registrarMovimientoConManager', () => {
    it('debe incrementar stock en ENTRADA', async () => {
      const stock = {
        varianteId: 'v1',
        sedeId: 's1',
        cantidad: 5,
        stockMinimo: 0,
        stockMaximo: null,
      };
      stockRepository.findOne.mockResolvedValue(stock);
      stockRepository.save.mockImplementation(async (value) => value);
      movimientoRepository.create.mockImplementation((value) => value);
      movimientoRepository.save.mockImplementation(async (value) => value);

      manager.getRepository.mockImplementation((entity: { name: string }) => {
        if (entity.name === 'StockSede') {
          return stockRepository;
        }
        if (entity.name === 'AlertaStock') {
          return alertaRepository;
        }
        return movimientoRepository;
      });

      const result = await service.registrarMovimientoConManager(
        {
          tipo: TipoMovimiento.ENTRADA,
          varianteId: 'v1',
          sedeDestinoId: 's1',
          cantidad: 3,
        },
        'u1',
        manager as any,
      );

      expect(result.stock.cantidad).toBe(8);
      expect(result.movimiento.realizadoPorId).toBe('u1');
    });

    it('debe decrementar stock en SALIDA', async () => {
      const stock = {
        varianteId: 'v1',
        sedeId: 's1',
        cantidad: 10,
        stockMinimo: 0,
        stockMaximo: null,
      };
      stockRepository.findOne.mockResolvedValue(stock);
      stockRepository.save.mockImplementation(async (value) => value);
      movimientoRepository.create.mockImplementation((value) => value);
      movimientoRepository.save.mockImplementation(async (value) => value);

      manager.getRepository.mockImplementation((entity: { name: string }) => {
        if (entity.name === 'StockSede') {
          return stockRepository;
        }
        if (entity.name === 'AlertaStock') {
          return alertaRepository;
        }
        return movimientoRepository;
      });

      const result = await service.registrarMovimientoConManager(
        {
          tipo: TipoMovimiento.SALIDA,
          varianteId: 'v1',
          sedeOrigenId: 's1',
          cantidad: 4,
        },
        'u1',
        manager as any,
      );

      expect(result.stock.cantidad).toBe(6);
    });

    it('debe ajustar stock por diferencia con AJUSTE', async () => {
      const stock = {
        varianteId: 'v1',
        sedeId: 's1',
        cantidad: 10,
        stockMinimo: 0,
        stockMaximo: null,
      };
      stockRepository.findOne.mockResolvedValue(stock);
      stockRepository.save.mockImplementation(async (value) => value);
      movimientoRepository.create.mockImplementation((value) => value);
      movimientoRepository.save.mockImplementation(async (value) => value);

      manager.getRepository.mockImplementation((entity: { name: string }) => {
        if (entity.name === 'StockSede') {
          return stockRepository;
        }
        if (entity.name === 'AlertaStock') {
          return alertaRepository;
        }
        return movimientoRepository;
      });

      const result = await service.registrarMovimientoConManager(
        {
          tipo: TipoMovimiento.AJUSTE,
          varianteId: 'v1',
          sedeOrigenId: 's1',
          cantidad: -3,
        },
        'u1',
        manager as any,
      );

      expect(result.stock.cantidad).toBe(7);
      expect(result.movimiento.cantidad).toBe(3);
      expect(result.movimiento.cantidadAnterior).toBe(10);
      expect(result.movimiento.cantidadNueva).toBe(7);
    });

    it('debe lanzar error si stock insuficiente en SALIDA', async () => {
      stockRepository.findOne.mockResolvedValue({
        varianteId: 'v1',
        sedeId: 's1',
        cantidad: 2,
        stockMinimo: 0,
        stockMaximo: null,
      });

      manager.getRepository.mockImplementation((entity: { name: string }) => {
        if (entity.name === 'StockSede') {
          return stockRepository;
        }
        if (entity.name === 'AlertaStock') {
          return alertaRepository;
        }
        return movimientoRepository;
      });

      await expect(
        service.registrarMovimientoConManager(
          {
            tipo: TipoMovimiento.SALIDA,
            varianteId: 'v1',
            sedeOrigenId: 's1',
            cantidad: 3,
          },
          'u1',
          manager as any,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('trasladar', () => {
    it('debe decrementar origen e incrementar destino en transaccion', async () => {
      const stockOrigen = {
        varianteId: 'v1',
        sedeId: 's1',
        cantidad: 10,
        stockMinimo: 0,
        stockMaximo: null,
      };
      const stockDestino = {
        varianteId: 'v1',
        sedeId: 's2',
        cantidad: 2,
        stockMinimo: 0,
        stockMaximo: null,
      };

      const stockRepo = {
        findOne: jest.fn().mockResolvedValueOnce(stockOrigen).mockResolvedValueOnce(stockDestino),
        create: jest.fn(),
        save: jest.fn().mockImplementation(async (value) => value),
      };

      const movRepo = {
        create: jest.fn().mockImplementation((value) => value),
        save: jest.fn().mockImplementation(async (value) => value),
      };

      const altRepo = {
        findOne: jest.fn().mockResolvedValue(null),
        find: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockImplementation((value) => value),
        save: jest.fn().mockImplementation(async (value) => value),
      };

      dataSource.transaction.mockImplementation(async (cb: any) =>
        cb({
          getRepository: (entity: { name: string }) => {
            if (entity.name === 'StockSede') {
              return stockRepo;
            }
            if (entity.name === 'AlertaStock') {
              return altRepo;
            }
            return movRepo;
          },
        }),
      );

      const result = await service.trasladar(
        {
          varianteId: 'v1',
          sedeOrigenId: 's1',
          sedeDestinoId: 's2',
          cantidad: 3,
        },
        'u1',
      );

      expect(result.stockOrigen.cantidad).toBe(7);
      expect(result.stockDestino.cantidad).toBe(5);
    });

    it('debe lanzar error si sedeOrigenId === sedeDestinoId', async () => {
      await expect(
        service.trasladar(
          {
            varianteId: 'v1',
            sedeOrigenId: 's1',
            sedeDestinoId: 's1',
            cantidad: 1,
          },
          'u1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
