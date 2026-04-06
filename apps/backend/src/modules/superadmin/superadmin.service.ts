import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { DataSource, Repository } from 'typeorm';
import { Rol } from '@cosmeticos/shared-types';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Empresa, EstadoEmpresa, PlanEmpresa } from './entities/empresa.entity';
import { LogActividad, ResultadoActividad } from './entities/log-actividad.entity';
import { CrearEmpresaDto } from './dto/crear-empresa.dto';

@Injectable()
export class SuperadminService {
  constructor(
    @InjectRepository(Empresa)
    private readonly empresasRepository: Repository<Empresa>,
    @InjectRepository(LogActividad)
    private readonly logsRepository: Repository<LogActividad>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async getTodasEmpresas() {
    const rows = await this.empresasRepository
      .createQueryBuilder('empresa')
      .leftJoin(Usuario, 'usuario', 'usuario.empresaId = empresa.id AND usuario.activo = true')
      .select('empresa.id', 'id')
      .addSelect('empresa.nombre', 'nombre')
      .addSelect('empresa.nit', 'nit')
      .addSelect('empresa.email', 'email')
      .addSelect('empresa.telefono', 'telefono')
      .addSelect('empresa.plan', 'plan')
      .addSelect('empresa.estado', 'estado')
      .addSelect('empresa.modulos', 'modulos')
      .addSelect('empresa.maxUsuarios', 'maxUsuarios')
      .addSelect('empresa.maxSedes', 'maxSedes')
      .addSelect('empresa.vencimientoEn', 'vencimientoEn')
      .addSelect('empresa.createdAt', 'createdAt')
      .addSelect('COUNT(usuario.id)', 'usuariosActivos')
      .groupBy('empresa.id')
      .orderBy('empresa.createdAt', 'DESC')
      .getRawMany();

    return rows.map((row) => ({
      id: row.id,
      nombre: row.nombre,
      nit: row.nit,
      email: row.email,
      telefono: row.telefono,
      plan: row.plan,
      estado: row.estado,
      modulos: row.modulos ?? [],
      maxUsuarios: Number(row.maxUsuarios),
      maxSedes: Number(row.maxSedes),
      vencimientoEn: row.vencimientoEn,
      createdAt: row.createdAt,
      usuariosActivos: Number(row.usuariosActivos ?? 0),
    }));
  }

  async crearEmpresa(dto: CrearEmpresaDto) {
    const existeNit = await this.empresasRepository.findOne({ where: { nit: dto.nit } });
    if (existeNit) {
      throw new ConflictException('Ya existe una empresa con ese NIT');
    }

    const existeAdminEmail = await this.usuariosRepository.findOne({
      where: { email: dto.adminEmail },
    });
    if (existeAdminEmail) {
      throw new ConflictException('El email del admin ya se encuentra registrado');
    }

    return this.dataSource.transaction(async (manager) => {
      const empresaRepo = manager.getRepository(Empresa);
      const usuarioRepo = manager.getRepository(Usuario);

      const empresa = await empresaRepo.save(
        empresaRepo.create({
          nombre: dto.nombre,
          nit: dto.nit,
          email: dto.email,
          plan: dto.plan,
          estado: EstadoEmpresa.TRIAL,
          modulos: [],
          telefono: null,
          vencimientoEn: null,
        }),
      );

      const nombreParts = dto.adminNombre.trim().split(/\s+/).filter(Boolean);
      const nombre = nombreParts[0] ?? 'Admin';
      const apellido = nombreParts.slice(1).join(' ') || 'Empresa';

      const hashedPassword = await bcrypt.hash(dto.adminPassword, 12);

      const usuario = await usuarioRepo.save(
        usuarioRepo.create({
          nombre,
          apellido,
          email: dto.adminEmail,
          password: hashedPassword,
          rol: Rol.ADMIN,
          empresaId: empresa.id,
          activo: true,
          sedeId: null,
          permisosExtra: [],
          permisosRevocados: [],
          forzarCambioPassword: true,
          telefono: null,
          notas: `Admin inicial de empresa ${empresa.nombre}`,
        }),
      );

      return {
        empresa,
        admin: {
          id: usuario.id,
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          email: usuario.email,
          rol: usuario.rol,
        },
      };
    });
  }

  async cambiarPlan(empresaId: string, plan: PlanEmpresa, vencimientoEn?: string) {
    const empresa = await this.empresasRepository.findOne({ where: { id: empresaId } });
    if (!empresa) {
      throw new NotFoundException('Empresa no encontrada');
    }

    empresa.plan = plan;
    empresa.vencimientoEn = vencimientoEn ?? empresa.vencimientoEn;

    await this.empresasRepository.save(empresa);
    return empresa;
  }

  async suspender(empresaId: string, motivo: string) {
    const empresa = await this.empresasRepository.findOne({ where: { id: empresaId } });
    if (!empresa) {
      throw new NotFoundException('Empresa no encontrada');
    }

    empresa.estado = EstadoEmpresa.SUSPENDIDA;
    await this.empresasRepository.save(empresa);

    return {
      ok: true,
      empresaId,
      motivo,
      estado: empresa.estado,
    };
  }

  async reactivar(empresaId: string) {
    const empresa = await this.empresasRepository.findOne({ where: { id: empresaId } });
    if (!empresa) {
      throw new NotFoundException('Empresa no encontrada');
    }

    empresa.estado = EstadoEmpresa.ACTIVA;
    await this.empresasRepository.save(empresa);

    return {
      ok: true,
      empresaId,
      estado: empresa.estado,
    };
  }

  async getMetricasGlobales() {
    const [totalEmpresas, activas, nuevasMes] = await Promise.all([
      this.empresasRepository.count(),
      this.empresasRepository.count({ where: { estado: EstadoEmpresa.ACTIVA } }),
      this.empresasRepository
        .createQueryBuilder('empresa')
        .where(`DATE_TRUNC('month', empresa.createdAt) = DATE_TRUNC('month', NOW())`)
        .getCount(),
    ]);

    return {
      totalEmpresas,
      activas,
      nuevasEsteMes: nuevasMes,
    };
  }

  async getLogs(
    page = 1,
    limit = 50,
    filtros?: {
      modulo?: string;
      resultado?: ResultadoActividad;
      fechaDesde?: string;
      fechaHasta?: string;
    },
  ) {
    const normalizedPage = Math.max(1, page);
    const normalizedLimit = Math.max(1, Math.min(200, limit));

    if (filtros?.fechaDesde && Number.isNaN(Date.parse(filtros.fechaDesde))) {
      throw new BadRequestException('fechaDesde debe tener formato YYYY-MM-DD');
    }

    if (filtros?.fechaHasta && Number.isNaN(Date.parse(filtros.fechaHasta))) {
      throw new BadRequestException('fechaHasta debe tener formato YYYY-MM-DD');
    }

    if (filtros?.fechaDesde && filtros?.fechaHasta) {
      const desde = new Date(filtros.fechaDesde);
      const hasta = new Date(filtros.fechaHasta);
      if (desde.getTime() > hasta.getTime()) {
        throw new BadRequestException('fechaDesde no puede ser mayor que fechaHasta');
      }
    }

    const qb = this.logsRepository
      .createQueryBuilder('log')
      .orderBy('log.createdAt', 'DESC')
      .skip((normalizedPage - 1) * normalizedLimit)
      .take(normalizedLimit);

    if (filtros?.modulo?.trim()) {
      qb.andWhere('LOWER(log.modulo) = LOWER(:modulo)', { modulo: filtros.modulo.trim() });
    }

    if (filtros?.resultado) {
      qb.andWhere('log.resultado = :resultado', { resultado: filtros.resultado });
    }

    if (filtros?.fechaDesde) {
      qb.andWhere('DATE(log.createdAt) >= :fechaDesde', { fechaDesde: filtros.fechaDesde });
    }

    if (filtros?.fechaHasta) {
      qb.andWhere('DATE(log.createdAt) <= :fechaHasta', { fechaHasta: filtros.fechaHasta });
    }

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page: normalizedPage,
      totalPages: Math.ceil(total / normalizedLimit) || 1,
    };
  }
}
