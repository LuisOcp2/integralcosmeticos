import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cliente } from './entities/cliente.entity';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { Venta } from '../ventas/entities/venta.entity';

@Injectable()
export class ClientesService {
  constructor(
    @InjectRepository(Cliente)
    private readonly clientesRepository: Repository<Cliente>,
    @InjectRepository(Venta)
    private readonly ventasRepository: Repository<Venta>,
  ) {}

  async create(dto: CreateClienteDto): Promise<Cliente> {
    const [porDocumento, porEmail] = await Promise.all([
      this.clientesRepository.findOne({ where: { documento: dto.documento } }),
      dto.email ? this.clientesRepository.findOne({ where: { email: dto.email } }) : null,
    ]);

    if (porDocumento?.activo) {
      throw new ConflictException('Ya existe un cliente activo con ese documento');
    }

    if (dto.email && porEmail?.activo) {
      throw new ConflictException('Ya existe un cliente activo con ese email');
    }

    const cliente = this.clientesRepository.create({
      ...dto,
      fechaNacimiento: dto.fechaNacimiento ? new Date(dto.fechaNacimiento) : null,
      activo: true,
      puntosFidelidad: 0,
    });

    return this.clientesRepository.save(cliente);
  }

  async findAll(): Promise<Cliente[]> {
    return this.clientesRepository.find({
      where: { activo: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Cliente> {
    const cliente = await this.clientesRepository.findOne({
      where: { id, activo: true },
    });

    if (!cliente) {
      throw new NotFoundException('Cliente no encontrado');
    }

    return cliente;
  }

  async findByDocumento(documento: string): Promise<Cliente> {
    const cliente = await this.clientesRepository.findOne({
      where: { documento, activo: true },
    });

    if (!cliente) {
      throw new NotFoundException('Cliente no encontrado para el documento enviado');
    }

    return cliente;
  }

  async sumarPuntos(clienteId: string, puntos: number): Promise<Cliente> {
    const cliente = await this.findOne(clienteId);
    cliente.puntosFidelidad += Math.max(0, puntos);
    return this.clientesRepository.save(cliente);
  }

  async getHistorialCompras(clienteId: string): Promise<Venta[]> {
    await this.findOne(clienteId);

    return this.ventasRepository.find({
      where: { clienteId, activo: true },
      relations: ['detalles'],
      order: { createdAt: 'DESC' },
    });
  }
}
