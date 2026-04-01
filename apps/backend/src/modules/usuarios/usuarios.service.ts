import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Rol } from '@cosmeticos/shared-types';
import { Usuario } from './entities/usuario.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UsuariosQueryDto } from './dto/usuarios-query.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUsuarioAdminDto } from './dto/create-usuario-admin.dto';
import { Sede } from '../sedes/entities/sede.entity';

export interface UsuarioSanitizado {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: Rol;
  sedeId?: string | null;
  activo: boolean;
  ultimoLogin?: Date | null;
  telefono?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsuariosPaginados {
  data: UsuarioSanitizado[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(Sede)
    private readonly sedesRepository: Repository<Sede>,
  ) {}

  private sanitize(usuario: Usuario): UsuarioSanitizado {
    return {
      id: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      rol: usuario.rol,
      sedeId: usuario.sedeId,
      activo: usuario.activo,
      ultimoLogin: usuario.ultimoLogin,
      telefono: usuario.telefono,
      createdAt: usuario.createdAt,
      updatedAt: usuario.updatedAt,
    };
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private normalizeText(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }

  private normalizeSearch(texto: string): string {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private generarPasswordTemporal(longitud = 12): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let result = '';
    for (let i = 0; i < longitud; i += 1) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private async validarSede(sedeId?: string): Promise<void> {
    if (!sedeId) {
      return;
    }

    const sede = await this.sedesRepository.findOne({ where: { id: sedeId, activo: true } });
    if (!sede) {
      throw new NotFoundException('La sede enviada no existe o esta inactiva');
    }
  }

  async seedAdmin() {
    const adminExiste = await this.usuariosRepository.findOne({
      where: { rol: Rol.ADMIN },
    });

    if (adminExiste) {
      return {
        message: 'Ya existe un usuario admin. Seed no necesario.',
        email: adminExiste.email,
      };
    }

    const hashedPassword = await bcrypt.hash('Admin2026!', 10);
    const admin = this.usuariosRepository.create({
      nombre: 'Administrador',
      apellido: 'Principal',
      email: 'admin@cosmeticos.com',
      password: hashedPassword,
      rol: Rol.ADMIN,
      activo: true,
      intentosLogin: 0,
    });

    await this.usuariosRepository.save(admin);

    return {
      message: 'Usuario admin creado exitosamente',
      credenciales: {
        email: 'admin@cosmeticos.com',
        password: 'Admin2026!',
        rol: 'ADMIN',
      },
    };
  }

  async create(createUsuarioDto: CreateUsuarioDto): Promise<UsuarioSanitizado> {
    await this.validarSede(createUsuarioDto.sedeId);

    const email = this.normalizeEmail(createUsuarioDto.email);
    const existe = await this.usuariosRepository.findOne({ where: { email } });
    if (existe) {
      throw new ConflictException('El email ya esta registrado');
    }

    const hashedPassword = await bcrypt.hash(createUsuarioDto.password, 10);
    const usuario = this.usuariosRepository.create({
      ...createUsuarioDto,
      nombre: this.normalizeText(createUsuarioDto.nombre),
      apellido: this.normalizeText(createUsuarioDto.apellido),
      email,
      password: hashedPassword,
      intentosLogin: 0,
    });

    const created = await this.usuariosRepository.save(usuario);
    return this.sanitize(created);
  }

  async createByAdmin(createUsuarioAdminDto: CreateUsuarioAdminDto) {
    await this.validarSede(createUsuarioAdminDto.sedeId);

    const email = this.normalizeEmail(createUsuarioAdminDto.email);
    const existe = await this.usuariosRepository.findOne({ where: { email } });
    if (existe) {
      throw new ConflictException('El email ya esta registrado');
    }

    const tempPassword =
      createUsuarioAdminDto.temporaryPassword?.trim() || this.generarPasswordTemporal();

    if (tempPassword.length < 8) {
      throw new BadRequestException('La contrasena temporal debe tener minimo 8 caracteres');
    }

    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    const usuario = this.usuariosRepository.create({
      nombre: this.normalizeText(createUsuarioAdminDto.nombre),
      apellido: this.normalizeText(createUsuarioAdminDto.apellido),
      email,
      rol: createUsuarioAdminDto.rol,
      sedeId: createUsuarioAdminDto.sedeId,
      telefono: createUsuarioAdminDto.telefono?.trim() || null,
      password: hashedPassword,
      activo: true,
      intentosLogin: 0,
    });

    const created = await this.usuariosRepository.save(usuario);

    return {
      usuario: this.sanitize(created),
      temporaryPassword: tempPassword,
    };
  }

  async findAll(queryDto: UsuariosQueryDto = {}): Promise<UsuariosPaginados> {
    const page = queryDto.page ?? 1;
    const limit = Math.min(queryDto.limit ?? 20, 100);
    const q = queryDto.q?.trim();
    const nombreNormalizado = "translate(lower(usuario.nombre), 'áéíóúüñ', 'aeiouun')";
    const apellidoNormalizado = "translate(lower(usuario.apellido), 'áéíóúüñ', 'aeiouun')";

    const query = this.usuariosRepository
      .createQueryBuilder('usuario')
      .select([
        'usuario.id',
        'usuario.nombre',
        'usuario.apellido',
        'usuario.email',
        'usuario.rol',
        'usuario.sedeId',
        'usuario.activo',
        'usuario.telefono',
        'usuario.ultimoLogin',
        'usuario.createdAt',
        'usuario.updatedAt',
      ]);

    if (queryDto.activo !== undefined) {
      query.andWhere('usuario.activo = :activo', { activo: queryDto.activo });
    }

    if (queryDto.rol) {
      query.andWhere('usuario.rol = :rol', { rol: queryDto.rol });
    }

    if (queryDto.sedeId) {
      query.andWhere('usuario.sedeId = :sedeId', { sedeId: queryDto.sedeId });
    }

    if (queryDto.email) {
      query.andWhere('lower(usuario.email) = :email', {
        email: this.normalizeEmail(queryDto.email),
      });
    }

    if (q) {
      const qNorm = this.normalizeSearch(q);
      const tokens = qNorm
        .split(' ')
        .filter((token) => token.length > 0)
        .slice(0, 5);

      if (!tokens.length) {
        return {
          data: [],
          meta: {
            total: 0,
            page,
            limit,
            totalPages: 0,
          },
        };
      }

      query.andWhere(
        new Brackets((qb) => {
          tokens.forEach((token, index) => {
            qb.andWhere(
              new Brackets((tokenQb) => {
                tokenQb
                  .where(`${nombreNormalizado} LIKE :nombre${index}`, {
                    [`nombre${index}`]: `%${token}%`,
                  })
                  .orWhere(`${apellidoNormalizado} LIKE :apellido${index}`, {
                    [`apellido${index}`]: `%${token}%`,
                  })
                  .orWhere('lower(usuario.email) LIKE :emailLike' + index, {
                    ['emailLike' + index]: `%${token}%`,
                  });
              }),
            );
          });
        }),
      );
    }

    query
      .orderBy('usuario.createdAt', 'DESC')
      .take(limit)
      .skip((page - 1) * limit);

    const [rows, total] = await query.getManyAndCount();

    return {
      data: rows.map((row) => this.sanitize(row)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findOne(id: string): Promise<UsuarioSanitizado> {
    const usuario = await this.usuariosRepository.findOne({
      where: { id },
      select: [
        'id',
        'nombre',
        'apellido',
        'email',
        'rol',
        'sedeId',
        'activo',
        'telefono',
        'ultimoLogin',
        'createdAt',
        'updatedAt',
      ],
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.sanitize(usuario);
  }

  async findByEmail(email: string): Promise<Usuario | null> {
    return this.usuariosRepository.findOne({ where: { email: this.normalizeEmail(email) } });
  }

  async update(id: string, updateUsuarioDto: UpdateUsuarioDto): Promise<UsuarioSanitizado> {
    const usuario = await this.usuariosRepository.findOne({ where: { id } });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (updateUsuarioDto.email && updateUsuarioDto.email !== usuario.email) {
      const email = this.normalizeEmail(updateUsuarioDto.email);
      const existe = await this.usuariosRepository.findOne({ where: { email } });
      if (existe && existe.id !== usuario.id) {
        throw new ConflictException('El email ya esta registrado');
      }
      usuario.email = email;
    }

    if (updateUsuarioDto.nombre !== undefined) {
      usuario.nombre = this.normalizeText(updateUsuarioDto.nombre);
    }

    if (updateUsuarioDto.apellido !== undefined) {
      usuario.apellido = this.normalizeText(updateUsuarioDto.apellido);
    }

    if (updateUsuarioDto.rol !== undefined) {
      usuario.rol = updateUsuarioDto.rol;
    }

    if (updateUsuarioDto.sedeId !== undefined) {
      await this.validarSede(updateUsuarioDto.sedeId);
      usuario.sedeId = updateUsuarioDto.sedeId ?? null;
    }

    if (updateUsuarioDto.password !== undefined) {
      if (updateUsuarioDto.password.length < 8) {
        throw new BadRequestException('La contrasena debe tener minimo 8 caracteres');
      }
      usuario.password = await bcrypt.hash(updateUsuarioDto.password, 10);
    }

    const saved = await this.usuariosRepository.save(usuario);
    return this.sanitize(saved);
  }

  async updateEstado(id: string, activo: boolean): Promise<UsuarioSanitizado> {
    const usuario = await this.usuariosRepository.findOne({ where: { id } });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (usuario.rol === Rol.ADMIN && !activo) {
      const totalAdminsActivos = await this.usuariosRepository.count({
        where: { rol: Rol.ADMIN, activo: true },
      });

      if (totalAdminsActivos <= 1) {
        throw new BadRequestException('No se puede desactivar el unico usuario admin activo');
      }
    }

    usuario.activo = activo;
    const saved = await this.usuariosRepository.save(usuario);
    return this.sanitize(saved);
  }

  async remove(id: string): Promise<void> {
    await this.updateEstado(id, false);
  }

  async getMe(id: string): Promise<UsuarioSanitizado> {
    return this.findOne(id);
  }

  async changeOwnPassword(id: string, dto: ChangePasswordDto): Promise<{ message: string }> {
    const usuario = await this.usuariosRepository.findOne({ where: { id } });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const passwordValido = await bcrypt.compare(dto.currentPassword, usuario.password);
    if (!passwordValido) {
      throw new UnauthorizedException('La contrasena actual es incorrecta');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('La nueva contrasena debe ser diferente a la actual');
    }

    usuario.password = await bcrypt.hash(dto.newPassword, 10);
    await this.usuariosRepository.save(usuario);
    return { message: 'Contrasena actualizada correctamente' };
  }

  async registrarLoginExitoso(usuarioId: string): Promise<void> {
    await this.usuariosRepository.update(usuarioId, {
      ultimoLogin: new Date(),
      intentosLogin: 0,
      bloqueadoHasta: null,
    });
  }

  async registrarLoginFallido(usuarioId: string): Promise<void> {
    const usuario = await this.usuariosRepository.findOne({ where: { id: usuarioId } });
    if (!usuario) {
      return;
    }

    const intentos = (usuario.intentosLogin ?? 0) + 1;
    const debeBloquear = intentos >= 5;

    await this.usuariosRepository.update(usuarioId, {
      intentosLogin: debeBloquear ? 0 : intentos,
      bloqueadoHasta: debeBloquear ? new Date(Date.now() + 15 * 60 * 1000) : null,
    });
  }
}
