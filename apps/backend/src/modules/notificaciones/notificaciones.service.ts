import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ConfiguracionNotificacion } from './entities/configuracion-notificacion.entity';
import {
  CategoriaNotificacion,
  Notificacion,
  PrioridadNotificacion,
  TipoNotificacion,
} from './entities/notificacion.entity';
import { NotificacionesGateway } from './notificaciones.gateway';

type CrearNotificacionInput = {
  tipo: TipoNotificacion;
  categoria: CategoriaNotificacion;
  titulo: string;
  mensaje: string;
  prioridad?: PrioridadNotificacion;
  accion?: {
    label?: string;
    ruta?: string;
  };
  expiresAt?: Date | string;
};

type QueryNotificaciones = {
  categoria?: CategoriaNotificacion;
  leida?: boolean;
  page?: number;
  limit?: number;
};

type UpdateConfiguracionInput = {
  inApp?: boolean;
  email?: boolean;
  silenciadoHasta?: Date | null;
  categoriasDesactivadas?: CategoriaNotificacion[];
};

@Injectable()
export class NotificacionesService {
  constructor(
    @InjectRepository(Notificacion)
    private readonly notificacionesRepository: Repository<Notificacion>,
    @InjectRepository(ConfiguracionNotificacion)
    private readonly configuracionRepository: Repository<ConfiguracionNotificacion>,
    private readonly notificacionesGateway: NotificacionesGateway,
  ) {}

  async crear(usuarioId: string, data: CrearNotificacionInput): Promise<Notificacion> {
    const notificacion = this.notificacionesRepository.create({
      usuarioId,
      tipo: data.tipo,
      categoria: data.categoria,
      titulo: data.titulo.trim(),
      mensaje: data.mensaje.trim(),
      prioridad: data.prioridad ?? PrioridadNotificacion.MEDIA,
      accionLabel: data.accion?.label?.trim() || null,
      accionRuta: data.accion?.ruta?.trim() || null,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      leida: false,
    });

    const saved = await this.notificacionesRepository.save(notificacion);
    this.notificacionesGateway.emitNuevaNotificacion(usuarioId, saved);
    return saved;
  }

  async crearMasivo(usuarioIds: string[], data: CrearNotificacionInput): Promise<Notificacion[]> {
    if (!usuarioIds.length) {
      return [];
    }

    const payload = usuarioIds.map((usuarioId) =>
      this.notificacionesRepository.create({
        usuarioId,
        tipo: data.tipo,
        categoria: data.categoria,
        titulo: data.titulo.trim(),
        mensaje: data.mensaje.trim(),
        prioridad: data.prioridad ?? PrioridadNotificacion.MEDIA,
        accionLabel: data.accion?.label?.trim() || null,
        accionRuta: data.accion?.ruta?.trim() || null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        leida: false,
      }),
    );

    const saved = await this.notificacionesRepository.save(payload);
    for (const notificacion of saved) {
      this.notificacionesGateway.emitNuevaNotificacion(notificacion.usuarioId, notificacion);
    }

    return saved;
  }

  async marcarLeida(id: string, usuarioId: string): Promise<Notificacion> {
    const notificacion = await this.notificacionesRepository.findOne({
      where: { id, usuarioId },
    });

    if (!notificacion) {
      throw new NotFoundException('Notificacion no encontrada');
    }

    if (!notificacion.leida) {
      notificacion.leida = true;
      notificacion.leidaEn = new Date();
    }

    return this.notificacionesRepository.save(notificacion);
  }

  async marcarTodasLeidas(usuarioId: string) {
    const ahora = new Date();
    await this.notificacionesRepository
      .createQueryBuilder()
      .update(Notificacion)
      .set({ leida: true, leidaEn: ahora })
      .where('usuarioId = :usuarioId', { usuarioId })
      .andWhere('leida = false')
      .execute();

    return { ok: true };
  }

  async getMisNotificaciones(usuarioId: string, query: QueryNotificaciones) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const qb = this.notificacionesRepository
      .createQueryBuilder('notificacion')
      .where('notificacion.usuarioId = :usuarioId', { usuarioId })
      .andWhere('(notificacion.expiresAt IS NULL OR notificacion.expiresAt >= NOW())')
      .orderBy('notificacion.createdAt', 'DESC');

    if (query.categoria) {
      qb.andWhere('notificacion.categoria = :categoria', { categoria: query.categoria });
    }

    if (query.leida !== undefined) {
      qb.andWhere('notificacion.leida = :leida', { leida: query.leida });
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

  async getResumen(usuarioId: string) {
    const [noLeidas, porCategoriaRaw] = await Promise.all([
      this.notificacionesRepository.count({
        where: {
          usuarioId,
          leida: false,
        },
      }),
      this.notificacionesRepository
        .createQueryBuilder('notificacion')
        .select('notificacion.categoria', 'categoria')
        .addSelect('COUNT(notificacion.id)', 'cantidad')
        .where('notificacion.usuarioId = :usuarioId', { usuarioId })
        .groupBy('notificacion.categoria')
        .getRawMany<{ categoria: CategoriaNotificacion; cantidad: string }>(),
    ]);

    const porCategoria = Object.values(CategoriaNotificacion).reduce<Record<string, number>>(
      (acc, categoria) => {
        acc[categoria] = 0;
        return acc;
      },
      {},
    );

    for (const item of porCategoriaRaw) {
      porCategoria[item.categoria] = Number(item.cantidad);
    }

    return { noLeidas, porCategoria };
  }

  async getConfiguracion(usuarioId: string): Promise<ConfiguracionNotificacion> {
    let configuracion = await this.configuracionRepository.findOne({ where: { usuarioId } });
    if (!configuracion) {
      configuracion = await this.configuracionRepository.save(
        this.configuracionRepository.create({
          usuarioId,
          inApp: true,
          email: false,
          silenciadoHasta: null,
          categoriasDesactivadas: [],
        }),
      );
    }
    return configuracion;
  }

  async updateConfiguracion(
    usuarioId: string,
    data: UpdateConfiguracionInput,
  ): Promise<ConfiguracionNotificacion> {
    const configuracion = await this.getConfiguracion(usuarioId);
    if (data.inApp !== undefined) {
      configuracion.inApp = data.inApp;
    }
    if (data.email !== undefined) {
      configuracion.email = data.email;
    }
    if (data.silenciadoHasta !== undefined) {
      configuracion.silenciadoHasta = data.silenciadoHasta;
    }
    if (data.categoriasDesactivadas !== undefined) {
      configuracion.categoriasDesactivadas = data.categoriasDesactivadas;
    }

    return this.configuracionRepository.save(configuracion);
  }

  async eliminarExpiradas() {
    await this.notificacionesRepository
      .createQueryBuilder()
      .delete()
      .from(Notificacion)
      .where('expiresAt IS NOT NULL')
      .andWhere('expiresAt < NOW()')
      .execute();

    return { ok: true };
  }

  async notificarUsuariosActivos(data: CrearNotificacionInput): Promise<Notificacion[]> {
    const usuarios = await this.configuracionRepository.find({ where: { inApp: true } });
    const usuarioIds = usuarios.map((it) => it.usuarioId);
    if (!usuarioIds.length) {
      return [];
    }

    const configuraciones = await this.configuracionRepository.find({
      where: { usuarioId: In(usuarioIds) },
    });

    const ahora = new Date();
    const permitidos = configuraciones
      .filter((cfg) => !cfg.silenciadoHasta || cfg.silenciadoHasta < ahora)
      .filter((cfg) => !cfg.categoriasDesactivadas.includes(data.categoria))
      .map((cfg) => cfg.usuarioId);

    return this.crearMasivo(permitidos, data);
  }
}
