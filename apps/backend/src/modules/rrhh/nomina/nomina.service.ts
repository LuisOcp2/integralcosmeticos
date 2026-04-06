import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Rol } from '@cosmeticos/shared-types';
import { Empleado, EstadoEmpleado } from '../entities/empleado.entity';
import { Asistencia, TipoAsistencia } from '../entities/asistencia.entity';
import { EstadoLiquidacionNomina, LiquidacionNomina } from './entities/liquidacion-nomina.entity';
import { EstadoNominaColectiva, NominaColectiva } from './entities/nomina-colectiva.entity';

const SMMLV_2026 = 1423500;
const AUXILIO_TRANSPORTE_2026 = 200000;

function toMoney(value: number): number {
  return Number(value.toFixed(2));
}

function getMonthRange(mes: number, ano: number): { inicio: string; fin: string } {
  const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
  const finDate = new Date(Date.UTC(ano, mes, 0));
  const fin = finDate.toISOString().slice(0, 10);
  return { inicio, fin };
}

@Injectable()
export class NominaService {
  constructor(
    @InjectRepository(Empleado)
    private readonly empleadoRepository: Repository<Empleado>,
    @InjectRepository(Asistencia)
    private readonly asistenciaRepository: Repository<Asistencia>,
    @InjectRepository(LiquidacionNomina)
    private readonly liquidacionRepository: Repository<LiquidacionNomina>,
    @InjectRepository(NominaColectiva)
    private readonly nominaColectivaRepository: Repository<NominaColectiva>,
  ) {}

  async calcularLiquidacion(
    empleadoId: string,
    mes: number,
    ano: number,
  ): Promise<LiquidacionNomina> {
    const empleado = await this.empleadoRepository.findOne({ where: { id: empleadoId } });
    if (!empleado) {
      throw new NotFoundException('Empleado no encontrado');
    }

    const { inicio, fin } = getMonthRange(mes, ano);
    const asistencias = await this.asistenciaRepository.find({
      where: { empleadoId, fecha: Between(inicio, fin) },
      order: { fecha: 'ASC' },
    });

    const diasTrabajados = asistencias.filter((a) =>
      [TipoAsistencia.NORMAL, TipoAsistencia.HORA_EXTRA, TipoAsistencia.FESTIVO].includes(a.tipo),
    ).length;

    const diasAusencia = asistencias.filter((a) => a.tipo === TipoAsistencia.AUSENCIA).length;

    const salarioProporcional = toMoney((Number(empleado.salarioBase) / 30) * diasTrabajados);
    const aplicaAuxTransporte =
      empleado.auxilioTransporte && Number(empleado.salarioBase) <= SMMLV_2026 * 2;
    const auxilioTransporte = aplicaAuxTransporte
      ? toMoney((AUXILIO_TRANSPORTE_2026 / 30) * diasTrabajados)
      : 0;

    const horaBase = Number(empleado.salarioBase) / 240;
    let horasExtra = 0;
    let valorHorasExtra = 0;

    for (const asistencia of asistencias) {
      if (!asistencia.horaEntrada || !asistencia.horaSalida) {
        continue;
      }

      const diffHours = Math.max(
        (new Date(asistencia.horaSalida).getTime() - new Date(asistencia.horaEntrada).getTime()) /
          3600000,
        0,
      );
      const extra = Math.max(diffHours - 8, 0);
      if (extra <= 0) {
        continue;
      }

      let recargo = 0.25;
      if (asistencia.tipo === TipoAsistencia.FESTIVO) {
        recargo = 1.0;
      } else if (asistencia.tipo === TipoAsistencia.HORA_EXTRA) {
        recargo = 0.75;
      }

      horasExtra += extra;
      valorHorasExtra += extra * horaBase * (1 + recargo);
    }

    horasExtra = toMoney(horasExtra);
    valorHorasExtra = toMoney(valorHorasExtra);

    const totalDevengado = toMoney(salarioProporcional + auxilioTransporte + valorHorasExtra);
    const saludEmpleado = toMoney(salarioProporcional * 0.04);
    const pensionEmpleado = toMoney(salarioProporcional * 0.04);
    const retencionFuente = 0;
    const otrasDeduciones = 0;
    const totalDeducciones = toMoney(
      saludEmpleado + pensionEmpleado + retencionFuente + otrasDeduciones,
    );
    const netoPagar = toMoney(totalDevengado - totalDeducciones);

    let liquidacion = await this.liquidacionRepository.findOne({
      where: { empleadoId, mes, ano },
    });

    if (!liquidacion) {
      liquidacion = this.liquidacionRepository.create({ empleadoId, mes, ano });
    }

    Object.assign(liquidacion, {
      diasTrabajados,
      diasAusencia,
      salarioBase: Number(empleado.salarioBase),
      auxilioTransporte,
      horasExtra,
      valorHorasExtra,
      totalDevengado,
      saludEmpleado,
      pensionEmpleado,
      retencionFuente,
      otrasDeduciones,
      totalDeducciones,
      netoPagar,
      estado: EstadoLiquidacionNomina.BORRADOR,
    });

    return this.liquidacionRepository.save(liquidacion);
  }

  async calcularNominaColectiva(mes: number, ano: number, sedeId?: string) {
    const where: any = { estado: EstadoEmpleado.ACTIVO };
    if (sedeId) {
      where.sedeId = sedeId;
    }

    const empleados = await this.empleadoRepository.find({ where });
    const liquidaciones = await Promise.all(
      empleados.map((empleado) => this.calcularLiquidacion(empleado.id, mes, ano)),
    );

    const sedeObjetivo = sedeId ?? empleados[0]?.sedeId;
    if (!sedeObjetivo) {
      throw new BadRequestException('No hay empleados activos para calcular nomina');
    }

    const totalDevengado = toMoney(
      liquidaciones.reduce((acc, item) => acc + Number(item.totalDevengado), 0),
    );
    const totalDeducciones = toMoney(
      liquidaciones.reduce((acc, item) => acc + Number(item.totalDeducciones), 0),
    );
    const totalNeto = toMoney(liquidaciones.reduce((acc, item) => acc + Number(item.netoPagar), 0));

    const nominaColectiva = this.nominaColectivaRepository.create({
      mes,
      ano,
      sedeId: sedeObjetivo,
      estado: EstadoNominaColectiva.EN_PROCESO,
      totalEmpleados: liquidaciones.length,
      totalDevengado,
      totalDeducciones,
      totalNeto,
    });

    const nomina = await this.nominaColectivaRepository.save(nominaColectiva);
    for (const liquidacion of liquidaciones) {
      liquidacion.nominaColectivaId = nomina.id;
      await this.liquidacionRepository.save(liquidacion);
    }

    return this.getNominaColectivaById(nomina.id);
  }

  async getNominasColectivas() {
    return this.nominaColectivaRepository.find({
      relations: { sede: true },
      order: { ano: 'DESC', mes: 'DESC' },
    });
  }

  async getNominaColectivaById(id: string) {
    const nomina = await this.nominaColectivaRepository.findOne({
      where: { id },
      relations: {
        sede: true,
        liquidaciones: { empleado: true },
      },
    });
    if (!nomina) {
      throw new NotFoundException('Nomina colectiva no encontrada');
    }
    return nomina;
  }

  async aprobarNomina(nominaColectivaId: string, userId: string, rol: Rol) {
    if (rol !== Rol.ADMIN) {
      throw new ForbiddenException('Solo ADMIN puede aprobar la nomina');
    }

    const nomina = await this.getNominaColectivaById(nominaColectivaId);
    nomina.estado = EstadoNominaColectiva.APROBADA;
    nomina.aprobadaPorId = userId;

    const updated = await this.nominaColectivaRepository.save(nomina);
    await this.liquidacionRepository.update(
      { nominaColectivaId: nomina.id },
      { estado: EstadoLiquidacionNomina.APROBADA },
    );
    return updated;
  }

  async generarColillaTexto(liquidacionId: string): Promise<string> {
    const liquidacion = await this.liquidacionRepository.findOne({
      where: { id: liquidacionId },
      relations: {
        empleado: { area: true, cargo: true, sede: true },
      },
    });
    if (!liquidacion) {
      throw new NotFoundException('Liquidacion no encontrada');
    }

    const empleado = liquidacion.empleado;
    const line = '-'.repeat(64);
    const fmt = (v: number) =>
      new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 2,
      }).format(Number(v || 0));

    return [
      'COLILLA DE PAGO - INTEGRAL COSMETICOS',
      line,
      `Empleado: ${empleado.nombre} ${empleado.apellido}`,
      `Documento: ${empleado.numeroDocumento}`,
      `Cargo: ${empleado.cargo?.nombre ?? '-'} | Area: ${empleado.area?.nombre ?? '-'}`,
      `Sede: ${empleado.sede?.nombre ?? '-'}`,
      `Periodo: ${String(liquidacion.mes).padStart(2, '0')}/${liquidacion.ano}`,
      line,
      'DEVENGADOS',
      `- Salario base: ${fmt(Number(liquidacion.salarioBase))}`,
      `- Auxilio transporte: ${fmt(Number(liquidacion.auxilioTransporte))}`,
      `- Horas extra (${Number(liquidacion.horasExtra)} h): ${fmt(Number(liquidacion.valorHorasExtra))}`,
      `- Total devengado: ${fmt(Number(liquidacion.totalDevengado))}`,
      line,
      'DEDUCCIONES',
      `- Salud (4%): ${fmt(Number(liquidacion.saludEmpleado))}`,
      `- Pension (4%): ${fmt(Number(liquidacion.pensionEmpleado))}`,
      `- Retencion fuente: ${fmt(Number(liquidacion.retencionFuente))}`,
      `- Otras deduciones: ${fmt(Number(liquidacion.otrasDeduciones))}`,
      `- Total deducciones: ${fmt(Number(liquidacion.totalDeducciones))}`,
      line,
      `NETO A PAGAR: ${fmt(Number(liquidacion.netoPagar))}`,
      `Estado: ${liquidacion.estado}`,
      line,
    ].join('\n');
  }
}
