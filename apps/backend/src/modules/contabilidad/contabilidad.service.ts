import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { EstadoVenta } from '@cosmeticos/shared-types';
import { Venta } from '../ventas/entities/venta.entity';
import { AsientoContable } from './entities/asiento-contable.entity';
import { CuentaContable } from './entities/cuenta-contable.entity';
import { MovimientoContable } from './entities/movimiento-contable.entity';
import { PeriodoContable } from './entities/periodo-contable.entity';
import {
  EstadoPeriodoContable,
  TipoAsientoContable,
  TipoCuentaContable,
  TipoMovimientoContable,
} from './enums/contabilidad.enums';

type MovimientoInput = {
  cuentaCodigo: string;
  tipo: TipoMovimientoContable;
  monto: number;
  descripcion?: string;
};

type CuentaSeed = {
  codigo: string;
  nombre: string;
  tipo: TipoCuentaContable;
  nivelPUC: number;
  padreId: string | null;
  activa: boolean;
};

@Injectable()
export class ContabilidadService implements OnModuleInit {
  private readonly logger = new Logger(ContabilidadService.name);

  constructor(
    @InjectRepository(CuentaContable)
    private readonly cuentasRepository: Repository<CuentaContable>,
    @InjectRepository(AsientoContable)
    private readonly asientosRepository: Repository<AsientoContable>,
    @InjectRepository(MovimientoContable)
    private readonly movimientosRepository: Repository<MovimientoContable>,
    @InjectRepository(PeriodoContable)
    private readonly periodosRepository: Repository<PeriodoContable>,
    @InjectRepository(Venta)
    private readonly ventasRepository: Repository<Venta>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureSchemaCompatibility();
    await this.seedPucBasico();
  }

  private async ensureSchemaCompatibility(): Promise<void> {
    await this.dataSource.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cuentas_contables_tipo_enum') THEN
          CREATE TYPE "cuentas_contables_tipo_enum" AS ENUM ('ACTIVO','PASIVO','PATRIMONIO','INGRESO','EGRESO','COSTO');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'asientos_contables_tipo_enum') THEN
          CREATE TYPE "asientos_contables_tipo_enum" AS ENUM ('VENTA','COMPRA','AJUSTE_INVENTARIO','APERTURA','CIERRE','MANUAL');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'movimientos_contables_tipo_enum') THEN
          CREATE TYPE "movimientos_contables_tipo_enum" AS ENUM ('DEBITO','CREDITO');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'periodos_contables_estado_enum') THEN
          CREATE TYPE "periodos_contables_estado_enum" AS ENUM ('ABIERTO','CERRADO');
        END IF;
      END
      $$;
    `);

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS "cuentas_contables" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "codigo" varchar(20) NOT NULL UNIQUE,
        "nombre" varchar(150) NOT NULL,
        "tipo" "cuentas_contables_tipo_enum" NOT NULL,
        "nivelPUC" integer NOT NULL,
        "padreId" uuid NULL,
        "activa" boolean NOT NULL DEFAULT true,
        CONSTRAINT "FK_cuentas_contables_padre" FOREIGN KEY ("padreId") REFERENCES "cuentas_contables"("id") ON DELETE SET NULL
      )
    `);

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS "asientos_contables" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "numero" varchar(20) NOT NULL UNIQUE,
        "fecha" date NOT NULL,
        "descripcion" text NOT NULL,
        "tipo" "asientos_contables_tipo_enum" NOT NULL,
        "referenciaId" uuid NULL,
        "referenciaTipo" varchar(30) NULL,
        "totalDebito" numeric(14,2) NOT NULL,
        "totalCredito" numeric(14,2) NOT NULL,
        "creadoPorId" uuid NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_asientos_contables_usuario" FOREIGN KEY ("creadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT
      )
    `);

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS "movimientos_contables" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "asientoId" uuid NOT NULL,
        "cuentaId" uuid NOT NULL,
        "tipo" "movimientos_contables_tipo_enum" NOT NULL,
        "monto" numeric(14,2) NOT NULL,
        "descripcion" text NULL,
        CONSTRAINT "FK_movimientos_contables_asiento" FOREIGN KEY ("asientoId") REFERENCES "asientos_contables"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_movimientos_contables_cuenta" FOREIGN KEY ("cuentaId") REFERENCES "cuentas_contables"("id") ON DELETE RESTRICT
      )
    `);

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS "periodos_contables" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "ano" integer NOT NULL,
        "mes" integer NOT NULL,
        "estado" "periodos_contables_estado_enum" NOT NULL DEFAULT 'ABIERTO',
        "cerradoPorId" uuid NULL,
        "cerradoEn" timestamp NULL,
        "asientoCierreId" uuid NULL,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_periodos_contables_anio_mes" UNIQUE ("ano", "mes")
      )
    `);

    await this.dataSource.query(
      `CREATE INDEX IF NOT EXISTS "IDX_cuentas_contables_padre" ON "cuentas_contables"("padreId")`,
    );
    await this.dataSource.query(
      `CREATE INDEX IF NOT EXISTS "IDX_asientos_contables_fecha" ON "asientos_contables"("fecha")`,
    );
    await this.dataSource.query(
      `CREATE INDEX IF NOT EXISTS "IDX_asientos_contables_tipo" ON "asientos_contables"("tipo")`,
    );
    await this.dataSource.query(
      `CREATE INDEX IF NOT EXISTS "IDX_movimientos_contables_asiento" ON "movimientos_contables"("asientoId")`,
    );
    await this.dataSource.query(
      `CREATE INDEX IF NOT EXISTS "IDX_movimientos_contables_cuenta" ON "movimientos_contables"("cuentaId")`,
    );

    this.logger.log('Esquema de contabilidad verificado/ajustado');
  }

  private async seedPucBasico(): Promise<void> {
    const cuentasBase: CuentaSeed[] = [
      {
        codigo: '1105',
        nombre: 'Caja',
        tipo: TipoCuentaContable.ACTIVO,
        nivelPUC: 3,
        padreId: null,
        activa: true,
      },
      {
        codigo: '1110',
        nombre: 'Bancos',
        tipo: TipoCuentaContable.ACTIVO,
        nivelPUC: 3,
        padreId: null,
        activa: true,
      },
      {
        codigo: '1305',
        nombre: 'Clientes',
        tipo: TipoCuentaContable.ACTIVO,
        nivelPUC: 3,
        padreId: null,
        activa: true,
      },
      {
        codigo: '2205',
        nombre: 'IVA por pagar',
        tipo: TipoCuentaContable.PASIVO,
        nivelPUC: 3,
        padreId: null,
        activa: true,
      },
      {
        codigo: '4135',
        nombre: 'Ventas',
        tipo: TipoCuentaContable.INGRESO,
        nivelPUC: 3,
        padreId: null,
        activa: true,
      },
      {
        codigo: '5',
        nombre: 'Costos',
        tipo: TipoCuentaContable.COSTO,
        nivelPUC: 1,
        padreId: null,
        activa: true,
      },
      {
        codigo: '6135',
        nombre: 'Mercancias',
        tipo: TipoCuentaContable.COSTO,
        nivelPUC: 3,
        padreId: null,
        activa: true,
      },
      {
        codigo: '3605',
        nombre: 'Utilidad o perdida del ejercicio',
        tipo: TipoCuentaContable.PATRIMONIO,
        nivelPUC: 3,
        padreId: null,
        activa: true,
      },
    ];

    for (const cuenta of cuentasBase) {
      const existe = await this.cuentasRepository.findOne({ where: { codigo: cuenta.codigo } });
      if (!existe) {
        const creada = this.cuentasRepository.create(cuenta);
        await this.cuentasRepository.save(creada);
      }
    }

    const costoPadre = await this.cuentasRepository.findOne({ where: { codigo: '5' } });
    const mercancias = await this.cuentasRepository.findOne({ where: { codigo: '6135' } });
    if (costoPadre && mercancias && mercancias.padreId !== costoPadre.id) {
      mercancias.padreId = costoPadre.id;
      await this.cuentasRepository.save(mercancias);
    }
  }

  private round2(value: number): number {
    return Number(value.toFixed(2));
  }

  private async generarNumeroAsiento(manager: EntityManager): Promise<string> {
    const year = new Date().getFullYear();
    await manager.query('CREATE SEQUENCE IF NOT EXISTS asientos_contables_numero_seq START 1');
    const [{ seq }] = await manager.query(
      "SELECT LPAD(nextval('asientos_contables_numero_seq')::text, 6, '0') AS seq",
    );
    return `AC-${year}-${seq}`;
  }

  async validarPeriodoAbiertoPorFecha(fecha: Date | string): Promise<void> {
    const date = new Date(fecha);
    const ano = date.getFullYear();
    const mes = date.getMonth() + 1;

    const periodo = await this.periodosRepository.findOne({ where: { ano, mes } });
    if (periodo?.estado === EstadoPeriodoContable.CERRADO) {
      throw new ForbiddenException(
        `El periodo ${ano}-${String(mes).padStart(2, '0')} esta cerrado`,
      );
    }
  }

  private async crearAsiento(params: {
    manager?: EntityManager;
    fecha: string;
    descripcion: string;
    tipo: TipoAsientoContable;
    creadoPorId: string;
    referenciaId?: string | null;
    referenciaTipo?: string | null;
    movimientos: MovimientoInput[];
  }): Promise<AsientoContable> {
    const manager = params.manager ?? this.dataSource.manager;
    await this.validarPeriodoAbiertoPorFecha(params.fecha);

    const movimientosValidos = params.movimientos.filter((m) => this.round2(Number(m.monto)) > 0);
    if (!movimientosValidos.length) {
      throw new BadRequestException(
        'El asiento debe contener al menos un movimiento con monto mayor a cero',
      );
    }

    const totalDebito = this.round2(
      movimientosValidos
        .filter((m) => m.tipo === TipoMovimientoContable.DEBITO)
        .reduce((acc, mov) => acc + Number(mov.monto), 0),
    );
    const totalCredito = this.round2(
      movimientosValidos
        .filter((m) => m.tipo === TipoMovimientoContable.CREDITO)
        .reduce((acc, mov) => acc + Number(mov.monto), 0),
    );

    if (totalDebito !== totalCredito) {
      throw new BadRequestException(
        'Asiento desbalanceado: totalDebito debe ser igual a totalCredito',
      );
    }

    const codigos = [...new Set(movimientosValidos.map((m) => m.cuentaCodigo))];
    const cuentas = await manager
      .getRepository(CuentaContable)
      .find({ where: codigos.map((c) => ({ codigo: c })) });
    const cuentasPorCodigo = new Map(cuentas.map((c) => [c.codigo, c]));

    for (const codigo of codigos) {
      const cuenta = cuentasPorCodigo.get(codigo);
      if (!cuenta || !cuenta.activa) {
        throw new BadRequestException(`Cuenta contable invalida o inactiva: ${codigo}`);
      }
    }

    const numero = await this.generarNumeroAsiento(manager);

    const asiento = manager.getRepository(AsientoContable).create({
      numero,
      fecha: params.fecha,
      descripcion: params.descripcion,
      tipo: params.tipo,
      referenciaId: params.referenciaId ?? null,
      referenciaTipo: params.referenciaTipo ?? null,
      totalDebito,
      totalCredito,
      creadoPorId: params.creadoPorId,
      movimientos: movimientosValidos.map((mov) => {
        const cuenta = cuentasPorCodigo.get(mov.cuentaCodigo)!;
        return manager.getRepository(MovimientoContable).create({
          cuentaId: cuenta.id,
          tipo: mov.tipo,
          monto: this.round2(Number(mov.monto)),
          descripcion: mov.descripcion ?? null,
        });
      }),
    });

    return manager.getRepository(AsientoContable).save(asiento);
  }

  async generarAsientoVenta(venta: Venta, manager?: EntityManager): Promise<AsientoContable> {
    if (!venta?.id) {
      throw new BadRequestException('Venta invalida para generar asiento');
    }

    if (venta.estado !== EstadoVenta.COMPLETADA) {
      throw new BadRequestException('Solo se pueden contabilizar ventas completadas');
    }

    const subtotal = this.round2(Number(venta.subtotal));
    const impuestos = this.round2(Number(venta.impuestos));
    const total = this.round2(Number(venta.total));

    if (total <= 0) {
      throw new BadRequestException('La venta debe tener un total mayor a cero para contabilizar');
    }

    const existente = await this.asientosRepository.findOne({
      where: {
        referenciaId: venta.id,
        referenciaTipo: 'VENTA',
      },
    });

    if (existente) {
      return existente;
    }

    const fecha = venta.createdAt
      ? venta.createdAt.toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    return this.crearAsiento({
      manager,
      fecha,
      descripcion: `Registro contable automatico de venta ${venta.numero}`,
      tipo: TipoAsientoContable.VENTA,
      referenciaId: venta.id,
      referenciaTipo: 'VENTA',
      creadoPorId: venta.cajeroId,
      movimientos: [
        {
          cuentaCodigo: '1105',
          tipo: TipoMovimientoContable.DEBITO,
          monto: total,
          descripcion: `Ingreso por venta ${venta.numero}`,
        },
        {
          cuentaCodigo: '4135',
          tipo: TipoMovimientoContable.CREDITO,
          monto: subtotal,
          descripcion: `Venta gravada ${venta.numero}`,
        },
        {
          cuentaCodigo: '2205',
          tipo: TipoMovimientoContable.CREDITO,
          monto: impuestos,
          descripcion: `IVA generado ${venta.numero}`,
        },
      ],
    });
  }

  async generarAsientoReversionVenta(
    venta: Venta,
    usuarioId: string,
    motivo: string,
    manager?: EntityManager,
  ): Promise<AsientoContable> {
    if (!venta?.id) {
      throw new BadRequestException('Venta invalida para reversar asiento');
    }

    const asientoOriginal = await this.asientosRepository.findOne({
      where: { referenciaId: venta.id, referenciaTipo: 'VENTA' },
      relations: ['movimientos', 'movimientos.cuenta'],
    });

    if (!asientoOriginal) {
      throw new NotFoundException('No existe asiento original de venta para reversar');
    }

    const yaRevertido = await this.asientosRepository.findOne({
      where: { referenciaId: venta.id, referenciaTipo: 'VENTA_REVERSA' },
    });

    if (yaRevertido) {
      return yaRevertido;
    }

    await this.validarPeriodoAbiertoPorFecha(new Date());

    const movimientos: MovimientoInput[] = asientoOriginal.movimientos.map((mov) => ({
      cuentaCodigo: mov.cuenta.codigo,
      tipo:
        mov.tipo === TipoMovimientoContable.DEBITO
          ? TipoMovimientoContable.CREDITO
          : TipoMovimientoContable.DEBITO,
      monto: Number(mov.monto),
      descripcion: `Reversion venta ${venta.numero}. Motivo: ${motivo}`,
    }));

    return this.crearAsiento({
      manager,
      fecha: new Date().toISOString().slice(0, 10),
      descripcion: `Asiento de reversion por anulacion de venta ${venta.numero}`,
      tipo: TipoAsientoContable.MANUAL,
      referenciaId: venta.id,
      referenciaTipo: 'VENTA_REVERSA',
      creadoPorId: usuarioId,
      movimientos,
    });
  }

  async balanceGeneral(fecha?: string) {
    const fechaCorte = fecha ?? new Date().toISOString().slice(0, 10);

    const rows = await this.movimientosRepository
      .createQueryBuilder('m')
      .innerJoin('m.asiento', 'a')
      .innerJoin('m.cuenta', 'c')
      .where('a.fecha <= :fechaCorte', { fechaCorte })
      .select('c.id', 'cuenta_id')
      .addSelect('c.codigo', 'codigo')
      .addSelect('c.nombre', 'nombre')
      .addSelect('c.tipo', 'tipo')
      .addSelect(`SUM(CASE WHEN m.tipo = 'DEBITO' THEN m.monto ELSE 0 END)`, 'debito')
      .addSelect(`SUM(CASE WHEN m.tipo = 'CREDITO' THEN m.monto ELSE 0 END)`, 'credito')
      .groupBy('c.id')
      .addGroupBy('c.codigo')
      .addGroupBy('c.nombre')
      .addGroupBy('c.tipo')
      .orderBy('c.codigo', 'ASC')
      .getRawMany<{
        cuenta_id: string;
        codigo: string;
        nombre: string;
        tipo: TipoCuentaContable;
        debito: string;
        credito: string;
      }>();

    const activos: any[] = [];
    const pasivos: any[] = [];
    const patrimonio: any[] = [];

    let totalActivos = 0;
    let totalPasivos = 0;
    let totalPatrimonio = 0;

    for (const row of rows) {
      const debito = this.round2(Number(row.debito ?? 0));
      const credito = this.round2(Number(row.credito ?? 0));
      const tipo = row.tipo;
      const saldo =
        tipo === TipoCuentaContable.ACTIVO ||
        tipo === TipoCuentaContable.COSTO ||
        tipo === TipoCuentaContable.EGRESO
          ? this.round2(debito - credito)
          : this.round2(credito - debito);

      if (saldo === 0) {
        continue;
      }

      const cuenta = {
        cuentaId: row.cuenta_id,
        codigo: row.codigo,
        nombre: row.nombre,
        saldo,
      };

      if (tipo === TipoCuentaContable.ACTIVO) {
        activos.push(cuenta);
        totalActivos = this.round2(totalActivos + saldo);
      }

      if (tipo === TipoCuentaContable.PASIVO) {
        pasivos.push(cuenta);
        totalPasivos = this.round2(totalPasivos + saldo);
      }

      if (tipo === TipoCuentaContable.PATRIMONIO) {
        patrimonio.push(cuenta);
        totalPatrimonio = this.round2(totalPatrimonio + saldo);
      }
    }

    return {
      fechaCorte,
      activos,
      pasivos,
      patrimonio,
      totalActivos,
      totalPasivos,
      totalPatrimonio,
      pasivoMasPatrimonio: this.round2(totalPasivos + totalPatrimonio),
      balanceado: totalActivos === this.round2(totalPasivos + totalPatrimonio),
    };
  }

  async estadoResultados(fechaDesde: string, fechaHasta: string) {
    const rows = await this.movimientosRepository
      .createQueryBuilder('m')
      .innerJoin('m.asiento', 'a')
      .innerJoin('m.cuenta', 'c')
      .where('a.fecha BETWEEN :fechaDesde AND :fechaHasta', { fechaDesde, fechaHasta })
      .andWhere('c.tipo IN (:...tipos)', {
        tipos: [TipoCuentaContable.INGRESO, TipoCuentaContable.COSTO, TipoCuentaContable.EGRESO],
      })
      .select('c.id', 'cuenta_id')
      .addSelect('c.codigo', 'codigo')
      .addSelect('c.nombre', 'nombre')
      .addSelect('c.tipo', 'tipo')
      .addSelect(`SUM(CASE WHEN m.tipo = 'DEBITO' THEN m.monto ELSE 0 END)`, 'debito')
      .addSelect(`SUM(CASE WHEN m.tipo = 'CREDITO' THEN m.monto ELSE 0 END)`, 'credito')
      .groupBy('c.id')
      .addGroupBy('c.codigo')
      .addGroupBy('c.nombre')
      .addGroupBy('c.tipo')
      .orderBy('c.codigo', 'ASC')
      .getRawMany<{
        cuenta_id: string;
        codigo: string;
        nombre: string;
        tipo: TipoCuentaContable;
        debito: string;
        credito: string;
      }>();

    const ingresos: any[] = [];
    const costos: any[] = [];
    const gastos: any[] = [];
    let totalIngresos = 0;
    let totalCostos = 0;
    let totalGastos = 0;

    for (const row of rows) {
      const tipo = row.tipo;
      const debito = this.round2(Number(row.debito ?? 0));
      const credito = this.round2(Number(row.credito ?? 0));
      const saldo =
        tipo === TipoCuentaContable.INGRESO
          ? this.round2(credito - debito)
          : this.round2(debito - credito);

      const cuenta = {
        cuentaId: row.cuenta_id,
        codigo: row.codigo,
        nombre: row.nombre,
        saldo,
      };

      if (tipo === TipoCuentaContable.INGRESO) {
        ingresos.push(cuenta);
        totalIngresos = this.round2(totalIngresos + saldo);
      }
      if (tipo === TipoCuentaContable.COSTO) {
        costos.push(cuenta);
        totalCostos = this.round2(totalCostos + saldo);
      }
      if (tipo === TipoCuentaContable.EGRESO) {
        gastos.push(cuenta);
        totalGastos = this.round2(totalGastos + saldo);
      }
    }

    const utilidad = this.round2(totalIngresos - totalCostos - totalGastos);

    return {
      fechaDesde,
      fechaHasta,
      ingresos,
      costos,
      gastos,
      totalIngresos,
      totalCostos,
      totalGastos,
      utilidad,
    };
  }

  async libroMayor(cuentaId: string, fechaDesde: string, fechaHasta: string) {
    const cuenta = await this.cuentasRepository.findOne({ where: { id: cuentaId } });
    if (!cuenta) {
      throw new NotFoundException('Cuenta contable no encontrada');
    }

    const movimientos = await this.movimientosRepository
      .createQueryBuilder('m')
      .innerJoinAndSelect('m.asiento', 'a')
      .where('m.cuentaId = :cuentaId', { cuentaId })
      .andWhere('a.fecha BETWEEN :fechaDesde AND :fechaHasta', { fechaDesde, fechaHasta })
      .orderBy('a.fecha', 'ASC')
      .addOrderBy('a.createdAt', 'ASC')
      .getMany();

    let saldo = 0;
    const items = movimientos.map((mov) => {
      const monto = this.round2(Number(mov.monto));
      const incremento =
        cuenta.tipo === TipoCuentaContable.ACTIVO ||
        cuenta.tipo === TipoCuentaContable.COSTO ||
        cuenta.tipo === TipoCuentaContable.EGRESO
          ? mov.tipo === TipoMovimientoContable.DEBITO
            ? monto
            : -monto
          : mov.tipo === TipoMovimientoContable.CREDITO
            ? monto
            : -monto;
      saldo = this.round2(saldo + incremento);

      return {
        movimientoId: mov.id,
        asientoId: mov.asientoId,
        asientoNumero: mov.asiento.numero,
        fecha: mov.asiento.fecha,
        descripcion: mov.descripcion ?? mov.asiento.descripcion,
        tipo: mov.tipo,
        debito: mov.tipo === TipoMovimientoContable.DEBITO ? monto : 0,
        credito: mov.tipo === TipoMovimientoContable.CREDITO ? monto : 0,
        saldo,
      };
    });

    return {
      cuenta: {
        id: cuenta.id,
        codigo: cuenta.codigo,
        nombre: cuenta.nombre,
        tipo: cuenta.tipo,
      },
      fechaDesde,
      fechaHasta,
      movimientos: items,
      saldoFinal: saldo,
    };
  }

  async exportarSiigo(mes: number, ano: number) {
    const inicio = new Date(Date.UTC(ano, mes - 1, 1));
    const fin = new Date(Date.UTC(ano, mes, 0));
    const fechaDesde = inicio.toISOString().slice(0, 10);
    const fechaHasta = fin.toISOString().slice(0, 10);

    const asientos = await this.asientosRepository
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.movimientos', 'm')
      .leftJoinAndSelect('m.cuenta', 'c')
      .where('a.fecha BETWEEN :fechaDesde AND :fechaHasta', { fechaDesde, fechaHasta })
      .orderBy('a.fecha', 'ASC')
      .addOrderBy('a.numero', 'ASC')
      .getMany();

    return {
      sistemaDestino: 'SIIGO',
      mes,
      ano,
      fechaDesde,
      fechaHasta,
      comprobantes: asientos.map((asiento) => ({
        consecutivo: asiento.numero,
        fecha: asiento.fecha,
        descripcion: asiento.descripcion,
        tipo: asiento.tipo,
        referencia: {
          id: asiento.referenciaId,
          tipo: asiento.referenciaTipo,
        },
        totalDebito: this.round2(Number(asiento.totalDebito)),
        totalCredito: this.round2(Number(asiento.totalCredito)),
        movimientos: asiento.movimientos.map((mov) => ({
          cuentaCodigo: mov.cuenta.codigo,
          cuentaNombre: mov.cuenta.nombre,
          tipo: mov.tipo,
          valor: this.round2(Number(mov.monto)),
          descripcion: mov.descripcion,
        })),
      })),
    };
  }

  async cierreMes(mes: number, ano: number, usuarioId: string) {
    if (mes < 1 || mes > 12) {
      throw new BadRequestException('Mes invalido');
    }

    const fechaInicio = new Date(Date.UTC(ano, mes - 1, 1));
    const fechaFin = new Date(Date.UTC(ano, mes, 0));

    const periodoExistente = await this.periodosRepository.findOne({ where: { ano, mes } });
    if (periodoExistente?.estado === EstadoPeriodoContable.CERRADO) {
      throw new BadRequestException(
        `El periodo ${ano}-${String(mes).padStart(2, '0')} ya esta cerrado`,
      );
    }

    const fechaDesde = fechaInicio.toISOString().slice(0, 10);
    const fechaHasta = fechaFin.toISOString().slice(0, 10);

    const ventasPendientes = await this.ventasRepository
      .createQueryBuilder('v')
      .where('DATE(v.createdAt) BETWEEN :fechaDesde AND :fechaHasta', {
        fechaDesde,
        fechaHasta,
      })
      .andWhere('v.estado NOT IN (:...estados)', {
        estados: [EstadoVenta.COMPLETADA, EstadoVenta.ANULADA],
      })
      .getCount();

    if (ventasPendientes > 0) {
      throw new BadRequestException(
        `Existen ${ventasPendientes} ventas sin completar/anular en el periodo a cerrar`,
      );
    }

    const estado = await this.estadoResultados(fechaDesde, fechaHasta);

    const movimientosCierre: MovimientoInput[] = [];
    let totalDebito = 0;
    let totalCredito = 0;

    for (const ingreso of estado.ingresos) {
      if (ingreso.saldo > 0) {
        movimientosCierre.push({
          cuentaCodigo: ingreso.codigo,
          tipo: TipoMovimientoContable.DEBITO,
          monto: ingreso.saldo,
          descripcion: `Cierre de cuenta ingreso ${ingreso.codigo}`,
        });
        totalDebito = this.round2(totalDebito + ingreso.saldo);
      }
    }

    for (const costo of [...estado.costos, ...estado.gastos]) {
      if (costo.saldo > 0) {
        movimientosCierre.push({
          cuentaCodigo: costo.codigo,
          tipo: TipoMovimientoContable.CREDITO,
          monto: costo.saldo,
          descripcion: `Cierre de cuenta resultado ${costo.codigo}`,
        });
        totalCredito = this.round2(totalCredito + costo.saldo);
      }
    }

    const diferencia = this.round2(Math.abs(totalDebito - totalCredito));
    if (diferencia > 0) {
      movimientosCierre.push({
        cuentaCodigo: '3605',
        tipo:
          totalDebito > totalCredito
            ? TipoMovimientoContable.CREDITO
            : TipoMovimientoContable.DEBITO,
        monto: diferencia,
        descripcion: 'Cierre de utilidad o perdida del ejercicio',
      });
    }

    const asientoCierre = await this.crearAsiento({
      fecha: fechaHasta,
      descripcion: `Cierre mensual ${ano}-${String(mes).padStart(2, '0')}`,
      tipo: TipoAsientoContable.CIERRE,
      creadoPorId: usuarioId,
      referenciaTipo: 'CIERRE_MENSUAL',
      referenciaId: null,
      movimientos: movimientosCierre,
    });

    const periodo = periodoExistente
      ? this.periodosRepository.merge(periodoExistente, {
          estado: EstadoPeriodoContable.CERRADO,
          cerradoPorId: usuarioId,
          cerradoEn: new Date(),
          asientoCierreId: asientoCierre.id,
        })
      : this.periodosRepository.create({
          ano,
          mes,
          estado: EstadoPeriodoContable.CERRADO,
          cerradoPorId: usuarioId,
          cerradoEn: new Date(),
          asientoCierreId: asientoCierre.id,
        });

    await this.periodosRepository.save(periodo);

    return {
      message: `Periodo ${ano}-${String(mes).padStart(2, '0')} cerrado correctamente`,
      periodo,
      asientoCierre,
      utilidadPeriodo: estado.utilidad,
    };
  }
}
