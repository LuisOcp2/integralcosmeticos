import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Asistencia, TipoAsistencia } from './entities/asistencia.entity';
import { Empleado } from './entities/empleado.entity';

type ConteoTipos = Record<TipoAsistencia, number>;

function asDateYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function inicioFinMes(ano: number, mes: number): { inicio: string; fin: string } {
  const inicio = new Date(Date.UTC(ano, mes - 1, 1));
  const fin = new Date(Date.UTC(ano, mes, 0));
  return { inicio: asDateYmd(inicio), fin: asDateYmd(fin) };
}

@Injectable()
export class AsistenciaService {
  constructor(
    @InjectRepository(Asistencia)
    private readonly asistenciaRepository: Repository<Asistencia>,
    @InjectRepository(Empleado)
    private readonly empleadoRepository: Repository<Empleado>,
  ) {}

  async registrarEntrada(empleadoId: string, _userId: string) {
    const empleado = await this.empleadoRepository.findOne({ where: { id: empleadoId } });
    if (!empleado) {
      throw new NotFoundException('Empleado no encontrado');
    }

    const fecha = asDateYmd(new Date());
    let asistencia = await this.asistenciaRepository.findOne({ where: { empleadoId, fecha } });

    if (!asistencia) {
      asistencia = this.asistenciaRepository.create({
        empleadoId,
        fecha,
        tipo: TipoAsistencia.NORMAL,
      });
    }

    asistencia.horaEntrada = new Date();
    return this.asistenciaRepository.save(asistencia);
  }

  async registrarSalida(empleadoId: string, _userId: string) {
    const fecha = asDateYmd(new Date());
    const asistencia = await this.asistenciaRepository.findOne({ where: { empleadoId, fecha } });
    if (!asistencia) {
      throw new NotFoundException('No existe registro de entrada para hoy');
    }

    asistencia.horaSalida = new Date();
    return this.asistenciaRepository.save(asistencia);
  }

  async getEstadoDia(fecha?: string, sedeId?: string) {
    const fechaObjetivo = fecha ?? asDateYmd(new Date());
    const empleados = await this.empleadoRepository.find({
      where: sedeId ? ({ sedeId } as any) : undefined,
      relations: { area: true, cargo: true },
      order: { nombre: 'ASC' },
    });

    const asistencias = await this.asistenciaRepository.find({
      where: { fecha: fechaObjetivo },
    });
    const asistenciaPorEmpleado = new Map(asistencias.map((a) => [a.empleadoId, a]));

    return empleados.map((empleado) => {
      const asistencia = asistenciaPorEmpleado.get(empleado.id) ?? null;
      const estado = !asistencia
        ? 'SIN_REGISTRO'
        : asistencia.horaSalida
          ? 'SALIO'
          : asistencia.horaEntrada
            ? 'ENTRO'
            : 'SIN_REGISTRO';

      return {
        empleado: {
          id: empleado.id,
          nombre: `${empleado.nombre} ${empleado.apellido}`,
          area: empleado.area?.nombre ?? null,
          cargo: empleado.cargo?.nombre ?? null,
        },
        fecha: fechaObjetivo,
        estado,
        horaEntrada: asistencia?.horaEntrada ?? null,
        horaSalida: asistencia?.horaSalida ?? null,
        tipo: asistencia?.tipo ?? null,
      };
    });
  }

  async getResumenMensual(empleadoId: string, mes: number, ano: number) {
    const { inicio, fin } = inicioFinMes(ano, mes);
    const asistencias = await this.asistenciaRepository.find({
      where: {
        empleadoId,
        fecha: Between(inicio, fin),
      },
      order: { fecha: 'ASC' },
    });

    const porTipo: ConteoTipos = {
      [TipoAsistencia.NORMAL]: 0,
      [TipoAsistencia.HORA_EXTRA]: 0,
      [TipoAsistencia.FESTIVO]: 0,
      [TipoAsistencia.VACACIONES]: 0,
      [TipoAsistencia.INCAPACIDAD]: 0,
      [TipoAsistencia.PERMISO]: 0,
      [TipoAsistencia.AUSENCIA]: 0,
    };

    let horasTotales = 0;
    for (const item of asistencias) {
      porTipo[item.tipo] += 1;
      if (item.horaEntrada && item.horaSalida) {
        const diffMs = new Date(item.horaSalida).getTime() - new Date(item.horaEntrada).getTime();
        horasTotales += Math.max(diffMs / 3600000, 0);
      }
    }

    return {
      empleadoId,
      mes,
      ano,
      totalRegistros: asistencias.length,
      porTipo,
      ausencias: porTipo[TipoAsistencia.AUSENCIA],
      horasTotales: Number(horasTotales.toFixed(2)),
    };
  }

  async getReportePorArea(areaId: string, mes: number, ano: number) {
    const empleados = await this.empleadoRepository.find({
      where: { areaId },
      relations: { cargo: true },
      order: { nombre: 'ASC' },
    });

    const resumenes = await Promise.all(
      empleados.map(async (empleado) => ({
        empleado: {
          id: empleado.id,
          nombre: `${empleado.nombre} ${empleado.apellido}`,
          cargo: empleado.cargo?.nombre ?? null,
        },
        resumen: await this.getResumenMensual(empleado.id, mes, ano),
      })),
    );

    return {
      areaId,
      mes,
      ano,
      totalEmpleados: empleados.length,
      registros: resumenes,
    };
  }
}
