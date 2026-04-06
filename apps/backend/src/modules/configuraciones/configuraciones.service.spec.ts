import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfiguracionesService } from './configuraciones.service';

describe('ConfiguracionesService', () => {
  const tiposDocumentoRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const parametrosRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const dataSource = {
    query: jest.fn().mockResolvedValue(undefined),
  };

  let service: ConfiguracionesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    parametrosRepository.count.mockResolvedValue(1);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ConfiguracionesService,
          useFactory: () =>
            new ConfiguracionesService(
              dataSource as any,
              tiposDocumentoRepository as any,
              parametrosRepository as any,
            ),
        },
      ],
    }).compile();

    service = module.get(ConfiguracionesService);
  });

  describe('createTipoDocumento', () => {
    it('crea tipo de documento cuando no existe', async () => {
      tiposDocumentoRepository.findOne.mockResolvedValue(null);
      tiposDocumentoRepository.create.mockImplementation((value) => value);
      tiposDocumentoRepository.save.mockImplementation(async (value) => ({ id: 'td-1', ...value }));

      const result = await service.createTipoDocumento({
        codigo: 'CE',
        nombre: 'Cedula de Extranjeria',
      });

      expect(result.codigo).toBe('CE');
      expect(result.nombre).toBe('Cedula de Extranjeria');
      expect(tiposDocumentoRepository.save).toHaveBeenCalledTimes(1);
    });

    it('falla si ya existe un tipo activo con mismo codigo', async () => {
      tiposDocumentoRepository.findOne.mockResolvedValue({
        id: 'td-1',
        codigo: 'CC',
        activo: true,
      });

      await expect(
        service.createTipoDocumento({
          codigo: 'CC',
          nombre: 'Cedula de Ciudadania',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('createParametro', () => {
    it('crea parametro cuando no existe', async () => {
      parametrosRepository.findOne.mockResolvedValue(null);
      parametrosRepository.create.mockImplementation((value) => value);
      parametrosRepository.save.mockImplementation(async (value) => ({ id: 'p-1', ...value }));

      const result = await service.createParametro({
        clave: 'venta.moneda',
        valor: 'COP',
        tipoDato: 'STRING',
      });

      expect(result.clave).toBe('venta.moneda');
      expect(result.valor).toBe('COP');
    });

    it('lanza NotFound si parametro no existe al consultar por clave', async () => {
      parametrosRepository.count.mockResolvedValue(1);
      parametrosRepository.findOne.mockResolvedValue(null);

      await expect(service.findParametroByClave('no.existe')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('bootstrapParametrosBase', () => {
    it('crea parametros por defecto cuando no existen', async () => {
      parametrosRepository.findOne.mockResolvedValue(null);
      parametrosRepository.create.mockImplementation((value) => value);
      parametrosRepository.save.mockImplementation(async (value) => ({ id: 'new-id', ...value }));

      const result = await service.bootstrapParametrosBase();

      expect(result.created).toBeGreaterThan(0);
      expect(result.total).toBe(result.created);
      expect(parametrosRepository.save).toHaveBeenCalled();
    });
  });
});
