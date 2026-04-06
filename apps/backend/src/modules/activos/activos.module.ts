import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivosController } from './activos.controller';
import { ActivosService } from './activos.service';
import { Activo } from './entities/activo.entity';
import { CategoriaActivo } from './entities/categoria-activo.entity';
import { MovimientoActivo } from './entities/movimiento-activo.entity';
import { DepreciacionActivo } from './entities/depreciacion-activo.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Activo, CategoriaActivo, MovimientoActivo, DepreciacionActivo]),
  ],
  controllers: [ActivosController],
  providers: [ActivosService],
  exports: [ActivosService],
})
export class ActivosModule {}
