import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriasModule } from '../catalogo/categorias/categorias.module';
import { MarcasModule } from '../catalogo/marcas/marcas.module';
import { ConfiguracionesController } from './configuraciones.controller';
import { ConfiguracionesService } from './configuraciones.service';
import { TipoDocumentoConfiguracion } from './entities/tipo-documento-configuracion.entity';
import { ParametroConfiguracion } from './entities/parametro-configuracion.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([TipoDocumentoConfiguracion, ParametroConfiguracion]),
    CategoriasModule,
    MarcasModule,
  ],
  controllers: [ConfiguracionesController],
  providers: [ConfiguracionesService],
  exports: [ConfiguracionesService, TypeOrmModule],
})
export class ConfiguracionesModule {}
