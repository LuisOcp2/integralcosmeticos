import { Test, TestingModule } from '@nestjs/testing';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';

describe('SyncController', () => {
  const syncService = {
    getSyncStatus: jest.fn(),
    forzarSyncInmediato: jest.fn(),
  } as unknown as SyncService;

  let controller: SyncController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SyncController],
      providers: [{ provide: SyncService, useValue: syncService }],
    }).compile();

    controller = module.get<SyncController>(SyncController);
  });

  it('retorna estado de sincronizacion', async () => {
    (syncService.getSyncStatus as jest.Mock).mockResolvedValue({ pendientes: 0 });

    const result = await controller.getStatus();

    expect(result).toEqual({ pendientes: 0 });
    expect(syncService.getSyncStatus).toHaveBeenCalledTimes(1);
  });

  it('forza sincronizacion inmediata', async () => {
    (syncService.forzarSyncInmediato as jest.Mock).mockResolvedValue({ encolados: 2 });

    const result = await controller.forzarSync();

    expect(result).toEqual({ encolados: 2 });
    expect(syncService.forzarSyncInmediato).toHaveBeenCalledTimes(1);
  });
});
