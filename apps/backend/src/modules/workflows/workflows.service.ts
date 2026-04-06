import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Workflow } from './entities/workflow.entity';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { WorkflowQueryDto } from './dto/workflow-query.dto';
import { WorkflowEngineService } from './workflow-engine.service';

@Injectable()
export class WorkflowsService {
  constructor(
    @InjectRepository(Workflow)
    private readonly workflowsRepository: Repository<Workflow>,
    private readonly workflowEngine: WorkflowEngineService,
  ) {}

  async create(dto: CreateWorkflowDto, creadoPorId: string) {
    return this.workflowsRepository.save(
      this.workflowsRepository.create({
        nombre: dto.nombre.trim(),
        activo: dto.activo ?? true,
        creadoPorId,
        trigger: dto.trigger,
        pasos: dto.pasos,
        estadisticas: {
          ejecuciones: 0,
          exitosas: 0,
          fallidas: 0,
          ultimaEjecucion: null,
        },
      }),
    );
  }

  async findAll(query: WorkflowQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const qb = this.workflowsRepository
      .createQueryBuilder('workflow')
      .orderBy('workflow.createdAt', 'DESC');

    if (query.q?.trim()) {
      const term = `%${query.q.trim().toLowerCase()}%`;
      qb.andWhere(
        new Brackets((subQb) => {
          subQb.where('LOWER(workflow.nombre) LIKE :term', { term });
        }),
      );
    }

    if (query.activo !== undefined) {
      qb.andWhere('workflow.activo = :activo', { activo: query.activo });
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

  async findOne(id: string) {
    const workflow = await this.workflowsRepository.findOne({ where: { id } });
    if (!workflow) {
      throw new NotFoundException('Workflow no encontrado');
    }
    return workflow;
  }

  async update(id: string, dto: UpdateWorkflowDto) {
    const workflow = await this.findOne(id);

    if (dto.nombre !== undefined) {
      workflow.nombre = dto.nombre.trim();
    }
    if (dto.activo !== undefined) {
      workflow.activo = dto.activo;
    }
    if (dto.trigger !== undefined) {
      workflow.trigger = dto.trigger;
    }
    if (dto.pasos !== undefined) {
      workflow.pasos = dto.pasos;
    }

    return this.workflowsRepository.save(workflow);
  }

  async remove(id: string) {
    const workflow = await this.findOne(id);
    await this.workflowsRepository.remove(workflow);
    return { ok: true };
  }

  async ejecutarPrueba(id: string, contexto: Record<string, unknown>) {
    return this.workflowEngine.ejecutarWorkflow(id, contexto);
  }

  async getHistorial(id: string, page = 1, limit = 20) {
    await this.findOne(id);
    return this.workflowEngine.getHistorial(id, page, limit);
  }

  async getEstadisticas(id: string) {
    const workflow = await this.findOne(id);
    return workflow.estadisticas;
  }
}
