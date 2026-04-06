import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TesoreriaService } from './tesoreria.service';
import {
  CategoriaMovimientoBancario,
  TipoMovimientoBancario,
} from './entities/movimiento-bancario.entity';

type RepoMock = {
  findOne: jest.Mock;
  find: jest.Mock;
  save: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  remove: jest.Mock;
  createQueryBuilder: jest.Mock;
};

function createRepoMock(): RepoMock {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn((input) => input),
    update: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
}

describe('TesoreriaService', () => {
  const cuentasRepository = createRepoMock();
  const movimientosRepository = createRepoMock();
  const dataSource = { transaction: jest.fn() };

  let service: TesoreriaService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: TesoreriaService,
          useFactory: () =>
            new TesoreriaService(
              cuentasRepository as any,
              movimientosRepository as any,
              dataSource as any,
            ),
        },
      ],
    }).compile();

    service = module.get(TesoreriaService);
  });

  it('registra ingreso y actualiza saldo de la cuenta', async () => {
    cuentasRepository.findOne.mockResolvedValue({
      id: 'c1',
      saldoActual: 1000,
      nombre: 'Principal',
    });
    movimientosRepository.save.mockImplementation(async (v) => ({ id: 'm1', ...v }));

    const result = await service.registrarIngreso(
      'c1',
      {
        monto: 250,
        categoria: CategoriaMovimientoBancario.VENTA,
        descripcion: 'Ingreso por venta',
      } as any,
      'u1',
    );

    expect(result.tipo).toBe(TipoMovimientoBancario.INGRESO);
    expect(result.saldoDespues).toBe(1250);
    expect(cuentasRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ saldoActual: 1250 }),
    );
  });

  it('falla al registrar egreso con monto invalido', async () => {
    cuentasRepository.findOne.mockResolvedValue({
      id: 'c1',
      saldoActual: 1000,
      nombre: 'Principal',
    });

    await expect(
      service.registrarEgreso(
        'c1',
        {
          monto: 0,
          categoria: CategoriaMovimientoBancario.GASTO_OPERATIVO,
          descripcion: 'Pago',
        } as any,
        'u1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('falla si no existe cuenta origen en traslado', async () => {
    const cuentasRepoTx = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'c2', saldoActual: 500 }),
      save: jest.fn(),
    };
    const movimientosRepoTx = { create: jest.fn((v) => v), save: jest.fn() };

    dataSource.transaction.mockImplementation(async (cb: any) =>
      cb({
        getRepository: (entity: { name: string }) => {
          if (entity.name === 'CuentaBancaria') return cuentasRepoTx;
          return movimientosRepoTx;
        },
      }),
    );

    await expect(
      service.trasladarEntreCuentas('c1', 'c2', 100, 'Traslado', 'u1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('realiza traslado entre cuentas en transaccion', async () => {
    const cuentasRepoTx = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce({ id: 'c1', saldoActual: 1000 })
        .mockResolvedValueOnce({ id: 'c2', saldoActual: 500 }),
      save: jest.fn(),
    };
    const movimientosRepoTx = {
      create: jest.fn((v) => v),
      save: jest.fn(),
    };

    dataSource.transaction.mockImplementation(async (cb: any) =>
      cb({
        getRepository: (entity: { name: string }) => {
          if (entity.name === 'CuentaBancaria') return cuentasRepoTx;
          return movimientosRepoTx;
        },
      }),
    );

    const result = await service.trasladarEntreCuentas('c1', 'c2', 150, 'Traslado operativo', 'u1');

    expect(result.origen.tipo).toBe(TipoMovimientoBancario.EGRESO);
    expect(result.destino.tipo).toBe(TipoMovimientoBancario.INGRESO);
    expect(cuentasRepoTx.save).toHaveBeenCalledTimes(2);
    expect(movimientosRepoTx.save).toHaveBeenCalledTimes(2);
  });
});
