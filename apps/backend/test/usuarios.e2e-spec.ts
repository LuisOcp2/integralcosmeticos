import {
  ForbiddenException,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { Rol } from '@cosmeticos/shared-types';
import { UsuariosController } from '../src/modules/usuarios/usuarios.controller';
import { UsuariosService } from '../src/modules/usuarios/usuarios.service';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';

describe('UsuariosController (e2e)', () => {
  let app: INestApplication;

  const usuariosService = {
    seedAdmin: jest.fn().mockResolvedValue({ message: 'admin seed ok' }),
    findAll: jest
      .fn()
      .mockResolvedValue([{ id: 'u1', email: 'admin@cosmeticos.com', rol: Rol.ADMIN }]),
    create: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const jwtGuard = {
    canActivate: jest.fn((context) => {
      const req = context.switchToHttp().getRequest();
      const auth = req.headers.authorization as string | undefined;
      if (!auth) {
        throw new UnauthorizedException('Sin token');
      }
      if (auth === 'Bearer token-admin') {
        req.user = { id: 'u1', rol: Rol.ADMIN };
        return true;
      }
      if (auth === 'Bearer token-cajero') {
        req.user = { id: 'u2', rol: Rol.CAJERO };
        return true;
      }
      throw new UnauthorizedException('Token inválido');
    }),
  };

  const rolesGuard = {
    canActivate: jest.fn((context) => {
      const req = context.switchToHttp().getRequest();
      if (!req.user) {
        throw new UnauthorizedException('Sin usuario');
      }
      if (req.user.rol === Rol.CAJERO) {
        throw new ForbiddenException('Sin permisos');
      }
      return true;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [UsuariosController],
      providers: [{ provide: UsuariosService, useValue: usuariosService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(jwtGuard)
      .overrideGuard(RolesGuard)
      .useValue(rolesGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST /api/usuarios/seed → 201 crea admin si no existe', async () => {
    await request(app.getHttpServer()).post('/api/usuarios/seed').expect(201);
    expect(usuariosService.seedAdmin).toHaveBeenCalled();
  });

  it('GET /api/usuarios → 401 sin token', async () => {
    await request(app.getHttpServer()).get('/api/usuarios').expect(401);
  });

  it('GET /api/usuarios → 200 con token ADMIN', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/usuarios')
      .set('Authorization', 'Bearer token-admin')
      .expect(200);

    expect(response.body).toHaveLength(1);
  });

  it('GET /api/usuarios → 403 con token CAJERO', async () => {
    await request(app.getHttpServer())
      .get('/api/usuarios')
      .set('Authorization', 'Bearer token-cajero')
      .expect(403);
  });
});
