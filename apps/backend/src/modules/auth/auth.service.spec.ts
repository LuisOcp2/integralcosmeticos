import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { Rol } from '@cosmeticos/shared-types';
import { AuthService } from './auth.service';
import { UsuariosService } from '../usuarios/usuarios.service';

describe('AuthService', () => {
  const usuariosService = {
    findByEmail: jest.fn(),
    registrarLoginExitoso: jest.fn(),
    registrarIntentoFallido: jest.fn(),
    esBloqueado: jest.fn(),
  };

  const jwtService = {
    sign: jest.fn(),
  } as unknown as JwtService;

  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsuariosService, useValue: usuariosService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('validateUser', () => {
    it('debe retornar usuario sin password si credenciales son correctas', async () => {
      const hashed = await bcrypt.hash('Admin2026!', 10);
      usuariosService.findByEmail.mockResolvedValue({
        id: 'u1',
        email: 'admin@cosmeticos.com',
        password: hashed,
        rol: Rol.ADMIN,
        activo: true,
      });
      usuariosService.esBloqueado.mockReturnValue(false);

      const result = await service.validateUser('admin@cosmeticos.com', 'Admin2026!');

      expect(result).toEqual({
        id: 'u1',
        email: 'admin@cosmeticos.com',
        rol: Rol.ADMIN,
        activo: true,
      });
      expect(usuariosService.registrarLoginExitoso).toHaveBeenCalledWith('u1');
      expect((result as any).password).toBeUndefined();
    });

    it('debe lanzar UnauthorizedException si usuario no existe', async () => {
      usuariosService.findByEmail.mockResolvedValue(null);

      await expect(
        service.validateUser('noexiste@cosmeticos.com', '123456'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('debe lanzar UnauthorizedException si usuario está inactivo', async () => {
      usuariosService.findByEmail.mockResolvedValue({
        id: 'u2',
        email: 'inactivo@cosmeticos.com',
        password: 'hash',
        activo: false,
      });

      await expect(
        service.validateUser('inactivo@cosmeticos.com', '123456'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('debe lanzar UnauthorizedException si password incorrecto', async () => {
      const hashed = await bcrypt.hash('password-correcta', 10);
      usuariosService.findByEmail.mockResolvedValue({
        id: 'u3',
        email: 'admin@cosmeticos.com',
        password: hashed,
        activo: true,
      });
      usuariosService.esBloqueado.mockReturnValue(false);

      await expect(
        service.validateUser('admin@cosmeticos.com', 'incorrecta'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(usuariosService.registrarIntentoFallido).toHaveBeenCalledWith(
        'admin@cosmeticos.com',
        undefined,
      );
    });
  });

  describe('login', () => {
    it('debe retornar accessToken y usuario', async () => {
      (jwtService.sign as jest.Mock).mockReturnValue('jwt-token');
      const usuario = {
        id: 'u1',
        email: 'admin@cosmeticos.com',
        rol: Rol.ADMIN,
        sedeId: 's1',
        permisosExtra: [],
        permisosRevocados: [],
      };

      const result = await service.login(usuario);

      expect(result).toEqual({
        accessToken: 'jwt-token',
        usuario,
      });
      expect(jwtService.sign).toHaveBeenCalledTimes(1);
    });
  });
});
