import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TipoMovimiento } from '@cosmeticos/shared-types';
import { InventarioService } from './inventario.service';

describe('InventarioService', () => {
  const stockRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
  };

  const movimientoRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
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
              variantesRepository as any,
              sedesRepository as any,
              dataSource as any,
            ),
        },
      ],
    }).compile();

    service = module.get(InventarioService);

    variantesRepository.findOne.mockResolvedValue({
      id: 'v1',
      activo: true,
      producto: { activo: true },
    });
    sedesRepository.findOne.mockResolvedValue({ id: 's1', activo: true });
  });

  describe('registrarMovimiento', () => {
    it('debe incrementar stock en ENTRADA', async () => {
      const stock = { varianteId: 'v1', sedeId: 's1', cantidad: 5, activo: true };
      stockRepository.findOne.mockResolvedValue(stock);
      stockRepository.save.mockImplementation(async (value) => value);
      movimientoRepository.create.mockImplementation((value) => value);
      movimientoRepository.save.mockImplementation(async (value) => value);

      manager.getRepository.mockImplementation((entity: { name: string }) => {
        if (entity.name === 'StockSede') {
          return stockRepository;
        }
        return movimientoRepository;
      });

      const result = await service.registrarMovimientoConManager(
        {
          tipo: TipoMovimiento.ENTRADA,
          varianteId: 'v1',
          sedeId: 's1',
          cantidad: 3,
        },
        'u1',
        manager as any,
      );

      expect(result.stock.cantidad).toBe(8);
    });

    it('debe decrementar stock en SALIDA', async () => {
      const stock = { varianteId: 'v1', sedeId: 's1', cantidad: 10, activo: true };
      stockRepository.findOne.mockResolvedValue(stock);
      stockRepository.save.mockImplementation(async (value) => value);
      movimientoRepository.create.mockImplementation((value) => value);
      movimientoRepository.save.mockImplementation(async (value) => value);

      manager.getRepository.mockImplementation((entity: { name: string }) => {
        if (entity.name === 'StockSede') {
          return stockRepository;
        }
        return movimientoRepository;
      });

      const result = await service.registrarMovimientoConManager(
        {
          tipo: TipoMovimiento.SALIDA,
          varianteId: 'v1',
          sedeId: 's1',
          cantidad: 4,
        },
        'u1',
        manager as any,
      );

      expect(result.stock.cantidad).toBe(6);
    });

    it('debe lanzar error si stock insuficiente en SALIDA', async () => {
      stockRepository.findOne.mockResolvedValue({
        varianteId: 'v1',
        sedeId: 's1',
        cantidad: 2,
        activo: true,
      });
      manager.getRepository.mockImplementation((entity: { name: string }) => {
        if (entity.name === 'StockSede') {
          return stockRepository;
        }
        return movimientoRepository;
      });

      await expect(
        service.registrarMovimientoConManager(
          {
            tipo: TipoMovimiento.SALIDA,
            varianteId: 'v1',
            sedeId: 's1',
            cantidad: 3,
          },
          'u1',
          manager as any,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('trasladar', () => {
    it('debe decrementar origen e incrementar destino en transacción', async () => {
      const stockOrigen = { varianteId: 'v1', sedeId: 's1', cantidad: 10, activo: true };
      const stockDestino = { varianteId: 'v1', sedeId: 's2', cantidad: 2, activo: true };

      const stockRepo = {
        findOne: jest.fn().mockResolvedValueOnce(stockOrigen).mockResolvedValueOnce(stockDestino),
        create: jest.fn(),
        save: jest.fn().mockImplementation(async (value) => value),
      };
      const movRepo = {
        create: jest.fn().mockImplementation((value) => value),
        save: jest.fn().mockImplementation(async (value) => value),
      };

      dataSource.transaction.mockImplementation(async (cb: any) =>
        cb({
          getRepository: (entity: { name: string }) =>
            entity.name === 'StockSede' ? stockRepo : movRepo,
        }),
      );

      const result = await service.trasladar(
        {
          varianteId: 'v1',
          sedeOrigen: 's1',
          sedeDestino: 's2',
          cantidad: 3,
        },
        'u1',
      );

      expect(result.stockOrigen.cantidad).toBe(7);
      expect(result.stockDestino.cantidad).toBe(5);
    });

    it('debe lanzar error si sedeOrigen === sedeDestino', async () => {
      await expect(
        service.trasladar(
          {
            varianteId: 'v1',
            sedeOrigen: 's1',
            sedeDestino: 's1',
            cantidad: 1,
          },
          'u1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
