import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';
import { Categoria } from './entities/categoria.entity';

@Injectable()
export class CategoriasService {
  constructor(
    @InjectRepository(Categoria)
    private readonly categoriasRepository: Repository<Categoria>,
  ) {}

  private async findById(id: string): Promise<Categoria> {
    const categoria = await this.categoriasRepository.findOne({ where: { id } });
    if (!categoria) {
      throw new NotFoundException('Categoria no encontrada');
    }
    return categoria;
  }

  async create(createCategoriaDto: CreateCategoriaDto): Promise<Categoria> {
    const existente = await this.categoriasRepository.findOne({
      where: { nombre: createCategoriaDto.nombre },
    });

    if (existente?.activo) {
      throw new ConflictException('Ya existe una categoria activa con ese nombre');
    }

    if (existente && !existente.activo) {
      existente.descripcion = createCategoriaDto.descripcion;
      existente.activo = true;
      return this.categoriasRepository.save(existente);
    }

    const categoria = this.categoriasRepository.create(createCategoriaDto);
    return this.categoriasRepository.save(categoria);
  }

  async findAll(activosSolo = true): Promise<Categoria[]> {
    return this.categoriasRepository.find({
      where: activosSolo ? { activo: true } : undefined,
      order: { nombre: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Categoria> {
    const categoria = await this.findById(id);
    if (!categoria.activo) {
      throw new NotFoundException('Categoria no encontrada o inactiva');
    }
    return categoria;
  }

  async update(id: string, updateCategoriaDto: UpdateCategoriaDto): Promise<Categoria> {
    const categoria = await this.findById(id);

    if (updateCategoriaDto.nombre && updateCategoriaDto.nombre !== categoria.nombre) {
      const existeNombre = await this.categoriasRepository.findOne({
        where: { nombre: updateCategoriaDto.nombre, activo: true },
      });
      if (existeNombre) {
        throw new ConflictException('Ya existe una categoria activa con ese nombre');
      }
    }

    Object.assign(categoria, updateCategoriaDto);
    return this.categoriasRepository.save(categoria);
  }

  async remove(id: string): Promise<void> {
    const categoria = await this.findById(id);
    categoria.activo = false;
    await this.categoriasRepository.save(categoria);
  }

  async restore(id: string): Promise<Categoria> {
    const categoria = await this.findById(id);
    categoria.activo = true;
    return this.categoriasRepository.save(categoria);
  }
}
