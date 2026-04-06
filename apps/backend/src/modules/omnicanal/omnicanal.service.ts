import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CanalOmnicanal, Conversacion, EstadoConversacion } from './entities/conversacion.entity';
import {
  DireccionMensajeOmnicanal,
  EstadoMensajeOmnicanal,
  Mensaje,
  TipoMensajeOmnicanal,
} from './entities/mensaje.entity';
import { PlantillaMensaje } from './entities/plantilla-mensaje.entity';
import { OmnicanalGateway } from './omnicanal.gateway';
import { CreatePlantillaMensajeDto } from './dto/create-plantilla-mensaje.dto';
import { UpdatePlantillaMensajeDto } from './dto/update-plantilla-mensaje.dto';

type InboxQuery = {
  canal?: CanalOmnicanal;
  estado?: EstadoConversacion;
  asignadoAId?: string;
  page?: number;
  limit?: number;
};

@Injectable()
export class OmnicanalService {
  constructor(
    @InjectRepository(Conversacion)
    private readonly conversacionesRepository: Repository<Conversacion>,
    @InjectRepository(Mensaje)
    private readonly mensajesRepository: Repository<Mensaje>,
    @InjectRepository(PlantillaMensaje)
    private readonly plantillasRepository: Repository<PlantillaMensaje>,
    private readonly omnicanalGateway: OmnicanalGateway,
  ) {}

  async getInbox(query: InboxQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const qb = this.conversacionesRepository
      .createQueryBuilder('conversacion')
      .leftJoinAndSelect('conversacion.asignadoA', 'asignadoA')
      .orderBy('conversacion.ultimoMensajeEn', 'DESC');

    if (query.canal) {
      qb.andWhere('conversacion.canal = :canal', { canal: query.canal });
    }
    if (query.estado) {
      qb.andWhere('conversacion.estado = :estado', { estado: query.estado });
    }
    if (query.asignadoAId) {
      qb.andWhere('conversacion.asignadoAId = :asignadoAId', { asignadoAId: query.asignadoAId });
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

  async getConversacionDetalle(conversacionId: string, page = 1, limit = 20) {
    const conversacion = await this.conversacionesRepository.findOne({
      where: { id: conversacionId },
    });
    if (!conversacion) {
      throw new NotFoundException('Conversacion no encontrada');
    }

    const mensajes = await this.getMensajes(conversacionId, page, limit);
    return { conversacion, mensajes };
  }

  async getMensajes(conversacionId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const qb = this.mensajesRepository
      .createQueryBuilder('mensaje')
      .where('mensaje.conversacionId = :conversacionId', { conversacionId })
      .orderBy('mensaje.createdAt', 'DESC');

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

  async enviarMensaje(
    conversacionId: string,
    data: { contenido: string; tipo?: TipoMensajeOmnicanal },
    userId: string,
  ) {
    const conversacion = await this.conversacionesRepository.findOne({
      where: { id: conversacionId },
    });
    if (!conversacion) {
      throw new NotFoundException('Conversacion no encontrada');
    }

    const mensaje = await this.mensajesRepository.save(
      this.mensajesRepository.create({
        conversacionId,
        tipo: data.tipo ?? TipoMensajeOmnicanal.TEXTO,
        direccion: DireccionMensajeOmnicanal.SALIENTE,
        contenido: data.contenido?.trim() || null,
        archivoUrl: null,
        estado: EstadoMensajeOmnicanal.ENVIADO,
        enviadoPorId: userId,
      }),
    );

    conversacion.ultimoMensajeEn = mensaje.createdAt;
    if (conversacion.estado === EstadoConversacion.NUEVA) {
      conversacion.estado = EstadoConversacion.EN_ATENCION;
    }
    await this.conversacionesRepository.save(conversacion);

    this.omnicanalGateway.emitirNuevoMensajeConversacion(conversacionId, mensaje);
    return mensaje;
  }

  async asignar(conversacionId: string, usuarioId: string) {
    const conversacion = await this.conversacionesRepository.findOne({
      where: { id: conversacionId },
    });
    if (!conversacion) {
      throw new NotFoundException('Conversacion no encontrada');
    }

    conversacion.asignadoAId = usuarioId;
    conversacion.estado = EstadoConversacion.ASIGNADA;
    conversacion.resueltaEn = null;
    return this.conversacionesRepository.save(conversacion);
  }

  async resolver(conversacionId: string) {
    const conversacion = await this.conversacionesRepository.findOne({
      where: { id: conversacionId },
    });
    if (!conversacion) {
      throw new NotFoundException('Conversacion no encontrada');
    }

    conversacion.estado = EstadoConversacion.RESUELTA;
    conversacion.resueltaEn = new Date();
    return this.conversacionesRepository.save(conversacion);
  }

  async recibirMensajeExterno(
    canal: CanalOmnicanal,
    contactoIdentificador: string,
    contactoNombre: string,
    contenido: string,
    canalExternoId?: string,
  ) {
    let conversacion = await this.conversacionesRepository.findOne({
      where: {
        canal,
        contactoIdentificador,
      },
      order: { createdAt: 'DESC' },
    });

    if (!conversacion) {
      const ahora = new Date();
      conversacion = await this.conversacionesRepository.save(
        this.conversacionesRepository.create({
          canal,
          estado: EstadoConversacion.NUEVA,
          clienteId: null,
          contactoIdentificador,
          contactoNombre,
          asignadoAId: null,
          etiquetas: [],
          primerMensajeEn: ahora,
          ultimoMensajeEn: ahora,
          canalExternoId: canalExternoId ?? null,
        }),
      );
    }

    const mensaje = await this.mensajesRepository.save(
      this.mensajesRepository.create({
        conversacionId: conversacion.id,
        tipo: TipoMensajeOmnicanal.TEXTO,
        direccion: DireccionMensajeOmnicanal.ENTRANTE,
        contenido: contenido.trim(),
        estado: EstadoMensajeOmnicanal.ENVIADO,
        enviadoPorId: null,
      }),
    );

    conversacion.ultimoMensajeEn = mensaje.createdAt;
    conversacion.contactoNombre = contactoNombre || conversacion.contactoNombre;
    if (canalExternoId) {
      conversacion.canalExternoId = canalExternoId;
    }
    if (conversacion.estado === EstadoConversacion.RESUELTA) {
      conversacion.estado = EstadoConversacion.EN_ATENCION;
      conversacion.resueltaEn = null;
    }

    await this.conversacionesRepository.save(conversacion);

    const payload = { conversacion, mensaje };
    this.omnicanalGateway.emitirNuevoMensajeConversacion(conversacion.id, payload);
    this.omnicanalGateway.emitirNuevoMensajeInbox(payload);

    return payload;
  }

  async crearPlantilla(dto: CreatePlantillaMensajeDto) {
    return this.plantillasRepository.save(
      this.plantillasRepository.create({
        ...dto,
        nombre: dto.nombre.trim(),
        asunto: dto.asunto?.trim() || null,
        cuerpo: dto.cuerpo.trim(),
        variables: dto.variables ?? [],
        activa: dto.activa ?? true,
      }),
    );
  }

  async listarPlantillas() {
    return this.plantillasRepository.find({ order: { createdAt: 'DESC' } });
  }

  async getPlantilla(id: string) {
    const plantilla = await this.plantillasRepository.findOne({ where: { id } });
    if (!plantilla) {
      throw new NotFoundException('Plantilla no encontrada');
    }
    return plantilla;
  }

  async updatePlantilla(id: string, dto: UpdatePlantillaMensajeDto) {
    const plantilla = await this.getPlantilla(id);

    if (dto.nombre !== undefined) {
      plantilla.nombre = dto.nombre.trim();
    }
    if (dto.canal !== undefined) {
      plantilla.canal = dto.canal;
    }
    if (dto.categoria !== undefined) {
      plantilla.categoria = dto.categoria;
    }
    if (dto.asunto !== undefined) {
      plantilla.asunto = dto.asunto?.trim() || null;
    }
    if (dto.cuerpo !== undefined) {
      plantilla.cuerpo = dto.cuerpo.trim();
    }
    if (dto.variables !== undefined) {
      plantilla.variables = dto.variables;
    }
    if (dto.activa !== undefined) {
      plantilla.activa = dto.activa;
    }

    return this.plantillasRepository.save(plantilla);
  }

  async removePlantilla(id: string) {
    const plantilla = await this.getPlantilla(id);
    await this.plantillasRepository.remove(plantilla);
    return { ok: true };
  }
}
