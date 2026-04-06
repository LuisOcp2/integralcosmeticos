import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActividadCRM } from '../actividades/entities/actividad-crm.entity';
import { Oportunidad } from './entities/oportunidad.entity';
import { OportunidadesController } from './oportunidades.controller';
import { OportunidadesService } from './oportunidades.service';

@Module({
  imports: [TypeOrmModule.forFeature([Oportunidad, ActividadCRM])],
  controllers: [OportunidadesController],
  providers: [OportunidadesService],
  exports: [OportunidadesService],
})
export class OportunidadesModule {}
