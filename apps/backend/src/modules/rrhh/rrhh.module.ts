import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RrhhController } from './rrhh.controller';
import { NominaController } from './nomina/nomina.controller';
import { EmpleadosService } from './empleados.service';
import { TurnosService } from './turnos.service';
import { AsistenciaService } from './asistencia.service';
import { VacacionesService } from './vacaciones.service';
import { NominaService } from './nomina/nomina.service';
import { Area } from './entities/area.entity';
import { Cargo } from './entities/cargo.entity';
import { Empleado } from './entities/empleado.entity';
import { Turno } from './entities/turno.entity';
import { AsignacionTurno } from './entities/asignacion-turno.entity';
import { Asistencia } from './entities/asistencia.entity';
import { Vacaciones } from './entities/vacaciones.entity';
import { LiquidacionNomina } from './nomina/entities/liquidacion-nomina.entity';
import { NominaColectiva } from './nomina/entities/nomina-colectiva.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Area,
      Cargo,
      Empleado,
      Turno,
      AsignacionTurno,
      Asistencia,
      Vacaciones,
      LiquidacionNomina,
      NominaColectiva,
    ]),
  ],
  controllers: [RrhhController, NominaController],
  providers: [EmpleadosService, TurnosService, AsistenciaService, VacacionesService, NominaService],
  exports: [EmpleadosService, TurnosService, AsistenciaService, VacacionesService, NominaService],
})
export class RrhhModule {}
