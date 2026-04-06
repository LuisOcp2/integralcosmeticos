import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CuentaBancaria } from './entities/cuenta-bancaria.entity';
import {
  CategoriaMovimientoBancario,
  MovimientoBancario,
  TipoMovimientoBancario,
} from './entities/movimiento-bancario.entity';

@Injectable()
export class ConciliacionService {
  constructor(
    @InjectRepository(CuentaBancaria)
    private readonly cuentasRepository: Repository<CuentaBancaria>,
    @InjectRepository(MovimientoBancario)
    private readonly movimientosRepository: Repository<MovimientoBancario>,
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

  private getMonthRange(mes: number, ano: number): { desde: string; hasta: string } {
    const desde = new Date(ano, mes - 1, 1).toISOString().slice(0, 10);
    const hasta = new Date(ano, mes, 0).toISOString().slice(0, 10);
    return { desde, hasta };
  }

  async getMovimientosNoConciliados(cuentaId: string, mes: number, ano: number) {
    await this.getCuentaOrFail(cuentaId);
    const { desde, hasta } = this.getMonthRange(mes, ano);

    return this.movimientosRepository
      .find({
        where: {
          cuentaBancariaId: cuentaId,
          conciliado: false,
        },
        order: { fecha: 'ASC', createdAt: 'ASC' },
      })
      .then((items) => items.filter((item) => item.fecha >= desde && item.fecha <= hasta));
  }

  async conciliarMovimiento(movimientoBancarioId: string) {
    const movimiento = await this.movimientosRepository.findOne({
      where: { id: movimientoBancarioId },
    });

    if (!movimiento) {
      throw new NotFoundException('Movimiento bancario no encontrado');
    }

    movimiento.conciliado = true;
    movimiento.conciliadoEn = new Date();
    return this.movimientosRepository.save(movimiento);
  }

  async importarExtractoCSV(cuentaId: string, csvString: string, userId: string) {
    const cuenta = await this.getCuentaOrFail(cuentaId);
    const lines = csvString
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (!lines.length) {
      return { importados: 0, conciliadosAutomatico: 0, pendientes: 0 };
    }

    const [headerLine, ...rows] = lines;
    const headers = headerLine.split(',').map((h) => h.trim().toLowerCase());
    const idxFecha = headers.indexOf('fecha');
    const idxDescripcion = headers.indexOf('descripcion');
    const idxReferencia = headers.indexOf('referencia');
    const idxMonto = headers.indexOf('monto');
    const idxTipo = headers.indexOf('tipo');

    if (idxFecha < 0 || idxDescripcion < 0 || idxMonto < 0 || idxTipo < 0) {
      return { importados: 0, conciliadosAutomatico: 0, pendientes: 0 };
    }

    const referencias = rows
      .map((row) => row.split(',')[idxReferencia]?.trim())
      .filter((value): value is string => Boolean(value));

    const movimientosExistentes = referencias.length
      ? await this.movimientosRepository
          .createQueryBuilder('mov')
          .where('mov.cuentaBancariaId = :cuentaId', { cuentaId })
          .andWhere('mov.referencia IN (:...referencias)', { referencias })
          .getMany()
      : [];

    const referenciasExistentes = new Set(
      movimientosExistentes.map((mov) => (mov.referencia ?? '').trim()).filter(Boolean),
    );

    let saldo = this.round2(Number(cuenta.saldoActual));
    let conciliadosAutomatico = 0;
    let importados = 0;
    const nuevos: MovimientoBancario[] = [];

    for (const row of rows) {
      const cols = row.split(',');
      const fecha = (cols[idxFecha] ?? '').trim();
      const descripcion = (cols[idxDescripcion] ?? '').trim();
      const referencia = (cols[idxReferencia] ?? '').trim() || null;
      const montoRaw = Number((cols[idxMonto] ?? '0').replace(/\./g, '').replace(',', '.'));
      const tipoRaw = (cols[idxTipo] ?? '').trim().toUpperCase();

      if (!fecha || !descripcion || !Number.isFinite(montoRaw) || montoRaw === 0) {
        continue;
      }

      const monto = this.round2(Math.abs(montoRaw));
      const tipo =
        tipoRaw === 'EGRESO' || tipoRaw === 'DEBITO'
          ? TipoMovimientoBancario.EGRESO
          : TipoMovimientoBancario.INGRESO;

      saldo =
        tipo === TipoMovimientoBancario.INGRESO
          ? this.round2(saldo + monto)
          : this.round2(saldo - monto);

      const conciliado = Boolean(referencia && referenciasExistentes.has(referencia));
      if (conciliado) {
        conciliadosAutomatico += 1;
      }

      const movimiento = this.movimientosRepository.create({
        cuentaBancariaId: cuentaId,
        fecha,
        descripcion,
        referencia,
        tipo,
        monto,
        saldoDespues: saldo,
        categoria: CategoriaMovimientoBancario.OTRO,
        conciliado,
        conciliadoEn: conciliado ? new Date() : null,
        registradoPorId: userId,
      });

      nuevos.push(movimiento);
      importados += 1;
    }

    if (nuevos.length) {
      await this.movimientosRepository.save(nuevos);
      cuenta.saldoActual = saldo;
      await this.cuentasRepository.save(cuenta);
    }

    return {
      importados,
      conciliadosAutomatico,
      pendientes: importados - conciliadosAutomatico,
    };
  }

  async getReporteConciliacion(cuentaId: string, mes: number, ano: number) {
    await this.getCuentaOrFail(cuentaId);
    const { desde, hasta } = this.getMonthRange(mes, ano);

    const movimientos = await this.movimientosRepository
      .createQueryBuilder('mov')
      .where('mov.cuentaBancariaId = :cuentaId', { cuentaId })
      .andWhere('mov.fecha BETWEEN :desde AND :hasta', { desde, hasta })
      .orderBy('mov.fecha', 'ASC')
      .addOrderBy('mov.createdAt', 'ASC')
      .getMany();

    const signed = (mov: MovimientoBancario) =>
      mov.tipo === TipoMovimientoBancario.INGRESO ? Number(mov.monto) : -Number(mov.monto);

    const totalBanco = this.round2(movimientos.reduce((acc, mov) => acc + signed(mov), 0));
    const totalSistema = this.round2(
      movimientos.filter((mov) => mov.conciliado).reduce((acc, mov) => acc + signed(mov), 0),
    );
    const noConciliados = movimientos.filter((mov) => !mov.conciliado);

    return {
      cuentaId,
      mes,
      ano,
      totalBanco,
      totalSistema,
      diferencia: this.round2(totalBanco - totalSistema),
      noConciliados,
    };
  }
}
