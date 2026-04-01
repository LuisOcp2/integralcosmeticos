import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Rol, Permiso, PERMISOS_POR_ROL } from '@cosmeticos/shared-types';
import { UsuariosService } from './usuarios.service';
import { Usuario } from './entities/usuario.entity';
import { AuditoriaUsuario, AccionAuditoria } from './entities/auditoria-usuario.entity';

/*───────────────────────── helpers ─────────────────────────*/
const makeUsuario = (override: Partial<Usuario> = {}): Usuario =>
  ({
    id: 'uuid-1',
    nombre: 'Juan',
    apellido: 'Perez',
    email: 'juan@cosmeticos.com',
    password: 'hashed',
    rol: Rol.CAJERO,
    activo: true,
    permisosExtra: [],
    permisosRevocados: [],
    sedeId: null,
    telefono: null,
    avatarUrl: null,
    intentosFallidos: 0,
    bloqueadoHasta: null,
    ultimoLogin: null,
    ultimaIp: null,
    resetPasswordToken: null,
    resetPasswordExpires: null,
    forzarCambioPassword: false,
    notas: null,
    creadoPorId: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    desactivadoEn: null,
    desactivadoPorId: null,
    tokenVersion: 0,
    ...override,
  } as Usuario);

/*───────────────────────── suite ─────────────────────────*/
describe('UsuariosService', () => {
  let service: UsuariosService;

  /* ── mocks de repositorio ── */
  const usuariosRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const auditoriaRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findAndCount: jest.fn(),
  };

  /* query builder parcial */
  const qb = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getManyAndCount: jest.fn(),
    getCount: jest.fn(),
    getRawMany: jest.fn(),
    groupBy: jest.fn().mockReturnThis(),
  };

  const dataSource = {
    query: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    usuariosRepo.createQueryBuilder.mockReturnValue(qb);
    auditoriaRepo.create.mockReturnValue({});
    auditoriaRepo.save.mockResolvedValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuariosService,
        { provide: getRepositoryToken(Usuario), useValue: usuariosRepo },
        { provide: getRepositoryToken(AuditoriaUsuario), useValue: auditoriaRepo },
        { provide: 'DataSource', useValue: dataSource },
      ],
    }).compile();

    service = module.get<UsuariosService>(UsuariosService);
  });

  /*──────────────── esBloqueado ────────────────*/
  describe('esBloqueado', () => {
    it('retorna false si no hay bloqueadoHasta', () => {
      const u = makeUsuario({ bloqueadoHasta: null });
      expect(service.esBloqueado(u)).toBe(false);
    });

    it('retorna true si bloqueadoHasta es futuro', () => {
      const u = makeUsuario({ bloqueadoHasta: new Date(Date.now() + 10_000) });
      expect(service.esBloqueado(u)).toBe(true);
    });

    it('retorna false si bloqueadoHasta es pasado', () => {
      const u = makeUsuario({ bloqueadoHasta: new Date(Date.now() - 10_000) });
      expect(service.esBloqueado(u)).toBe(false);
    });
  });

  /*──────────────── create ────────────────*/
  describe('create', () => {
    it('crea usuario y omite password en respuesta', async () => {
      usuariosRepo.findOne.mockResolvedValue(null);
      const creado = makeUsuario({ id: 'new-uuid', email: 'nuevo@test.com' });
      usuariosRepo.create.mockReturnValue(creado);
      usuariosRepo.save.mockResolvedValue({ ...creado, password: 'hashed' });

      const resultado = await service.create(
        {
          nombre: 'Juan',
          apellido: 'Perez',
          email: 'nuevo@test.com',
          password: 'Admin2026!',
          rol: Rol.CAJERO,
        },
        'admin-id',
      );

      expect(resultado).not.toHaveProperty('password');
      expect(auditoriaRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ accion: AccionAuditoria.CREAR }),
      );
    });

    it('lanza ConflictException si email ya existe', async () => {
      usuariosRepo.findOne.mockResolvedValue(makeUsuario());

      await expect(
        service.create({
          nombre: 'Juan',
          apellido: 'Perez',
          email: 'juan@cosmeticos.com',
          password: 'Admin2026!',
          rol: Rol.CAJERO,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  /*──────────────── findAll ────────────────*/
  describe('findAll', () => {
    it('llama createQueryBuilder y devuelve paginación', async () => {
      qb.getManyAndCount.mockResolvedValue([[makeUsuario()], 1]);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.data).toHaveLength(1);
    });

    it('aplica filtro de búsqueda', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ buscar: 'juan', page: 1, limit: 10 });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('LIKE'),
        expect.objectContaining({ buscar: '%juan%' }),
      );
    });

    it('aplica filtro de rol', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ rol: Rol.ADMIN, page: 1, limit: 10 });

      expect(qb.andWhere).toHaveBeenCalledWith('u.rol = :rol', { rol: Rol.ADMIN });
    });
  });

  /*──────────────── findOne ────────────────*/
  describe('findOne', () => {
    it('retorna usuario si existe', async () => {
      const u = makeUsuario();
      qb.getOne.mockResolvedValue(u);

      const result = await service.findOne('uuid-1');

      expect(result).toEqual(u);
    });

    it('lanza NotFoundException si no existe', async () => {
      qb.getOne.mockResolvedValue(null);

      await expect(service.findOne('inexistente')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  /*──────────────── update ────────────────*/
  describe('update', () => {
    it('actualiza campos y registra auditoría', async () => {
      const u = makeUsuario();
      usuariosRepo.findOne.mockResolvedValue(u);
      usuariosRepo.save.mockResolvedValue({ ...u, nombre: 'Carlos', password: 'hashed' });

      const result = await service.update('uuid-1', { nombre: 'Carlos' }, 'admin-id');

      expect(result).not.toHaveProperty('password');
      expect(auditoriaRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ accion: AccionAuditoria.ACTUALIZAR }),
      );
    });

    it('lanza NotFoundException si usuario no existe', async () => {
      usuariosRepo.findOne.mockResolvedValue(null);

      await expect(service.update('no-existe', { nombre: 'X' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('lanza ConflictException si nuevo email ya está en uso', async () => {
      const u = makeUsuario();
      usuariosRepo.findOne
        .mockResolvedValueOnce(u) // buscar por id
        .mockResolvedValueOnce(makeUsuario({ id: 'otro' })); // email en uso

      await expect(
        service.update('uuid-1', { email: 'otro@cosmeticos.com' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  /*──────────────── remove ────────────────*/
  describe('remove', () => {
    it('desactiva usuario (soft delete)', async () => {
      const u = makeUsuario();
      usuariosRepo.findOne.mockResolvedValue(u);
      usuariosRepo.save.mockResolvedValue({ ...u, activo: false });

      await service.remove('uuid-1', 'admin-id');

      expect(usuariosRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ activo: false }),
      );
    });

    it('lanza ForbiddenException al eliminar último admin', async () => {
      const admin = makeUsuario({ rol: Rol.ADMIN });
      usuariosRepo.findOne.mockResolvedValue(admin);
      usuariosRepo.count.mockResolvedValue(1);

      await expect(service.remove('uuid-1')).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  /*──────────────── activar ────────────────*/
  describe('activar', () => {
    it('activa usuario desactivado', async () => {
      const u = makeUsuario({ activo: false, desactivadoEn: new Date() });
      usuariosRepo.findOne.mockResolvedValue(u);
      usuariosRepo.save.mockResolvedValue({ ...u, activo: true });

      await service.activar('uuid-1', 'admin-id');

      expect(usuariosRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ activo: true, desactivadoEn: null }),
      );
    });

    it('lanza NotFoundException si usuario no existe', async () => {
      usuariosRepo.findOne.mockResolvedValue(null);

      await expect(service.activar('no-existe')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  /*──────────────── cambiarPassword ────────────────*/
  describe('cambiarPassword', () => {
    it('cambia contraseña correctamente', async () => {
      const hashed = await bcrypt.hash('OldPass1!', 10);
      const u = makeUsuario({ password: hashed });
      qb.getOne.mockResolvedValue(u);
      usuariosRepo.save.mockResolvedValue(u);

      await service.cambiarPassword('uuid-1', {
        passwordActual: 'OldPass1!',
        passwordNuevo: 'NewPass2@',
      });

      expect(usuariosRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ forzarCambioPassword: false }),
      );
    });

    it('lanza UnauthorizedException si contraseña actual es incorrecta', async () => {
      const hashed = await bcrypt.hash('correcta', 10);
      const u = makeUsuario({ password: hashed });
      qb.getOne.mockResolvedValue(u);

      await expect(
        service.cambiarPassword('uuid-1', { passwordActual: 'incorrecta', passwordNuevo: 'NewPass2@' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('lanza BadRequestException si nueva contraseña es igual a la actual', async () => {
      const hashed = await bcrypt.hash('MismaPass1!', 10);
      const u = makeUsuario({ password: hashed });
      qb.getOne.mockResolvedValue(u);

      await expect(
        service.cambiarPassword('uuid-1', { passwordActual: 'MismaPass1!', passwordNuevo: 'MismaPass1!' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  /*──────────────── bloquear / desbloquear ────────────────*/
  describe('bloquear', () => {
    it('establece bloqueadoHasta en el futuro', async () => {
      const u = makeUsuario();
      usuariosRepo.findOne.mockResolvedValue(u);
      usuariosRepo.save.mockResolvedValue(u);

      await service.bloquear('uuid-1', 15, 'admin-id');

      expect(usuariosRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          bloqueadoHasta: expect.any(Date),
        }),
      );
    });

    it('lanza NotFoundException si usuario no existe', async () => {
      usuariosRepo.findOne.mockResolvedValue(null);

      await expect(service.bloquear('no-existe', 30)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('desbloquear', () => {
    it('limpia bloqueadoHasta e intentosFallidos', async () => {
      const u = makeUsuario({ bloqueadoHasta: new Date(Date.now() + 10000), intentosFallidos: 5 });
      usuariosRepo.findOne.mockResolvedValue(u);
      usuariosRepo.save.mockResolvedValue(u);

      await service.desbloquear('uuid-1', 'admin-id');

      expect(usuariosRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ bloqueadoHasta: null, intentosFallidos: 0 }),
      );
    });
  });

  /*──────────────── registrarIntentoFallido ────────────────*/
  describe('registrarIntentoFallido', () => {
    it('incrementa intentosFallidos', async () => {
      const u = makeUsuario({ intentosFallidos: 2 });
      usuariosRepo.findOne.mockResolvedValue(u);
      usuariosRepo.save.mockResolvedValue(u);

      await service.registrarIntentoFallido('juan@cosmeticos.com');

      expect(usuariosRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ intentosFallidos: 3 }),
      );
    });

    it('bloquea automáticamente al alcanzar 5 intentos', async () => {
      const u = makeUsuario({ intentosFallidos: 4 });
      usuariosRepo.findOne.mockResolvedValue(u);
      usuariosRepo.save.mockResolvedValue(u);

      await service.registrarIntentoFallido('juan@cosmeticos.com');

      expect(usuariosRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          bloqueadoHasta: expect.any(Date),
        }),
      );
    });

    it('no hace nada si email no existe', async () => {
      usuariosRepo.findOne.mockResolvedValue(null);

      await service.registrarIntentoFallido('noexiste@cosmeticos.com');

      expect(usuariosRepo.save).not.toHaveBeenCalled();
    });
  });

  /*──────────────── gestionarPermisos ────────────────*/
  describe('gestionarPermisos', () => {
    it('actualiza permisosExtra y permisosRevocados', async () => {
      const u = makeUsuario();
      usuariosRepo.findOne.mockResolvedValue(u);
      usuariosRepo.save.mockResolvedValue(u);

      await service.gestionarPermisos(
        'uuid-1',
        {
          permisosExtra: [Permiso.REPORTES_VER],
          permisosRevocados: [Permiso.VENTAS_CREAR],
          motivo: 'prueba',
        },
        'admin-id',
      );

      expect(usuariosRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          permisosExtra: [Permiso.REPORTES_VER],
          permisosRevocados: [Permiso.VENTAS_CREAR],
        }),
      );
    });

    it('lanza NotFoundException si usuario no existe', async () => {
      usuariosRepo.findOne.mockResolvedValue(null);

      await expect(
        service.gestionarPermisos('no-existe', { permisosExtra: [], permisosRevocados: [] }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  /*──────────────── getPermisosEfectivos ────────────────*/
  describe('getPermisosEfectivos', () => {
    it('calcula permisos efectivos = rol + extra - revocados', async () => {
      const u = makeUsuario({
        rol: Rol.CAJERO,
        permisosExtra: [Permiso.REPORTES_VER],
        permisosRevocados: [Permiso.VENTAS_CREAR],
      });
      usuariosRepo.findOne.mockResolvedValue(u);

      const { permisosEfectivos, permisosRol, permisosExtra, permisosRevocados } =
        await service.getPermisosEfectivos('uuid-1');

      expect(permisosRol).toEqual(PERMISOS_POR_ROL[Rol.CAJERO]);
      expect(permisosExtra).toContain(Permiso.REPORTES_VER);
      expect(permisosRevocados).toContain(Permiso.VENTAS_CREAR);
      expect(permisosEfectivos).not.toContain(Permiso.VENTAS_CREAR);
      expect(permisosEfectivos).toContain(Permiso.REPORTES_VER);
    });

    it('lanza NotFoundException si usuario no existe', async () => {
      usuariosRepo.findOne.mockResolvedValue(null);

      await expect(service.getPermisosEfectivos('no-existe')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  /*──────────────── getEstadisticas ────────────────*/
  describe('getEstadisticas', () => {
    it('devuelve total, activos, inactivos, bloqueados y porRol', async () => {
      usuariosRepo.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(8); // activos

      qb.getCount.mockResolvedValue(1); // bloqueados
      qb.getRawMany.mockResolvedValue([
        { rol: Rol.ADMIN, total: '1' },
        { rol: Rol.CAJERO, total: '9' },
      ]);

      const result = await service.getEstadisticas();

      expect(result.total).toBe(10);
      expect(result.activos).toBe(8);
      expect(result.inactivos).toBe(2);
      expect(result.bloqueados).toBe(1);
      expect(result.porRol[Rol.ADMIN]).toBe(1);
    });
  });

  /*──────────────── getAuditoria ────────────────*/
  describe('getAuditoria', () => {
    it('devuelve registros paginados', async () => {
      const entrada = { id: 'a1', accion: AccionAuditoria.LOGIN } as AuditoriaUsuario;
      auditoriaRepo.findAndCount.mockResolvedValue([[entrada], 1]);

      const result = await service.getAuditoria('uuid-1', 1, 10);

      expect(result.total).toBe(1);
      expect(result.data[0].accion).toBe(AccionAuditoria.LOGIN);
    });
  });
});
