import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { TipoDocumento } from '@cosmeticos/shared-types';
import { ClientesService } from '../../clientes/clientes.service';
import { Oportunidad, EtapaOportunidad } from '../oportunidades/entities/oportunidad.entity';
import { CrearLeadDto } from './dto/crear-lead.dto';
import { ActualizarLeadDto } from './dto/actualizar-lead.dto';
import { FiltrosLeadDto } from './dto/filtros-lead.dto';
import { EstadoLead, Lead } from './entities/lead.entity';

type KanbanEtapa = {
  items: Oportunidad[];
  total: number;
};

type KanbanOportunidades = Record<EtapaOportunidad, KanbanEtapa>;

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private readonly leadsRepository: Repository<Lead>,
    @InjectRepository(Oportunidad)
    private readonly oportunidadesRepository: Repository<Oportunidad>,
    private readonly clientesService: ClientesService,
  ) {}

  async findAll(filtros: FiltrosLeadDto) {
    const page = filtros.page ?? 1;
    const limit = filtros.limit ?? 20;
    const offset = (page - 1) * limit;

    const qb = this.leadsRepository
      .createQueryBuilder('lead')
      .leftJoinAndSelect('lead.asignadoA', 'asignadoA')
      .leftJoinAndSelect('lead.convertidoACliente', 'convertidoACliente')
      .orderBy('lead.createdAt', 'DESC');

    if (filtros.q?.trim()) {
      const term = `%${filtros.q.trim().toLowerCase()}%`;
      qb.andWhere(
        new Brackets((subQb) => {
          subQb
            .where('LOWER(lead.nombre) LIKE :term', { term })
            .orWhere("LOWER(COALESCE(lead.empresa, '')) LIKE :term", { term })
            .orWhere("LOWER(COALESCE(lead.email, '')) LIKE :term", { term })
            .orWhere("LOWER(COALESCE(lead.telefono, '')) LIKE :term", { term });
        }),
      );
    }

    if (filtros.estado) {
      qb.andWhere('lead.estado = :estado', { estado: filtros.estado });
    }

    if (filtros.origen) {
      qb.andWhere('lead.origen = :origen', { origen: filtros.origen });
    }

    if (filtros.asignadoAId) {
      qb.andWhere('lead.asignadoAId = :asignadoAId', { asignadoAId: filtros.asignadoAId });
    }

    if (filtros.sedeId) {
      qb.andWhere('lead.sedeId = :sedeId', { sedeId: filtros.sedeId });
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

  async findOne(id: string): Promise<Lead> {
    const lead = await this.leadsRepository.findOne({
      where: { id },
      relations: {
        asignadoA: true,
        convertidoACliente: true,
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead no encontrado');
    }

    return lead;
  }

  async create(dto: CrearLeadDto, userId: string): Promise<Lead> {
    const lead = this.leadsRepository.create({
      ...dto,
      estado: dto.estado ?? EstadoLead.NUEVO,
      empresa: dto.empresa?.trim() || null,
      email: dto.email?.trim().toLowerCase() || null,
      telefono: dto.telefono?.trim() || null,
      notas: dto.notas?.trim() || null,
      motivoPerdida: dto.motivoPerdida?.trim() || null,
      fechaProximoContacto: dto.fechaProximoContacto ? new Date(dto.fechaProximoContacto) : null,
      creadoPorId: userId,
    });

    return this.leadsRepository.save(lead);
  }

  async update(id: string, dto: ActualizarLeadDto): Promise<Lead> {
    const lead = await this.findOne(id);

    if (dto.nombre !== undefined) {
      lead.nombre = dto.nombre.trim();
    }
    if (dto.empresa !== undefined) {
      lead.empresa = dto.empresa?.trim() || null;
    }
    if (dto.email !== undefined) {
      lead.email = dto.email?.trim().toLowerCase() || null;
    }
    if (dto.telefono !== undefined) {
      lead.telefono = dto.telefono?.trim() || null;
    }
    if (dto.origen !== undefined) {
      lead.origen = dto.origen;
    }
    if (dto.estado !== undefined) {
      lead.estado = dto.estado;
      if (dto.estado === EstadoLead.GANADO || dto.estado === EstadoLead.PERDIDO) {
        lead.ultimoContacto = new Date();
      }
    }
    if (dto.valorEstimado !== undefined) {
      lead.valorEstimado = dto.valorEstimado;
    }
    if (dto.probabilidad !== undefined) {
      lead.probabilidad = dto.probabilidad;
    }
    if (dto.asignadoAId !== undefined) {
      lead.asignadoAId = dto.asignadoAId;
    }
    if (dto.sedeId !== undefined) {
      lead.sedeId = dto.sedeId;
    }
    if (dto.notas !== undefined) {
      lead.notas = dto.notas?.trim() || null;
    }
    if (dto.motivoPerdida !== undefined) {
      lead.motivoPerdida = dto.motivoPerdida?.trim() || null;
    }
    if (dto.fechaProximoContacto !== undefined) {
      lead.fechaProximoContacto = dto.fechaProximoContacto
        ? new Date(dto.fechaProximoContacto)
        : null;
    }

    return this.leadsRepository.save(lead);
  }

  async remove(id: string): Promise<Lead> {
    const lead = await this.findOne(id);
    return this.leadsRepository.remove(lead);
  }

  async convertirACliente(leadId: string): Promise<{ lead: Lead; clienteId: string }> {
    const lead = await this.findOne(leadId);

    if (lead.convertidoAClienteId) {
      return {
        lead,
        clienteId: lead.convertidoAClienteId,
      };
    }

    const numeroDocumento = `LD${Date.now()}${Math.floor(Math.random() * 10)}`.slice(0, 20);

    const cliente = await this.clientesService.create({
      tipoDocumento: TipoDocumento.CC,
      numeroDocumento,
      nombre: lead.nombre,
      email: lead.email ?? undefined,
      telefono: lead.telefono ?? undefined,
      notas: lead.notas ?? undefined,
      sedeRegistroId: lead.sedeId,
    });

    lead.convertidoAClienteId = cliente.id;
    lead.estado = EstadoLead.GANADO;
    lead.ultimoContacto = new Date();

    const leadActualizado = await this.leadsRepository.save(lead);

    return {
      lead: leadActualizado,
      clienteId: cliente.id,
    };
  }

  async getKanbanOportunidades(): Promise<KanbanOportunidades> {
    const etapas = Object.values(EtapaOportunidad);
    const base = etapas.reduce((acc, etapa) => {
      acc[etapa] = { items: [], total: 0 };
      return acc;
    }, {} as KanbanOportunidades);

    const oportunidades = await this.oportunidadesRepository.find({
      relations: {
        lead: true,
        cliente: true,
        asignadoA: true,
      },
      order: {
        updatedAt: 'DESC',
      },
    });

    for (const oportunidad of oportunidades) {
      base[oportunidad.etapa].items.push(oportunidad);
      base[oportunidad.etapa].total += Number(oportunidad.valor) || 0;
    }

    return base;
  }
}
