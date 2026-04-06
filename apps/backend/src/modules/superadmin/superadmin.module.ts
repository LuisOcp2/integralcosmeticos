import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Empresa } from './entities/empresa.entity';
import { LogActividad } from './entities/log-actividad.entity';
import { AuditoriaInterceptor } from './interceptors/auditoria.interceptor';
import { SuperadminController } from './superadmin.controller';
import { SuperadminService } from './superadmin.service';

@Module({
  imports: [TypeOrmModule.forFeature([Empresa, LogActividad, Usuario])],
  controllers: [SuperadminController],
  providers: [SuperadminService, AuditoriaInterceptor],
  exports: [SuperadminService, AuditoriaInterceptor, TypeOrmModule],
})
export class SuperadminModule {}
