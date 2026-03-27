import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Usuario } from './entities/usuario.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
  ) {}

  async create(createUsuarioDto: CreateUsuarioDto): Promise<Usuario> {
    const existe = await this.usuariosRepository.findOne({
      where: { email: createUsuarioDto.email },
    });
    if (existe) throw new ConflictException('El email ya está registrado');

    const hashedPassword = await bcrypt.hash(createUsuarioDto.password, 10);
    const usuario = this.usuariosRepository.create({
      ...createUsuarioDto,
      password: hashedPassword,
    });
    return this.usuariosRepository.save(usuario);
  }

  async findAll(): Promise<Usuario[]> {
    return this.usuariosRepository.find({
      where: { activo: true },
      select: ['id', 'nombre', 'apellido', 'email', 'rol', 'sedeId', 'activo', 'createdAt'],
    });
  }

  async findOne(id: string): Promise<Usuario> {
    const usuario = await this.usuariosRepository.findOne({ where: { id } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    return usuario;
  }

  async findByEmail(email: string): Promise<Usuario | null> {
    return this.usuariosRepository.findOne({ where: { email } });
  }

  async remove(id: string): Promise<void> {
    const usuario = await this.findOne(id);
    usuario.activo = false;
    await this.usuariosRepository.save(usuario);
  }
}
