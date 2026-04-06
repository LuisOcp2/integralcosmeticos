import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { DataSource } from 'typeorm';
import { LogActividad, ResultadoActividad } from '../entities/log-actividad.entity';

@Injectable()
export class AuditoriaInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditoriaInterceptor.name);

  constructor(private readonly dataSource: DataSource) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = String(request?.method ?? '').toUpperCase();
    const shouldAudit = ['POST', 'PATCH', 'DELETE'].includes(method);
    const user = request?.user;

    if (!shouldAudit || !user?.id) {
      return next.handle();
    }

    const startAt = Date.now();
    const url = String(request?.originalUrl ?? request?.url ?? '');
    const relativeUrl = url.replace(/^\/api\/v\d+\//, '/');
    const modulo = relativeUrl.split('/').filter(Boolean)[0] ?? 'sistema';
    const accion = `${method} ${relativeUrl || '/'}`;
    const ipAddress =
      request?.ip ??
      request?.headers?.['x-forwarded-for'] ??
      request?.socket?.remoteAddress ??
      'desconocida';

    const guardarLog = async (resultado: ResultadoActividad, error?: string | null) => {
      try {
        const body = request?.body ?? {};
        const logsRepository = this.dataSource.getRepository(LogActividad);
        await logsRepository.save(
          logsRepository.create({
            empresaId: user?.empresaId ?? null,
            usuarioId: user?.id ?? null,
            ipAddress,
            modulo,
            accion,
            entidadTipo: body.entidadTipo ?? null,
            entidadId: body.entidadId ?? null,
            resultado,
            error: error ?? null,
            duracionMs: Date.now() - startAt,
          }),
        );
      } catch (err) {
        this.logger.warn(`No fue posible registrar log de auditoria: ${(err as Error).message}`);
      }
    };

    return next.handle().pipe(
      tap(() => {
        void guardarLog(ResultadoActividad.EXITO);
      }),
      catchError((error) => {
        void guardarLog(ResultadoActividad.ERROR, error?.message ?? 'Error no controlado');
        return throwError(() => error);
      }),
    );
  }
}
