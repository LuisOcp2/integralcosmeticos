import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Activo, EstadoActivo } from './entities/activo.entity';
import { CategoriaActivo, MetodoDepreciacionActivo } from './entities/categoria-activo.entity';
import { MovimientoActivo, TipoMovimientoActivo } from './entities/movimiento-activo.entity';
import { DepreciacionActivo } from './entities/depreciacion-activo.entity';
import { CreateActivoDto } from './dto/create-activo.dto';
import { UpdateActivoDto } from './dto/update-activo.dto';
import { ActivosQueryDto } from './dto/activos-query.dto';

@Injectable()
export class ActivosService {
  constructor(
    @InjectRepository(Activo)
    private readonly activosRepository: Repository<Activo>,
    @InjectRepository(CategoriaActivo)
    private readonly categoriasRepository: Repository<CategoriaActivo>,
    @InjectRepository(MovimientoActivo)
    private readonly movimientosRepository: Repository<MovimientoActivo>,
    @InjectRepository(DepreciacionActivo)
    private readonly depreciacionesRepository: Repository<DepreciacionActivo>,
  ) {}

  async create(dto: CreateActivoDto, realizadoPorId: string): Promise<Activo> {
    const codigo = await this.generarCodigo();
    const valorCompra = Number(dto.valorCompra);
    const valorResidual = Number(dto.valorResidual ?? 0);

    if (valorResidual > valorCompra) {
      throw new BadRequestException('El valor residual no puede ser mayor al valor de compra');
    }

    const activo = this.activosRepository.create({
      codigo,
      nombre: dto.nombre.trim(),
      categoriaId: dto.categoriaId,
      sedeId: dto.sedeId,
      custodioId: dto.custodioId ?? null,
      estado: dto.estado ?? EstadoActivo.ACTIVO,
      marca: dto.marca?.trim() || null,
      modelo: dto.modelo?.trim() || null,
      serial: dto.serial?.trim() || null,
      fechaCompra: dto.fechaCompra,
      valorCompra,
      valorResidual,
      valorActual: valorCompra,
      proximoMantenimiento: dto.proximoMantenimiento ?? null,
      garantiaHasta: dto.garantiaHasta ?? null,
      foto: dto.foto?.trim() || null,
    });

    const saved = await this.activosRepository.save(activo);

    await this.movimientosRepository.save(
      this.movimientosRepository.create({
        activoId: saved.id,
        tipo: TipoMovimientoActivo.ALTA,
        descripcion: 'Registro inicial del activo',
        sedeOrigenId: null,
        sedeDestinoId: saved.sedeId,
        costo: null,
        fecha: new Date(),
        realizadoPorId,
      }),
    );

    return this.findOne(saved.id);
  }

  async findAll(query: ActivosQueryDto) {
    const rrhhExiste = await this.rrhhTableExists();
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const qb = this.activosRepository
      .createQueryBuilder('activo')
      .leftJoinAndSelect('activo.categoria', 'categoria')
      .leftJoinAndSelect('activo.sede', 'sede')
      .orderBy('activo.createdAt', 'DESC');

    if (rrhhExiste) {
      qb.leftJoinAndSelect('activo.custodio', 'custodio');
    }

    if (query.sedeId) {
      qb.andWhere('activo.sedeId = :sedeId', { sedeId: query.sedeId });
    }
    if (query.categoriaId) {
      qb.andWhere('activo.categoriaId = :categoriaId', { categoriaId: query.categoriaId });
    }
    if (query.estado) {
      qb.andWhere('activo.estado = :estado', { estado: query.estado });
    }
    if (query.custodioId) {
      qb.andWhere('activo.custodioId = :custodioId', { custodioId: query.custodioId });
    }

    const [items, total] = await Promise.all([
      qb.clone().offset(offset).limit(limit).getMany(),
      qb.clone().getCount(),
    ]);

    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
      items,
    };
  }

  async getCategorias() {
    return this.categoriasRepository.find({
      where: { activa: true },
      order: { nombre: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Activo> {
    const rrhhExiste = await this.rrhhTableExists();
    const activo = await this.activosRepository.findOne({
      where: { id },
      relations: { categoria: true, sede: true, ...(rrhhExiste ? { custodio: true } : {}) },
    });

    if (!activo) {
      throw new NotFoundException('Activo no encontrado');
    }

    return activo;
  }

  async update(id: string, dto: UpdateActivoDto): Promise<Activo> {
    const activo = await this.findOne(id);

    if (dto.nombre !== undefined) {
      activo.nombre = dto.nombre.trim();
    }
    if (dto.categoriaId !== undefined) {
      activo.categoriaId = dto.categoriaId;
    }
    if (dto.sedeId !== undefined) {
      activo.sedeId = dto.sedeId;
    }
    if (dto.custodioId !== undefined) {
      activo.custodioId = dto.custodioId ?? null;
    }
    if (dto.estado !== undefined) {
      activo.estado = dto.estado;
    }
    if (dto.marca !== undefined) {
      activo.marca = dto.marca?.trim() || null;
    }
    if (dto.modelo !== undefined) {
      activo.modelo = dto.modelo?.trim() || null;
    }
    if (dto.serial !== undefined) {
      activo.serial = dto.serial?.trim() || null;
    }
    if (dto.fechaCompra !== undefined) {
      activo.fechaCompra = dto.fechaCompra;
    }
    if (dto.valorCompra !== undefined) {
      activo.valorCompra = Number(dto.valorCompra);
    }
    if (dto.valorResidual !== undefined) {
      activo.valorResidual = Number(dto.valorResidual);
    }
    if (dto.proximoMantenimiento !== undefined) {
      activo.proximoMantenimiento = dto.proximoMantenimiento ?? null;
    }
    if (dto.garantiaHasta !== undefined) {
      activo.garantiaHasta = dto.garantiaHasta ?? null;
    }
    if (dto.foto !== undefined) {
      activo.foto = dto.foto?.trim() || null;
    }

    if (Number(activo.valorResidual) > Number(activo.valorCompra)) {
      throw new BadRequestException('El valor residual no puede ser mayor al valor de compra');
    }

    await this.activosRepository.save(activo);
    return this.findOne(id);
  }

  async remove(id: string): Promise<{ ok: true }> {
    const activo = await this.findOne(id);
    await this.activosRepository.remove(activo);
    return { ok: true };
  }

  async calcularDepreciacionMes(activoId: string, mes: number, anio: number) {
    if (mes < 1 || mes > 12) {
      throw new BadRequestException('El mes debe estar entre 1 y 12');
    }

    const activo = await this.findOne(activoId);
    const categoria = await this.categoriasRepository.findOne({
      where: { id: activo.categoriaId },
    });
    if (!categoria) {
      throw new NotFoundException('Categoria de activo no encontrada');
    }

    const existente = await this.depreciacionesRepository.findOne({
      where: { activoId, anio, mes },
    });
    if (existente) {
      throw new ConflictException('La depreciacion para este periodo ya fue registrada');
    }

    const valorCompra = Number(activo.valorCompra);
    const valorResidual = Number(activo.valorResidual);
    const valorActual = Number(activo.valorActual);
    const baseDepreciable = Math.max(0, valorCompra - valorResidual);

    let montoDepreciacion = 0;
    if (baseDepreciable > 0) {
      if (categoria.metodoDep === MetodoDepreciacionActivo.REDUCCION_SALDOS) {
        const tasaMensual = 2 / (Math.max(1, categoria.vidaUtilAnios) * 12);
        montoDepreciacion = valorActual * tasaMensual;
      } else {
        montoDepreciacion = baseDepreciable / (Math.max(1, categoria.vidaUtilAnios) * 12);
      }
    }

    montoDepreciacion = Number(montoDepreciacion.toFixed(2));
    const valorLibros = Number(Math.max(valorResidual, valorActual - montoDepreciacion).toFixed(2));

    const depreciacion = this.depreciacionesRepository.create({
      activoId,
      anio,
      mes,
      montoDepreciacion,
      valorLibros,
    });

    await this.depreciacionesRepository.save(depreciacion);
    activo.valorActual = valorLibros;
    await this.activosRepository.save(activo);

    return depreciacion;
  }

  async trasladar(
    activoId: string,
    sedeDestinoId: string,
    custodioDestinoId: string,
    descripcion: string,
    realizadoPorId: string,
  ) {
    const activo = await this.findOne(activoId);
    const sedeOrigenId = activo.sedeId;

    activo.sedeId = sedeDestinoId;
    activo.custodioId = custodioDestinoId;
    await this.activosRepository.save(activo);

    const movimiento = this.movimientosRepository.create({
      activoId,
      tipo: TipoMovimientoActivo.TRASLADO,
      descripcion: descripcion.trim(),
      sedeOrigenId,
      sedeDestinoId,
      costo: null,
      fecha: new Date(),
      realizadoPorId,
    });
    await this.movimientosRepository.save(movimiento);

    return this.findOne(activoId);
  }

  async darDeBaja(activoId: string, motivo: string, realizadoPorId: string) {
    const activo = await this.findOne(activoId);
    activo.estado = EstadoActivo.DADO_DE_BAJA;
    await this.activosRepository.save(activo);

    const movimiento = this.movimientosRepository.create({
      activoId,
      tipo: TipoMovimientoActivo.BAJA,
      descripcion: motivo.trim(),
      sedeOrigenId: activo.sedeId,
      sedeDestinoId: null,
      costo: null,
      fecha: new Date(),
      realizadoPorId,
    });
    await this.movimientosRepository.save(movimiento);

    return this.findOne(activoId);
  }

  async getProximosMantenimientos(dias = 30) {
    const rrhhExiste = await this.rrhhTableExists();
    const tope = new Date();
    tope.setDate(tope.getDate() + dias);

    const fin = tope.toISOString().slice(0, 10);

    const qb = this.activosRepository
      .createQueryBuilder('activo')
      .leftJoinAndSelect('activo.categoria', 'categoria')
      .leftJoinAndSelect('activo.sede', 'sede')
      .where('activo.estado = :estado', { estado: EstadoActivo.ACTIVO })
      .andWhere('activo.proximoMantenimiento IS NOT NULL')
      .andWhere('activo.proximoMantenimiento <= :fin', { fin })
      .orderBy('activo.proximoMantenimiento', 'ASC');

    if (rrhhExiste) {
      qb.leftJoinAndSelect('activo.custodio', 'custodio');
    }

    return qb.getMany();
  }

  async getReporteValorizacion() {
    const rows = await this.activosRepository
      .createQueryBuilder('activo')
      .innerJoin('activo.categoria', 'categoria')
      .select('categoria.id', 'categoriaId')
      .addSelect('categoria.nombre', 'categoriaNombre')
      .addSelect('COUNT(activo.id)', 'cantidadActivos')
      .addSelect('COALESCE(SUM(activo.valorCompra), 0)', 'valorCompraTotal')
      .addSelect(
        'COALESCE(SUM(activo.valorCompra - activo.valorActual), 0)',
        'depreciacionAcumulada',
      )
      .addSelect('COALESCE(SUM(activo.valorActual), 0)', 'valorActualTotal')
      .groupBy('categoria.id')
      .addGroupBy('categoria.nombre')
      .orderBy('categoria.nombre', 'ASC')
      .getRawMany<{
        categoriaId: string;
        categoriaNombre: string;
        cantidadActivos: string;
        valorCompraTotal: string;
        depreciacionAcumulada: string;
        valorActualTotal: string;
      }>();

    return rows.map((row) => ({
      categoriaId: row.categoriaId,
      categoriaNombre: row.categoriaNombre,
      cantidadActivos: Number(row.cantidadActivos),
      valorCompraTotal: Number(row.valorCompraTotal),
      depreciacionAcumulada: Number(row.depreciacionAcumulada),
      valorActualTotal: Number(row.valorActualTotal),
    }));
  }

  async getHistorial(id: string) {
    await this.findOne(id);
    return this.movimientosRepository.find({
      where: { activoId: id },
      relations: { sedeOrigen: true, sedeDestino: true, realizadoPor: true },
      order: { fecha: 'DESC' },
    });
  }

  async getEmpleadosDisponibles(page = 1, limit = 200) {
    const rrhhExiste = await this.rrhhTableExists();
    if (!rrhhExiste) {
      return {
        items: [],
        total: 0,
        page,
        limit,
        totalPages: 1,
      };
    }

    const offset = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.activosRepository.query(
        `
          SELECT e.id, e.nombre, e.apellido
          FROM rrhh_empleados e
          ORDER BY e.nombre ASC
          LIMIT $1 OFFSET $2
        `,
        [limit, offset],
      ),
      this.activosRepository.query('SELECT COUNT(*)::int AS total FROM rrhh_empleados'),
    ]);

    const totalCount = Number(total?.[0]?.total ?? 0);

    return {
      items,
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
    };
  }

  private async generarCodigo(): Promise<string> {
    const last = await this.activosRepository
      .createQueryBuilder('activo')
      .select('activo.codigo', 'codigo')
      .where("activo.codigo LIKE 'ACT-%'")
      .orderBy('activo.codigo', 'DESC')
      .limit(1)
      .getRawOne<{ codigo?: string }>();

    const lastNumber = Number((last?.codigo ?? 'ACT-0000').split('-')[1] ?? '0');
    return `ACT-${String(lastNumber + 1).padStart(4, '0')}`;
  }

  private async rrhhTableExists(): Promise<boolean> {
    const result = await this.activosRepository.query(
      "SELECT to_regclass('public.rrhh_empleados') AS table_name",
    );
    return Boolean(result?.[0]?.table_name);
  }
}
