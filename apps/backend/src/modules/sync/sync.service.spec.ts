import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Queue } from 'bull';
import { getQueueToken } from '@nestjs/bull';
import { SyncLog } from './entities/sync-log.entity';
import { SyncService } from './sync.service';

describe('SyncService', () => {
  const configService = {
    get: jest.fn(),
  } as unknown as ConfigService;

  const syncQueue = {
    add: jest.fn(),
    getWaitingCount: jest.fn().mockResolvedValue(2),
    getCompletedCount: jest.fn().mockResolvedValue(10),
    getFailedCount: jest.fn().mockResolvedValue(1),
  } as unknown as Queue;

  const syncLogRepository = {
    create: jest.fn((input) => input),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  } as unknown as Repository<SyncLog>;

  const dataSource = {
    getRepository: jest.fn(),
  } as unknown as DataSource;

  let service: SyncService;

  beforeEach(async () => {
    jest.clearAllMocks();
    (configService.get as jest.Mock).mockReturnValue(undefined);
    (syncLogRepository.findOne as jest.Mock).mockResolvedValue({
      creadoEn: new Date('2026-01-01T10:00:00Z'),
    });
    (syncLogRepository.find as jest.Mock).mockResolvedValue([{ id: 'log-1', tabla: 'ventas' }]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        { provide: ConfigService, useValue: configService },
        { provide: DataSource, useValue: dataSource },
        { provide: getQueueToken('sync'), useValue: syncQueue },
        { provide: getRepositoryToken(SyncLog), useValue: syncLogRepository },
      ],
    }).compile();

    service = module.get<SyncService>(SyncService);
  });

  it('encola sync-tabla con reintentos para ids validos', async () => {
    (syncQueue.add as jest.Mock).mockResolvedValue({ id: 'job-1' });

    const result = await service.queueSync('ventas', ['v1', 'v2']);

    expect(syncQueue.add).toHaveBeenCalledWith(
      'sync-tabla',
      { tabla: 'ventas', ids: ['v1', 'v2'] },
      expect.objectContaining({ attempts: 3 }),
    );
    expect(result).toEqual({ id: 'job-1' });
  });

  it('no encola trabajos cuando ids llega vacio', async () => {
    const result = await service.queueSync('clientes', []);

    expect(result).toBeNull();
    expect(syncQueue.add).not.toHaveBeenCalled();
  });

  it('retorna estado agregado de cola e historial', async () => {
    const status = await service.getSyncStatus();

    expect(status.pendientes).toBe(2);
    expect(status.completados).toBe(10);
    expect(status.errores).toBe(1);
    expect(status.historial).toHaveLength(1);
    expect(syncLogRepository.find).toHaveBeenCalledWith(expect.objectContaining({ take: 10 }));
  });
});
