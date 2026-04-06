import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proyecto } from './entities/proyecto.entity';
import { Tarea, EstadoTarea } from './entities/tarea.entity';
import { ComentarioTarea } from './entities/comentario-tarea.entity';
import { CreateProyectoDto } from './dto/create-proyecto.dto';
import { UpdateProyectoDto } from './dto/update-proyecto.dto';
import { ProyectosQueryDto } from './dto/proyectos-query.dto';
import { CreateTareaDto } from './dto/create-tarea.dto';
import { UpdateTareaDto } from './dto/update-tarea.dto';

@Injectable()
export class ProyectosService {
  constructor(
    @InjectRepository(Proyecto)
    private readonly proyectosRepository: Repository<Proyecto>,
    @InjectRepository(Tarea)
    private readonly tareasRepository: Repository<Tarea>,
    @InjectRepository(ComentarioTarea)
    private readonly comentariosRepository: Repository<ComentarioTarea>,
  ) {}

  async create(dto: CreateProyectoDto): Promise<Proyecto> {
    const codigo = await this.generarCodigo();
    const proyecto = this.proyectosRepository.create({
      codigo,
      nombre: dto.nombre.trim(),
      tipo: dto.tipo,
      estado: dto.estado,
      responsableId: dto.responsableId,
      clienteId: dto.clienteId ?? null,
      fechaInicio: dto.fechaInicio,
      fechaFinEsperada: dto.fechaFinEsperada,
      fechaFinReal: dto.fechaFinReal ?? null,
      presupuesto: dto.presupuesto ?? null,
      costoActual: dto.costoActual ?? 0,
      prioridad: dto.prioridad,
      porcentajeAvance: dto.porcentajeAvance ?? 0,
    });

    const saved = await this.proyectosRepository.save(proyecto);
    return this.findOne(saved.id);
  }

  async findAll(query: ProyectosQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const qb = this.proyectosRepository
      .createQueryBuilder('proyecto')
      .leftJoinAndSelect('proyecto.cliente', 'cliente')
      .orderBy('proyecto.createdAt', 'DESC');

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

  async findOne(id: string): Promise<Proyecto> {
    const proyecto = await this.proyectosRepository.findOne({
      where: { id },
      relations: { cliente: true },
    });

    if (!proyecto) {
      throw new NotFoundException('Proyecto no encontrado');
    }

    return proyecto;
  }

  async update(id: string, dto: UpdateProyectoDto): Promise<Proyecto> {
    const proyecto = await this.findOne(id);

    if (dto.nombre !== undefined) proyecto.nombre = dto.nombre.trim();
    if (dto.tipo !== undefined) proyecto.tipo = dto.tipo;
    if (dto.estado !== undefined) proyecto.estado = dto.estado;
    if (dto.responsableId !== undefined) proyecto.responsableId = dto.responsableId;
    if (dto.clienteId !== undefined) proyecto.clienteId = dto.clienteId ?? null;
    if (dto.fechaInicio !== undefined) proyecto.fechaInicio = dto.fechaInicio;
    if (dto.fechaFinEsperada !== undefined) proyecto.fechaFinEsperada = dto.fechaFinEsperada;
    if (dto.fechaFinReal !== undefined) proyecto.fechaFinReal = dto.fechaFinReal ?? null;
    if (dto.presupuesto !== undefined) proyecto.presupuesto = dto.presupuesto ?? null;
    if (dto.costoActual !== undefined) proyecto.costoActual = dto.costoActual;
    if (dto.prioridad !== undefined) proyecto.prioridad = dto.prioridad;
    if (dto.porcentajeAvance !== undefined) proyecto.porcentajeAvance = dto.porcentajeAvance;

    await this.proyectosRepository.save(proyecto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<{ ok: true }> {
    const proyecto = await this.findOne(id);
    await this.proyectosRepository.remove(proyecto);
    return { ok: true };
  }

  async calcularAvance(proyectoId: string) {
    await this.findOne(proyectoId);

    const total = await this.tareasRepository.count({ where: { proyectoId } });
    const completadas = await this.tareasRepository.count({
      where: { proyectoId, estado: EstadoTarea.COMPLETADA },
    });
    const porcentaje = total > 0 ? Math.round((completadas / total) * 100) : 0;

    await this.proyectosRepository.update({ id: proyectoId }, { porcentajeAvance: porcentaje });

    return {
      proyectoId,
      totalTareas: total,
      tareasCompletadas: completadas,
      porcentajeAvance: porcentaje,
    };
  }

  async getKanban(proyectoId: string) {
    await this.findOne(proyectoId);

    const rows = await this.tareasRepository
      .createQueryBuilder('tarea')
      .select('tarea.estado', 'estado')
      .addSelect('COUNT(tarea.id)', 'count')
      .addSelect('COALESCE(SUM(tarea.estimacionHoras), 0)', 'horasEstimadas')
      .where('tarea.proyectoId = :proyectoId', { proyectoId })
      .groupBy('tarea.estado')
      .getRawMany<{ estado: EstadoTarea; count: string; horasEstimadas: string }>();

    const map: Record<EstadoTarea, { count: number; horasEstimadas: number; items: Tarea[] }> = {
      [EstadoTarea.PENDIENTE]: { count: 0, horasEstimadas: 0, items: [] },
      [EstadoTarea.EN_PROGRESO]: { count: 0, horasEstimadas: 0, items: [] },
      [EstadoTarea.REVISION]: { count: 0, horasEstimadas: 0, items: [] },
      [EstadoTarea.COMPLETADA]: { count: 0, horasEstimadas: 0, items: [] },
      [EstadoTarea.CANCELADA]: { count: 0, horasEstimadas: 0, items: [] },
    };

    const tareas = await this.tareasRepository.find({
      where: { proyectoId },
      order: { orden: 'ASC', createdAt: 'ASC' },
    });

    rows.forEach((row) => {
      map[row.estado].count = Number(row.count);
      map[row.estado].horasEstimadas = Number(row.horasEstimadas);
    });

    tareas.forEach((tarea) => {
      map[tarea.estado].items.push(tarea);
    });

    return map;
  }

  async getMisTareas(userId: string) {
    const rrhhExiste = await this.rrhhTableExists();

    const qb = this.tareasRepository
      .createQueryBuilder('tarea')
      .leftJoinAndSelect('tarea.proyecto', 'proyecto')
      .orderBy('tarea.fechaVencimiento', 'ASC', 'NULLS LAST')
      .addOrderBy('tarea.createdAt', 'DESC');

    if (rrhhExiste) {
      qb.leftJoinAndSelect('tarea.asignadoA', 'asignadoA').where('asignadoA.usuarioId = :userId', {
        userId,
      });
    } else {
      qb.where('tarea.creadoPorId = :userId', { userId });
    }

    return qb.getMany();
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
      this.proyectosRepository.query(
        `
          SELECT e.id, e.nombre, e.apellido
          FROM rrhh_empleados e
          ORDER BY e.nombre ASC
          LIMIT $1 OFFSET $2
        `,
        [limit, offset],
      ),
      this.proyectosRepository.query('SELECT COUNT(*)::int AS total FROM rrhh_empleados'),
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

  async createTarea(proyectoId: string, dto: CreateTareaDto, creadoPorId: string) {
    await this.findOne(proyectoId);

    if (dto.parentId) {
      const parent = await this.tareasRepository.findOne({
        where: { id: dto.parentId, proyectoId },
      });
      if (!parent) {
        throw new BadRequestException('La tarea padre no pertenece al proyecto');
      }
    }

    const tarea = this.tareasRepository.create({
      proyectoId,
      parentId: dto.parentId ?? null,
      titulo: dto.titulo.trim(),
      estado: dto.estado,
      prioridad: dto.prioridad,
      asignadoAId: dto.asignadoAId,
      creadoPorId,
      fechaVencimiento: dto.fechaVencimiento ?? null,
      estimacionHoras: dto.estimacionHoras ?? null,
      horasReales: 0,
      orden: dto.orden ?? 0,
      completadaEn: null,
    });

    const saved = await this.tareasRepository.save(tarea);
    await this.calcularAvance(proyectoId);

    return this.findTarea(proyectoId, saved.id);
  }

  async findTareas(proyectoId: string) {
    await this.findOne(proyectoId);
    return this.tareasRepository.find({
      where: { proyectoId },
      relations: { subtareas: true, comentarios: true },
      order: { orden: 'ASC', createdAt: 'ASC' },
    });
  }

  async findTarea(proyectoId: string, tareaId: string) {
    await this.findOne(proyectoId);
    const tarea = await this.tareasRepository.findOne({
      where: { id: tareaId, proyectoId },
      relations: {
        subtareas: true,
        comentarios: { autor: true },
        creadoPor: true,
      },
    });
    if (!tarea) {
      throw new NotFoundException('Tarea no encontrada');
    }
    return tarea;
  }

  async updateTarea(proyectoId: string, tareaId: string, dto: UpdateTareaDto) {
    const tarea = await this.findTarea(proyectoId, tareaId);

    if (dto.parentId !== undefined) {
      if (dto.parentId === tarea.id) {
        throw new ConflictException('Una tarea no puede ser padre de si misma');
      }
      if (dto.parentId) {
        const parent = await this.tareasRepository.findOne({
          where: { id: dto.parentId, proyectoId },
        });
        if (!parent) {
          throw new BadRequestException('La tarea padre no pertenece al proyecto');
        }
      }
      tarea.parentId = dto.parentId ?? null;
    }

    if (dto.titulo !== undefined) tarea.titulo = dto.titulo.trim();
    if (dto.estado !== undefined) tarea.estado = dto.estado;
    if (dto.prioridad !== undefined) tarea.prioridad = dto.prioridad;
    if (dto.asignadoAId !== undefined) tarea.asignadoAId = dto.asignadoAId;
    if (dto.fechaVencimiento !== undefined) tarea.fechaVencimiento = dto.fechaVencimiento ?? null;
    if (dto.estimacionHoras !== undefined) tarea.estimacionHoras = dto.estimacionHoras ?? null;
    if (dto.orden !== undefined) tarea.orden = dto.orden;

    if (dto.estado !== undefined) {
      tarea.completadaEn = dto.estado === EstadoTarea.COMPLETADA ? new Date() : null;
    }

    await this.tareasRepository.save(tarea);
    await this.calcularAvance(proyectoId);
    return this.findTarea(proyectoId, tareaId);
  }

  async deleteTarea(proyectoId: string, tareaId: string) {
    const tarea = await this.findTarea(proyectoId, tareaId);
    await this.tareasRepository.remove(tarea);
    await this.calcularAvance(proyectoId);
    return { ok: true };
  }

  async cambiarEstadoTarea(proyectoId: string, tareaId: string, estado: EstadoTarea) {
    const tarea = await this.findTarea(proyectoId, tareaId);
    tarea.estado = estado;
    tarea.completadaEn = estado === EstadoTarea.COMPLETADA ? new Date() : null;

    await this.tareasRepository.save(tarea);
    await this.calcularAvance(proyectoId);
    return this.findTarea(proyectoId, tareaId);
  }

  async registrarHoras(proyectoId: string, tareaId: string, horas: number) {
    const tarea = await this.findTarea(proyectoId, tareaId);
    tarea.horasReales = Number((Number(tarea.horasReales) + Number(horas)).toFixed(2));
    await this.tareasRepository.save(tarea);
    return this.findTarea(proyectoId, tareaId);
  }

  async addComentario(proyectoId: string, tareaId: string, texto: string, autorId: string) {
    await this.findTarea(proyectoId, tareaId);
    const comentario = this.comentariosRepository.create({
      tareaId,
      autorId,
      texto: texto.trim(),
    });
    return this.comentariosRepository.save(comentario);
  }

  private async generarCodigo(): Promise<string> {
    const last = await this.proyectosRepository
      .createQueryBuilder('proyecto')
      .select('proyecto.codigo', 'codigo')
      .where("proyecto.codigo LIKE 'PRY-%'")
      .orderBy('proyecto.codigo', 'DESC')
      .limit(1)
      .getRawOne<{ codigo?: string }>();

    const lastNumber = Number((last?.codigo ?? 'PRY-000').split('-')[1] ?? '0');
    return `PRY-${String(lastNumber + 1).padStart(3, '0')}`;
  }

  private async rrhhTableExists(): Promise<boolean> {
    const result = await this.proyectosRepository.query(
      "SELECT to_regclass('public.rrhh_empleados') AS table_name",
    );
    return Boolean(result?.[0]?.table_name);
  }
}
