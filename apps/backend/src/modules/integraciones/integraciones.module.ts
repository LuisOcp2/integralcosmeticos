import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegracionConfig } from './entities/integracion-config.entity';
import { LogIntegracion } from './entities/log-integracion.entity';
import { IntegracionesController } from './integraciones.controller';
import { IntegracionesService } from './integraciones.service';
import { StorageService } from './storage.service';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([IntegracionConfig, LogIntegracion])],
  controllers: [IntegracionesController],
  providers: [IntegracionesService, StorageService],
  exports: [IntegracionesService, StorageService],
})
export class IntegracionesModule {}
