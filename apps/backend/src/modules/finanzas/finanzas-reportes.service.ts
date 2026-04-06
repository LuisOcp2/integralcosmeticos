import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Factura } from '../comercial/entities/factura.entity';
import { PresupuestoMensual } from './entities/presupuesto-mensual.entity';
import { MovimientoBancario } from './entities/movimiento-bancario.entity';
import { CuentaBancaria } from './entities/cuenta-bancaria.entity';
import { PeriodoContable } from './entities/periodo-contable.entity';
import { FiltrosPeriodoContableDto } from './dto/filtros-periodo-contable.dto';
import { CerrarPeriodoContableDto } from './dto/cerrar-periodo-contable.dto';
import { FiltrosPresupuestoMensualDto } from './dto/filtros-presupuesto-mensual.dto';
import { CrearPresupuestoMensualDto } from './dto/crear-presupuesto-mensual.dto';
import { ActualizarPresupuestoMensualDto } from './dto/actualizar-presupuesto-mensual.dto';
import { EstadoPeriodoFinanciero } from './entities/periodo-contable.entity';

@Injectable()
export class FinanzasReportesService {
  constructor(
    @InjectRepository(PresupuestoMensual)
    private readonly presupuestosRepository: Repository<PresupuestoMensual>,
    @InjectRepository(MovimientoBancario)
    private readonly movimientosRepository: Repository<MovimientoBancario>,
    @InjectRepository(CuentaBancaria)
    private readonly cuentasRepository: Repository<CuentaBancaria>,
    @InjectRepository(Factura)
    private readonly facturasRepository: Repository<Factura>,
    @InjectRepository(PeriodoContable)
    private readonly periodosRepository: Repository<PeriodoContable>,
  ) {}

  private round2(value: number): number {
    return Number(value.toFixed(2));
  }

  async listarPeriodos(query: FiltrosPeriodoContableDto) {
    const qb = this.periodosRepository
      .createQueryBuilder('periodo')
      .orderBy('periodo.ano', 'DESC')
      .addOrderBy('periodo.mes', 'DESC');

    if (query.ano) {
      qb.andWhere('periodo.ano = :ano', { ano: query.ano });
    }
    if (query.mes) {
      qb.andWhere('periodo.mes = :mes', { mes: query.mes });
    }
    if (query.estado) {
      qb.andWhere('periodo.estado = :estado', { estado: query.estado });
    }

    return qb.getMany();
  }

  async cerrarPeriodo(id: string, dto: CerrarPeriodoContableDto, userId: string) {
    const periodo = await this.periodosRepository.findOne({ where: { id } });
    if (!periodo) {
      return null;
    }

    periodo.estado = dto.estado ?? EstadoPeriodoFinanciero.CERRADO;
    periodo.fechaCierre = new Date();
    periodo.cerradoPorId = userId;
    return this.periodosRepository.save(periodo);
  }

  async listarPresupuestos(query: FiltrosPresupuestoMensualDto) {
    const qb = this.presupuestosRepository
      .createQueryBuilder('presupuesto')
      .leftJoinAndSelect('presupuesto.periodo', 'periodo')
      .orderBy('periodo.ano', 'DESC')
      .addOrderBy('periodo.mes', 'DESC')
      .addOrderBy('presupuesto.categoria', 'ASC');

    if (query.periodoId) {
      qb.andWhere('presupuesto.periodoId = :periodoId', { periodoId: query.periodoId });
    }
    if (query.tipo) {
      qb.andWhere('presupuesto.tipo = :tipo', { tipo: query.tipo });
    }
    if (query.mes) {
      qb.andWhere('periodo.mes = :mes', { mes: query.mes });
    }
    if (query.ano) {
      qb.andWhere('periodo.ano = :ano', { ano: query.ano });
    }

    return qb.getMany();
  }

  async crearPresupuesto(dto: CrearPresupuestoMensualDto) {
    const presupuesto = this.presupuestosRepository.create(dto);
    return this.presupuestosRepository.save(presupuesto);
  }

  async actualizarPresupuesto(id: string, dto: ActualizarPresupuestoMensualDto) {
    const presupuesto = await this.presupuestosRepository.findOne({ where: { id } });
    if (!presupuesto) {
      return null;
    }
    Object.assign(presupuesto, dto);
    return this.presupuestosRepository.save(presupuesto);
  }

  async eliminarPresupuesto(id: string) {
    const presupuesto = await this.presupuestosRepository.findOne({ where: { id } });
    if (!presupuesto) {
      return { ok: true };
    }
    await this.presupuestosRepository.remove(presupuesto);
    return { ok: true };
  }

  async getEjecucionPresupuesto(mes: number, ano: number) {
    const periodo = await this.periodosRepository.findOne({ where: { mes, ano } });
    if (!periodo) {
      return {
        mes,
        ano,
        periodoId: null,
        items: [],
      };
    }

    const presupuestos = await this.presupuestosRepository.find({
      where: { periodoId: periodo.id },
      order: { categoria: 'ASC' },
    });

    const fechaDesde = new Date(ano, mes - 1, 1).toISOString().slice(0, 10);
    const fechaHasta = new Date(ano, mes, 0).toISOString().slice(0, 10);

    const items = await Promise.all(
      presupuestos.map(async (presupuesto) => {
        const row = await this.movimientosRepository
          .createQueryBuilder('mov')
          .select('COALESCE(SUM(mov.monto), 0)', 'total')
          .where('mov.fecha BETWEEN :fechaDesde AND :fechaHasta', { fechaDesde, fechaHasta })
          .andWhere('mov.categoria = :categoria', { categoria: presupuesto.categoria })
          .andWhere('mov.tipo = :tipo', { tipo: presupuesto.tipo })
          .getRawOne<{ total: string }>();

        const presupuestado = this.round2(Number(presupuesto.montoPresupuestado));
        const ejecutado = this.round2(Number(row?.total ?? presupuesto.montoEjecutado ?? 0));
        return {
          id: presupuesto.id,
          categoria: presupuesto.categoria,
          tipo: presupuesto.tipo,
          presupuestado,
          ejecutado,
          diferencia: this.round2(presupuestado - ejecutado),
          porcentaje: presupuestado > 0 ? this.round2((ejecutado / presupuestado) * 100) : 0,
        };
      }),
    );

    return {
      mes,
      ano,
      periodoId: periodo.id,
      estado: periodo.estado,
      items,
    };
  }

  async getIndicadores() {
    const saldoTotal = this.round2(
      (await this.cuentasRepository.find()).reduce(
        (acc, cuenta) => acc + Number(cuenta.saldoActual),
        0,
      ),
    );

    const hoy = new Date();
    const proximaFecha = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 30)
      .toISOString()
      .slice(0, 10);

    const cuentasPorCobrar = await this.facturasRepository
      .createQueryBuilder('factura')
      .select('COALESCE(SUM(factura.saldo), 0)', 'total')
      .where('factura.saldo > 0')
      .getRawOne<{ total: string }>();

    const pagosProximos = await this.facturasRepository
      .createQueryBuilder('factura')
      .select('COALESCE(SUM(factura.saldo), 0)', 'total')
      .where('factura.saldo > 0')
      .andWhere('factura.fechaVencimiento BETWEEN :hoy AND :proximaFecha', {
        hoy: hoy.toISOString().slice(0, 10),
        proximaFecha,
      })
      .getRawOne<{ total: string }>();

    const diasCarteraRaw = await this.facturasRepository
      .createQueryBuilder('factura')
      .select('COALESCE(AVG(factura."fechaPago"::date - factura."fechaEmision"::date), 0)', 'dias')
      .where('factura.fechaPago IS NOT NULL')
      .getRawOne<{ dias: string }>();

    const totalPagosProximos30dias = this.round2(Number(pagosProximos?.total ?? 0));
    const cuentasPorCobrarTotal = this.round2(Number(cuentasPorCobrar?.total ?? 0));

    return {
      liquidez:
        totalPagosProximos30dias > 0
          ? this.round2(saldoTotal / totalPagosProximos30dias)
          : saldoTotal > 0
            ? 999
            : 0,
      diasCartera: this.round2(Number(diasCarteraRaw?.dias ?? 0)),
      cuentasPorCobrar: cuentasPorCobrarTotal,
      saldoTotal,
      totalPagosProximos30dias,
    };
  }
}
