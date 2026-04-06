import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConciliacionService } from './conciliacion.service';
import { TipoMovimientoBancario } from './entities/movimiento-bancario.entity';

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

describe('ConciliacionService', () => {
  const cuentasRepository = createRepoMock();
  const movimientosRepository = createRepoMock();
  let service: ConciliacionService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ConciliacionService,
          useFactory: () =>
            new ConciliacionService(cuentasRepository as any, movimientosRepository as any),
        },
      ],
    }).compile();

    service = module.get(ConciliacionService);
  });

  it('obtiene movimientos no conciliados por mes y anio', async () => {
    cuentasRepository.findOne.mockResolvedValue({ id: 'c1' });
    movimientosRepository.find.mockResolvedValue([
      { id: 'm1', fecha: '2026-04-10', conciliado: false },
      { id: 'm2', fecha: '2026-05-02', conciliado: false },
    ]);

    const result = await service.getMovimientosNoConciliados('c1', 4, 2026);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('m1');
  });

  it('marca un movimiento como conciliado', async () => {
    movimientosRepository.findOne.mockResolvedValue({
      id: 'm1',
      conciliado: false,
      conciliadoEn: null,
    });
    movimientosRepository.save.mockImplementation(async (v) => v);

    const result = await service.conciliarMovimiento('m1');

    expect(result.conciliado).toBe(true);
    expect(result.conciliadoEn).toBeInstanceOf(Date);
  });

  it('falla al conciliar un movimiento inexistente', async () => {
    movimientosRepository.findOne.mockResolvedValue(null);

    await expect(service.conciliarMovimiento('m1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('importa csv y concilia automaticamente por referencia existente', async () => {
    cuentasRepository.findOne.mockResolvedValue({ id: 'c1', saldoActual: 1000 });

    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([{ referencia: 'REF-001' }]),
    };
    movimientosRepository.createQueryBuilder.mockReturnValue(qb);
    movimientosRepository.save.mockResolvedValue(undefined);
    cuentasRepository.save.mockResolvedValue(undefined);

    const csv = [
      'fecha,descripcion,referencia,monto,tipo',
      '2026-04-01,Abono cliente,REF-001,500,INGRESO',
      '2026-04-02,Pago proveedor,REF-XYZ,200,EGRESO',
    ].join('\n');

    const result = await service.importarExtractoCSV('c1', csv, 'u1');

    expect(result.importados).toBe(2);
    expect(result.conciliadosAutomatico).toBe(1);
    expect(result.pendientes).toBe(1);
    expect(movimientosRepository.save).toHaveBeenCalled();
    expect(cuentasRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ saldoActual: 1300 }),
    );
  });

  it('construye reporte de conciliacion con diferencia', async () => {
    cuentasRepository.findOne.mockResolvedValue({ id: 'c1' });
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        { tipo: TipoMovimientoBancario.INGRESO, monto: 500, conciliado: true },
        { tipo: TipoMovimientoBancario.EGRESO, monto: 150, conciliado: false },
      ]),
    };
    movimientosRepository.createQueryBuilder.mockReturnValue(qb);

    const result = await service.getReporteConciliacion('c1', 4, 2026);

    expect(result.totalBanco).toBe(350);
    expect(result.totalSistema).toBe(500);
    expect(result.diferencia).toBe(-150);
    expect(result.noConciliados).toHaveLength(1);
  });
});
