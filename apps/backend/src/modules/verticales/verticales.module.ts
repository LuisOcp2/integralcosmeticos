import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InmobiliariaController } from './inmobiliaria/inmobiliaria.controller';
import { InmobiliariaService } from './inmobiliaria/inmobiliaria.service';
import { ContratoArrendamiento } from './inmobiliaria/entities/contrato-arrendamiento.entity';
import { Inmueble } from './inmobiliaria/entities/inmueble.entity';
import { PagoArriendo } from './inmobiliaria/entities/pago-arriendo.entity';
import { InversionistasController } from './inversionistas/inversionistas.controller';
import { InversionistasService } from './inversionistas/inversionistas.service';
import { InversionItem } from './inversionistas/entities/inversion-item.entity';
import { Inversionista } from './inversionistas/entities/inversionista.entity';
import { MovimientoInversion } from './inversionistas/entities/movimiento-inversion.entity';
import { Portafolio } from './inversionistas/entities/portafolio.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Inmueble,
      ContratoArrendamiento,
      PagoArriendo,
      Inversionista,
      Portafolio,
      InversionItem,
      MovimientoInversion,
    ]),
  ],
  controllers: [InmobiliariaController, InversionistasController],
  providers: [InmobiliariaService, InversionistasService],
  exports: [InmobiliariaService, InversionistasService],
})
export class VerticalesModule {}
