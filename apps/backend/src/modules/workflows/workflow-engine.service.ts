import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import axios from 'axios';
import { ActividadesService } from '../crm/actividades/actividades.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import {
  CategoriaNotificacion,
  PrioridadNotificacion,
  TipoNotificacion,
} from '../notificaciones/entities/notificacion.entity';
import { CrearActividadDto } from '../crm/actividades/dto/crear-actividad.dto';
import { TipoActividadCRM } from '../crm/actividades/entities/actividad-crm.entity';
import { EjecucionWorkflow, EstadoEjecucionWorkflow } from './entities/ejecucion-workflow.entity';
import { AccionWorkflowTipo, TriggerWorkflowTipo, Workflow } from './entities/workflow.entity';

@Injectable()
export class WorkflowEngineService implements OnModuleInit {
  private readonly logger = new Logger(WorkflowEngineService.name);

  constructor(
    @InjectRepository(Workflow)
    private readonly workflowsRepository: Repository<Workflow>,
    @InjectRepository(EjecucionWorkflow)
    private readonly ejecucionesRepository: Repository<EjecucionWorkflow>,
    private readonly notificacionesService: NotificacionesService,
    private readonly actividadesService: ActividadesService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    try {
      await this.dispararEvento(TriggerWorkflowTipo.FACTURA_VENCIDA, {
        fuente: 'init',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (!this.isMissingWorkflowsSchemaError(error)) {
        throw error;
      }

      this.logger.warn(
        'Workflows no disponible (faltan tablas/migracion). El engine se mantendra en modo seguro hasta aplicar migraciones.',
      );
    }
  }

  @Cron('0 0 * * *')
  async cronFacturasVencidas() {
    try {
      await this.dispararEvento(TriggerWorkflowTipo.FACTURA_VENCIDA, {
        fuente: 'cron-diario',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (!this.isMissingWorkflowsSchemaError(error)) {
        throw error;
      }

      this.logger.warn('Cron FACTURA_VENCIDA omitido: tablas de workflows no disponibles.');
    }
  }

  @Cron('*/5 * * * *')
  async cronProgramados() {
    let workflows: Workflow[] = [];
    try {
      workflows = await this.workflowsRepository.find({ where: { activo: true } });
    } catch (error) {
      if (!this.isMissingWorkflowsSchemaError(error)) {
        throw error;
      }

      this.logger.warn('Cron PROGRAMADO omitido: tablas de workflows no disponibles.');
      return;
    }

    const ahora = new Date();

    for (const workflow of workflows) {
      if (workflow.trigger?.tipo !== TriggerWorkflowTipo.PROGRAMADO) {
        continue;
      }

      const expresion = String(workflow.trigger?.configuracion?.expresionCron ?? '').trim();
      if (!expresion) {
        continue;
      }

      const fecha = this.parseUtcCron(expresion, ahora);
      if (!fecha) {
        continue;
      }

      await this.ejecutarWorkflow(workflow.id, {
        fuente: 'cron-programado',
        expresionCron: expresion,
        timestamp: fecha.toISOString(),
      });
    }
  }

  async dispararEvento(tipo: TriggerWorkflowTipo, contexto: Record<string, unknown>) {
    let workflows: Workflow[] = [];
    try {
      workflows = await this.workflowsRepository.find({ where: { activo: true } });
    } catch (error) {
      if (!this.isMissingWorkflowsSchemaError(error)) {
        throw error;
      }

      this.logger.warn(
        `Evento ${tipo} omitido: tablas de workflows no disponibles (aplica migracion pendiente).`,
      );
      return {
        evento: tipo,
        workflowsEjecutados: 0,
        resultados: [],
      };
    }

    const filtrados = workflows.filter((wf) => wf.trigger?.tipo === tipo);

    const resultados = [] as Array<{ workflowId: string; ejecucionId: string; estado: string }>;
    for (const workflow of filtrados) {
      const ejecucion = await this.ejecutarWorkflow(workflow.id, contexto);
      resultados.push({
        workflowId: workflow.id,
        ejecucionId: ejecucion.id,
        estado: ejecucion.estado,
      });
    }

    return {
      evento: tipo,
      workflowsEjecutados: resultados.length,
      resultados,
    };
  }

  async ejecutarWorkflow(workflowId: string, contexto: Record<string, unknown>) {
    const workflow = await this.workflowsRepository.findOne({ where: { id: workflowId } });
    if (!workflow) {
      throw new NotFoundException('Workflow no encontrado');
    }

    const inicio = new Date();
    const ejecucion = await this.ejecucionesRepository.save(
      this.ejecucionesRepository.create({
        workflowId,
        estado: EstadoEjecucionWorkflow.EN_PROCESO,
        contexto,
        resultado: null,
        error: null,
        duracionMs: null,
        inicioEn: inicio,
        finEn: null,
      }),
    );

    let output: Record<string, unknown> = { ...contexto };

    try {
      for (const paso of workflow.pasos ?? []) {
        output = await this.ejecutarPaso(paso, output);
      }

      const fin = new Date();
      ejecucion.estado = EstadoEjecucionWorkflow.EXITOSA;
      ejecucion.resultado = output;
      ejecucion.finEn = fin;
      ejecucion.duracionMs = fin.getTime() - inicio.getTime();
      await this.ejecucionesRepository.save(ejecucion);

      await this.actualizarEstadisticas(workflow, true, fin);
      return ejecucion;
    } catch (error) {
      const fin = new Date();
      ejecucion.estado = EstadoEjecucionWorkflow.FALLIDA;
      ejecucion.error = (error as Error)?.message ?? 'Error desconocido';
      ejecucion.finEn = fin;
      ejecucion.duracionMs = fin.getTime() - inicio.getTime();
      await this.ejecucionesRepository.save(ejecucion);

      await this.actualizarEstadisticas(workflow, false, fin);
      throw error;
    }
  }

  async ejecutarPaso(
    paso: {
      tipo: AccionWorkflowTipo;
      config: Record<string, unknown>;
    },
    contexto: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    switch (paso.tipo) {
      case AccionWorkflowTipo.ENVIAR_NOTIFICACION: {
        const usuarioId = String(paso.config.usuarioId ?? contexto.usuarioId ?? '');
        if (!usuarioId) {
          throw new Error('ENVIAR_NOTIFICACION requiere usuarioId');
        }

        const notificacion = await this.notificacionesService.crear(usuarioId, {
          tipo: (paso.config.tipo as TipoNotificacion) ?? TipoNotificacion.INFO,
          categoria:
            (paso.config.categoria as CategoriaNotificacion) ?? CategoriaNotificacion.GENERAL,
          titulo: String(paso.config.titulo ?? 'Notificacion de workflow'),
          mensaje: String(paso.config.mensaje ?? 'Evento procesado correctamente'),
          prioridad:
            (paso.config.prioridad as PrioridadNotificacion | undefined) ??
            PrioridadNotificacion.MEDIA,
          accion:
            paso.config.accionLabel || paso.config.accionRuta
              ? {
                  label: paso.config.accionLabel ? String(paso.config.accionLabel) : undefined,
                  ruta: paso.config.accionRuta ? String(paso.config.accionRuta) : undefined,
                }
              : undefined,
        });
        return { ...contexto, notificacion };
      }

      case AccionWorkflowTipo.CREAR_ACTIVIDAD_CRM: {
        const fallbackUserId =
          this.configService.get<string>('WORKFLOW_DEFAULT_USER_ID') ?? randomUUID();

        const dto: CrearActividadDto = {
          tipo: (paso.config.tipoActividad as TipoActividadCRM) ?? TipoActividadCRM.TAREA,
          asunto: String(paso.config.asunto ?? 'Actividad automatizada'),
          descripcion: paso.config.descripcion ? String(paso.config.descripcion) : undefined,
          fecha: new Date().toISOString(),
          clienteId: paso.config.clienteId ? String(paso.config.clienteId) : undefined,
          leadId: paso.config.leadId ? String(paso.config.leadId) : undefined,
          oportunidadId: paso.config.oportunidadId ? String(paso.config.oportunidadId) : undefined,
          proximaAccion: paso.config.proximaAccion ? String(paso.config.proximaAccion) : undefined,
          fechaProximaAccion: paso.config.fechaProximaAccion
            ? String(paso.config.fechaProximaAccion)
            : undefined,
          duracionMinutos: paso.config.duracionMinutos
            ? Number(paso.config.duracionMinutos)
            : undefined,
          realizadoPorId: paso.config.realizadoPorId
            ? String(paso.config.realizadoPorId)
            : undefined,
          completada: false,
          resultado: undefined,
        };
        const actividad = await this.actividadesService.create(
          dto,
          String(paso.config.realizadoPorId ?? contexto.usuarioId ?? fallbackUserId),
        );
        return { ...contexto, actividad };
      }

      case AccionWorkflowTipo.WEBHOOK_EXTERNO: {
        const url = String(paso.config.url ?? '');
        if (!url) {
          throw new Error('WEBHOOK_EXTERNO requiere URL');
        }

        const token = this.configService.get<string>('WORKFLOW_WEBHOOK_TOKEN');

        const response = await axios.post(
          url,
          {
            contexto,
            config: paso.config,
          },
          {
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
              ...(paso.config.headers as Record<string, string> | undefined),
            },
            timeout: Number(paso.config.timeoutMs ?? 10000),
            validateStatus: () => true,
          },
        );

        return {
          ...contexto,
          webhook: {
            ok: response.status >= 200 && response.status < 300,
            status: response.status,
            body: response.data,
          },
        };
      }

      case AccionWorkflowTipo.ESPERAR_MINUTOS: {
        // Limitacion: este paso bloquea la ejecucion en memoria, recomendado solo para flujos cortos.
        const minutos = Number(paso.config.minutos ?? 1);
        const ms = Math.max(0, minutos) * 60 * 1000;
        await new Promise((resolve) => setTimeout(resolve, ms));
        return {
          ...contexto,
          espera: { minutos },
        };
      }

      default:
        throw new Error(`Tipo de accion no soportado: ${paso.tipo}`);
    }
  }

  async getHistorial(workflowId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const qb = this.ejecucionesRepository
      .createQueryBuilder('ejecucion')
      .where('ejecucion.workflowId = :workflowId', { workflowId })
      .orderBy('ejecucion.inicioEn', 'DESC');

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

  private async actualizarEstadisticas(workflow: Workflow, exito: boolean, fecha: Date) {
    const stats = workflow.estadisticas ?? {
      ejecuciones: 0,
      exitosas: 0,
      fallidas: 0,
      ultimaEjecucion: null,
    };

    stats.ejecuciones += 1;
    if (exito) {
      stats.exitosas += 1;
    } else {
      stats.fallidas += 1;
    }
    stats.ultimaEjecucion = fecha.toISOString();

    workflow.estadisticas = stats;
    await this.workflowsRepository.save(workflow);
  }

  private parseUtcCron(expression: string, now: Date): Date | null {
    const parts = expression.trim().split(/\s+/);
    if (parts.length !== 5) {
      return null;
    }

    const [minExpr, hourExpr, dayExpr, monthExpr, dowExpr] = parts;
    const min = now.getUTCMinutes();
    const hour = now.getUTCHours();
    const day = now.getUTCDate();
    const month = now.getUTCMonth() + 1;
    const dow = now.getUTCDay();

    if (
      this.matchesCronPart(minExpr, min) &&
      this.matchesCronPart(hourExpr, hour) &&
      this.matchesCronPart(dayExpr, day) &&
      this.matchesCronPart(monthExpr, month) &&
      this.matchesCronPart(dowExpr, dow)
    ) {
      return now;
    }
    return null;
  }

  private matchesCronPart(part: string, value: number): boolean {
    if (part === '*') {
      return true;
    }

    if (part.includes(',')) {
      return part.split(',').some((p) => this.matchesCronPart(p, value));
    }

    if (part.includes('/')) {
      const [base, stepRaw] = part.split('/');
      const step = Number(stepRaw);
      if (!Number.isFinite(step) || step <= 0) {
        return false;
      }

      if (base === '*') {
        return value % step === 0;
      }

      const start = Number(base);
      if (!Number.isFinite(start)) {
        return false;
      }
      return value >= start && (value - start) % step === 0;
    }

    if (part.includes('-')) {
      const [startRaw, endRaw] = part.split('-');
      const start = Number(startRaw);
      const end = Number(endRaw);
      if (!Number.isFinite(start) || !Number.isFinite(end)) {
        return false;
      }
      return value >= start && value <= end;
    }

    const exact = Number(part);
    return Number.isFinite(exact) && value === exact;
  }

  private isMissingWorkflowsSchemaError(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }

    const dbError = error as QueryFailedError & { code?: string; message?: string };
    const msg = String(dbError.message ?? '').toLowerCase();

    return (
      dbError.code === '42P01' ||
      msg.includes('relation "workflows" does not exist') ||
      msg.includes('relation "ejecuciones_workflow" does not exist')
    );
  }
}
