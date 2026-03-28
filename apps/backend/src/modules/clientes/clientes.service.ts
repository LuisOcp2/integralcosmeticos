import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cliente } from './entities/cliente.entity';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { Venta } from '../ventas/entities/venta.entity';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { TipoDocumentoConfiguracion } from '../configuraciones/entities/tipo-documento-configuracion.entity';

@Injectable()
export class ClientesService {
  constructor(
    @InjectRepository(Cliente)
    private readonly clientesRepository: Repository<Cliente>,
    @InjectRepository(Venta)
    private readonly ventasRepository: Repository<Venta>,
    @InjectRepository(TipoDocumentoConfiguracion)
    private readonly tiposDocumentoRepository: Repository<TipoDocumentoConfiguracion>,
  ) {}

  async create(dto: CreateClienteDto): Promise<Cliente> {
    const tipoDocumento = await this.validarTipoDocumentoActivo(dto.tipoDocumento);

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
      tipoDocumento: tipoDocumento.codigo,
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

  async findOneConHistorial(id: string): Promise<{ cliente: Cliente; historial: Venta[] }> {
    const [cliente, historial] = await Promise.all([
      this.findOne(id),
      this.getHistorialCompras(id),
    ]);
    return {
      cliente,
      historial,
    };
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

  async update(id: string, dto: UpdateClienteDto): Promise<Cliente> {
    const cliente = await this.findOne(id);

    const documento = dto.documento?.trim();
    if (documento && documento !== cliente.documento) {
      const existenteDocumento = await this.clientesRepository.findOne({
        where: { documento },
      });
      if (existenteDocumento?.activo && existenteDocumento.id !== cliente.id) {
        throw new ConflictException('Ya existe un cliente activo con ese documento');
      }
      cliente.documento = documento;
    }

    const emailNormalizado = dto.email?.trim().toLowerCase();
    if (emailNormalizado !== undefined && emailNormalizado !== (cliente.email ?? undefined)) {
      if (emailNormalizado) {
        const existenteEmail = await this.clientesRepository.findOne({
          where: { email: emailNormalizado },
        });
        if (existenteEmail?.activo && existenteEmail.id !== cliente.id) {
          throw new ConflictException('Ya existe un cliente activo con ese email');
        }
        cliente.email = emailNormalizado;
      } else {
        cliente.email = null;
      }
    }

    if (dto.nombre !== undefined) {
      cliente.nombre = dto.nombre;
    }

    if (dto.apellido !== undefined) {
      cliente.apellido = dto.apellido;
    }

    if (dto.tipoDocumento !== undefined) {
      const tipoDocumento = await this.validarTipoDocumentoActivo(dto.tipoDocumento);
      cliente.tipoDocumento = tipoDocumento.codigo;
    }

    if (dto.telefono !== undefined) {
      cliente.telefono = dto.telefono?.trim() ? dto.telefono.trim() : null;
    }

    if (dto.direccion !== undefined) {
      cliente.direccion = dto.direccion?.trim() ? dto.direccion.trim() : null;
    }

    if (dto.fechaNacimiento !== undefined) {
      cliente.fechaNacimiento = dto.fechaNacimiento ? new Date(dto.fechaNacimiento) : null;
    }

    return this.clientesRepository.save(cliente);
  }

  async sumarPuntos(clienteId: string, puntos: number): Promise<Cliente> {
    const cliente = await this.findOne(clienteId);
    cliente.puntosFidelidad += Math.max(0, puntos);
    return this.clientesRepository.save(cliente);
  }

  async setPuntos(clienteId: string, puntos: number): Promise<Cliente> {
    const cliente = await this.findOne(clienteId);
    cliente.puntosFidelidad = Math.max(0, puntos);
    return this.clientesRepository.save(cliente);
  }

  async getHistorialCompras(clienteId: string): Promise<Venta[]> {
    await this.findOne(clienteId);

    return this.ventasRepository.find({
      where: { clienteId },
      relations: ['detalles'],
      order: { createdAt: 'DESC' },
    });
  }

  private async validarTipoDocumentoActivo(codigo: string): Promise<TipoDocumentoConfiguracion> {
    const codigoNormalizado = codigo.trim().toUpperCase();
    const tipoDocumento = await this.tiposDocumentoRepository.findOne({
      where: { codigo: codigoNormalizado, activo: true },
    });

    if (!tipoDocumento) {
      const totalActivos = await this.tiposDocumentoRepository.count({ where: { activo: true } });
      const legacyPermitidos = ['CC', 'NIT', 'PASAPORTE'];

      if (totalActivos === 0 && legacyPermitidos.includes(codigoNormalizado)) {
        return {
          id: 'legacy-default',
          codigo: codigoNormalizado,
          nombre: codigoNormalizado,
          activo: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as TipoDocumentoConfiguracion;
      }

      throw new NotFoundException('Tipo de documento no encontrado o inactivo en configuracion');
    }

    return tipoDocumento;
  }
}
