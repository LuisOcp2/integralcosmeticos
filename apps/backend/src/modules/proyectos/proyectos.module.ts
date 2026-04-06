import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProyectosController } from './proyectos.controller';
import { ProyectosService } from './proyectos.service';
import { Proyecto } from './entities/proyecto.entity';
import { Tarea } from './entities/tarea.entity';
import { ComentarioTarea } from './entities/comentario-tarea.entity';
import { MiembroProyecto } from './entities/miembro-proyecto.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Proyecto, Tarea, ComentarioTarea, MiembroProyecto])],
  controllers: [ProyectosController],
  providers: [ProyectosService],
  exports: [ProyectosService],
})
export class ProyectosModule {}
