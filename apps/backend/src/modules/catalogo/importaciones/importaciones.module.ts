import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Categoria } from '../categorias/entities/categoria.entity';
import { Marca } from '../marcas/entities/marca.entity';
import { Producto } from '../productos/entities/producto.entity';
import { Variante } from '../variantes/entities/variante.entity';
import { ImportacionesController } from './importaciones.controller';
import { ImportacionesProcessor } from './importaciones.processor';
import { ImportacionesService } from './importaciones.service';
import { ImportacionCatalogoJob } from './entities/importacion-catalogo-job.entity';
import { ImportacionCatalogoRow } from './entities/importacion-catalogo-row.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Categoria,
      Marca,
      Producto,
      Variante,
      ImportacionCatalogoJob,
      ImportacionCatalogoRow,
    ]),
    BullModule.registerQueue({ name: 'catalogo-import' }),
  ],
  controllers: [ImportacionesController],
  providers: [ImportacionesService, ImportacionesProcessor],
  exports: [ImportacionesService],
})
export class ImportacionesModule {}
