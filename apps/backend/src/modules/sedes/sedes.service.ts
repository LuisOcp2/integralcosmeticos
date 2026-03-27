import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSedeDto } from './dto/create-sede.dto';
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
}
