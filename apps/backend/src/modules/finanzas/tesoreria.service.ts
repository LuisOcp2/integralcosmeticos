import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CuentaBancaria } from './entities/cuenta-bancaria.entity';
import {
  CategoriaMovimientoBancario,
  MovimientoBancario,
  TipoMovimientoBancario,
} from './entities/movimiento-bancario.entity';
import { RegistrarEgresoDto } from './dto/registrar-egreso.dto';
import { RegistrarIngresoDto } from './dto/registrar-ingreso.dto';
import { CrearCuentaBancariaDto } from './dto/crear-cuenta-bancaria.dto';
import { ActualizarCuentaBancariaDto } from './dto/actualizar-cuenta-bancaria.dto';
import { FiltrosCuentaBancariaDto } from './dto/filtros-cuenta-bancaria.dto';
import { FiltrosMovimientoBancarioDto } from './dto/filtros-movimiento-bancario.dto';

@Injectable()
export class TesoreriaService {
  constructor(
    @InjectRepository(CuentaBancaria)
    private readonly cuentasRepository: Repository<CuentaBancaria>,
    @InjectRepository(MovimientoBancario)
    private readonly movimientosRepository: Repository<MovimientoBancario>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  private round2(value: number): number {
    return Number(value.toFixed(2));
  }

  private async getCuentaOrFail(cuentaId: string): Promise<CuentaBancaria> {
    const cuenta = await this.cuentasRepository.findOne({ where: { id: cuentaId } });
    if (!cuenta) {
      throw new NotFoundException('Cuenta bancaria no encontrada');
    }
    return cuenta;
  }

  async getSaldosActuales() {
    const cuentas = await this.cuentasRepository.find({
      where: { activa: true },
      order: { esPrincipal: 'DESC', nombre: 'ASC' },
    });

    const data = await Promise.all(
      cuentas.map(async (cuenta) => {
        const movimientos = await this.movimientosRepository.find({
          where: { cuentaBancariaId: cuenta.id },
          order: { fecha: 'DESC', createdAt: 'DESC' },
          take: 5,
        });
        return {
          ...cuenta,
          saldoActual: Number(cuenta.saldoActual),
          saldoInicial: Number(cuenta.saldoInicial),
          movimientos,
        };
      }),
    );

    return data;
  }

  async crearCuenta(dto: CrearCuentaBancariaDto) {
    const cuenta = this.cuentasRepository.create({
      ...dto,
      saldoInicial: this.round2(Number(dto.saldoInicial)),
      saldoActual: this.round2(Number(dto.saldoActual ?? dto.saldoInicial)),
      activa: dto.activa ?? true,
      esPrincipal: dto.esPrincipal ?? false,
      moneda: (dto.moneda ?? 'COP').toUpperCase(),
    });

    if (cuenta.esPrincipal) {
      await this.cuentasRepository.update({ esPrincipal: true }, { esPrincipal: false });
    }

    return this.cuentasRepository.save(cuenta);
  }

  async listarCuentas(query: FiltrosCuentaBancariaDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const qb = this.cuentasRepository.createQueryBuilder('cuenta').orderBy('cuenta.nombre', 'ASC');

    if (query.tipoCuenta) {
      qb.andWhere('cuenta.tipoCuenta = :tipoCuenta', { tipoCuenta: query.tipoCuenta });
    }
    if (query.activa !== undefined) {
      qb.andWhere('cuenta.activa = :activa', { activa: query.activa });
    }
    if (query.q?.trim()) {
      qb.andWhere(
        '(LOWER(cuenta.nombre) LIKE :q OR LOWER(cuenta.banco) LIKE :q OR LOWER(cuenta.numeroCuenta) LIKE :q)',
        { q: `%${query.q.trim().toLowerCase()}%` },
      );
    }

    const [items, total] = await Promise.all([
      qb.clone().skip(offset).take(limit).getMany(),
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

  async obtenerCuenta(id: string) {
    return this.getCuentaOrFail(id);
  }

  async actualizarCuenta(id: string, dto: ActualizarCuentaBancariaDto) {
    const cuenta = await this.getCuentaOrFail(id);
    Object.assign(cuenta, dto);
    if (dto.moneda) {
      cuenta.moneda = dto.moneda.toUpperCase();
    }
    if (dto.esPrincipal) {
      await this.cuentasRepository.update({ esPrincipal: true }, { esPrincipal: false });
      cuenta.esPrincipal = true;
    }
    return this.cuentasRepository.save(cuenta);
  }

  async eliminarCuenta(id: string) {
    const cuenta = await this.getCuentaOrFail(id);
    await this.cuentasRepository.remove(cuenta);
    return { ok: true };
  }

  async getMovimientos(query: FiltrosMovimientoBancarioDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const qb = this.movimientosRepository
      .createQueryBuilder('mov')
      .leftJoinAndSelect('mov.cuentaBancaria', 'cuenta')
      .orderBy('mov.fecha', 'DESC')
      .addOrderBy('mov.createdAt', 'DESC');

    if (query.cuentaBancariaId) {
      qb.andWhere('mov.cuentaBancariaId = :cuentaBancariaId', {
        cuentaBancariaId: query.cuentaBancariaId,
      });
    }
    if (query.tipo) {
      qb.andWhere('mov.tipo = :tipo', { tipo: query.tipo });
    }
    if (query.categoria) {
      qb.andWhere('mov.categoria = :categoria', { categoria: query.categoria });
    }
    if (query.conciliado !== undefined) {
      qb.andWhere('mov.conciliado = :conciliado', { conciliado: query.conciliado });
    }
    if (query.fechaDesde) {
      qb.andWhere('mov.fecha >= :fechaDesde', { fechaDesde: query.fechaDesde });
    }
    if (query.fechaHasta) {
      qb.andWhere('mov.fecha <= :fechaHasta', { fechaHasta: query.fechaHasta });
    }

    const [items, total] = await Promise.all([
      qb.clone().skip(offset).take(limit).getMany(),
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

  async registrarIngreso(cuentaId: string, dto: RegistrarIngresoDto, userId: string) {
    const cuenta = await this.getCuentaOrFail(cuentaId);
    const monto = this.round2(Number(dto.monto));
    if (monto <= 0) {
      throw new BadRequestException('El monto debe ser mayor a cero');
    }

    const saldoActual = this.round2(Number(cuenta.saldoActual));
    const saldoDespues = this.round2(saldoActual + monto);

    const movimiento = this.movimientosRepository.create({
      cuentaBancariaId: cuenta.id,
      fecha: dto.fecha ?? new Date().toISOString().slice(0, 10),
      descripcion: dto.descripcion,
      referencia: dto.referencia?.trim() || null,
      tipo: TipoMovimientoBancario.INGRESO,
      monto,
      saldoDespues,
      categoria: dto.categoria,
      conciliado: false,
      ventaId: dto.ventaId ?? null,
      facturaId: dto.facturaId ?? null,
      ordenCompraId: null,
      registradoPorId: userId,
    });

    cuenta.saldoActual = saldoDespues;
    await this.cuentasRepository.save(cuenta);
    return this.movimientosRepository.save(movimiento);
  }

  async registrarEgreso(cuentaId: string, dto: RegistrarEgresoDto, userId: string) {
    const cuenta = await this.getCuentaOrFail(cuentaId);
    const monto = this.round2(Number(dto.monto));
    if (monto <= 0) {
      throw new BadRequestException('El monto debe ser mayor a cero');
    }

    const saldoActual = this.round2(Number(cuenta.saldoActual));
    const saldoDespues = this.round2(saldoActual - monto);

    const movimiento = this.movimientosRepository.create({
      cuentaBancariaId: cuenta.id,
      fecha: dto.fecha ?? new Date().toISOString().slice(0, 10),
      descripcion: dto.descripcion,
      referencia: dto.referencia?.trim() || null,
      tipo: TipoMovimientoBancario.EGRESO,
      monto,
      saldoDespues,
      categoria: dto.categoria,
      conciliado: false,
      ventaId: null,
      facturaId: null,
      ordenCompraId: dto.ordenCompraId ?? null,
      registradoPorId: userId,
    });

    cuenta.saldoActual = saldoDespues;
    await this.cuentasRepository.save(cuenta);
    return this.movimientosRepository.save(movimiento);
  }

  async trasladarEntreCuentas(
    cuentaOrigenId: string,
    cuentaDestinoId: string,
    montoInput: number,
    descripcion: string,
    userId: string,
  ) {
    if (cuentaOrigenId === cuentaDestinoId) {
      throw new BadRequestException('La cuenta origen y destino deben ser diferentes');
    }

    const monto = this.round2(Number(montoInput));
    if (monto <= 0) {
      throw new BadRequestException('El monto debe ser mayor a cero');
    }

    return this.dataSource.transaction(async (manager) => {
      const cuentasRepo = manager.getRepository(CuentaBancaria);
      const movimientosRepo = manager.getRepository(MovimientoBancario);

      const [origen, destino] = await Promise.all([
        cuentasRepo.findOne({ where: { id: cuentaOrigenId } }),
        cuentasRepo.findOne({ where: { id: cuentaDestinoId } }),
      ]);

      if (!origen || !destino) {
        throw new NotFoundException('Cuenta de origen o destino no encontrada');
      }

      const saldoOrigenDespues = this.round2(Number(origen.saldoActual) - monto);
      const saldoDestinoDespues = this.round2(Number(destino.saldoActual) + monto);
      const referencia = `TRASLADO-${Date.now()}`;

      const fecha = new Date().toISOString().slice(0, 10);
      const movimientoOrigen = movimientosRepo.create({
        cuentaBancariaId: origen.id,
        fecha,
        descripcion,
        referencia,
        tipo: TipoMovimientoBancario.EGRESO,
        monto,
        saldoDespues: saldoOrigenDespues,
        categoria: CategoriaMovimientoBancario.OTRO,
        conciliado: false,
        registradoPorId: userId,
      });

      const movimientoDestino = movimientosRepo.create({
        cuentaBancariaId: destino.id,
        fecha,
        descripcion,
        referencia,
        tipo: TipoMovimientoBancario.INGRESO,
        monto,
        saldoDespues: saldoDestinoDespues,
        categoria: CategoriaMovimientoBancario.OTRO,
        conciliado: false,
        registradoPorId: userId,
      });

      origen.saldoActual = saldoOrigenDespues;
      destino.saldoActual = saldoDestinoDespues;

      await Promise.all([
        movimientosRepo.save(movimientoOrigen),
        movimientosRepo.save(movimientoDestino),
        cuentasRepo.save(origen),
        cuentasRepo.save(destino),
      ]);

      return {
        referencia,
        origen: movimientoOrigen,
        destino: movimientoDestino,
      };
    });
  }

  async getFlujoCaja(cuentaId: string | undefined, fechaDesde: string, fechaHasta: string) {
    const qb = this.movimientosRepository
      .createQueryBuilder('mov')
      .select('mov.fecha', 'fecha')
      .addSelect(
        `COALESCE(SUM(CASE WHEN mov.tipo = '${TipoMovimientoBancario.INGRESO}' THEN mov.monto ELSE 0 END), 0)`,
        'ingresos',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN mov.tipo = '${TipoMovimientoBancario.EGRESO}' THEN mov.monto ELSE 0 END), 0)`,
        'egresos',
      )
      .where('mov.fecha BETWEEN :fechaDesde AND :fechaHasta', { fechaDesde, fechaHasta });

    if (cuentaId) {
      qb.andWhere('mov.cuentaBancariaId = :cuentaId', { cuentaId });
    }

    const rows = await qb.groupBy('mov.fecha').orderBy('mov.fecha', 'ASC').getRawMany<{
      fecha: string;
      ingresos: string;
      egresos: string;
    }>();

    const serie = rows.map((row) => {
      const ingresos = this.round2(Number(row.ingresos ?? 0));
      const egresos = this.round2(Number(row.egresos ?? 0));
      return {
        fecha: row.fecha,
        ingresos,
        egresos,
        neto: this.round2(ingresos - egresos),
      };
    });

    return {
      fechaDesde,
      fechaHasta,
      cuentaId: cuentaId ?? null,
      serie,
      totalIngresos: this.round2(serie.reduce((acc, item) => acc + item.ingresos, 0)),
      totalEgresos: this.round2(serie.reduce((acc, item) => acc + item.egresos, 0)),
    };
  }

  async getResumenTesoreria() {
    const cuentas = await this.cuentasRepository.find();
    const saldoTotal = this.round2(
      cuentas.reduce((acc, cuenta) => acc + Number(cuenta.saldoActual), 0),
    );

    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
    const flujoMes = await this.getFlujoCaja(undefined, firstDay, lastDay);

    const alertas = cuentas
      .filter((cuenta) => Number(cuenta.saldoActual) < 0)
      .map((cuenta) => ({
        tipo: 'saldo_negativo',
        cuentaId: cuenta.id,
        mensaje: `${cuenta.nombre} presenta saldo negativo`,
        saldoActual: Number(cuenta.saldoActual),
      }));

    return {
      saldoTotal,
      cuentas: cuentas.map((cuenta) => ({
        ...cuenta,
        saldoActual: Number(cuenta.saldoActual),
        saldoInicial: Number(cuenta.saldoInicial),
      })),
      flujoMes,
      alertas,
    };
  }
}
