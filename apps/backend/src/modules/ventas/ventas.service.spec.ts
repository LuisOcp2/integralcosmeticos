import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EstadoCaja, EstadoVenta, MetodoPago, TipoMovimiento } from '@cosmeticos/shared-types';
import { VentasService } from './ventas.service';

function createRepoMock() {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn((input) => input),
    createQueryBuilder: jest.fn(),
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

  describe('crearVenta', () => {
    it('debe lanzar error si no hay caja abierta en la sede', async () => {
      cajaRepository.findOne.mockResolvedValue(null);

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

    it('debe crear venta y reducir stock correctamente', async () => {
      cajaRepository.findOne.mockResolvedValue({
        id: 'caja-1',
        sedeId: 's1',
        estado: EstadoCaja.ABIERTA,
        activo: true,
      });

      const ventaRepo = {
        createQueryBuilder: jest.fn(() => ({
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue({ numero: 'VTA-2026-00009' }),
        })),
        create: jest.fn((data) => data),
        save: jest
          .fn()
          .mockResolvedValueOnce({ id: 'venta-1' })
          .mockResolvedValueOnce({ id: 'venta-1', total: 12000, estado: EstadoVenta.COMPLETADA }),
        find: jest.fn().mockResolvedValue([]),
        findOne: jest.fn().mockResolvedValue({
          id: 'venta-1',
          detalles: [],
          activo: true,
        }),
      };

      const detalleRepo = {
        create: jest.fn((data) => data),
        save: jest.fn().mockResolvedValue({}),
      };

      const varianteRepo = {
        findOne: jest
          .fn()
          .mockResolvedValue({ id: 'v1', productoId: 'p1', precioExtra: 0, activo: true }),
      };

      const productoRepo = {
        findOne: jest.fn().mockResolvedValue({ id: 'p1', precioBase: 12000, iva: 0, activo: true }),
      };

      const clienteRepo = {
        findOne: jest.fn().mockResolvedValue(null),
        save: jest.fn(),
      };

      const cajaRepo = {
        findOne: jest.fn().mockResolvedValue({ id: 'caja-1', estado: EstadoCaja.ABIERTA }),
        save: jest.fn().mockResolvedValue({}),
      };

      dataSource.transaction.mockImplementation(async (cb: any) =>
        cb({
          getRepository: (entity: { name: string }) => {
            if (entity.name === 'Venta') return ventaRepo;
            if (entity.name === 'DetalleVenta') return detalleRepo;
            if (entity.name === 'Variante') return varianteRepo;
            if (entity.name === 'Producto') return productoRepo;
            if (entity.name === 'Cliente') return clienteRepo;
            return cajaRepo;
          },
        }),
      );

      const getVentaByIdSpy = jest
        .spyOn(service, 'getVentaById')
        .mockResolvedValue({ id: 'venta-1', numero: 'VTA-2026-00010' } as any);

      await service.crearVenta(
        {
          sedeId: 's1',
          metodoPago: MetodoPago.EFECTIVO,
          items: [{ varianteId: 'v1', cantidad: 1 }],
        } as any,
        'u1',
      );

      expect(inventarioService.registrarMovimientoConManager).toHaveBeenCalledWith(
        expect.objectContaining({ tipo: TipoMovimiento.SALIDA, varianteId: 'v1', cantidad: 1 }),
        'u1',
        expect.anything(),
      );
      expect(getVentaByIdSpy).toHaveBeenCalledWith('venta-1');
    });

    it('debe generar número correlativo VTA-YYYY-NNNNN', async () => {
      cajaRepository.findOne.mockResolvedValue({
        id: 'caja-1',
        sedeId: 's1',
        estado: EstadoCaja.ABIERTA,
        activo: true,
      });

      const year = new Date().getFullYear();
      const ventaRepo = {
        createQueryBuilder: jest.fn(() => ({
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue({ numero: `VTA-${year}-00001` }),
        })),
        create: jest.fn((data) => data),
        save: jest
          .fn()
          .mockResolvedValueOnce({ id: 'venta-1' })
          .mockResolvedValueOnce({ id: 'venta-1', numero: `VTA-${year}-00002`, total: 1000 }),
        find: jest.fn().mockResolvedValue([]),
        findOne: jest.fn().mockResolvedValue({ id: 'venta-1', activo: true, detalles: [] }),
      };

      const simpleRepo = {
        findOne: jest
          .fn()
          .mockResolvedValue({ id: 'x', precioBase: 1000, iva: 0, activo: true, productoId: 'p1' }),
        create: jest.fn((x) => x),
        save: jest.fn().mockResolvedValue({}),
      };

      dataSource.transaction.mockImplementation(async (cb: any) =>
        cb({
          getRepository: (entity: { name: string }) => {
            if (entity.name === 'Venta') return ventaRepo;
            if (entity.name === 'DetalleVenta') return simpleRepo;
            if (entity.name === 'Variante') return simpleRepo;
            if (entity.name === 'Producto') return simpleRepo;
            if (entity.name === 'Cliente') return simpleRepo;
            return { ...simpleRepo, find: jest.fn().mockResolvedValue([]) };
          },
        }),
      );

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
        expect.objectContaining({ numero: `VTA-${year}-00002` }),
      );
    });

    it('debe sumar puntos de fidelidad si hay clienteId', async () => {
      cajaRepository.findOne.mockResolvedValue({
        id: 'caja-1',
        sedeId: 's1',
        estado: EstadoCaja.ABIERTA,
        activo: true,
      });

      const ventaRepo = {
        createQueryBuilder: jest.fn(() => ({
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(null),
        })),
        create: jest.fn((data) => data),
        save: jest
          .fn()
          .mockResolvedValueOnce({ id: 'venta-1' })
          .mockResolvedValueOnce({ id: 'venta-1', total: 3500 }),
        find: jest.fn().mockResolvedValue([]),
        findOne: jest.fn().mockResolvedValue({ id: 'venta-1', detalles: [], activo: true }),
      };

      const cliente = { id: 'cl-1', activo: true, puntosFidelidad: 2 };
      const clienteRepo = {
        findOne: jest.fn().mockResolvedValue(cliente),
        save: jest.fn().mockResolvedValue(cliente),
      };

      const simpleRepo = {
        findOne: jest
          .fn()
          .mockResolvedValue({ id: 'x', productoId: 'p1', precioBase: 3500, iva: 0, activo: true }),
        create: jest.fn((x) => x),
        save: jest.fn().mockResolvedValue({}),
      };

      dataSource.transaction.mockImplementation(async (cb: any) =>
        cb({
          getRepository: (entity: { name: string }) => {
            if (entity.name === 'Venta') return ventaRepo;
            if (entity.name === 'Cliente') return clienteRepo;
            if (entity.name === 'DetalleVenta') return simpleRepo;
            if (entity.name === 'Variante') return simpleRepo;
            if (entity.name === 'Producto') return simpleRepo;
            return { ...simpleRepo, find: jest.fn().mockResolvedValue([]) };
          },
        }),
      );

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

      expect(cliente.puntosFidelidad).toBe(5);
      expect(clienteRepo.save).toHaveBeenCalled();
    });
  });

  describe('anularVenta', () => {
    it('debe cambiar estado a ANULADA y registrar DEVOLUCION en inventario', async () => {
      const venta = {
        id: 'venta-1',
        numero: 'VTA-2026-00001',
        sedeId: 's1',
        cajaId: 'c1',
        estado: EstadoVenta.COMPLETADA,
        activo: true,
        detalles: [{ varianteId: 'v1', cantidad: 2, activo: true }],
      };

      const ventaRepo = {
        findOne: jest.fn().mockResolvedValue(venta),
        save: jest.fn().mockImplementation(async (value) => value),
        find: jest.fn().mockResolvedValue([]),
      };
      const cajaRepo = {
        findOne: jest.fn().mockResolvedValue({ id: 'c1', estado: EstadoCaja.ABIERTA }),
        save: jest.fn().mockResolvedValue({}),
      };

      dataSource.transaction.mockImplementation(async (cb: any) =>
        cb({
          getRepository: (entity: { name: string }) =>
            entity.name === 'Venta' ? ventaRepo : cajaRepo,
        }),
      );

      const result = await service.anularVenta('venta-1', { motivo: 'Error cajero' } as any, 'u1');

      expect(result.estado).toBe(EstadoVenta.ANULADA);
      expect(inventarioService.registrarMovimientoConManager).toHaveBeenCalledWith(
        expect.objectContaining({ tipo: TipoMovimiento.DEVOLUCION, varianteId: 'v1' }),
        'u1',
        expect.anything(),
      );
    });
  });
});
