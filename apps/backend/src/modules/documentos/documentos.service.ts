import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { CarpetaDocumento } from './entities/carpeta-documento.entity';
import { Documento } from './entities/documento.entity';
import { VersionDocumento } from './entities/version-documento.entity';
import { CreateCarpetaDto } from './dto/create-carpeta.dto';
import { UpdateCarpetaDto } from './dto/update-carpeta.dto';
import { CreateDocumentoDto } from './dto/create-documento.dto';
import { UpdateDocumentoDto } from './dto/update-documento.dto';
import { BuscarDocumentosDto } from './dto/buscar-documentos.dto';
import { CrearVersionDocumentoDto } from './dto/crear-version-documento.dto';

@Injectable()
export class DocumentosService {
  constructor(
    @InjectRepository(CarpetaDocumento)
    private readonly carpetasRepository: Repository<CarpetaDocumento>,
    @InjectRepository(Documento)
    private readonly documentosRepository: Repository<Documento>,
    @InjectRepository(VersionDocumento)
    private readonly versionesRepository: Repository<VersionDocumento>,
  ) {}

  async createCarpeta(dto: CreateCarpetaDto, creadaPorId: string) {
    const carpeta = this.carpetasRepository.create({
      nombre: dto.nombre.trim(),
      padreId: dto.padreId ?? null,
      acceso: dto.acceso,
      creadaPorId,
    });
    return this.carpetasRepository.save(carpeta);
  }

  async findCarpetas() {
    return this.carpetasRepository.find({
      relations: { padre: true },
      order: { nombre: 'ASC' },
    });
  }

  async findCarpeta(id: string) {
    const carpeta = await this.carpetasRepository.findOne({
      where: { id },
      relations: { padre: true },
    });
    if (!carpeta) {
      throw new NotFoundException('Carpeta no encontrada');
    }
    return carpeta;
  }

  async updateCarpeta(id: string, dto: UpdateCarpetaDto) {
    const carpeta = await this.findCarpeta(id);
    if (dto.nombre !== undefined) carpeta.nombre = dto.nombre.trim();
    if (dto.padreId !== undefined) carpeta.padreId = dto.padreId ?? null;
    if (dto.acceso !== undefined) carpeta.acceso = dto.acceso;
    return this.carpetasRepository.save(carpeta);
  }

  async removeCarpeta(id: string) {
    const carpeta = await this.findCarpeta(id);
    await this.carpetasRepository.remove(carpeta);
    return { ok: true };
  }

  async createDocumento(dto: CreateDocumentoDto, creadoPorId: string) {
    const documento = this.documentosRepository.create({
      nombre: dto.nombre.trim(),
      descripcion: dto.descripcion?.trim() || null,
      carpetaId: dto.carpetaId,
      tipo: dto.tipo,
      nombreArchivo: dto.nombreArchivo.trim(),
      archivoUrl: dto.archivoUrl.trim(),
      tamano: dto.tamano,
      mimeType: dto.mimeType.trim(),
      version: 1,
      etiquetas: dto.etiquetas?.map((tag) => tag.trim()).filter(Boolean) ?? [],
      creadoPorId,
      vencimientoEn: dto.vencimientoEn ?? null,
      entidadTipo: dto.entidadTipo?.trim() || null,
      entidadId: dto.entidadId ?? null,
    });
    return this.documentosRepository.save(documento);
  }

  async findDocumentos(carpetaId?: string) {
    const qb = this.documentosRepository
      .createQueryBuilder('documento')
      .leftJoinAndSelect('documento.carpeta', 'carpeta')
      .leftJoinAndSelect('documento.creadoPor', 'creadoPor')
      .orderBy('documento.createdAt', 'DESC');

    if (carpetaId) {
      qb.where('documento.carpetaId = :carpetaId', { carpetaId });
    }

    return qb.getMany();
  }

  async findDocumento(id: string) {
    const documento = await this.documentosRepository.findOne({
      where: { id },
      relations: { carpeta: true, creadoPor: true },
    });
    if (!documento) {
      throw new NotFoundException('Documento no encontrado');
    }
    return documento;
  }

  async updateDocumento(id: string, dto: UpdateDocumentoDto) {
    const documento = await this.findDocumento(id);

    if (dto.nombre !== undefined) documento.nombre = dto.nombre.trim();
    if (dto.descripcion !== undefined) documento.descripcion = dto.descripcion?.trim() || null;
    if (dto.carpetaId !== undefined) documento.carpetaId = dto.carpetaId;
    if (dto.tipo !== undefined) documento.tipo = dto.tipo;
    if (dto.nombreArchivo !== undefined) documento.nombreArchivo = dto.nombreArchivo.trim();
    if (dto.archivoUrl !== undefined) documento.archivoUrl = dto.archivoUrl.trim();
    if (dto.tamano !== undefined) documento.tamano = dto.tamano;
    if (dto.mimeType !== undefined) documento.mimeType = dto.mimeType.trim();
    if (dto.etiquetas !== undefined) {
      documento.etiquetas = dto.etiquetas.map((tag) => tag.trim()).filter(Boolean);
    }
    if (dto.vencimientoEn !== undefined) documento.vencimientoEn = dto.vencimientoEn ?? null;
    if (dto.entidadTipo !== undefined) documento.entidadTipo = dto.entidadTipo?.trim() || null;
    if (dto.entidadId !== undefined) documento.entidadId = dto.entidadId ?? null;

    return this.documentosRepository.save(documento);
  }

  async removeDocumento(id: string) {
    const documento = await this.findDocumento(id);
    await this.documentosRepository.remove(documento);
    return { ok: true };
  }

  async getCarpetaArbol() {
    const [carpetas, conteoRaw] = await Promise.all([
      this.carpetasRepository.find({ order: { nombre: 'ASC' } }),
      this.documentosRepository
        .createQueryBuilder('documento')
        .select('documento.carpetaId', 'carpetaId')
        .addSelect('COUNT(documento.id)', 'count')
        .groupBy('documento.carpetaId')
        .getRawMany<{ carpetaId: string; count: string }>(),
    ]);

    const countMap = new Map(conteoRaw.map((item) => [item.carpetaId, Number(item.count)]));

    const nodes = carpetas.map((carpeta) => ({
      ...carpeta,
      documentCount: countMap.get(carpeta.id) ?? 0,
      children: [] as Array<any>,
    }));

    const byId = new Map(nodes.map((node) => [node.id, node]));
    const roots: Array<any> = [];

    nodes.forEach((node) => {
      if (node.padreId && byId.has(node.padreId)) {
        byId.get(node.padreId)?.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  async buscar(query: BuscarDocumentosDto) {
    const qb = this.documentosRepository
      .createQueryBuilder('documento')
      .leftJoinAndSelect('documento.carpeta', 'carpeta')
      .orderBy('documento.createdAt', 'DESC');

    if (query.q?.trim()) {
      const term = `%${query.q.trim().toLowerCase()}%`;
      qb.andWhere(
        new Brackets((subQb) => {
          subQb
            .where('LOWER(documento.nombre) LIKE :term', { term })
            .orWhere("LOWER(COALESCE(documento.descripcion, '')) LIKE :term", { term })
            .orWhere(
              'EXISTS (SELECT 1 FROM unnest(documento.etiquetas) tag WHERE LOWER(tag) LIKE :term)',
              {
                term,
              },
            );
        }),
      );
    }

    if (query.tipo) {
      qb.andWhere('documento.tipo = :tipo', { tipo: query.tipo });
    }
    if (query.carpetaId) {
      qb.andWhere('documento.carpetaId = :carpetaId', { carpetaId: query.carpetaId });
    }

    return qb.getMany();
  }

  async getDocumentosEntidad(tipo: string, entidadId: string) {
    return this.documentosRepository.find({
      where: { entidadTipo: tipo, entidadId },
      relations: { carpeta: true },
      order: { createdAt: 'DESC' },
    });
  }

  async crearVersion(documentoId: string, dto: CrearVersionDocumentoDto, subidoPorId: string) {
    const documento = await this.findDocumento(documentoId);
    const siguienteVersion = Number(documento.version) + 1;

    const version = this.versionesRepository.create({
      documentoId,
      version: siguienteVersion,
      archivoUrl: dto.archivoUrl.trim(),
      nombreArchivo: dto.nombreArchivo.trim(),
      cambios: dto.cambios?.trim() || null,
      subidoPorId,
    });

    await this.versionesRepository.save(version);
    documento.version = siguienteVersion;
    documento.archivoUrl = dto.archivoUrl.trim();
    documento.nombreArchivo = dto.nombreArchivo.trim();
    await this.documentosRepository.save(documento);

    return version;
  }

  async getVersiones(documentoId: string) {
    await this.findDocumento(documentoId);
    return this.versionesRepository.find({
      where: { documentoId },
      relations: { subidoPor: true },
      order: { version: 'DESC' },
    });
  }

  async getDocumentosVencidosProximos(dias = 30) {
    const hoy = new Date();
    const tope = new Date();
    tope.setDate(tope.getDate() + dias);

    const inicio = hoy.toISOString().slice(0, 10);
    const fin = tope.toISOString().slice(0, 10);

    return this.documentosRepository
      .createQueryBuilder('documento')
      .leftJoinAndSelect('documento.carpeta', 'carpeta')
      .where('documento.vencimientoEn IS NOT NULL')
      .andWhere('documento.vencimientoEn BETWEEN :inicio AND :fin', { inicio, fin })
      .orderBy('documento.vencimientoEn', 'ASC')
      .getMany();
  }
}
