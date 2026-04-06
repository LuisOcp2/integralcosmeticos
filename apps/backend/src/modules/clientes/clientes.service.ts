import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, EntityManager, QueryFailedError, Repository } from 'typeorm';
import { EstadoVenta } from '@cosmeticos/shared-types';
import { Cliente } from './entities/cliente.entity';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { ClientesQueryDto } from './dto/clientes-query.dto';
import { Venta } from '../ventas/entities/venta.entity';

@Injectable()
export class ClientesService {
  constructor(
    @InjectRepository(Cliente)
    private readonly clientesRepository: Repository<Cliente>,
    @InjectRepository(Venta)
    private readonly ventasRepository: Repository<Venta>,
  ) {}

  private normalizarTipoDocumento(valor: string): Cliente['tipoDocumento'] {
    if (valor === 'PASAPORTE') {
      return 'PAS';
    }
    return valor as Cliente['tipoDocumento'];
  }

  async create(dto: CreateClienteDto): Promise<Cliente> {
    const payload = this.normalizarPayload(dto);

    const [porDocumento, porEmail] = await Promise.all([
      this.clientesRepository.findOne({ where: { numeroDocumento: payload.numeroDocumento } }),
      payload.email ? this.clientesRepository.findOne({ where: { email: payload.email } }) : null,
    ]);

    if (porDocumento) {
      throw new ConflictException('Ya existe un cliente con ese numero de documento');
    }

    if (payload.email && porEmail) {
      throw new ConflictException('Ya existe un cliente con ese email');
    }

    const cliente = this.clientesRepository.create({
      ...payload,
      puntos: 0,
      totalCompras: 0,
      cantidadCompras: 0,
      activo: true,
    });

    try {
      return await this.clientesRepository.save(cliente);
    } catch (error) {
      this.handleUniqueConstraintError(error);
      throw error;
    }
  }

  async findAll(query: ClientesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const qb = this.clientesRepository
      .createQueryBuilder('cliente')
      .where('cliente.activo = true')
      .orderBy('cliente.createdAt', 'DESC');

    if (query.q?.trim()) {
      const term = `%${query.q.trim().toLowerCase()}%`;
      qb.andWhere(
        new Brackets((subQb) => {
          subQb
            .where('LOWER(cliente.nombre) LIKE :term', { term })
            .orWhere("LOWER(COALESCE(cliente.apellido, '')) LIKE :term", { term })
            .orWhere('LOWER(cliente.numeroDocumento) LIKE :term', { term })
            .orWhere("LOWER(COALESCE(cliente.telefono, '')) LIKE :term", { term })
            .orWhere("LOWER(COALESCE(cliente.celular, '')) LIKE :term", { term })
            .orWhere("LOWER(COALESCE(cliente.email, '')) LIKE :term", { term });
        }),
      );
    }

    if (query.ciudad?.trim()) {
      qb.andWhere("LOWER(COALESCE(cliente.ciudad, '')) = :ciudad", {
        ciudad: query.ciudad.trim().toLowerCase(),
      });
    }

    if (query.puntosMinimos !== undefined) {
      qb.andWhere('cliente.puntos >= :puntosMinimos', { puntosMinimos: query.puntosMinimos });
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

  async findOne(id: string): Promise<Cliente> {
    const cliente = await this.clientesRepository.findOne({ where: { id } });

    if (!cliente) {
      throw new NotFoundException('Cliente no encontrado');
    }

    return cliente;
  }

  async update(id: string, dto: UpdateClienteDto): Promise<Cliente> {
    const cliente = await this.findOne(id);
    const payload = this.normalizarPayload(dto);

    if (payload.numeroDocumento && payload.numeroDocumento !== cliente.numeroDocumento) {
      const existente = await this.clientesRepository.findOne({
        where: { numeroDocumento: payload.numeroDocumento },
      });
      if (existente && existente.id !== cliente.id) {
        throw new ConflictException('Ya existe un cliente con ese numero de documento');
      }
    }

    if (payload.email !== undefined && payload.email !== cliente.email) {
      if (payload.email) {
        const existente = await this.clientesRepository.findOne({
          where: { email: payload.email },
        });
        if (existente && existente.id !== cliente.id) {
          throw new ConflictException('Ya existe un cliente con ese email');
        }
      }
    }

    Object.assign(cliente, payload);

    try {
      return await this.clientesRepository.save(cliente);
    } catch (error) {
      this.handleUniqueConstraintError(error);
      throw error;
    }
  }

  async remove(id: string): Promise<Cliente> {
    const cliente = await this.findOne(id);
    cliente.activo = false;
    return this.clientesRepository.save(cliente);
  }

  async findByDocumento(numeroDocumento: string): Promise<Cliente> {
    const cliente = await this.clientesRepository.findOne({
      where: { numeroDocumento: numeroDocumento.trim() },
    });

    if (!cliente) {
      throw new NotFoundException('Cliente no encontrado para el documento enviado');
    }

    return cliente;
  }

  async findOneConHistorial(id: string): Promise<{ cliente: Cliente; historial: Venta[] }> {
    const [cliente, historialResponse] = await Promise.all([
      this.findOne(id),
      this.getHistorialCompras(id, 1, 10),
    ]);

    return {
      cliente,
      historial: historialResponse.items,
    };
  }

  async registrarCompra(clienteId: string, montoTotal: number): Promise<Cliente> {
    const cliente = await this.findOne(clienteId);
    const totalCompra = Number(montoTotal);
    const puntosGanados = Math.floor(totalCompra / 1000);

    cliente.totalCompras = Number(cliente.totalCompras) + totalCompra;
    cliente.cantidadCompras += 1;
    cliente.puntos += puntosGanados;

    return this.clientesRepository.save(cliente);
  }

  async sumarPuntosConManager(
    clienteId: string,
    puntos: number,
    manager: EntityManager,
    montoTotal?: number,
  ): Promise<Cliente> {
    const repo = manager.getRepository(Cliente);
    const cliente = await repo.findOne({ where: { id: clienteId, activo: true } });

    if (!cliente) {
      throw new NotFoundException('Cliente no encontrado');
    }

    const puntosAplicar = Math.max(0, Math.floor(Number(puntos) || 0));
    cliente.puntos += puntosAplicar;

    if (montoTotal !== undefined) {
      const compra = Number(montoTotal);
      cliente.totalCompras = Number(cliente.totalCompras) + compra;
      cliente.cantidadCompras += 1;
    }

    return repo.save(cliente);
  }

  async setPuntos(clienteId: string, puntos: number): Promise<Cliente> {
    const cliente = await this.findOne(clienteId);
    cliente.puntos = Math.max(0, puntos);
    return this.clientesRepository.save(cliente);
  }

  async getHistorialCompras(clienteId: string, page = 1, limit = 20) {
    await this.findOne(clienteId);
    const offset = (page - 1) * limit;

    const qb = this.ventasRepository
      .createQueryBuilder('venta')
      .leftJoinAndSelect('venta.detalles', 'detalles')
      .where('venta.clienteId = :clienteId', { clienteId })
      .andWhere('venta.estado = :estado', { estado: EstadoVenta.COMPLETADA })
      .orderBy('venta.createdAt', 'DESC');

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

  async getClientesFrecuentes(sedeId?: string, top = 10) {
    const qb = this.clientesRepository
      .createQueryBuilder('cliente')
      .leftJoin(Venta, 'venta', 'venta.clienteId = cliente.id AND venta.estado = :estado', {
        estado: EstadoVenta.COMPLETADA,
      })
      .where('cliente.activo = true')
      .select('cliente.id', 'id')
      .addSelect('cliente.nombre', 'nombre')
      .addSelect('cliente.apellido', 'apellido')
      .addSelect('cliente.numeroDocumento', 'numeroDocumento')
      .addSelect('cliente.totalCompras', 'totalCompras')
      .addSelect('cliente.cantidadCompras', 'cantidadCompras')
      .addSelect('cliente.puntos', 'puntos')
      .groupBy('cliente.id')
      .addGroupBy('cliente.nombre')
      .addGroupBy('cliente.apellido')
      .addGroupBy('cliente.numeroDocumento')
      .addGroupBy('cliente.totalCompras')
      .addGroupBy('cliente.cantidadCompras')
      .addGroupBy('cliente.puntos')
      .orderBy('cliente.totalCompras', 'DESC')
      .limit(top);

    if (sedeId) {
      qb.andWhere('venta.sedeId = :sedeId', { sedeId });
    }

    const rows = await qb.getRawMany<{
      id: string;
      nombre: string;
      apellido?: string | null;
      numeroDocumento: string;
      totalCompras: string;
      cantidadCompras: string;
      puntos: string;
    }>();

    return rows.map((row) => ({
      id: row.id,
      nombre: row.nombre,
      apellido: row.apellido ?? null,
      numeroDocumento: row.numeroDocumento,
      totalCompras: Number(row.totalCompras),
      cantidadCompras: Number(row.cantidadCompras),
      puntos: Number(row.puntos),
    }));
  }

  async getCumpleaniosHoy() {
    const hoy = new Date();
    const mes = `${hoy.getMonth() + 1}`.padStart(2, '0');
    const dia = `${hoy.getDate()}`.padStart(2, '0');

    return this.clientesRepository
      .createQueryBuilder('cliente')
      .where('cliente.activo = true')
      .andWhere('cliente.fechaNacimiento IS NOT NULL')
      .andWhere("TO_CHAR(cliente.fechaNacimiento, 'MM-DD') = :mmdd", { mmdd: `${mes}-${dia}` })
      .orderBy('cliente.nombre', 'ASC')
      .addOrderBy('cliente.apellido', 'ASC')
      .getMany();
  }

  async getEstadisticas() {
    const total = await this.clientesRepository.count();

    const [activos, conEmail, comprasRaw, topCiudadesRaw] = await Promise.all([
      this.clientesRepository.count({ where: { activo: true } }),
      this.clientesRepository
        .createQueryBuilder('cliente')
        .where('cliente.email IS NOT NULL')
        .andWhere("TRIM(cliente.email) <> ''")
        .getCount(),
      this.clientesRepository
        .createQueryBuilder('cliente')
        .select('COALESCE(SUM(cliente.totalCompras), 0)', 'suma')
        .addSelect('COALESCE(AVG(cliente.totalCompras), 0)', 'promedio')
        .getRawOne<{ suma: string; promedio: string }>(),
      this.clientesRepository
        .createQueryBuilder('cliente')
        .select('COALESCE(cliente.ciudad, :sinCiudad)', 'ciudad')
        .addSelect('COUNT(cliente.id)', 'cantidad')
        .setParameter('sinCiudad', 'SIN_CIUDAD')
        .where('cliente.activo = true')
        .groupBy('cliente.ciudad')
        .orderBy('COUNT(cliente.id)', 'DESC')
        .limit(5)
        .getRawMany<{ ciudad: string; cantidad: string }>(),
    ]);

    return {
      total,
      activos,
      conEmail,
      promedioCompras: Number(comprasRaw?.promedio ?? 0),
      totalCompras: Number(comprasRaw?.suma ?? 0),
      topCiudades: topCiudadesRaw.map((row) => ({
        ciudad: row.ciudad,
        cantidad: Number(row.cantidad),
      })),
    };
  }

  async getSegmentos() {
    const ahora = new Date();
    const fechaNuevo = new Date(ahora);
    fechaNuevo.setDate(fechaNuevo.getDate() - 30);

    const fechaInactivo = new Date(ahora);
    fechaInactivo.setDate(fechaInactivo.getDate() - 90);

    const [vip, frecuente, nuevo, inactivo] = await Promise.all([
      this.clientesRepository
        .createQueryBuilder('cliente')
        .where('cliente.activo = true')
        .andWhere('cliente.totalCompras > :monto', { monto: 500000 })
        .getCount(),
      this.clientesRepository
        .createQueryBuilder('cliente')
        .where('cliente.activo = true')
        .andWhere('cliente.cantidadCompras > 10')
        .getCount(),
      this.clientesRepository
        .createQueryBuilder('cliente')
        .where('cliente.activo = true')
        .andWhere('cliente.createdAt >= :fechaNuevo', { fechaNuevo })
        .getCount(),
      this.clientesRepository
        .createQueryBuilder('cliente')
        .where('cliente.activo = true')
        .andWhere(
          `NOT EXISTS (
            SELECT 1 FROM ventas venta
            WHERE venta."clienteId" = cliente.id
              AND venta.estado = :estado
              AND venta."createdAt" >= :fechaInactivo
          )`,
          { estado: EstadoVenta.COMPLETADA, fechaInactivo },
        )
        .getCount(),
    ]);

    return {
      VIP: vip,
      FRECUENTE: frecuente,
      NUEVO: nuevo,
      INACTIVO: inactivo,
    };
  }

  private normalizarPayload(dto: Partial<CreateClienteDto>): Partial<Cliente> {
    const payload: Partial<Cliente> = {};

    if (dto.tipoDocumento !== undefined) {
      payload.tipoDocumento = this.normalizarTipoDocumento(dto.tipoDocumento);
    }

    if (dto.numeroDocumento !== undefined) {
      payload.numeroDocumento = dto.numeroDocumento.trim();
    }

    if (dto.nombre !== undefined) {
      payload.nombre = dto.nombre.trim();
    }

    if (dto.apellido !== undefined) {
      payload.apellido = dto.apellido?.trim() ? dto.apellido.trim() : null;
    }

    if (dto.email !== undefined) {
      payload.email = dto.email?.trim() ? dto.email.trim().toLowerCase() : null;
    }

    if (dto.telefono !== undefined) {
      payload.telefono = dto.telefono?.trim() ? dto.telefono.trim() : null;
    }

    if (dto.celular !== undefined) {
      payload.celular = dto.celular?.trim() ? dto.celular.trim() : null;
    }

    if (dto.fechaNacimiento !== undefined) {
      payload.fechaNacimiento = dto.fechaNacimiento ? new Date(dto.fechaNacimiento) : null;
    }

    if (dto.genero !== undefined) {
      payload.genero = dto.genero;
    }

    if (dto.direccion !== undefined) {
      payload.direccion = dto.direccion?.trim() ? dto.direccion.trim() : null;
    }

    if (dto.ciudad !== undefined) {
      payload.ciudad = dto.ciudad?.trim() ? dto.ciudad.trim() : null;
    }

    if (dto.departamento !== undefined) {
      payload.departamento = dto.departamento?.trim() ? dto.departamento.trim() : null;
    }

    if (dto.notas !== undefined) {
      payload.notas = dto.notas?.trim() ? dto.notas.trim() : null;
    }

    if (dto.sedeRegistroId !== undefined) {
      payload.sedeRegistroId = dto.sedeRegistroId ?? null;
    }

    return payload;
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

    if (detail.includes('numerodocumento')) {
      throw new ConflictException('Ya existe un cliente con ese numero de documento');
    }

    if (detail.includes('email')) {
      throw new ConflictException('Ya existe un cliente con ese email');
    }

    throw new ConflictException('Ya existe un cliente con datos unicos duplicados');
  }
}
