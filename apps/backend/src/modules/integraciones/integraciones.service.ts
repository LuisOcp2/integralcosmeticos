import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { createTransport } from 'nodemailer';
import { Repository } from 'typeorm';
import { ConfigurarIntegracionDto } from './dto/configurar-integracion.dto';
import {
  EstadoIntegracion,
  IntegracionConfig,
  TipoIntegracion,
} from './entities/integracion-config.entity';
import {
  EstadoLogIntegracion,
  LogIntegracion,
  TipoLogIntegracion,
} from './entities/log-integracion.entity';
import { StorageService } from './storage.service';

type CredencialesEncriptadas = {
  iv: string;
  data: string;
  tag: string;
};

@Injectable()
export class IntegracionesService {
  private readonly logger = new Logger(IntegracionesService.name);
  private readonly encryptionKey: Buffer;

  constructor(
    private readonly configService: ConfigService,
    private readonly storageService: StorageService,
    @InjectRepository(IntegracionConfig)
    private readonly integracionesRepository: Repository<IntegracionConfig>,
    @InjectRepository(LogIntegracion)
    private readonly logsRepository: Repository<LogIntegracion>,
  ) {
    const configuredKey = this.configService.get<string>('ENCRYPTION_KEY');
    const nodeEnv = this.configService.get<string>('NODE_ENV') ?? 'local';

    let rawKey = configuredKey;
    if (!configuredKey && nodeEnv === 'local') {
      rawKey = 'dev-insecure-encryption-key';
      this.logger.warn(
        'ENCRYPTION_KEY no definida. Usando clave insegura de desarrollo (solo local).',
      );
    }

    if (!rawKey) {
      throw new InternalServerErrorException(
        'ENCRYPTION_KEY es obligatoria fuera de NODE_ENV=local',
      );
    }
    this.encryptionKey = createHash('sha256').update(rawKey).digest();
  }

  async getAll() {
    const rows = await this.integracionesRepository.find({ order: { tipo: 'ASC' } });
    return rows.map(({ credenciales: _credenciales, ...safe }) => safe);
  }

  async configurar(tipo: TipoIntegracion, dto: ConfigurarIntegracionDto) {
    const credenciales = this.encryptJson(dto.credenciales);

    const existente = await this.integracionesRepository.findOne({ where: { tipo } });
    const entidad = existente ?? this.integracionesRepository.create({ tipo, nombre: tipo });

    entidad.nombre = dto.nombre?.trim() || tipo;
    entidad.credenciales = credenciales;
    entidad.configuracion = dto.configuracion;
    entidad.activa = true;
    entidad.estado = EstadoIntegracion.OK;
    entidad.mensajeError = null;

    const saved = await this.integracionesRepository.save(entidad);

    await this.logsRepository.save(
      this.logsRepository.create({
        integracionId: saved.id,
        tipo: TipoLogIntegracion.REQUEST,
        estado: EstadoLogIntegracion.EXITO,
        request: { tipo, configuracion: dto.configuracion },
        response: { ok: true, message: 'Integracion configurada' },
        error: null,
        duracionMs: 0,
      }),
    );

    const { credenciales: _credenciales, ...safe } = saved;
    return safe;
  }

  async testConexion(tipo: TipoIntegracion) {
    const integracion = await this.integracionesRepository.findOne({ where: { tipo } });
    if (!integracion) {
      throw new NotFoundException('Integracion no configurada');
    }

    const startAt = Date.now();
    let estado: EstadoLogIntegracion = EstadoLogIntegracion.EXITO;
    let response: Record<string, unknown> = { mensaje: 'pendiente de implementacion' };
    let errorMessage: string | null = null;

    try {
      if (tipo === TipoIntegracion.SMTP) {
        const creds = this.decryptJson(integracion.credenciales);
        const host = String(creds.host ?? '');
        const port = Number(creds.port ?? 587);
        const secure = Boolean(creds.secure ?? false);
        const user = String(creds.user ?? '');
        const pass = String(creds.pass ?? '');
        const to = String(
          creds.adminEmail ?? this.configService.get<string>('SMTP_TEST_TO') ?? user,
        );

        const transport = createTransport({
          host,
          port,
          secure,
          auth: user && pass ? { user, pass } : undefined,
        });

        await transport.sendMail({
          from: user || 'no-reply@integralcosmeticos.local',
          to,
          subject: 'Prueba de integracion SMTP',
          text: 'Correo de prueba de IntegracionesService',
        });

        response = { mensaje: 'Correo de prueba enviado', destino: to };
      } else if (tipo === TipoIntegracion.S3) {
        response = await this.storageService.testS3Connection();
      }

      integracion.estado = EstadoIntegracion.OK;
      integracion.mensajeError = null;
      integracion.ultimaSync = new Date();
      await this.integracionesRepository.save(integracion);
    } catch (error) {
      estado = EstadoLogIntegracion.ERROR;
      errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      integracion.estado = EstadoIntegracion.ERROR;
      integracion.mensajeError = errorMessage;
      await this.integracionesRepository.save(integracion);
      response = { mensaje: 'Error en test de conexion', error: errorMessage };
    }

    await this.logsRepository.save(
      this.logsRepository.create({
        integracionId: integracion.id,
        tipo: TipoLogIntegracion.REQUEST,
        estado,
        request: { tipo },
        response,
        error: errorMessage,
        duracionMs: Date.now() - startAt,
      }),
    );

    if (estado === EstadoLogIntegracion.ERROR) {
      throw new BadRequestException(response);
    }

    return response;
  }

  async getLogs(tipo: TipoIntegracion, page = 1, limit = 30) {
    const integracion = await this.integracionesRepository.findOne({ where: { tipo } });
    if (!integracion) {
      throw new NotFoundException('Integracion no encontrada');
    }

    const normalizedPage = Math.max(1, page);
    const normalizedLimit = Math.max(1, Math.min(100, limit));

    const [data, total] = await this.logsRepository.findAndCount({
      where: { integracionId: integracion.id },
      order: { createdAt: 'DESC' },
      skip: (normalizedPage - 1) * normalizedLimit,
      take: normalizedLimit,
    });

    return {
      data,
      total,
      page: normalizedPage,
      totalPages: Math.ceil(total / normalizedLimit) || 1,
    };
  }

  private encryptJson(payload: Record<string, unknown>): CredencialesEncriptadas {
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(payload), 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return {
      iv: iv.toString('base64'),
      data: encrypted.toString('base64'),
      tag: tag.toString('base64'),
    };
  }

  private decryptJson(payload: Record<string, unknown>) {
    const iv = String(payload.iv ?? '');
    const data = String(payload.data ?? '');
    const tag = String(payload.tag ?? '');

    if (!iv || !data || !tag) {
      return {};
    }

    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(data, 'base64')),
      decipher.final(),
    ]);

    return JSON.parse(decrypted.toString('utf8')) as Record<string, unknown>;
  }
}
