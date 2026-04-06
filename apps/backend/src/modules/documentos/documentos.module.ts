import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegracionesModule } from '../integraciones/integraciones.module';
import { DocumentosController } from './documentos.controller';
import { DocumentosService } from './documentos.service';
import { CarpetaDocumento } from './entities/carpeta-documento.entity';
import { Documento } from './entities/documento.entity';
import { VersionDocumento } from './entities/version-documento.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CarpetaDocumento, Documento, VersionDocumento]),
    IntegracionesModule,
  ],
  controllers: [DocumentosController],
  providers: [DocumentosService],
  exports: [DocumentosService],
})
export class DocumentosModule {}
