import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { EstadoTarea } from '../entities/tarea.entity';

export class CambiarEstadoTareaDto {
  @ApiProperty({ enum: EstadoTarea })
  @IsEnum(EstadoTarea)
  estado: EstadoTarea;
}
