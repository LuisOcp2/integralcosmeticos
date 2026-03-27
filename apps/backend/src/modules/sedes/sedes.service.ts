import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSedeDto } from './dto/create-sede.dto';
import { UpdateSedeDto } from './dto/update-sede.dto';
import { Sede } from './entities/sede.entity';

@Injectable()
export class SedesService {
  constructor(
    @InjectRepository(Sede)
    private readonly sedesRepository: Repository<Sede>,
  ) {}

  async create(createSedeDto: CreateSedeDto): Promise<Sede> {
    const existente = await this.sedesRepository.findOne({
      where: { nombre: createSedeDto.nombre, activo: true },
    });
    if (existente) {
      throw new ConflictException('Ya existe una sede activa con ese nombre');
    }

    const sede = this.sedesRepository.create(createSedeDto);
    if (sede.moneda) {
      sede.moneda = sede.moneda.trim().toUpperCase();
    }
    return this.sedesRepository.save(sede);
  }

  async findAll(): Promise<Sede[]> {
    return this.sedesRepository.find({ where: { activo: true } });
  }

  async findOne(id: string): Promise<Sede> {
    const sede = await this.sedesRepository.findOne({ where: { id, activo: true } });
    if (!sede) {
      throw new NotFoundException('Sede no encontrada');
    }
    return sede;
  }

  async remove(id: string): Promise<void> {
    const sede = await this.findOne(id);
    sede.activo = false;
    await this.sedesRepository.save(sede);
  }

  async update(id: string, dto: UpdateSedeDto): Promise<Sede> {
    const sede = await this.findOne(id);

    if (dto.nombre && dto.nombre.trim() !== sede.nombre) {
      const existente = await this.sedesRepository.findOne({
        where: { nombre: dto.nombre.trim(), activo: true },
      });
      if (existente && existente.id !== sede.id) {
        throw new ConflictException('Ya existe una sede activa con ese nombre');
      }
      sede.nombre = dto.nombre.trim();
    }

    if (dto.direccion !== undefined) {
      sede.direccion = dto.direccion;
    }

    if (dto.ciudad !== undefined) {
      sede.ciudad = dto.ciudad;
    }

    if (dto.telefono !== undefined) {
      sede.telefono = dto.telefono?.trim() ? dto.telefono.trim() : undefined;
    }

    if (dto.tipo !== undefined) {
      sede.tipo = dto.tipo;
    }

    if (dto.moneda !== undefined) {
      sede.moneda = dto.moneda.trim().toUpperCase();
    }

    if (dto.impuestoPorcentaje !== undefined) {
      sede.impuestoPorcentaje = dto.impuestoPorcentaje;
    }

    return this.sedesRepository.save(sede);
  }
}
