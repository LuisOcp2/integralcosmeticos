import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Producto } from '../productos/entities/producto.entity';
import { Variante } from './entities/variante.entity';
import { VariantesController } from './variantes.controller';
import { VariantesService } from './variantes.service';

@Module({
  imports: [TypeOrmModule.forFeature([Variante, Producto])],
  controllers: [VariantesController],
  providers: [VariantesService],
  exports: [VariantesService],
})
export class VariantesModule {}
