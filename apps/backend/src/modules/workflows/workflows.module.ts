import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActividadesModule } from '../crm/actividades/actividades.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { EjecucionWorkflow } from './entities/ejecucion-workflow.entity';
import { Workflow } from './entities/workflow.entity';
import { WorkflowEngineService } from './workflow-engine.service';
import { WorkflowsController } from './workflows.controller';
import { WorkflowsService } from './workflows.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Workflow, EjecucionWorkflow]),
    NotificacionesModule,
    ActividadesModule,
  ],
  controllers: [WorkflowsController],
  providers: [WorkflowEngineService, WorkflowsService],
  exports: [WorkflowEngineService, WorkflowsService],
})
export class WorkflowsModule {}
