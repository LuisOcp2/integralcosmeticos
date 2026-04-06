import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { ActividadCRM, TipoActividadCRM } from '../actividades/entities/actividad-crm.entity';
import { CrearOportunidadDto } from './dto/crear-oportunidad.dto';
import { EtapaOportunidad, Oportunidad } from './entities/oportunidad.entity';

type FiltrosOportunidad = {
  q?: string;
  etapa?: EtapaOportunidad;
  asignadoAId?: string;
  leadId?: string;
  clienteId?: string;
  page?: number;
  limit?: number;
};

@Injectable()
export class OportunidadesService {
  constructor(
    @InjectRepository(Oportunidad)
    private readonly oportunidadesRepository: Repository<Oportunidad>,
    @InjectRepository(ActividadCRM)
    private readonly actividadesRepository: Repository<ActividadCRM>,
  ) {}

  async findAll(filtros: FiltrosOportunidad) {
    const page = filtros.page ?? 1;
    const limit = filtros.limit ?? 20;
    const offset = (page - 1) * limit;

    const qb = this.oportunidadesRepository
      .createQueryBuilder('oportunidad')
      .leftJoinAndSelect('oportunidad.lead', 'lead')
      .leftJoinAndSelect('oportunidad.cliente', 'cliente')
      .leftJoinAndSelect('oportunidad.asignadoA', 'asignadoA')
      .orderBy('oportunidad.updatedAt', 'DESC');

    if (filtros.q?.trim()) {
      const term = `%${filtros.q.trim().toLowerCase()}%`;
      qb.andWhere(
        new Brackets((subQb) => {
          subQb
            .where('LOWER(oportunidad.titulo) LIKE :term', { term })
            .orWhere("LOWER(COALESCE(oportunidad.descripcion, '')) LIKE :term", { term })
            .orWhere("LOWER(COALESCE(lead.nombre, '')) LIKE :term", { term })
            .orWhere("LOWER(COALESCE(cliente.nombre, '')) LIKE :term", { term });
        }),
      );
    }

    if (filtros.etapa) {
      qb.andWhere('oportunidad.etapa = :etapa', { etapa: filtros.etapa });
    }
    if (filtros.asignadoAId) {
      qb.andWhere('oportunidad.asignadoAId = :asignadoAId', { asignadoAId: filtros.asignadoAId });
    }
    if (filtros.leadId) {
      qb.andWhere('oportunidad.leadId = :leadId', { leadId: filtros.leadId });
    }
    if (filtros.clienteId) {
      qb.andWhere('oportunidad.clienteId = :clienteId', { clienteId: filtros.clienteId });
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

  async findOne(id: string): Promise<Oportunidad> {
    const oportunidad = await this.oportunidadesRepository.findOne({
      where: { id },
      relations: {
        lead: true,
        cliente: true,
        asignadoA: true,
      },
    });

    if (!oportunidad) {
      throw new NotFoundException('Oportunidad no encontrada');
    }

    return oportunidad;
  }

  async create(dto: CrearOportunidadDto, userId: string): Promise<Oportunidad> {
    const oportunidad = this.oportunidadesRepository.create({
      ...dto,
      etapa: dto.etapa ?? EtapaOportunidad.PROSPECTO,
      titulo: dto.titulo.trim(),
      descripcion: dto.descripcion?.trim() || null,
      motivoPerdida: dto.motivoPerdida?.trim() || null,
      fechaCierreEsperada: new Date(dto.fechaCierreEsperada),
      fechaCierreReal: dto.fechaCierreReal ? new Date(dto.fechaCierreReal) : null,
      creadoPorId: userId,
    });

    return this.oportunidadesRepository.save(oportunidad);
  }

  async update(id: string, dto: Partial<CrearOportunidadDto>): Promise<Oportunidad> {
    const oportunidad = await this.findOne(id);

    if (dto.titulo !== undefined) {
      oportunidad.titulo = dto.titulo.trim();
    }
    if (dto.leadId !== undefined) {
      oportunidad.leadId = dto.leadId;
    }
    if (dto.clienteId !== undefined) {
      oportunidad.clienteId = dto.clienteId;
    }
    if (dto.etapa !== undefined) {
      oportunidad.etapa = dto.etapa;
    }
    if (dto.valor !== undefined) {
      oportunidad.valor = dto.valor;
    }
    if (dto.probabilidad !== undefined) {
      oportunidad.probabilidad = dto.probabilidad;
    }
    if (dto.fechaCierreEsperada !== undefined) {
      oportunidad.fechaCierreEsperada = new Date(dto.fechaCierreEsperada);
    }
    if (dto.fechaCierreReal !== undefined) {
      oportunidad.fechaCierreReal = dto.fechaCierreReal ? new Date(dto.fechaCierreReal) : null;
    }
    if (dto.asignadoAId !== undefined) {
      oportunidad.asignadoAId = dto.asignadoAId;
    }
    if (dto.descripcion !== undefined) {
      oportunidad.descripcion = dto.descripcion?.trim() || null;
    }
    if (dto.motivoPerdida !== undefined) {
      oportunidad.motivoPerdida = dto.motivoPerdida?.trim() || null;
    }

    return this.oportunidadesRepository.save(oportunidad);
  }

  async remove(id: string): Promise<Oportunidad> {
    const oportunidad = await this.findOne(id);
    return this.oportunidadesRepository.remove(oportunidad);
  }

  async cambiarEtapa(id: string, etapa: EtapaOportunidad, nota?: string): Promise<Oportunidad> {
    const oportunidad = await this.findOne(id);
    oportunidad.etapa = etapa;

    if (etapa === EtapaOportunidad.GANADA || etapa === EtapaOportunidad.PERDIDA) {
      oportunidad.fechaCierreReal = new Date();
    }

    if (etapa === EtapaOportunidad.PERDIDA && nota) {
      oportunidad.motivoPerdida = nota.trim();
    }

    const oportunidadActualizada = await this.oportunidadesRepository.save(oportunidad);

    const actividad = this.actividadesRepository.create({
      tipo: TipoActividadCRM.NOTA,
      oportunidadId: oportunidad.id,
      leadId: oportunidad.leadId ?? null,
      clienteId: oportunidad.clienteId ?? null,
      asunto: `Cambio de etapa a ${etapa}`,
      descripcion: nota?.trim() || null,
      resultado: `Etapa actual: ${etapa}`,
      fecha: new Date(),
      completada: true,
      realizadoPorId: oportunidad.asignadoAId,
    });

    await this.actividadesRepository.save(actividad);

    return oportunidadActualizada;
  }
}
