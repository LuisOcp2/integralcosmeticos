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

  async findAll(): Promise<Categoria[]> {
    return this.categoriasRepository.find({
      where: { activo: true },
      order: { nombre: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Categoria> {
    const categoria = await this.categoriasRepository.findOne({ where: { id, activo: true } });
    if (!categoria) {
      throw new NotFoundException('Categoria no encontrada');
    }
    return categoria;
  }

  async update(id: string, updateCategoriaDto: UpdateCategoriaDto): Promise<Categoria> {
    const categoria = await this.findOne(id);

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
    const categoria = await this.findOne(id);
    categoria.activo = false;
    await this.categoriasRepository.save(categoria);
  }
}
