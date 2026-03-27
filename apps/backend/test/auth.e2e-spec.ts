import { INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { LocalAuthGuard } from '../src/modules/auth/guards/local-auth.guard';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let authService: { login: jest.Mock };
  let localGuard: { canActivate: jest.Mock };
  let jwtGuard: { canActivate: jest.Mock };

  beforeEach(async () => {
    authService = {
      login: jest.fn().mockImplementation((user) => ({
        accessToken: 'token-valido',
        usuario: user,
      })),
    };

    localGuard = {
      canActivate: jest.fn((context) => {
        const req = context.switchToHttp().getRequest();
        if (req.body?.password !== 'Admin2026!') {
          throw new UnauthorizedException('Credenciales inválidas');
        }
        req.user = {
          id: 'u1',
          email: req.body.email,
          rol: 'ADMIN',
        };
        return true;
      }),
    };

    jwtGuard = {
      canActivate: jest.fn((context) => {
        const req = context.switchToHttp().getRequest();
        const auth = req.headers.authorization as string | undefined;
        if (!auth || auth !== 'Bearer token-valido') {
          throw new UnauthorizedException('Token inválido');
        }
        req.user = { id: 'u1', email: 'admin@cosmeticos.com', rol: 'ADMIN' };
        return true;
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: JwtService, useValue: { sign: jest.fn() } },
      ],
    })
      .overrideGuard(LocalAuthGuard)
      .useValue(localGuard)
      .overrideGuard(JwtAuthGuard)
      .useValue(jwtGuard)
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

  it('POST /api/auth/login → 200 con accessToken si credenciales correctas', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@cosmeticos.com', password: 'Admin2026!' })
      .expect(201);

    expect(response.body.accessToken).toBe('token-valido');
  });

  it('POST /api/auth/login → 401 si password incorrecto', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@cosmeticos.com', password: 'incorrecta' })
      .expect(401);
  });

  it('GET /api/auth/perfil → 401 sin token', async () => {
    await request(app.getHttpServer()).get('/api/auth/perfil').expect(401);
  });

  it('GET /api/auth/perfil → 200 con token válido', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/auth/perfil')
      .set('Authorization', 'Bearer token-valido')
      .expect(200);

    expect(response.body.email).toBe('admin@cosmeticos.com');
  });
});
