import { Job } from 'bull';
import { SyncProcessor } from './sync.processor';
import { SyncService } from './sync.service';

describe('SyncProcessor', () => {
  const syncService = {
    resolverRegistrosPorIds: jest.fn(),
    syncTabla: jest.fn(),
    registrarSync: jest.fn(),
  } as unknown as SyncService;

  let processor: SyncProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    processor = new SyncProcessor(syncService);
  });

  it('procesa job exitoso y registra log OK', async () => {
    (syncService.resolverRegistrosPorIds as jest.Mock).mockResolvedValue([{ id: 'v1' }]);
    (syncService.syncTabla as jest.Mock).mockResolvedValue({ count: 1 });

    const job = {
      data: { tabla: 'ventas', ids: ['v1'] },
      attemptsMade: 0,
    } as Job<{ tabla: string; ids: string[] }>;

    const result = await processor.handleSync(job);

    expect(result).toEqual({ estado: 'OK', registrosAfectados: 1 });
    expect(syncService.registrarSync).toHaveBeenCalledWith('ventas', 'upsert', 1, 'OK');
  });

  it('registra log ERROR con intento y vuelve a lanzar excepcion', async () => {
    (syncService.resolverRegistrosPorIds as jest.Mock).mockResolvedValue([{ id: 'c1' }]);
    (syncService.syncTabla as jest.Mock).mockRejectedValue(new Error('fallo de red'));

    const job = {
      data: { tabla: 'clientes', ids: ['c1'] },
      attemptsMade: 1,
    } as Job<{ tabla: string; ids: string[] }>;

    await expect(processor.handleSync(job)).rejects.toThrow('fallo de red');
    expect(syncService.registrarSync).toHaveBeenCalledWith(
      'clientes',
      'upsert-intento-2',
      0,
      'ERROR',
      'fallo de red',
    );
  });
});
