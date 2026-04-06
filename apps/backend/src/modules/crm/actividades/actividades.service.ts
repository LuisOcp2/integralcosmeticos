import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, LessThanOrEqual, Repository } from 'typeorm';
import { CrearActividadDto } from './dto/crear-actividad.dto';
import { ActividadCRM } from './entities/actividad-crm.entity';

type FiltrosActividad = {
  q?: string;
  tipo?: string;
  completada?: boolean;
  leadId?: string;
  oportunidadId?: string;
  clienteId?: string;
  realizadoPorId?: string;
  page?: number;
  limit?: number;
};

@Injectable()
export class ActividadesService {
  constructor(
    @InjectRepository(ActividadCRM)
    private readonly actividadesRepository: Repository<ActividadCRM>,
  ) {}

  async findAll(filtros: FiltrosActividad) {
    const page = filtros.page ?? 1;
    const limit = filtros.limit ?? 20;
    const offset = (page - 1) * limit;

    const qb = this.actividadesRepository
      .createQueryBuilder('actividad')
      .leftJoinAndSelect('actividad.realizadoPor', 'realizadoPor')
      .leftJoinAndSelect('actividad.lead', 'lead')
      .leftJoinAndSelect('actividad.oportunidad', 'oportunidad')
      .leftJoinAndSelect('actividad.cliente', 'cliente')
      .orderBy('actividad.fecha', 'DESC');

    if (filtros.q?.trim()) {
      const term = `%${filtros.q.trim().toLowerCase()}%`;
      qb.andWhere(
        new Brackets((subQb) => {
          subQb
            .where('LOWER(actividad.asunto) LIKE :term', { term })
            .orWhere("LOWER(COALESCE(actividad.descripcion, '')) LIKE :term", { term })
            .orWhere("LOWER(COALESCE(actividad.resultado, '')) LIKE :term", { term });
        }),
      );
    }

    if (filtros.tipo) {
      qb.andWhere('actividad.tipo = :tipo', { tipo: filtros.tipo });
    }
    if (filtros.completada !== undefined) {
      qb.andWhere('actividad.completada = :completada', { completada: filtros.completada });
    }
    if (filtros.leadId) {
      qb.andWhere('actividad.leadId = :leadId', { leadId: filtros.leadId });
    }
    if (filtros.oportunidadId) {
      qb.andWhere('actividad.oportunidadId = :oportunidadId', {
        oportunidadId: filtros.oportunidadId,
      });
    }
    if (filtros.clienteId) {
      qb.andWhere('actividad.clienteId = :clienteId', { clienteId: filtros.clienteId });
    }
    if (filtros.realizadoPorId) {
      qb.andWhere('actividad.realizadoPorId = :realizadoPorId', {
        realizadoPorId: filtros.realizadoPorId,
      });
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

  async create(dto: CrearActividadDto, userId: string): Promise<ActividadCRM> {
    const actividad = this.actividadesRepository.create({
      ...dto,
      asunto: dto.asunto.trim(),
      descripcion: dto.descripcion?.trim() || null,
      resultado: dto.resultado?.trim() || null,
      proximaAccion: dto.proximaAccion?.trim() || null,
      fecha: new Date(dto.fecha),
      fechaProximaAccion: dto.fechaProximaAccion ? new Date(dto.fechaProximaAccion) : null,
      realizadoPorId: dto.realizadoPorId ?? userId,
      completada: dto.completada ?? false,
    });

    return this.actividadesRepository.save(actividad);
  }

  async completar(id: string, resultado?: string): Promise<ActividadCRM> {
    const actividad = await this.actividadesRepository.findOne({ where: { id } });
    if (!actividad) {
      throw new NotFoundException('Actividad CRM no encontrada');
    }

    actividad.completada = true;
    if (resultado !== undefined) {
      actividad.resultado = resultado?.trim() || null;
    }

    return this.actividadesRepository.save(actividad);
  }

  async getPendientes() {
    const hoyMasTres = new Date();
    hoyMasTres.setDate(hoyMasTres.getDate() + 3);

    return this.actividadesRepository.find({
      where: {
        completada: false,
        fechaProximaAccion: LessThanOrEqual(hoyMasTres),
      },
      relations: {
        realizadoPor: true,
        lead: true,
        oportunidad: true,
        cliente: true,
      },
      order: {
        fechaProximaAccion: 'ASC',
      },
    });
  }
}
