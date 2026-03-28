import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { ImportacionesService } from './importaciones.service';

@Processor('catalogo-import')
export class ImportacionesProcessor {
  constructor(private readonly importacionesService: ImportacionesService) {}

  @Process('process-import-job')
  async processImport(job: Job<{ jobId: string }>) {
    await this.importacionesService.processImportJob(job.data.jobId);
    return { ok: true, jobId: job.data.jobId };
  }
}
