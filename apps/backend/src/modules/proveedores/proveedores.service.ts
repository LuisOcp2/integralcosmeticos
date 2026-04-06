import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, QueryFailedError, Repository } from 'typeorm';
import { Proveedor } from './entities/proveedor.entity';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { ProveedoresQueryDto } from './dto/proveedores-query.dto';

@Injectable()
export class ProveedoresService {
  constructor(
    @InjectRepository(Proveedor)
    private readonly proveedorRepository: Repository<Proveedor>,
  ) {}

  private async generarCodigoProveedor(): Promise<string> {
    const ultimo = await this.proveedorRepository
      .createQueryBuilder('proveedor')
      .select('proveedor.codigo', 'codigo')
      .where("proveedor.codigo ~ '^PRV-[0-9]+$'")
      .orderBy("CAST(SUBSTRING(proveedor.codigo FROM '[0-9]+$') AS INTEGER)", 'DESC')
      .limit(1)
      .getRawOne<{ codigo?: string }>();

    const ultimoNumero = ultimo?.codigo ? Number(ultimo.codigo.replace(/^PRV-/, '')) || 0 : 0;
    const siguiente = `${ultimoNumero + 1}`.padStart(6, '0');
    return `PRV-${siguiente}`;
  }

  async create(dto: CreateProveedorDto): Promise<Proveedor> {
    const nit = dto.nit.trim();
    const existente = await this.proveedorRepository.findOne({ where: { nit } });
    if (existente) {
      throw new ConflictException('Ya existe un proveedor con ese NIT');
    }

    const proveedor = this.proveedorRepository.create({
      ...dto,
      codigo: await this.generarCodigoProveedor(),
      nit,
      email: dto.email?.trim().toLowerCase() ?? null,
      telefono: dto.telefono?.trim() ?? null,
      contactoNombre: dto.contactoNombre?.trim() ?? null,
      direccion: dto.direccion?.trim() ?? null,
      ciudad: dto.ciudad?.trim() ?? null,
      notas: dto.notas?.trim() ?? null,
      activo: dto.activo ?? true,
    });

    try {
      return await this.proveedorRepository.save(proveedor);
    } catch (error) {
      this.handleUniqueConstraintError(error);
      throw error;
    }
  }

  async findAll(query: ProveedoresQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const qb = this.proveedorRepository
      .createQueryBuilder('proveedor')
      .orderBy('proveedor."createdAt"', 'DESC');

    if (query.q?.trim()) {
      const term = `%${query.q.trim().toLowerCase()}%`;
      qb.where(
        new Brackets((subQb) => {
          subQb
            .where('LOWER(proveedor.razon_social) LIKE :term', { term })
            .orWhere('LOWER(proveedor.nit) LIKE :term', { term })
            .orWhere("LOWER(COALESCE(proveedor.email, '')) LIKE :term", { term })
            .orWhere("LOWER(COALESCE(proveedor.telefono, '')) LIKE :term", { term })
            .orWhere("LOWER(COALESCE(proveedor.ciudad, '')) LIKE :term", { term });
        }),
      );
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

  async findOne(id: string): Promise<Proveedor> {
    const proveedor = await this.proveedorRepository.findOne({ where: { id } });
    if (!proveedor) {
      throw new NotFoundException(`Proveedor con ID ${id} no encontrado`);
    }
    return proveedor;
  }

  async update(id: string, dto: UpdateProveedorDto): Promise<Proveedor> {
    const proveedor = await this.findOne(id);

    if (dto.nit !== undefined) {
      const nit = dto.nit.trim();
      if (nit !== proveedor.nit) {
        const existente = await this.proveedorRepository.findOne({ where: { nit } });
        if (existente && existente.id !== proveedor.id) {
          throw new ConflictException('Ya existe un proveedor con ese NIT');
        }
      }
      proveedor.nit = nit;
    }

    if (dto.nombre !== undefined) {
      proveedor.nombre = dto.nombre.trim();
    }
    if (dto.email !== undefined) {
      proveedor.email = dto.email?.trim() ? dto.email.trim().toLowerCase() : null;
    }
    if (dto.telefono !== undefined) {
      proveedor.telefono = dto.telefono?.trim() ? dto.telefono.trim() : null;
    }
    if (dto.contactoNombre !== undefined) {
      proveedor.contactoNombre = dto.contactoNombre?.trim() ? dto.contactoNombre.trim() : null;
    }
    if (dto.direccion !== undefined) {
      proveedor.direccion = dto.direccion?.trim() ? dto.direccion.trim() : null;
    }
    if (dto.ciudad !== undefined) {
      proveedor.ciudad = dto.ciudad?.trim() ? dto.ciudad.trim() : null;
    }
    if (dto.notas !== undefined) {
      proveedor.notas = dto.notas?.trim() ? dto.notas.trim() : null;
    }
    if (dto.activo !== undefined) {
      proveedor.activo = dto.activo;
    }

    try {
      return await this.proveedorRepository.save(proveedor);
    } catch (error) {
      this.handleUniqueConstraintError(error);
      throw error;
    }
  }

  async remove(id: string): Promise<Proveedor> {
    const proveedor = await this.findOne(id);
    proveedor.activo = false;
    return this.proveedorRepository.save(proveedor);
  }

  private handleUniqueConstraintError(error: unknown): never | void {
    if (!(error instanceof QueryFailedError)) {
      return;
    }

    const dbError = error as QueryFailedError & { code?: string; detail?: string };
    if (dbError.code !== '23505') {
      return;
    }

    const detail = dbError.detail?.toLowerCase() ?? '';
    if (detail.includes('nit')) {
      throw new ConflictException('Ya existe un proveedor con ese NIT');
    }

    throw new ConflictException('Ya existe un proveedor con datos unicos duplicados');
  }
}
