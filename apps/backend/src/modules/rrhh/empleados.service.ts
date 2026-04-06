import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Area } from './entities/area.entity';
import { Cargo } from './entities/cargo.entity';
import { Empleado } from './entities/empleado.entity';
import { CrearAreaDto } from './dto/crear-area.dto';
import { ActualizarAreaDto } from './dto/actualizar-area.dto';
import { FiltrosAreaDto } from './dto/filtros-area.dto';
import { CrearCargoDto } from './dto/crear-cargo.dto';
import { ActualizarCargoDto } from './dto/actualizar-cargo.dto';
import { FiltrosCargoDto } from './dto/filtros-cargo.dto';
import { CrearEmpleadoDto } from './dto/crear-empleado.dto';
import { ActualizarEmpleadoDto } from './dto/actualizar-empleado.dto';
import { FiltrosEmpleadoDto } from './dto/filtros-empleado.dto';

@Injectable()
export class EmpleadosService {
  constructor(
    @InjectRepository(Area)
    private readonly areaRepository: Repository<Area>,
    @InjectRepository(Cargo)
    private readonly cargoRepository: Repository<Cargo>,
    @InjectRepository(Empleado)
    private readonly empleadoRepository: Repository<Empleado>,
  ) {}

  async crearArea(dto: CrearAreaDto): Promise<Area> {
    const nombre = dto.nombre.trim();
    const existente = await this.areaRepository.findOne({ where: { nombre } });
    if (existente) {
      throw new ConflictException('Ya existe un area con ese nombre');
    }

    const area = this.areaRepository.create({
      nombre,
      descripcion: dto.descripcion?.trim() ?? null,
      responsableId: dto.responsableId ?? null,
      activa: dto.activa ?? true,
    });
    return this.areaRepository.save(area);
  }

  async listarAreas(filtros: FiltrosAreaDto) {
    const page = filtros.page ?? 1;
    const limit = filtros.limit ?? 20;
    const qb = this.areaRepository
      .createQueryBuilder('area')
      .leftJoinAndSelect('area.responsable', 'responsable')
      .orderBy('area.nombre', 'ASC');

    if (typeof filtros.activa === 'boolean') {
      qb.andWhere('area.activa = :activa', { activa: filtros.activa });
    }
    if (filtros.q?.trim()) {
      qb.andWhere("(LOWER(area.nombre) LIKE :q OR LOWER(COALESCE(area.descripcion, '')) LIKE :q)", {
        q: `%${filtros.q.trim().toLowerCase()}%`,
      });
    }

    const [items, total] = await qb
      .offset((page - 1) * limit)
      .limit(limit)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async obtenerArea(id: string): Promise<Area> {
    const area = await this.areaRepository.findOne({
      where: { id },
      relations: { responsable: true, cargos: true, empleados: true },
    });
    if (!area) {
      throw new NotFoundException('Area no encontrada');
    }
    return area;
  }

  async actualizarArea(id: string, dto: ActualizarAreaDto): Promise<Area> {
    const area = await this.obtenerArea(id);

    if (dto.nombre !== undefined) {
      const nombre = dto.nombre.trim();
      if (nombre !== area.nombre) {
        const existente = await this.areaRepository.findOne({ where: { nombre } });
        if (existente && existente.id !== area.id) {
          throw new ConflictException('Ya existe un area con ese nombre');
        }
      }
      area.nombre = nombre;
    }
    if (dto.descripcion !== undefined) {
      area.descripcion = dto.descripcion?.trim() || null;
    }
    if (dto.responsableId !== undefined) {
      area.responsableId = dto.responsableId ?? null;
    }
    if (dto.activa !== undefined) {
      area.activa = dto.activa;
    }

    return this.areaRepository.save(area);
  }

  async eliminarArea(id: string): Promise<void> {
    const area = await this.obtenerArea(id);
    area.activa = false;
    await this.areaRepository.save(area);
  }

  async crearCargo(dto: CrearCargoDto): Promise<Cargo> {
    await this.obtenerArea(dto.areaId);
    const cargo = this.cargoRepository.create(dto);
    return this.cargoRepository.save(cargo);
  }

  async listarCargos(filtros: FiltrosCargoDto) {
    const page = filtros.page ?? 1;
    const limit = filtros.limit ?? 20;
    const qb = this.cargoRepository
      .createQueryBuilder('cargo')
      .leftJoinAndSelect('cargo.area', 'area')
      .orderBy('cargo.nombre', 'ASC');

    if (filtros.areaId) {
      qb.andWhere('cargo.areaId = :areaId', { areaId: filtros.areaId });
    }
    if (filtros.nivel) {
      qb.andWhere('cargo.nivel = :nivel', { nivel: filtros.nivel });
    }
    if (filtros.q?.trim()) {
      qb.andWhere('LOWER(cargo.nombre) LIKE :q', { q: `%${filtros.q.trim().toLowerCase()}%` });
    }

    const [items, total] = await qb
      .offset((page - 1) * limit)
      .limit(limit)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async obtenerCargo(id: string): Promise<Cargo> {
    const cargo = await this.cargoRepository.findOne({ where: { id }, relations: { area: true } });
    if (!cargo) {
      throw new NotFoundException('Cargo no encontrado');
    }
    return cargo;
  }

  async actualizarCargo(id: string, dto: ActualizarCargoDto): Promise<Cargo> {
    const cargo = await this.obtenerCargo(id);
    if (dto.areaId) {
      await this.obtenerArea(dto.areaId);
    }

    Object.assign(cargo, {
      ...dto,
      nombre: dto.nombre?.trim() ?? cargo.nombre,
    });
    return this.cargoRepository.save(cargo);
  }

  async eliminarCargo(id: string): Promise<void> {
    const cargo = await this.obtenerCargo(id);
    await this.cargoRepository.remove(cargo);
  }

  async crearEmpleado(dto: CrearEmpleadoDto): Promise<Empleado> {
    await this.obtenerArea(dto.areaId);
    await this.obtenerCargo(dto.cargoId);

    const existente = await this.empleadoRepository.findOne({
      where: { numeroDocumento: dto.numeroDocumento.trim() },
    });
    if (existente) {
      throw new ConflictException('Ya existe un empleado con ese documento');
    }

    const empleado = this.empleadoRepository.create({
      ...dto,
      numeroDocumento: dto.numeroDocumento.trim(),
      nombre: dto.nombre.trim(),
      apellido: dto.apellido.trim(),
      email: dto.email?.trim().toLowerCase() ?? null,
      telefono: dto.telefono?.trim() ?? null,
      genero: dto.genero?.trim() ?? null,
      eps: dto.eps?.trim() ?? null,
      arl: dto.arl?.trim() ?? null,
      fondoPension: dto.fondoPension?.trim() ?? null,
      cuentaBancaria: dto.cuentaBancaria?.trim() ?? null,
      usuarioId: dto.usuarioId ?? null,
      fechaRetiro: dto.fechaRetiro ?? null,
      auxilioTransporte: dto.auxilioTransporte ?? true,
    });
    return this.empleadoRepository.save(empleado);
  }

  async listarEmpleados(filtros: FiltrosEmpleadoDto) {
    const page = filtros.page ?? 1;
    const limit = filtros.limit ?? 20;
    const qb = this.empleadoRepository
      .createQueryBuilder('empleado')
      .leftJoinAndSelect('empleado.area', 'area')
      .leftJoinAndSelect('empleado.cargo', 'cargo')
      .leftJoinAndSelect('empleado.sede', 'sede')
      .orderBy('empleado.nombre', 'ASC');

    if (filtros.areaId) qb.andWhere('empleado.areaId = :areaId', { areaId: filtros.areaId });
    if (filtros.cargoId) qb.andWhere('empleado.cargoId = :cargoId', { cargoId: filtros.cargoId });
    if (filtros.estado) qb.andWhere('empleado.estado = :estado', { estado: filtros.estado });
    if (filtros.sedeId) qb.andWhere('empleado.sedeId = :sedeId', { sedeId: filtros.sedeId });
    if (filtros.q?.trim()) {
      qb.andWhere(
        '(LOWER(empleado.nombre) LIKE :q OR LOWER(empleado.apellido) LIKE :q OR empleado.numeroDocumento LIKE :raw)',
        {
          q: `%${filtros.q.trim().toLowerCase()}%`,
          raw: `%${filtros.q.trim()}%`,
        },
      );
    }

    const [items, total] = await qb
      .offset((page - 1) * limit)
      .limit(limit)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async obtenerEmpleado(id: string): Promise<Empleado> {
    const empleado = await this.empleadoRepository.findOne({
      where: { id },
      relations: { area: true, cargo: true, sede: true, usuario: true },
    });
    if (!empleado) {
      throw new NotFoundException('Empleado no encontrado');
    }
    return empleado;
  }

  async actualizarEmpleado(id: string, dto: ActualizarEmpleadoDto): Promise<Empleado> {
    const empleado = await this.obtenerEmpleado(id);

    if (dto.numeroDocumento && dto.numeroDocumento.trim() !== empleado.numeroDocumento) {
      const existente = await this.empleadoRepository.findOne({
        where: { numeroDocumento: dto.numeroDocumento.trim() },
      });
      if (existente && existente.id !== empleado.id) {
        throw new ConflictException('Ya existe un empleado con ese documento');
      }
    }

    if (dto.areaId) await this.obtenerArea(dto.areaId);
    if (dto.cargoId) await this.obtenerCargo(dto.cargoId);

    Object.assign(empleado, {
      ...dto,
      nombre: dto.nombre?.trim() ?? empleado.nombre,
      apellido: dto.apellido?.trim() ?? empleado.apellido,
      numeroDocumento: dto.numeroDocumento?.trim() ?? empleado.numeroDocumento,
      email: dto.email !== undefined ? dto.email?.trim().toLowerCase() || null : empleado.email,
      telefono: dto.telefono !== undefined ? dto.telefono?.trim() || null : empleado.telefono,
      genero: dto.genero !== undefined ? dto.genero?.trim() || null : empleado.genero,
      eps: dto.eps !== undefined ? dto.eps?.trim() || null : empleado.eps,
      arl: dto.arl !== undefined ? dto.arl?.trim() || null : empleado.arl,
      fondoPension:
        dto.fondoPension !== undefined ? dto.fondoPension?.trim() || null : empleado.fondoPension,
      cuentaBancaria:
        dto.cuentaBancaria !== undefined
          ? dto.cuentaBancaria?.trim() || null
          : empleado.cuentaBancaria,
      fechaRetiro: dto.fechaRetiro !== undefined ? (dto.fechaRetiro ?? null) : empleado.fechaRetiro,
      usuarioId: dto.usuarioId !== undefined ? (dto.usuarioId ?? null) : empleado.usuarioId,
    });

    return this.empleadoRepository.save(empleado);
  }

  async eliminarEmpleado(id: string): Promise<Empleado> {
    const empleado = await this.obtenerEmpleado(id);
    empleado.fechaRetiro = new Date().toISOString().slice(0, 10);
    return this.empleadoRepository.save(empleado);
  }

  async getOrganigrama() {
    const areas = await this.areaRepository.find({
      where: { activa: true },
      relations: { responsable: true, empleados: { cargo: true } },
      order: { nombre: 'ASC' },
    });

    return areas.map((area) => {
      const responsableId = area.responsableId;
      const responsables = area.empleados.filter((emp) => emp.id === responsableId);
      const subordinados = area.empleados.filter((emp) => emp.id !== responsableId);
      return {
        id: area.id,
        nombre: area.nombre,
        responsable: responsables[0] ?? null,
        subordinados,
      };
    });
  }
}
