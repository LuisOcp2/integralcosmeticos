import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Rol, Permiso, PERMISOS_POR_ROL } from '@cosmeticos/shared-types';
import { Usuario } from './entities/usuario.entity';
import { AuditoriaUsuario, AccionAuditoria } from './entities/auditoria-usuario.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { CambiarPasswordDto } from './dto/cambiar-password.dto';
import { ResetPasswordAdminDto } from './dto/reset-password-admin.dto';
import { GestionarPermisosDto } from './dto/gestionar-permisos.dto';
import { FiltrosUsuarioDto } from './dto/filtros-usuario.dto';
import { CambiarRolDto } from './dto/cambiar-rol.dto';

@Injectable()
export class UsuariosService {
  private readonly logger = new Logger(UsuariosService.name);

  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepo: Repository<Usuario>,
    @InjectRepository(AuditoriaUsuario)
    private readonly auditoriaRepo: Repository<AuditoriaUsuario>,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureSchemaCompatibility();
  }

  private async ensureSchemaCompatibility(): Promise<void> {
    await this.dataSource.query(
      `ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "permisosExtra" text[] NOT NULL DEFAULT '{}'`,
    );
    await this.dataSource.query(
      `ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "permisosRevocados" text[] NOT NULL DEFAULT '{}'`,
    );
    await this.dataSource.query(
      `ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "avatarUrl" varchar(500) NULL`,
    );
    await this.dataSource.query(
      `ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "intentosFallidos" integer NOT NULL DEFAULT 0`,
    );
    await this.dataSource.query(
      `ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "forzarCambioPassword" boolean NOT NULL DEFAULT false`,
    );
    await this.dataSource.query(
      `ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "ultimaIp" varchar(45) NULL`,
    );
    await this.dataSource.query(
      `ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "resetPasswordToken" varchar NULL`,
    );
    await this.dataSource.query(
      `ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "resetPasswordExpires" timestamp NULL`,
    );
    await this.dataSource.query(
      `ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "notas" text NULL`,
    );
    await this.dataSource.query(
      `ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "creadoPorId" uuid NULL`,
    );
    await this.dataSource.query(
      `ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "desactivadoEn" timestamp NULL`,
    );
    await this.dataSource.query(
      `ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "desactivadoPorId" uuid NULL`,
    );
    await this.dataSource.query(
      `ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "bloqueadoHasta" timestamp NULL`,
    );
    await this.dataSource.query(
      `ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "ultimoLogin" timestamp NULL`,
    );
    await this.dataSource.query(
      `ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "tokenVersion" integer NOT NULL DEFAULT 0`,
    );

    await this.dataSource
      .query(
        `UPDATE "usuarios" SET "intentosFallidos" = COALESCE("intentos_login", 0) WHERE "intentosFallidos" = 0`,
      )
      .catch(() => undefined);
    await this.dataSource
      .query(
        `UPDATE "usuarios" SET "bloqueadoHasta" = "bloqueado_hasta" WHERE "bloqueado_hasta" IS NOT NULL AND "bloqueadoHasta" IS NULL`,
      )
      .catch(() => undefined);
    await this.dataSource
      .query(
        `UPDATE "usuarios" SET "ultimoLogin" = "ultimo_login" WHERE "ultimo_login" IS NOT NULL AND "ultimoLogin" IS NULL`,
      )
      .catch(() => undefined);

    await this.dataSource.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'auditoria_usuarios_accion_enum') THEN
          CREATE TYPE "auditoria_usuarios_accion_enum" AS ENUM (
            'CREAR','ACTUALIZAR','CAMBIAR_ROL','CAMBIAR_PASSWORD','RESET_PASSWORD','ACTIVAR','DESACTIVAR',
            'BLOQUEAR','DESBLOQUEAR','AGREGAR_PERMISO','REVOCAR_PERMISO','LOGIN','LOGIN_FALLIDO'
          );
        END IF;
      END
      $$;
    `);

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS "auditoria_usuarios" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "usuarioAfectadoId" uuid NOT NULL,
        "realizadoPorId" uuid NULL,
        "accion" "auditoria_usuarios_accion_enum" NOT NULL,
        "datosAnteriores" jsonb NULL,
        "datosNuevos" jsonb NULL,
        "ip" varchar(45) NULL,
        "userAgent" varchar(300) NULL,
        "motivo" text NULL,
        "createdAt" timestamp NOT NULL DEFAULT now()
      )
    `);

    await this.dataSource.query(
      `CREATE INDEX IF NOT EXISTS "IDX_auditoria_usuario_afectado" ON "auditoria_usuarios" ("usuarioAfectadoId")`,
    );
    await this.dataSource.query(
      `CREATE INDEX IF NOT EXISTS "IDX_auditoria_realizado_por" ON "auditoria_usuarios" ("realizadoPorId")`,
    );
    await this.dataSource.query(
      `CREATE INDEX IF NOT EXISTS "IDX_auditoria_created_at" ON "auditoria_usuarios" ("createdAt")`,
    );

    this.logger.log('Esquema de usuarios verificado/ajustado');
  }

  async seedAdmin() {
    const adminExiste = await this.usuariosRepo.findOne({ where: { rol: Rol.ADMIN } });
    if (adminExiste) {
      return { message: 'Ya existe un admin. Seed no necesario.', email: adminExiste.email };
    }
    const hashedPassword = await bcrypt.hash('Admin2026!', 12);
    const admin = this.usuariosRepo.create({
      nombre: 'Administrador',
      apellido: 'Principal',
      email: 'admin@cosmeticos.com',
      password: hashedPassword,
      rol: Rol.ADMIN,
      activo: true,
      forzarCambioPassword: true,
    });
    await this.usuariosRepo.save(admin);
    return {
      message: 'Usuario admin creado',
      credenciales: {
        email: 'admin@cosmeticos.com',
        password: 'Admin2026!',
        nota: 'Cambia la contrasena en el primer login',
      },
    };
  }

  async create(dto: CreateUsuarioDto, creadoPorId?: string): Promise<Omit<Usuario, 'password'>> {
    const existe = await this.usuariosRepo.findOne({ where: { email: dto.email } });
    if (existe) {
      throw new ConflictException('El email ya esta registrado');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const usuario = this.usuariosRepo.create({
      ...dto,
      password: hashedPassword,
      creadoPorId: creadoPorId ?? null,
      forzarCambioPassword: dto.forzarCambioPassword ?? false,
      sedeId: dto.sedeId ?? null,
      telefono: dto.telefono ?? null,
      notas: dto.notas ?? null,
    });

    const saved = await this.usuariosRepo.save(usuario);

    await this.registrarAuditoria({
      usuarioAfectadoId: saved.id,
      realizadoPorId: creadoPorId ?? null,
      accion: AccionAuditoria.CREAR,
      datosNuevos: {
        nombre: saved.nombre,
        apellido: saved.apellido,
        email: saved.email,
        rol: saved.rol,
        sedeId: saved.sedeId,
      },
    });

    const { password, ...resultado } = saved;
    return resultado;
  }

  async findAll(
    filtros: FiltrosUsuarioDto,
  ): Promise<{ data: Partial<Usuario>[]; total: number; page: number; totalPages: number }> {
    const {
      buscar,
      rol,
      sedeId,
      activo,
      page = 1,
      limit = 20,
      orderBy = 'createdAt',
      order = 'DESC',
    } = filtros;

    const qb = this.usuariosRepo
      .createQueryBuilder('u')
      .select([
        'u.id',
        'u.nombre',
        'u.apellido',
        'u.email',
        'u.rol',
        'u.sedeId',
        'u.activo',
        'u.telefono',
        'u.avatarUrl',
        'u.ultimoLogin',
        'u.intentosFallidos',
        'u.bloqueadoHasta',
        'u.forzarCambioPassword',
        'u.createdAt',
        'u.updatedAt',
      ]);

    if (buscar) {
      qb.andWhere(
        '(LOWER(u.nombre) LIKE LOWER(:buscar) OR LOWER(u.apellido) LIKE LOWER(:buscar) OR LOWER(u.email) LIKE LOWER(:buscar))',
        { buscar: `%${buscar}%` },
      );
    }
    if (rol) {
      qb.andWhere('u.rol = :rol', { rol });
    }
    if (sedeId) {
      qb.andWhere('u.sedeId = :sedeId', { sedeId });
    }
    if (activo !== undefined) {
      qb.andWhere('u.activo = :activo', { activo });
    }

    const camposValidos = ['nombre', 'email', 'rol', 'createdAt', 'ultimoLogin'];
    const campo = camposValidos.includes(orderBy) ? orderBy : 'createdAt';
    qb.orderBy(`u.${campo}`, order);
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string): Promise<Partial<Usuario>> {
    const usuario = await this.usuariosRepo
      .createQueryBuilder('u')
      .select([
        'u.id',
        'u.nombre',
        'u.apellido',
        'u.email',
        'u.rol',
        'u.sedeId',
        'u.activo',
        'u.telefono',
        'u.avatarUrl',
        'u.permisosExtra',
        'u.permisosRevocados',
        'u.ultimoLogin',
        'u.intentosFallidos',
        'u.bloqueadoHasta',
        'u.forzarCambioPassword',
        'u.notas',
        'u.creadoPorId',
        'u.createdAt',
        'u.updatedAt',
        'u.desactivadoEn',
      ])
      .where('u.id = :id', { id })
      .getOne();

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return usuario;
  }

  async findByEmail(email: string): Promise<Usuario | null> {
    return this.usuariosRepo
      .createQueryBuilder('u')
      .addSelect('u.password')
      .addSelect('u.permisosExtra')
      .addSelect('u.permisosRevocados')
      .where('u.email = :email', { email: email.toLowerCase().trim() })
      .getOne();
  }

  async update(
    id: string,
    dto: UpdateUsuarioDto,
    realizadoPorId?: string,
  ): Promise<Partial<Usuario>> {
    const usuario = await this.usuariosRepo.findOne({ where: { id } });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (dto.email && dto.email !== usuario.email) {
      const existeEmail = await this.usuariosRepo.findOne({ where: { email: dto.email } });
      if (existeEmail) {
        throw new ConflictException('El email ya esta en uso');
      }
    }

    const datosAnteriores = {
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      rol: usuario.rol,
      sedeId: usuario.sedeId,
      activo: usuario.activo,
      telefono: usuario.telefono,
    };

    const camposActualizar = { ...dto };
    Object.assign(usuario, camposActualizar);

    const saved = await this.usuariosRepo.save(usuario);

    await this.registrarAuditoria({
      usuarioAfectadoId: id,
      realizadoPorId: realizadoPorId ?? null,
      accion: AccionAuditoria.ACTUALIZAR,
      datosAnteriores,
      datosNuevos: camposActualizar,
    });

    const { password, ...resultado } = saved;
    return resultado;
  }

  async remove(id: string, realizadoPorId?: string): Promise<void> {
    const usuario = await this.usuariosRepo.findOne({ where: { id } });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }
    if (usuario.rol === Rol.ADMIN) {
      const totalAdmins = await this.usuariosRepo.count({
        where: { rol: Rol.ADMIN, activo: true },
      });
      if (totalAdmins <= 1) {
        throw new ForbiddenException('No se puede desactivar el ultimo administrador activo');
      }
    }

    usuario.activo = false;
    usuario.desactivadoEn = new Date();
    usuario.desactivadoPorId = realizadoPorId ?? null;
    await this.usuariosRepo.save(usuario);

    await this.registrarAuditoria({
      usuarioAfectadoId: id,
      realizadoPorId: realizadoPorId ?? null,
      accion: AccionAuditoria.DESACTIVAR,
    });
  }

  async activar(id: string, realizadoPorId?: string): Promise<void> {
    const usuario = await this.usuariosRepo.findOne({ where: { id } });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }
    usuario.activo = true;
    usuario.desactivadoEn = null;
    usuario.desactivadoPorId = null;
    await this.usuariosRepo.save(usuario);

    await this.registrarAuditoria({
      usuarioAfectadoId: id,
      realizadoPorId: realizadoPorId ?? null,
      accion: AccionAuditoria.ACTIVAR,
    });
  }

  async cambiarPassword(id: string, dto: CambiarPasswordDto): Promise<void> {
    const usuario = await this.usuariosRepo
      .createQueryBuilder('u')
      .addSelect('u.password')
      .where('u.id = :id', { id })
      .getOne();
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const valido = await bcrypt.compare(dto.passwordActual, usuario.password);
    if (!valido) {
      throw new UnauthorizedException('La contrasena actual es incorrecta');
    }

    if (dto.passwordActual === dto.passwordNuevo) {
      throw new BadRequestException('La nueva contrasena debe ser diferente a la actual');
    }

    usuario.password = await bcrypt.hash(dto.passwordNuevo, 12);
    usuario.forzarCambioPassword = false;
    await this.usuariosRepo.save(usuario);

    await this.registrarAuditoria({
      usuarioAfectadoId: id,
      realizadoPorId: id,
      accion: AccionAuditoria.CAMBIAR_PASSWORD,
    });
  }

  async resetPasswordAdmin(
    id: string,
    dto: ResetPasswordAdminDto,
    realizadoPorId?: string,
  ): Promise<void> {
    const usuario = await this.usuariosRepo.findOne({ where: { id } });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    usuario.password = await bcrypt.hash(dto.passwordNuevo, 12);
    usuario.forzarCambioPassword = dto.forzarCambio ?? true;
    usuario.intentosFallidos = 0;
    usuario.bloqueadoHasta = null;
    await this.usuariosRepo.save(usuario);

    await this.registrarAuditoria({
      usuarioAfectadoId: id,
      realizadoPorId: realizadoPorId ?? null,
      accion: AccionAuditoria.RESET_PASSWORD,
      datosNuevos: { forzarCambio: usuario.forzarCambioPassword },
      motivo: dto.motivo,
    });
  }

  async bloquear(id: string, minutosBloqueo: number = 30, realizadoPorId?: string): Promise<void> {
    const usuario = await this.usuariosRepo.findOne({ where: { id } });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }
    const bloqueadoHasta = new Date(Date.now() + minutosBloqueo * 60 * 1000);
    usuario.bloqueadoHasta = bloqueadoHasta;
    await this.usuariosRepo.save(usuario);
    await this.registrarAuditoria({
      usuarioAfectadoId: id,
      realizadoPorId: realizadoPorId ?? null,
      accion: AccionAuditoria.BLOQUEAR,
      datosNuevos: { bloqueadoHasta, minutosBloqueo },
    });
  }

  async desbloquear(id: string, realizadoPorId?: string): Promise<void> {
    const usuario = await this.usuariosRepo.findOne({ where: { id } });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }
    usuario.bloqueadoHasta = null;
    usuario.intentosFallidos = 0;
    await this.usuariosRepo.save(usuario);
    await this.registrarAuditoria({
      usuarioAfectadoId: id,
      realizadoPorId: realizadoPorId ?? null,
      accion: AccionAuditoria.DESBLOQUEAR,
    });
  }

  async registrarIntentoFallido(email: string, ip?: string): Promise<void> {
    const usuario = await this.usuariosRepo.findOne({
      where: { email: email.toLowerCase().trim() },
    });
    if (!usuario) {
      return;
    }
    usuario.intentosFallidos += 1;
    if (usuario.intentosFallidos >= 5) {
      usuario.bloqueadoHasta = new Date(Date.now() + 15 * 60 * 1000);
    }
    await this.usuariosRepo.save(usuario);
    await this.registrarAuditoria({
      usuarioAfectadoId: usuario.id,
      realizadoPorId: null,
      accion: AccionAuditoria.LOGIN_FALLIDO,
      datosNuevos: { intentosFallidos: usuario.intentosFallidos },
      ip,
    });
  }

  async registrarLoginExitoso(id: string, ip?: string): Promise<void> {
    await this.usuariosRepo.update(id, {
      intentosFallidos: 0,
      bloqueadoHasta: null,
      ultimoLogin: new Date(),
      ultimaIp: ip ?? null,
    });
    await this.registrarAuditoria({
      usuarioAfectadoId: id,
      realizadoPorId: id,
      accion: AccionAuditoria.LOGIN,
      ip,
    });
  }

  esBloqueado(usuario: Usuario): boolean {
    if (!usuario.bloqueadoHasta) {
      return false;
    }
    return usuario.bloqueadoHasta > new Date();
  }

  async gestionarPermisos(
    id: string,
    dto: GestionarPermisosDto,
    realizadoPorId?: string,
  ): Promise<void> {
    const usuario = await this.usuariosRepo.findOne({ where: { id } });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const datosAnteriores = {
      permisosExtra: usuario.permisosExtra,
      permisosRevocados: usuario.permisosRevocados,
    };

    usuario.permisosExtra = dto.permisosExtra;
    usuario.permisosRevocados = dto.permisosRevocados;
    await this.usuariosRepo.save(usuario);

    await this.registrarAuditoria({
      usuarioAfectadoId: id,
      realizadoPorId: realizadoPorId ?? null,
      accion: AccionAuditoria.AGREGAR_PERMISO,
      datosAnteriores,
      datosNuevos: {
        permisosExtra: dto.permisosExtra,
        permisosRevocados: dto.permisosRevocados,
      },
      motivo: dto.motivo,
    });
  }

  async getPermisosEfectivos(id: string): Promise<{
    permisosEfectivos: Permiso[];
    permisosRol: Permiso[];
    permisosExtra: Permiso[];
    permisosRevocados: Permiso[];
  }> {
    const usuario = await this.usuariosRepo.findOne({
      where: { id },
      select: ['id', 'rol', 'permisosExtra', 'permisosRevocados'],
    });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const permisosRol = PERMISOS_POR_ROL[usuario.rol] ?? [];
    const permisosExtra = usuario.permisosExtra ?? [];
    const permisosRevocados = new Set(usuario.permisosRevocados ?? []);

    const permisosEfectivos = [...new Set([...permisosRol, ...permisosExtra])].filter(
      (p) => !permisosRevocados.has(p),
    );

    return {
      permisosEfectivos,
      permisosRol,
      permisosExtra,
      permisosRevocados: [...permisosRevocados],
    };
  }

  async getAuditoria(
    usuarioId: string,
    page: number = 1,
    limit: number = 30,
  ): Promise<{ data: AuditoriaUsuario[]; total: number }> {
    const pageNum = Number.isFinite(Number(page)) ? Math.max(1, Number(page)) : 1;
    const limitNum = Number.isFinite(Number(limit))
      ? Math.min(100, Math.max(1, Number(limit)))
      : 30;

    const [data, total] = await this.auditoriaRepo.findAndCount({
      where: { usuarioAfectadoId: usuarioId },
      order: { createdAt: 'DESC' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    });
    return { data, total };
  }

  async getEstadisticas(): Promise<{
    total: number;
    activos: number;
    inactivos: number;
    bloqueados: number;
    porRol: Record<string, number>;
  }> {
    const total = await this.usuariosRepo.count();
    const activos = await this.usuariosRepo.count({ where: { activo: true } });
    const ahora = new Date();

    const bloqueados = await this.usuariosRepo
      .createQueryBuilder('u')
      .where('u.bloqueadoHasta > :ahora', { ahora })
      .getCount();

    const porRolRaw = await this.usuariosRepo
      .createQueryBuilder('u')
      .select('u.rol', 'rol')
      .addSelect('COUNT(*)', 'total')
      .groupBy('u.rol')
      .getRawMany();

    const porRol = porRolRaw.reduce(
      (acc, r) => {
        acc[r.rol] = parseInt(r.total, 10);
        return acc;
      },
      {} as Record<string, number>,
    );

    return { total, activos, inactivos: total - activos, bloqueados, porRol };
  }

  /**
   * Cambia el rol de un usuario e incrementa `tokenVersion` para invalidar
   * todos los JWT existentes de esa cuenta.
   */
  async cambiarRol(
    id: string,
    dto: CambiarRolDto,
    realizadoPorId: string,
  ): Promise<Omit<Usuario, 'password'>> {
    const usuario = await this.usuariosRepo.findOne({ where: { id } });
    if (!usuario) {
      throw new NotFoundException(`Usuario ${id} no encontrado`);
    }

    // Un usuario no puede cambiarse su propio rol
    if (id === realizadoPorId) {
      throw new ForbiddenException('No puedes cambiar tu propio rol');
    }

    const rolAnterior = usuario.rol;

    await this.usuariosRepo.update(id, {
      rol: dto.rol,
      tokenVersion: (usuario.tokenVersion ?? 0) + 1,
    });

    await this.registrarAuditoria({
      usuarioAfectadoId: id,
      realizadoPorId,
      accion: AccionAuditoria.CAMBIAR_ROL,
      datosAnteriores: { rol: rolAnterior },
      datosNuevos: { rol: dto.rol },
      motivo: dto.motivo,
    });

    const updated = await this.usuariosRepo.findOneOrFail({ where: { id } });
    this.logger.log(`Rol de ${id} cambiado de ${rolAnterior} → ${dto.rol} por ${realizadoPorId}`);

    const { password, ...resultado } = updated as Usuario & { password: string };
    return resultado;
  }

  private async registrarAuditoria(datos: {
    usuarioAfectadoId: string;
    realizadoPorId: string | null;
    accion: AccionAuditoria;
    datosAnteriores?: Record<string, unknown>;
    datosNuevos?: Record<string, unknown>;
    ip?: string;
    userAgent?: string;
    motivo?: string;
  }): Promise<void> {
    const registro = this.auditoriaRepo.create({
      ...datos,
      datosAnteriores: datos.datosAnteriores ?? null,
      datosNuevos: datos.datosNuevos ?? null,
    });
    await this.auditoriaRepo.save(registro).catch(() => {
      // No fallar operacion principal
    });
  }
}
