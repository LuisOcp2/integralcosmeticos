import {
  ForbiddenException,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { Rol } from '@cosmeticos/shared-types';
import { SyncController } from '../src/modules/sync/sync.controller';
import { SyncService } from '../src/modules/sync/sync.service';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';

describe('SyncController (e2e)', () => {
  let app: INestApplication;

  const syncService = {
    getSyncStatus: jest.fn().mockResolvedValue({ pendientes: 2, completados: 11, errores: 0 }),
    forzarSyncInmediato: jest.fn().mockResolvedValue({ encolados: 3 }),
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

      throw new UnauthorizedException('Token invalido');
    }),
  };

  const rolesGuard = {
    canActivate: jest.fn((context) => {
      const req = context.switchToHttp().getRequest();
      if (req.user?.rol !== Rol.ADMIN) {
        throw new ForbiddenException('Sin permisos');
      }

      return true;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [SyncController],
      providers: [{ provide: SyncService, useValue: syncService }],
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

  it('GET /api/sync/status -> 401 sin token', async () => {
    await request(app.getHttpServer()).get('/api/sync/status').expect(401);
  });

  it('GET /api/sync/status -> 403 con rol no admin', async () => {
    await request(app.getHttpServer())
      .get('/api/sync/status')
      .set('Authorization', 'Bearer token-cajero')
      .expect(403);
  });

  it('GET /api/sync/status -> 200 con rol ADMIN', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/sync/status')
      .set('Authorization', 'Bearer token-admin')
      .expect(200);

    expect(response.body.completados).toBe(11);
    expect(syncService.getSyncStatus).toHaveBeenCalled();
  });

  it('POST /api/sync/forzar -> 201 encola tablas criticas', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/sync/forzar')
      .set('Authorization', 'Bearer token-admin')
      .expect(201);

    expect(response.body.encolados).toBe(3);
    expect(syncService.forzarSyncInmediato).toHaveBeenCalled();
  });
});
