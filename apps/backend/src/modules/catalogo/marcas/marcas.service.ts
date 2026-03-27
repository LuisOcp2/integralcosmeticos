import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateMarcaDto } from './dto/create-marca.dto';
import { UpdateMarcaDto } from './dto/update-marca.dto';
import { Marca } from './entities/marca.entity';

@Injectable()
export class MarcasService {
  constructor(
    @InjectRepository(Marca)
    private readonly marcasRepository: Repository<Marca>,
  ) {}

  async create(createMarcaDto: CreateMarcaDto): Promise<Marca> {
    const existente = await this.marcasRepository.findOne({
      where: { nombre: createMarcaDto.nombre },
    });

    if (existente?.activo) {
      throw new ConflictException('Ya existe una marca activa con ese nombre');
    }

    if (existente && !existente.activo) {
      existente.descripcion = createMarcaDto.descripcion;
      existente.activo = true;
      return this.marcasRepository.save(existente);
    }

    const marca = this.marcasRepository.create(createMarcaDto);
    return this.marcasRepository.save(marca);
  }

  async findAll(): Promise<Marca[]> {
    return this.marcasRepository.find({
      where: { activo: true },
      order: { nombre: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Marca> {
    const marca = await this.marcasRepository.findOne({ where: { id, activo: true } });
    if (!marca) {
      throw new NotFoundException('Marca no encontrada');
    }
    return marca;
  }

  async update(id: string, updateMarcaDto: UpdateMarcaDto): Promise<Marca> {
    const marca = await this.findOne(id);

    if (updateMarcaDto.nombre && updateMarcaDto.nombre !== marca.nombre) {
      const existeNombre = await this.marcasRepository.findOne({
        where: { nombre: updateMarcaDto.nombre, activo: true },
      });
      if (existeNombre) {
        throw new ConflictException('Ya existe una marca activa con ese nombre');
      }
    }

    Object.assign(marca, updateMarcaDto);
    return this.marcasRepository.save(marca);
  }

  async remove(id: string): Promise<void> {
    const marca = await this.findOne(id);
    marca.activo = false;
    await this.marcasRepository.save(marca);
  }
}
